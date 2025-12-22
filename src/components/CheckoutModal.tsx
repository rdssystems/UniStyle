import React, { useState, useEffect } from 'react';
import { Appointment, Product, SoldProduct } from '../types';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';
import ProductMultiSelect from './ProductMultiSelect';

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment;
    servicePrice: number;
}

interface SelectedProduct extends Product {
    quantity: number;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, appointment, servicePrice }) => {
    const { tenant } = useTenant();
    const {
        products, services, professionals, clients,
        updateAppointment, addStockMovement,
        transactions, addTransaction, updateTransaction,
        commissions, addCommission, updateCommission
    } = useData();
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Checkbox for Payment Method (Simplified)
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix'>('cash');

    const tenantProducts = products.filter(p => p.tenantId === tenant?.id);
    const currentService = services.find(s => s.id === appointment.serviceId);
    // Find professional for commission
    const currentProfessional = professionals.find(p => p.id === appointment.professionalId);

    // MENSALISTA CHECK
    const client = clients.find(c => c.id === appointment.clientId);
    const isMensalista = client?.isMensalista || false;

    const effectiveServicePrice = isMensalista ? 0 : servicePrice;

    useEffect(() => {
        if (!isOpen) {
            setSelectedProducts([]);
            setIsFinalizing(false);
            setPaymentMethod('cash');
        } else {
            // If already completed, load existing products
            if (appointment.status === 'Concluído' && appointment.productsSold) {
                const loadedProducts: SelectedProduct[] = appointment.productsSold.map(sold => {
                    const originalProduct = tenantProducts.find(p => p.id === sold.productId);
                    if (originalProduct) {
                        return { ...originalProduct, quantity: sold.quantity };
                    }
                    // Fallback if product deleted?
                    return {
                        id: sold.productId,
                        tenantId: tenant?.id || '',
                        name: sold.name,
                        stock: 0,
                        minStock: 0,
                        sellingPrice: sold.sellingPrice,
                        costPrice: 0,
                        category: 'other',
                        quantity: sold.quantity
                    } as SelectedProduct;
                });
                setSelectedProducts(loadedProducts);
            }
        }
    }, [isOpen, appointment, tenantProducts]);

    if (!isOpen || !currentService) return null;

    const handleProductSelectionChange = (productId: string, isSelected: boolean) => {
        setSelectedProducts(prev => {
            if (isSelected) {
                const productToAdd = tenantProducts.find(p => p.id === productId);
                if (productToAdd && !prev.some(p => p.id === productId)) {
                    return [...prev, { ...productToAdd, quantity: 1 }];
                }
            } else {
                return prev.filter(p => p.id !== productId);
            }
            return prev;
        });
    };

    const handleQuantityChange = (productId: string, change: number) => {
        setSelectedProducts(prev => {
            const updated = prev.map(p =>
                p.id === productId ? { ...p, quantity: Math.max(1, p.quantity + change) } : p
            );
            return updated.filter(p => p.quantity > 0);
        });
    };

    const handleRemoveProduct = (productId: string) => {
        setSelectedProducts(prev => prev.filter(p => p.id !== productId));
    };

    const totalProductsPrice = selectedProducts.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0);
    const totalAmount = effectiveServicePrice + totalProductsPrice;

    const handleFinalizeSale = async () => {
        if (isFinalizing) return;
        setIsFinalizing(true);
        console.log("Starting finalize sale...");

        try {
            const timestamp = new Date().toISOString();
            const errors: string[] = [];
            const isUpdate = appointment.status === 'Concluído';

            // 0. If Update, Revert Previous Stock Movements
            if (isUpdate && appointment.productsSold) {
                for (const sold of appointment.productsSold) {
                    await addStockMovement({
                        productId: sold.productId,
                        type: 'entry', // Return to stock
                        quantity: sold.quantity,
                        reason: 'Correção de Atendimento (Estorno Automático)',
                        date: timestamp,
                        observations: `Reversão Atendimento ${appointment.id}`
                    });
                }
            }

            // 1. Deduct Product Stock & Record Movement (New/Current selection)
            for (const p of selectedProducts) {
                const success = await addStockMovement({
                    productId: p.id,
                    type: 'exit',
                    quantity: p.quantity,
                    reason: isUpdate ? 'Venda (Correção)' : 'Venda/Uso (Atendimento)',
                    date: timestamp,
                    observations: `Atendimento ${appointment.id}`
                });
                if (!success) errors.push(`Erro ao baixar estoque do produto: ${p.name}`);
            }

            // 2. Register/Update Cash Transaction (Income)
            let transaction: any = null;
            if (isUpdate) {
                const existingTransaction = transactions.find(t => t.relatedEntityId === appointment.id);
                if (existingTransaction) {
                    transaction = await updateTransaction({
                        ...existingTransaction,
                        amount: totalAmount,
                        description: `Atendimento: ${currentService.title} + ${selectedProducts.length} Produtos (Atualizado)`,
                        paymentMethod: paymentMethod,
                        // Keep original date? Or update to now? User usually expects record date to stay same unless specified.
                        // Let's keep original date but update content.
                    });
                } else {
                    // Falls back to create if missing
                    transaction = await addTransaction({
                        type: 'income',
                        category: 'service',
                        amount: totalAmount,
                        description: `Atendimento: ${currentService.title} + ${selectedProducts.length} Produtos`,
                        paymentMethod: paymentMethod,
                        date: timestamp,
                        relatedEntityId: appointment.id,
                        relatedEntityType: 'appointment'
                    });
                }
            } else {
                transaction = await addTransaction({
                    type: 'income',
                    category: 'service',
                    amount: totalAmount,
                    description: `Atendimento: ${currentService.title} + ${selectedProducts.length} Produtos`,
                    paymentMethod: paymentMethod,
                    date: timestamp,
                    relatedEntityId: appointment.id,
                    relatedEntityType: 'appointment'
                });
            }

            if (!transaction) {
                errors.push("Erro ao registrar transação no caixa. Verifique se a tabela 'transactions' foi criada no banco de dados.");
            }

            // 3. Register/Update Commission
            if (currentProfessional && currentProfessional.commissionPercentage > 0) {
                const commissionAmount = (servicePrice * currentProfessional.commissionPercentage) / 100;
                if (commissionAmount > 0) {
                    let commission: any = null;
                    if (isUpdate) {
                        const existingCommission = commissions.find(c => c.appointmentId === appointment.id);
                        if (existingCommission) {
                            commission = await updateCommission({
                                ...existingCommission,
                                amount: commissionAmount,
                                // Keep status?
                            });
                        } else {
                            commission = await addCommission({
                                professionalId: currentProfessional.id,
                                appointmentId: appointment.id,
                                amount: commissionAmount,
                                status: 'pending',
                                date: timestamp
                            });
                        }
                    } else {
                        commission = await addCommission({
                            professionalId: currentProfessional.id,
                            appointmentId: appointment.id,
                            amount: commissionAmount,
                            status: 'pending',
                            date: timestamp
                        });
                    }
                    if (!commission) errors.push("Erro ao registrar comissão. Verifique se a tabela 'commissions' foi criada.");
                }
            }

            if (errors.length > 0) {
                alert(`Ocorreram erros durante a finalização:\n${errors.join('\n')}\n\nO financeiro pode estar incompleto.`);
                // We don't return here if we want to proceed to update appointment status?
                // Probably better to stop.
                setIsFinalizing(false);
                return;
            }

            // 4. Update Appointment Status
            const productsToSave: SoldProduct[] = selectedProducts.map(p => ({
                productId: p.id,
                name: p.name,
                quantity: p.quantity,
                sellingPrice: p.sellingPrice,
            }));

            const updated = await updateAppointment({
                ...appointment,
                status: 'Concluído',
                totalAmount: totalAmount,
                productsSold: productsToSave,
            });

            if (updated.success) {
                // Success feedback
                onClose();
            } else {
                alert('Erro ao atualizar status do agendamento, mas financeiro pode ter sido gerado. Contacte suporte.');
            }

        } catch (error) {
            console.error("Error finalizing:", error);
            alert("Ocorreu um erro crítico ao processar. Verifique o console.");
        } finally {
            setIsFinalizing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark rounded-xl w-full max-w-lg border border-border-dark shadow-2xl animate-fade-in flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-border-dark shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-text-primary-dark">Finalizar Atendimento</h2>
                        <p className="text-sm text-text-secondary-dark">Confira os valores e adicione produtos</p>
                    </div>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar grow">
                    {/* Service Details */}
                    <div className="bg-background-dark p-4 rounded-lg border border-border-dark">
                        <h3 className="text-xs font-bold text-text-secondary-dark uppercase mb-2">Serviço Realizado</h3>
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="text-text-primary-dark font-medium block">{currentService.title}</span>
                                {isMensalista && (
                                    <span className="text-[10px] font-bold text-purple-400 bg-purple-500/10 px-1 py-0.5 rounded border border-purple-500/20">
                                        MENSALISTA (ISENTO)
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <span className={`font-bold block ${isMensalista ? 'text-text-secondary-dark line-through text-xs' : 'text-text-primary-dark'}`}>
                                    R$ {servicePrice.toFixed(2)}
                                </span>
                                {isMensalista && (
                                    <span className="font-bold text-green-500">R$ 0.00</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Products Section */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xs font-bold text-text-secondary-dark uppercase">Produtos / Consumo</h3>
                        </div>
                        <ProductMultiSelect
                            availableProducts={tenantProducts}
                            selectedProductIds={selectedProducts.map(p => p.id)}
                            onSelectionChange={handleProductSelectionChange}
                        />
                    </div>

                    {/* Selected Products List */}
                    {selectedProducts.length > 0 && (
                        <div className="bg-background-dark p-4 rounded-lg border border-border-dark space-y-3">
                            <h4 className="text-xs font-bold text-text-secondary-dark uppercase mb-2">Itens Adicionados</h4>
                            {selectedProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between gap-4">
                                    <span className="text-text-secondary-dark text-sm flex-1 truncate">{product.name}</span>
                                    <div className="flex items-center gap-2 bg-surface-dark rounded-lg p-1">
                                        <button
                                            type="button"
                                            onClick={() => handleQuantityChange(product.id, -1)}
                                            className="p-1 text-text-secondary-dark hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">remove</span>
                                        </button>
                                        <span className="font-bold text-text-primary-dark w-6 text-center text-sm">{product.quantity}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleQuantityChange(product.id, 1)}
                                            className="p-1 text-text-secondary-dark hover:text-green-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">add</span>
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-text-primary-dark min-w-[70px] text-right text-sm">R$ {(product.sellingPrice * product.quantity).toFixed(2)}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveProduct(product.id)}
                                            className="p-1 text-text-secondary-dark hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Payment Method */}
                    <div>
                        <h3 className="text-xs font-bold text-text-secondary-dark uppercase mb-2">Forma de Pagamento</h3>
                        <div className="grid grid-cols-3 gap-3">
                            {['cash', 'card', 'pix'].map((method) => (
                                <button
                                    key={method}
                                    onClick={() => setPaymentMethod(method as any)}
                                    className={`py-2 rounded-lg border text-sm font-bold capitalize transition-all ${paymentMethod === method ? 'bg-primary text-background-dark border-primary' : 'bg-transparent border-border-dark text-text-secondary-dark hover:border-primary'}`}
                                >
                                    {method === 'cash' ? 'Dinheiro' : method === 'card' ? 'Cartão' : 'PIX'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-surface-dark to-background-dark p-6 rounded-xl border border-border-dark flex justify-between items-center">
                        <span className="text-lg font-bold text-text-secondary-dark">Total Geral</span>
                        <span className="text-3xl font-black text-primary">R$ {totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div className="p-6 border-t border-border-dark flex justify-end shrink-0">
                    <button
                        onClick={handleFinalizeSale}
                        className="w-full bg-primary text-background-dark px-6 py-4 rounded-xl font-bold hover:opacity-90 shadow-glow-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        disabled={isFinalizing}
                    >
                        {isFinalizing ? (
                            <>Processing...</>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">check_circle</span>
                                Confirmar e Finalizar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckoutModal;

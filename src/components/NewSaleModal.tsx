import React, { useState } from 'react';
import { Product } from '../types';
import { useData } from '../contexts/DataContext';
import ProductMultiSelect from './ProductMultiSelect';

interface NewSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

interface SelectedProduct extends Product {
    quantity: number;
}

const NewSaleModal: React.FC<NewSaleModalProps> = ({ isOpen, onClose, products }) => {
    const { addTransaction, addStockMovement } = useData();
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'pix' | 'other'>('cash');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.sellingPrice * p.quantity), 0);

    const handleProductSelectionChange = (productId: string, isSelected: boolean) => {
        if (isSelected) {
            const product = products.find(p => p.id === productId);
            if (product) {
                setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
            }
        } else {
            setSelectedProducts(prev => prev.filter(p => p.id !== productId));
        }
    };

    const handleQuantityChange = (productId: string, delta: number) => {
        setSelectedProducts(prev => prev.map(p => {
            if (p.id === productId) {
                const newQty = Math.max(1, p.quantity + delta);
                return { ...p, quantity: newQty };
            }
            return p;
        }));
    };

    const handleConfirmSale = async () => {
        if (selectedProducts.length === 0) return;
        setIsLoading(true);

        try {
            // 1. Register Stock Exit
            for (const p of selectedProducts) {
                await addStockMovement({
                    productId: p.id,
                    type: 'exit',
                    quantity: p.quantity,
                    reason: 'Venda Direta',
                    date: new Date().toISOString(),
                    observations: `Venda Direta (Caixa)`
                });
            }

            // 2. Register Transaction
            const productNames = selectedProducts.map(p => `${p.quantity}x ${p.name}`).join(', ');
            await addTransaction({
                type: 'income',
                category: 'product',
                amount: totalAmount,
                description: `Venda Direta: ${productNames}`,
                paymentMethod: paymentMethod,
                date: new Date().toISOString(),
                relatedEntityType: 'manual'
            });

            onClose();
            setSelectedProducts([]);
            setPaymentMethod('cash');
        } catch (error) {
            console.error("Erro ao registrar venda:", error);
            alert("Erro ao registrar venda. Verifique o console.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark w-full max-w-2xl rounded-xl border border-border-dark shadow-xl p-6 h-[90vh] flex flex-col">
                <h2 className="text-2xl font-black text-text-primary-dark mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">shopping_cart</span>
                    Registrar Venda
                </h2>

                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6">
                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-bold text-text-secondary-dark uppercase mb-2">Produtos</label>
                        <ProductMultiSelect
                            availableProducts={products}
                            selectedProductIds={selectedProducts.map(p => p.id)}
                            onSelectionChange={handleProductSelectionChange}
                        />
                    </div>

                    {/* Selected Products List */}
                    {selectedProducts.length > 0 && (
                        <div className="space-y-3">
                            <label className="block text-sm font-bold text-text-secondary-dark uppercase">Itens Selecionados</label>
                            {selectedProducts.map(product => (
                                <div key={product.id} className="flex items-center justify-between bg-background-dark p-3 rounded-lg border border-border-dark animate-fade-in">
                                    <div className="flex-1">
                                        <div className="font-bold text-text-primary-dark">{product.name}</div>
                                        <div className="text-xs text-text-secondary-dark font-mono flex gap-2">
                                            <span>Estoque: {product.stock}</span>
                                            <span>|</span>
                                            <span>Un: R$ {product.sellingPrice.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center bg-surface-dark rounded-lg border border-border-dark h-8">
                                            <button
                                                onClick={() => handleQuantityChange(product.id, -1)}
                                                className="w-8 h-full flex items-center justify-center text-text-secondary-dark hover:text-red-400 disabled:opacity-30"
                                                disabled={product.quantity <= 1}
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-bold text-sm text-text-primary-dark">{product.quantity}</span>
                                            <button
                                                onClick={() => handleQuantityChange(product.id, 1)}
                                                className="w-8 h-full flex items-center justify-center text-text-secondary-dark hover:text-primary"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="font-bold text-right w-24 text-text-primary-dark">
                                            R$ {(product.sellingPrice * product.quantity).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer / Payment */}
                <div className="mt-6 pt-6 border-t border-border-dark">
                    <div className="grid grid-cols-2 gap-6 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-2">Forma de Pagamento</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['cash', 'card', 'pix', 'other'].map(method => (
                                    <button
                                        key={method}
                                        onClick={() => setPaymentMethod(method as any)}
                                        className={`px-3 py-2 rounded-lg border text-sm font-bold capitalize transition-colors ${paymentMethod === method
                                            ? 'bg-primary/20 border-primary text-primary'
                                            : 'bg-background-dark border-border-dark text-text-secondary-dark hover:border-gray-600'
                                            }`}
                                    >
                                        {method === 'cash' ? 'Dinheiro' : method === 'card' ? 'Cartão' : method === 'pix' ? 'Pix' : 'Outro'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="bg-background-dark rounded-lg p-4 border border-border-dark flex flex-col justify-center items-end">
                            <span className="text-text-secondary-dark text-sm">Total a Pagar</span>
                            <span className="text-3xl font-black text-primary">R$ {totalAmount.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 rounded-xl border border-border-dark text-text-primary-dark font-bold hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmSale}
                            disabled={selectedProducts.length === 0 || isLoading}
                            className="flex-[2] py-4 rounded-xl bg-primary text-background-dark font-black text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2"
                        >
                            {isLoading ? 'Registrando...' : 'Finalizar Venda'}
                            {!isLoading && <span className="material-symbols-outlined">check_circle</span>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewSaleModal;

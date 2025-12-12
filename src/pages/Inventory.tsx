import React, { useState, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Product, StockMovement } from '../types';

type Tab = 'stock' | 'movements';

const Inventory = () => {
    const { tenant, user, isLoading: isLoadingTenant } = useTenant();
    const { products, stockMovements, addStockMovement, isLoadingData } = useData();
    const [activeTab, setActiveTab] = useState<Tab>('stock');
    const [searchTerm, setSearchTerm] = useState('');

    // Filters for History
    const [filterType, setFilterType] = useState<'all' | 'entry' | 'exit'>('all');
    const [filterPeriod, setFilterPeriod] = useState<'this-month' | 'last-month' | 'all'>('this-month');

    // Modals
    const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Initial Loading State
    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Estoque...</div>;
    }

    const tenantProducts = products.filter(p => p.tenantId === tenant?.id);
    const tenantMovements = stockMovements.filter(m => m.tenantId === tenant?.id);

    // --- INDICATORS ---
    const indicators = useMemo(() => {
        const lowStockCount = tenantProducts.filter(p => p.stock <= p.minStock).length;

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthMovements = tenantMovements.filter(m => {
            const d = new Date(m.date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const totalMovementsMonth = monthMovements.length;

        // Calculate most moved product
        const productMovementCounts: Record<string, number> = {};
        monthMovements.forEach(m => {
            productMovementCounts[m.productId] = (productMovementCounts[m.productId] || 0) + m.quantity;
        });

        let mostMovedProductId = '';
        let maxMovedQty = 0;

        Object.entries(productMovementCounts).forEach(([pid, qty]) => {
            if (qty > maxMovedQty) {
                maxMovedQty = qty;
                mostMovedProductId = pid;
            }
        });

        const mostMovedProduct = tenantProducts.find(p => p.id === mostMovedProductId);

        return {
            lowStockCount,
            totalMovementsMonth,
            mostMovedProductName: mostMovedProduct?.name || '-'
        };
    }, [tenantProducts, tenantMovements]);


    // --- FILTERED DATA ---
    const filteredProducts = useMemo(() => {
        return tenantProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tenantProducts, searchTerm]);

    const filteredMovements = useMemo(() => {
        let filtered = tenantMovements;

        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(m => {
                const prod = tenantProducts.find(p => p.id === m.productId);
                return prod?.name.toLowerCase().includes(term) || m.reason.toLowerCase().includes(term);
            });
        }

        // Type Filter
        if (filterType !== 'all') {
            filtered = filtered.filter(m => m.type === filterType);
        }

        // Period Filter
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        if (filterPeriod === 'this-month') {
            filtered = filtered.filter(m => {
                const d = new Date(m.date);
                return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            });
        } else if (filterPeriod === 'last-month') {
            const lastMonthDate = new Date(now.setMonth(now.getMonth() - 1));
            const lastMonth = lastMonthDate.getMonth();
            const lastMonthYear = lastMonthDate.getFullYear(); // Handle year rollover handled by Date setMonth
            filtered = filtered.filter(m => {
                const d = new Date(m.date);
                return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
            });
        }

        return filtered;
    }, [tenantMovements, tenantProducts, searchTerm, filterType, filterPeriod]);


    // --- ACTIONS ---

    const handleQuickAction = async (product: Product, type: 'entry' | 'exit') => {
        const reason = type === 'entry' ? 'Compra' : 'Uso Interno';
        await addStockMovement({
            productId: product.id,
            type,
            quantity: 1,
            reason,
            date: new Date().toISOString(),
            observations: 'Movimentação Rápida'
        });
    };

    const openAssessmentModal = (product: Product) => {
        setSelectedProduct(product);
        setIsAdjustmentModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* HEADER & INDICATORS */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-text-primary-dark text-4xl font-black">Gestão de Estoque</h1>
                        <p className="text-text-secondary-dark">Controle eficiente de entradas, saídas e inventário.</p>
                    </div>
                    <button
                        onClick={() => setIsMovementModalOpen(true)}
                        className="bg-primary text-background-dark px-4 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">swap_horiz</span>
                        Registrar Movimentação
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center gap-4">
                        <div className={`p-3 rounded-full ${indicators.lowStockCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div>
                            <p className="text-text-secondary-dark text-sm">Abaixo do Mínimo</p>
                            <p className="text-2xl font-bold text-text-primary-dark">{indicators.lowStockCount} produtos</p>
                        </div>
                    </div>
                    <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center gap-4">
                        <div className="p-3 rounded-full bg-blue-500/20 text-blue-400">
                            <span className="material-symbols-outlined">sync_alt</span>
                        </div>
                        <div>
                            <p className="text-text-secondary-dark text-sm">Movimentações (Mês)</p>
                            <p className="text-2xl font-bold text-text-primary-dark">{indicators.totalMovementsMonth}</p>
                        </div>
                    </div>
                    <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex items-center gap-4">
                        <div className="p-3 rounded-full bg-purple-500/20 text-purple-400">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <div>
                            <p className="text-text-secondary-dark text-sm">Mais Movimentado</p>
                            <p className="text-xl font-bold text-text-primary-dark truncate max-w-[150px]" title={indicators.mostMovedProductName}>{indicators.mostMovedProductName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS & FILTERS */}
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4 border-b border-border-dark">
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'stock' ? 'text-primary' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Estoque Atual
                        {activeTab === 'stock' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`pb-2 px-4 font-medium transition-colors relative ${activeTab === 'movements' ? 'text-primary' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Histórico de Movimentações
                        {activeTab === 'movements' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full"></div>}
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 bg-surface-dark p-2 rounded-lg border border-border-dark w-full md:w-auto">
                        <span className="material-symbols-outlined text-text-secondary-dark pl-2">search</span>
                        <input
                            type="text"
                            placeholder={activeTab === 'stock' ? "Buscar produto..." : "Buscar movimento..."}
                            className="bg-transparent border-none focus:ring-0 text-text-primary-dark placeholder-text-secondary-dark outline-none w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {activeTab === 'movements' && (
                        <div className="flex gap-2">
                            <select
                                value={filterPeriod}
                                onChange={(e) => setFilterPeriod(e.target.value as any)}
                                className="bg-surface-dark text-text-primary-dark border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                            >
                                <option value="this-month">Este Mês</option>
                                <option value="last-month">Mês Passado</option>
                                <option value="all">Todo Período</option>
                            </select>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="bg-surface-dark text-text-primary-dark border border-border-dark rounded-lg px-3 py-2 text-sm focus:border-primary outline-none"
                            >
                                <option value="all">Todos Tipos</option>
                                <option value="entry">Entradas</option>
                                <option value="exit">Saídas</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENT */}
            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden min-h-[400px]">
                {activeTab === 'stock' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/20">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Produto</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Categoria</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Estoque</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Status</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 text-sm font-medium text-text-primary-dark">{product.name}</td>
                                        <td className="px-6 py-4 text-sm text-text-secondary-dark">{product.category}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-text-primary-dark">{product.stock}</td>
                                        <td className="px-6 py-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${product.stock <= product.minStock ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                                {product.stock <= product.minStock ? 'Baixo Estoque' : 'Normal'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleQuickAction(product, 'exit')}
                                                    className="w-8 h-8 rounded-full bg-background-dark border border-border-dark text-text-secondary-dark hover:text-red-400 hover:border-red-500/50 flex items-center justify-center transition-all"
                                                    title="Uso Rápido (-1)"
                                                >
                                                    <span className="material-symbols-outlined text-sm">remove</span>
                                                </button>
                                                <button
                                                    onClick={() => handleQuickAction(product, 'entry')}
                                                    className="w-8 h-8 rounded-full bg-background-dark border border-border-dark text-text-secondary-dark hover:text-green-400 hover:border-green-500/50 flex items-center justify-center transition-all"
                                                    title="Entrada Rápida (+1)"
                                                >
                                                    <span className="material-symbols-outlined text-sm">add</span>
                                                </button>
                                                <div className="w-px h-6 bg-border-dark mx-1"></div>
                                                <button
                                                    onClick={() => openAssessmentModal(product)}
                                                    className="p-2 text-text-secondary-dark hover:text-primary transition-colors"
                                                    title="Ajuste Manual / Inventário"
                                                >
                                                    <span className="material-symbols-outlined text-xl">tune</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <div className="p-8 text-center text-text-secondary-dark">Nenhum produto encontrado.</div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-black/20">
                                <tr>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Data</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Produto</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Tipo</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Qtd</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Motivo</th>
                                    <th className="px-6 py-4 text-xs font-bold uppercase text-text-secondary-dark">Obs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark">
                                {filteredMovements.map((movement) => {
                                    const prod = tenantProducts.find(p => p.id === movement.productId);
                                    return (
                                        <tr key={movement.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm text-text-secondary-dark">
                                                {new Date(movement.date).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(movement.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-text-primary-dark">{prod?.name || 'Produto Removido'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${movement.type === 'entry' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {movement.type === 'entry' ? 'Entrada' : 'Saída'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-text-primary-dark">{movement.quantity}</td>
                                            <td className="px-6 py-4 text-sm text-text-primary-dark">{movement.reason}</td>
                                            <td className="px-6 py-4 text-xs text-text-secondary-dark max-w-[200px] truncate" title={movement.observations || ''}>{movement.observations || '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredMovements.length === 0 && (
                            <div className="p-8 text-center text-text-secondary-dark">Nenhuma movimentação encontrada neste período.</div>
                        )}
                    </div>
                )}
            </div>

            <MovementModal
                isOpen={isMovementModalOpen}
                onClose={() => setIsMovementModalOpen(false)}
                products={tenantProducts}
                onSubmit={addStockMovement}
            />

            {selectedProduct && (
                <AdjustmentModal
                    isOpen={isAdjustmentModalOpen}
                    onClose={() => { setIsAdjustmentModalOpen(false); setSelectedProduct(null); }}
                    product={selectedProduct}
                    onSubmit={addStockMovement}
                />
            )}
        </div>
    );
};

// --- SUBCOMPONENTS (Defined in same file for simplicity as requested "Interface enxuta") ---

const MovementModal = ({ isOpen, onClose, products, onSubmit }: { isOpen: boolean, onClose: () => void, products: Product[], onSubmit: any }) => {
    const { addTransaction } = useData();

    if (!isOpen) return null;

    const [productId, setProductId] = useState('');
    const [type, setType] = useState<'entry'>('entry'); // Locked to entry
    const [quantity, setQuantity] = useState(1);
    const [reason, setReason] = useState('Compra');
    const [observation, setObservation] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productId) {
            alert("Selecione um produto");
            return;
        }

        const selectedProduct = products.find(p => p.id === productId);
        if (selectedProduct) {
            const totalCost = selectedProduct.costPrice * quantity;
            if (totalCost > 0) {
                await addTransaction({
                    type: 'expense',
                    category: 'product',
                    amount: totalCost,
                    description: `Compra de Estoque: ${selectedProduct.name} (${quantity} un.)`,
                    paymentMethod: 'cash', // Default to cash for stock purchase
                    date: new Date().toISOString(),
                    relatedEntityType: 'manual'
                });
            }
        }

        await onSubmit({
            productId,
            type: 'entry',
            quantity: Number(quantity),
            reason,
            date: new Date().toISOString(),
            observations: observation
        });
        onClose();
        // Reset form
        setProductId('');
        setQuantity(1);
        setObservation('');
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark w-full max-w-md rounded-xl border border-border-dark shadow-xl p-6">
                <h2 className="text-xl font-bold text-text-primary-dark mb-4">Nova Entrada de Estoque</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Tipo</label>
                        <div className="flex bg-background-dark rounded-lg p-3 border border-border-dark">
                            <span className="font-bold text-green-400 flex items-center gap-2">
                                <span className="material-symbols-outlined">add_circle</span>
                                Entrada
                            </span>
                        </div>
                        <p className="text-xs text-text-secondary-dark mt-1">Saídas devem ser feitas pelo Caixa/Agenda.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Produto</label>
                        <select
                            value={productId}
                            onChange={(e) => setProductId(e.target.value)}
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary outline-none"
                            required
                        >
                            <option value="" className="bg-background-dark">Selecione...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id} className="bg-background-dark">{p.name} (Custo: R$ {p.costPrice?.toFixed(2) || '0.00'})</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Quantidade</label>
                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Number(e.target.value))}
                                className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Motivo</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary outline-none"
                            >
                                <option value="Compra" className="bg-background-dark">Compra</option>
                                <option value="Devolução" className="bg-background-dark">Devolução</option>
                                <option value="Ajuste" className="bg-background-dark">Ajuste (+)</option>
                                <option value="Outro" className="bg-background-dark">Outro</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Observações (Opcional)</label>
                        <textarea
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary outline-none resize-none h-20"
                        />
                    </div>

                    <div className="flex gap-3 mt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-border-dark text-text-primary-dark hover:bg-white/5 font-bold transition-colors">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-primary text-background-dark font-bold hover:opacity-90 transition-opacity">Salvar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdjustmentModal = ({ isOpen, onClose, product, onSubmit }: { isOpen: boolean, onClose: () => void, product: Product, onSubmit: any }) => {
    if (!isOpen) return null;

    const [newStock, setNewStock] = useState(product.stock);
    const [reason, setReason] = useState('Inventário');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const diff = newStock - product.stock;
        if (diff === 0) {
            onClose();
            return;
        }

        await onSubmit({
            productId: product.id,
            type: diff > 0 ? 'entry' : 'exit',
            quantity: Math.abs(diff),
            reason: reason,
            date: new Date().toISOString(),
            observations: `Ajuste manual. Anterior: ${product.stock}, Novo: ${newStock}`
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark w-full max-w-sm rounded-xl border border-border-dark shadow-xl p-6">
                <h2 className="text-xl font-bold text-text-primary-dark mb-1">Ajuste de Estoque</h2>
                <p className="text-text-secondary-dark text-sm mb-4">Produto: <span className="text-primary font-bold">{product.name}</span></p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Qtd Atual</label>
                            <input
                                type="number"
                                value={product.stock}
                                disabled
                                className="w-full bg-background-dark/50 border border-border-dark rounded-lg p-3 text-text-secondary-dark outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Nova Qtd</label>
                            <input
                                type="number"
                                min="0"
                                value={newStock}
                                onChange={(e) => setNewStock(Number(e.target.value))}
                                className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary outline-none font-bold"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-text-secondary-dark uppercase mb-1">Motivo do Ajuste</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary outline-none"
                            required
                        >
                            <option value="Inventário">Inventário Periódico</option>
                            <option value="Correção">Correção de Erro</option>
                            <option value="Avaria não registrada">Avaria não registrada</option>
                        </select>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-lg border border-border-dark text-text-primary-dark hover:bg-white/5 font-bold transition-colors">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-3 rounded-lg bg-primary text-background-dark font-bold hover:opacity-90 transition-opacity">Confirmar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Inventory;
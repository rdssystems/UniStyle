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
    const [filterPeriod, setFilterPeriod] = useState<'this-month' | 'last-month' | 'custom' | 'all'>('this-month');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [filterProductId, setFilterProductId] = useState('all');

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
        const totalValue = tenantProducts.reduce((acc, p) => acc + (p.stock * (p.costPrice || 0)), 0);

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
            mostMovedProductName: mostMovedProduct?.name || '-',
            totalValue
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
        let filtered = [...tenantMovements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Search Filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(m => {
                const prod = tenantProducts.find(p => p.id === m.productId);
                return prod?.name.toLowerCase().includes(term) || m.reason.toLowerCase().includes(term);
            });
        }

        // Product Filter
        if (filterProductId !== 'all') {
            filtered = filtered.filter(m => m.productId === filterProductId);
        }

        // Type Filter
        if (filterType !== 'all') {
            filtered = filtered.filter(m => m.type === filterType);
        }

        // Period Filter
        const now = new Date();
        if (filterPeriod === 'this-month') {
            filtered = filtered.filter(m => {
                const d = new Date(m.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        } else if (filterPeriod === 'last-month') {
            const lastMonthDate = new Date();
            lastMonthDate.setMonth(now.getMonth() - 1);
            filtered = filtered.filter(m => {
                const d = new Date(m.date);
                return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
            });
        } else if (filterPeriod === 'custom') {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(m => {
                const d = new Date(m.date);
                return d >= start && d <= end;
            });
        }

        return filtered;
    }, [tenantMovements, tenantProducts, searchTerm, filterType, filterPeriod, startDate, endDate, filterProductId]);

    // Grouping Logic: Same minute, same product, same reason, same type
    const groupedMovements = useMemo(() => {
        const groups: Record<string, StockMovement[]> = {};

        filteredMovements.forEach(m => {
            const date = new Date(m.date);
            const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
            const key = `${m.productId}-${m.type}-${m.reason}-${minuteKey}`;

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(m);
        });

        return Object.entries(groups).map(([key, items]) => {
            const representative = items[0];
            const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
            return {
                ...representative,
                quantity: totalQuantity,
                isGrouped: items.length > 1,
                itemsCount: items.length,
                details: items
            };
        });
    }, [filteredMovements]);


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

    const handleExactQuantityChange = async (product: Product, newQty: number) => {
        const diff = newQty - product.stock;
        if (diff === 0) return;

        await addStockMovement({
            productId: product.id,
            type: diff > 0 ? 'entry' : 'exit',
            quantity: Math.abs(diff),
            reason: 'Ajuste de Estoque',
            date: new Date().toISOString(),
            observations: `Alteração rápida de valor exato: ${product.stock} -> ${newQty}`
        });
    };

    const openAssessmentModal = (product: Product) => {
        setSelectedProduct(product);
        setIsAdjustmentModalOpen(true);
    };

    const exportToCSV = () => {
        const headers = ["Data", "Produto", "Tipo", "Quantidade", "Motivo", "Observacoes"];
        const rows = filteredMovements.map(m => {
            const prod = tenantProducts.find(p => p.id === m.productId);
            return [
                new Date(m.date).toLocaleString('pt-BR'),
                prod?.name || 'Removido',
                m.type === 'entry' ? 'Entrada' : 'Saida',
                m.quantity,
                m.reason,
                m.observations || ''
            ].join(';');
        });

        const csvContent = [headers.join(';'), ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_estoque_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* HEADER & INDICATORS */}
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h1 className="text-text-primary-dark text-4xl font-extrabold">Gestão de Estoque</h1>
                        <p className="text-text-secondary-dark font-medium uppercase tracking-widest text-[10px]">Controle inteligente de inventário e movimentações.</p>
                    </div>
                    <button
                        onClick={() => setIsMovementModalOpen(true)}
                        className="bg-primary text-background-dark px-6 h-12 rounded-xl font-extrabold uppercase text-xs shadow-glow-primary hover:opacity-90 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_box</span>
                        Entrada de Mercadoria
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4 shadow-xl">
                        <div className={`p-3 rounded-xl ${indicators.lowStockCount > 0 ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                            <span className="material-symbols-outlined">warning</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest leading-none mb-1">Abaixo do Mínimo</p>
                            <p className="text-2xl font-extrabold text-text-primary-dark">{indicators.lowStockCount} <span className="text-xs font-medium opacity-50">itens</span></p>
                        </div>
                    </div>

                    <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4 shadow-xl">
                        <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <span className="material-symbols-outlined">account_balance_wallet</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest leading-none mb-1">Valor Total em Estoque</p>
                            <p className="text-2xl font-extrabold text-text-primary-dark font-mono">R$ {indicators.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                    </div>

                    <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4 shadow-xl">
                        <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <span className="material-symbols-outlined">sync_alt</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest leading-none mb-1">Movimentos (Mês)</p>
                            <p className="text-2xl font-extrabold text-text-primary-dark">{indicators.totalMovementsMonth}</p>
                        </div>
                    </div>

                    <div className="bg-surface-dark p-5 rounded-2xl border border-border-dark flex items-center gap-4 shadow-xl">
                        <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest leading-none mb-1">Giro Rápido</p>
                            <p className="text-lg font-extrabold text-text-primary-dark truncate max-w-[150px]" title={indicators.mostMovedProductName}>{indicators.mostMovedProductName}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS & FILTERS */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center gap-6 border-b border-white/5 px-2">
                    <button
                        onClick={() => setActiveTab('stock')}
                        className={`pb-3 px-2 font-extrabold uppercase text-xs tracking-widest transition-all relative ${activeTab === 'stock' ? 'text-primary' : 'text-text-secondary-dark hover:text-white'}`}
                    >
                        Estoque Atual
                        {activeTab === 'stock' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-glow-primary"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('movements')}
                        className={`pb-3 px-2 font-extrabold uppercase text-xs tracking-widest transition-all relative ${activeTab === 'movements' ? 'text-primary' : 'text-text-secondary-dark hover:text-white'}`}
                    >
                        Histórico de Movimentações
                        {activeTab === 'movements' && <div className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-glow-primary"></div>}
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 bg-background-dark px-4 py-2.5 rounded-xl border border-border-dark w-full md:w-auto shadow-inner">
                        <span className="material-symbols-outlined text-text-secondary-dark">search</span>
                        <input
                            type="text"
                            placeholder={activeTab === 'stock' ? "Buscar produto ou categoria..." : "Filtrar por nome ou motivo..."}
                            className="bg-transparent border-none focus:ring-0 text-sm text-text-primary-dark placeholder-text-secondary-dark/50 outline-none w-full md:w-80 font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {activeTab === 'movements' && (
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={filterProductId}
                                onChange={(e) => setFilterProductId(e.target.value)}
                                className="bg-surface-dark text-text-primary-dark border border-border-dark rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none hover:bg-white/5 transition-colors shadow-lg"
                            >
                                <option value="all">Todos os Produtos</option>
                                {tenantProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>

                            <select
                                value={filterPeriod}
                                onChange={(e) => setFilterPeriod(e.target.value as any)}
                                className="bg-surface-dark text-text-primary-dark border border-border-dark rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none hover:bg-white/5 transition-colors shadow-lg"
                            >
                                <option value="this-month">Este Mês</option>
                                <option value="last-month">Mês Passado</option>
                                <option value="custom">Personalizado</option>
                                <option value="all">Todo Período</option>
                            </select>

                            {filterPeriod === 'custom' && (
                                <div className="flex items-center gap-2 animate-fade-in border border-border-dark rounded-xl px-2 bg-background-dark shadow-inner">
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-[10px] text-primary p-1 outline-none" />
                                    <span className="text-text-secondary-dark text-[10px] font-extrabold">ATÉ</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-[10px] text-primary p-1 outline-none" />
                                </div>
                            )}

                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="bg-surface-dark text-text-primary-dark border border-border-dark rounded-xl px-4 py-2.5 text-xs font-bold focus:border-primary outline-none hover:bg-white/5 transition-colors shadow-lg"
                            >
                                <option value="all">Todos Fluxos</option>
                                <option value="entry">Entradas (+)</option>
                                <option value="exit">Saídas (-)</option>
                            </select>

                            <button
                                onClick={exportToCSV}
                                className="bg-background-dark border border-border-dark text-text-primary-dark px-4 py-2.5 rounded-xl font-extrabold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-white/5 transition-all shadow-lg"
                            >
                                <span className="material-symbols-outlined text-sm">download</span>
                                Exportar CSV
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* CONTENT */}
            <div className="rounded-2xl border border-border-dark bg-surface-dark overflow-hidden min-h-[500px] shadow-2xl">
                {activeTab === 'stock' ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-background-dark/80 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Produto</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Categoria</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Qtd Atual</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Min</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Status</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest text-right">Ações Rápidas</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark/30">
                                {filteredProducts.map((product) => {
                                    // Status Logic: 
                                    // Red: <= min
                                    // Yellow: <= min * 1.2
                                    // Green: healthy
                                    const isLow = product.stock <= product.minStock;
                                    const isNear = product.stock <= product.minStock * 1.2 && !isLow;

                                    const statusClass = isLow
                                        ? 'bg-red-500/10 text-red-500 border-red-500/30'
                                        : isNear
                                            ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                                            : 'bg-green-500/10 text-green-500 border-green-500/30';

                                    const statusText = isLow ? 'Crítico' : isNear ? 'Próximo ao Limite' : 'Saudável';

                                    return (
                                        <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-xl bg-background-dark flex items-center justify-center overflow-hidden border border-border-dark shrink-0 shadow-inner">
                                                        {product.imageUrl ? (
                                                            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-text-secondary-dark opacity-30">inventory_2</span>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-extrabold text-text-primary-dark leading-tight">{product.name}</p>
                                                        <p className="text-[10px] text-text-secondary-dark font-mono mt-1 opacity-60">ID: {product.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="bg-input-dark border border-border-dark text-[10px] font-extrabold text-text-secondary-dark px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                                    {product.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="relative group/qty w-24">
                                                    <input
                                                        type="number"
                                                        value={product.stock}
                                                        onChange={(e) => handleExactQuantityChange(product, Number(e.target.value))}
                                                        className="w-full bg-input-dark border border-border-dark rounded-xl py-2 px-3 text-center font-extrabold text-lg text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all shadow-inner hover:bg-background-dark"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-xs font-bold text-text-secondary-dark">{product.minStock} <span className="text-[8px] opacity-40">un.</span></td>
                                            <td className="px-6 py-4">
                                                <div className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${statusClass} inline-flex items-center gap-1.5 uppercase tracking-widest`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${isLow ? 'bg-red-500' : isNear ? 'bg-yellow-500' : 'bg-green-500'} animate-pulse`}></span>
                                                    {statusText}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleQuickAction(product, 'exit')}
                                                        className="h-10 w-10 rounded-xl bg-input-dark border border-border-dark text-text-secondary-dark hover:text-red-500 hover:border-red-500/50 flex items-center justify-center transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
                                                        title="Saída Rápida (-1)"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">remove</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickAction(product, 'entry')}
                                                        className="h-10 w-10 rounded-xl bg-input-dark border border-border-dark text-text-secondary-dark hover:text-green-500 hover:border-green-500/50 flex items-center justify-center transition-all shadow-lg hover:-translate-y-0.5 active:scale-95"
                                                        title="Entrada Rápida (+1)"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">add</span>
                                                    </button>
                                                    <div className="w-px h-8 bg-border-dark mx-2 opacity-30"></div>
                                                    <button
                                                        onClick={() => openAssessmentModal(product)}
                                                        className="h-10 px-3 rounded-xl bg-background-dark border border-border-dark text-text-secondary-dark hover:text-primary hover:border-primary/50 flex items-center justify-center gap-2 transition-all shadow-lg text-[10px] font-extrabold uppercase tracking-widest"
                                                        title="Ajuste de Inventário"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">tune</span>
                                                        Ajustar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredProducts.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-background-dark/30">
                                <span className="material-symbols-outlined text-text-secondary-dark text-6xl mb-4 opacity-20">inventory</span>
                                <p className="text-text-secondary-dark font-bold uppercase tracking-widest text-sm">Nenhum produto em estoque com estes filtros.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-background-dark/80 backdrop-blur-md">
                                <tr>
                                    <th className="w-10"></th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Informação</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest text-center">Tipo / Qtd</th>
                                    <th className="px-6 py-5 text-[10px] font-extrabold uppercase text-text-secondary-dark tracking-widest">Contexto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark/30">
                                {groupedMovements.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="h-20 w-20 bg-background-dark rounded-full flex items-center justify-center border border-border-dark opacity-20">
                                                    <span className="material-symbols-outlined text-4xl">history</span>
                                                </div>
                                                <p className="text-text-secondary-dark font-extrabold uppercase tracking-widest text-sm">Sem histórico no período.</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    groupedMovements.map((movement) => {
                                        const prod = tenantProducts.find(p => p.id === movement.productId);
                                        const isExpanded = expandedGroups[movement.id];

                                        return (
                                            <React.Fragment key={movement.id}>
                                                <tr
                                                    className={`transition-colors group ${movement.isGrouped ? 'cursor-pointer hover:bg-primary/5 bg-primary/[0.02]' : 'hover:bg-white/5'}`}
                                                    onClick={() => movement.isGrouped && toggleGroup(movement.id)}
                                                >
                                                    <td className="p-4 text-center">
                                                        {movement.isGrouped && (
                                                            <span className="material-symbols-outlined text-text-secondary-dark text-sm transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(90deg)' : 'none' }}>
                                                                chevron_right
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-extrabold text-text-primary-dark">{prod?.name || 'Produto Removido'}</span>
                                                                {movement.isGrouped && (
                                                                    <span className="text-[8px] bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-tighter">
                                                                        {movement.itemsCount} registros agrupados
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-mono text-text-secondary-dark uppercase tracking-widest mt-1">
                                                                {new Date(movement.date).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-widest mb-1 shadow-sm ${movement.type === 'entry' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                                {movement.type === 'entry' ? 'Entrada (+)' : 'Saída (-)'}
                                                            </span>
                                                            <span className={`text-lg font-extrabold font-mono ${movement.type === 'entry' ? 'text-green-500' : 'text-red-500'}`}>
                                                                {movement.type === 'entry' ? '+' : '-'}{movement.quantity}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col max-w-[300px]">
                                                            <span className="text-xs font-bold text-text-primary-dark">{movement.reason}</span>
                                                            <span className="text-[10px] text-text-secondary-dark italic truncate mt-1 opacity-70" title={movement.observations || ''}>
                                                                {movement.observations || 'Nenhuma observação'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {movement.isGrouped && isExpanded && (
                                                    <tr className="bg-background-dark/50">
                                                        <td colSpan={4} className="p-0">
                                                            <div className="p-4 border-l-4 border-primary/30 ml-8 my-2 space-y-2 animate-fade-in">
                                                                <p className="text-[8px] font-extrabold text-text-secondary-dark uppercase tracking-widest mb-2 border-b border-border-dark/30 pb-1">Detalhamento do Agrupamento (Mesmo Minuto)</p>
                                                                {movement.details?.map(item => (
                                                                    <div key={item.id} className="grid grid-cols-4 text-[10px] text-text-secondary-dark py-1 border-b border-border-dark/10 last:border-0 hover:bg-white/5 transition-colors px-2 rounded">
                                                                        <span className="font-mono">{new Date(item.date).toLocaleTimeString('pt-BR')}</span>
                                                                        <span className="font-bold flex items-center gap-1">
                                                                            <span className={`h-1.5 w-1.5 rounded-full ${item.type === 'entry' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                                            {item.type === 'entry' ? '+' : '-'}{item.quantity} un.
                                                                        </span>
                                                                        <span className="truncate opacity-80">{item.reason}</span>
                                                                        <span className="italic truncate opacity-50">{item.observations}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
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

// --- SUBCOMPONENTS ---

const MovementModal = ({ isOpen, onClose, products, onSubmit }: { isOpen: boolean, onClose: () => void, products: Product[], onSubmit: any }) => {
    const { addTransaction } = useData();

    if (!isOpen) return null;

    const [productId, setProductId] = useState('');
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
            const totalCost = (selectedProduct.costPrice || 0) * quantity;
            if (totalCost > 0) {
                await addTransaction({
                    type: 'expense',
                    category: 'product',
                    amount: totalCost,
                    description: `Entrada de Estoque: ${selectedProduct.name} (${quantity} un.)`,
                    paymentMethod: 'cash',
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
        setProductId('');
        setQuantity(1);
        setObservation('');
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark w-full max-w-md rounded-2xl border border-border-dark shadow-2xl p-8 animate-fade-in">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 bg-green-500/10 rounded-xl flex items-center justify-center border border-green-500/20 text-green-500">
                        <span className="material-symbols-outlined">add_business</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-text-primary-dark uppercase tracking-wider leading-tight">Nova Entrada</h2>
                        <p className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest opacity-60">Abastecimento de produtos</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Produto para Entrada</label>
                            <select
                                value={productId}
                                onChange={(e) => setProductId(e.target.value)}
                                className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-sm font-bold text-text-primary-dark focus:border-primary focus:outline-none transition-all"
                                required
                            >
                                <option value="" className="bg-background-dark">Selecione o item...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id} className="bg-background-dark">{p.name} (Custo: R$ {p.costPrice?.toFixed(2) || '0.00'})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Quantidade</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-xl font-mono font-extrabold text-text-primary-dark focus:border-primary focus:outline-none transition-all shadow-inner"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Motivo</label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-xs font-bold text-text-primary-dark focus:border-primary focus:outline-none transition-all"
                                >
                                    <option value="Compra" className="bg-background-dark">Compra de Reposição</option>
                                    <option value="Devolução" className="bg-background-dark">Devolução de Cliente</option>
                                    <option value="Ajuste" className="bg-background-dark">Ajuste de Saldo (+)</option>
                                    <option value="Outro" className="bg-background-dark">Outro Motivo</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Anotação Técnica</label>
                            <textarea
                                value={observation}
                                onChange={(e) => setObservation(e.target.value)}
                                className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-sm text-text-primary-dark rounded-lg focus:border-primary focus:outline-none resize-none h-24 shadow-inner"
                                placeholder="Notas sobre a procedência ou validade..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-4 mt-2">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-4 rounded-xl border border-border-dark text-text-secondary-dark hover:text-white font-extrabold uppercase text-[10px] tracking-widest transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 px-4 py-4 rounded-xl bg-primary text-background-dark font-extrabold uppercase text-[10px] tracking-widest shadow-glow-primary hover:opacity-90 transition-all">Salvar Entrada</button>
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
            observations: `Ajuste manual (Inventário). Anterior: ${product.stock}, Novo: ${newStock}`
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark w-full max-w-sm rounded-2xl border border-border-dark shadow-2xl p-8 animate-fade-in">
                <div className="flex flex-col gap-1 mb-6">
                    <h2 className="text-xl font-extrabold text-text-primary-dark uppercase tracking-wider">Ajuste de Inventário</h2>
                    <p className="text-[10px] font-extrabold text-primary uppercase tracking-widest opacity-80">{product.name}</p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="opacity-50">
                            <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Qtd Atual</label>
                            <input
                                type="number"
                                value={product.stock}
                                disabled
                                className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-xl font-mono font-extrabold text-text-secondary-dark outline-none cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Nova Qtd</label>
                            <input
                                type="number"
                                min="0"
                                value={newStock}
                                onChange={(e) => setNewStock(Number(e.target.value))}
                                className="w-full bg-background-dark border-primary border-2 rounded-xl p-4 text-xl font-mono font-extrabold text-text-primary-dark focus:outline-none shadow-glow-primary/20"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Justificativa</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-sm font-bold text-text-primary-dark focus:border-primary outline-none"
                            required
                        >
                            <option value="Inventário">Contagem de Estoque</option>
                            <option value="Correção">Correção de Erro Sistêmico</option>
                            <option value="Avaria não registrada">Avaria Detectada</option>
                            <option value="Perda">Extravaio / Roubo</option>
                        </select>
                    </div>

                    <div className="flex flex-col gap-3 mt-4">
                        <button type="submit" className="w-full py-4 bg-primary text-background-dark font-black uppercase text-[10px] tracking-widest rounded-xl shadow-glow-primary hover:opacity-90 transition-all">Confirmar Novo Saldo</button>
                        <button type="button" onClick={onClose} className="w-full py-2 text-text-secondary-dark hover:text-white font-black uppercase text-[8px] tracking-[0.2em] transition-all">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Inventory;
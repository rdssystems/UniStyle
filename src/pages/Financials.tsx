import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';
import { Transaction } from '../types';
import NewSaleModal from '../components/NewSaleModal';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<Transaction, 'id' | 'tenantId'>) => Promise<void>;
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave }) => {
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [category, setCategory] = useState<string>('operational');
    const [amount, setAmount] = useState<string>('');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await onSave({
                type,
                category: category as any,
                amount: parseFloat(amount),
                description,
                paymentMethod: paymentMethod as any,
                date: new Date(date).toISOString(),
                relatedEntityType: 'manual'
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark rounded-xl w-full max-w-md border border-border-dark p-6 animate-fade-in text-text-primary-dark">
                <h2 className="text-xl font-extrabold mb-4 uppercase tracking-wider">Nova Movimentação</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-3 rounded-lg font-extrabold uppercase text-xs transition-all ${type === 'income' ? 'bg-green-500 text-background-dark shadow-glow-primary' : 'bg-input-dark text-text-secondary-dark hover:bg-white/5'}`}
                        >
                            Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-3 rounded-lg font-extrabold uppercase text-xs transition-all ${type === 'expense' ? 'bg-red-500 text-background-dark shadow-glow-primary' : 'bg-input-dark text-text-secondary-dark hover:bg-white/5'}`}
                        >
                            Saída
                        </button>
                    </div>

                    <div>
                        <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-1 tracking-widest">Valor</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-dark font-mono">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="w-full bg-input-dark border border-border-dark rounded-lg p-3 pl-10 text-white font-mono text-xl focus:border-primary outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-1 tracking-widest">Descrição</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded-lg p-3 text-white focus:border-primary outline-none"
                            placeholder="Ex: Compra de toalhas"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-1 tracking-widest">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-input-dark border border-border-dark rounded-lg p-3 text-white focus:border-primary outline-none"
                            >
                                <option value="operational" className="bg-surface-dark">Operacional</option>
                                <option value="salary" className="bg-surface-dark">Salário</option>
                                <option value="commission" className="bg-surface-dark">Comissão</option>
                                <option value="product" className="bg-surface-dark">Produto</option>
                                <option value="service" className="bg-surface-dark">Serviço</option>
                                <option value="other" className="bg-surface-dark">Outros</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-1 tracking-widest">Pagamento</label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full bg-input-dark border border-border-dark rounded-lg p-3 text-white focus:border-primary outline-none"
                            >
                                <option value="cash" className="bg-surface-dark">Dinheiro</option>
                                <option value="card" className="bg-surface-dark">Cartão</option>
                                <option value="pix" className="bg-surface-dark">PIX</option>
                                <option value="other" className="bg-surface-dark">Outro</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-1 tracking-widest">Data</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded-lg p-3 text-white focus:border-primary outline-none"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-text-secondary-dark font-bold hover:text-white transition-colors">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-8 py-3 bg-primary text-background-dark font-extrabold uppercase rounded-lg shadow-glow-primary hover:opacity-90 disabled:opacity-50 transition-all">
                            {isLoading ? 'Salvando...' : 'Salvar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

const Financials = () => {
    const { transactions, addTransaction, isLoadingData, products } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    // Date Filter State
    const [dateRange, setDateRange] = useState<'today' | 'month' | 'custom'>('today');
    const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

    const filteredTransactions = useMemo(() => {
        let filtered = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (filterType !== 'all') {
            filtered = filtered.filter(t => t.type === filterType);
        }

        const now = new Date();
        if (dateRange === 'today') {
            filtered = filtered.filter(t => new Date(t.date).toDateString() === now.toDateString());
        } else if (dateRange === 'month') {
            filtered = filtered.filter(t => new Date(t.date).getMonth() === now.getMonth() && new Date(t.date).getFullYear() === now.getFullYear());
        } else if (dateRange === 'custom') {
            const start = new Date(customStartDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(customEndDate);
            end.setHours(23, 59, 59, 999);

            filtered = filtered.filter(t => {
                const tDate = new Date(t.date);
                return tDate >= start && tDate <= end;
            });
        }

        return filtered;
    }, [transactions, filterType, dateRange, customStartDate, customEndDate]);

    const totals = useMemo(() => {
        return filteredTransactions.reduce((acc, curr) => {
            if (curr.type === 'income') {
                acc.income += curr.amount;
                acc.balance += curr.amount;
            } else {
                acc.expense += curr.amount;
                acc.balance -= curr.amount;
            }
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    }, [filteredTransactions]);

    if (isLoadingData) return <div className="text-white p-8">Carregando financeiro...</div>;

    const periodLabel = dateRange === 'today' ? 'Hoje' : dateRange === 'month' ? 'Este Mês' : 'Período Personalizado';

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-text-primary-dark text-4xl font-extrabold">Caixa</h1>
                    <p className="text-text-secondary-dark font-medium flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        Resumo do Caixa — <span className="text-primary font-bold">{periodLabel}</span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 bg-surface-dark border border-border-dark rounded-xl p-1 shadow-lg">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="bg-transparent text-text-primary-dark outline-none font-bold px-3 py-1.5 text-sm"
                        >
                            <option value="today" className="bg-surface-dark">Hoje</option>
                            <option value="month" className="bg-surface-dark">Este Mês</option>
                            <option value="custom" className="bg-surface-dark">Período</option>
                        </select>

                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 animate-fade-in border-l border-border-dark pl-2 pr-1">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="bg-input-dark border border-border-dark rounded p-1 text-xs text-text-primary-dark outline-none focus:border-primary"
                                />
                                <span className="text-text-secondary-dark text-xs font-extrabold">-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="bg-input-dark border border-border-dark rounded p-1 text-xs text-text-primary-dark outline-none focus:border-primary"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsAdjustmentModalOpen(true)}
                        className="bg-surface-dark border border-border-dark text-text-primary-dark h-11 px-4 rounded-xl font-bold hover:bg-white/5 transition-all text-xs flex items-center gap-2 shadow-lg"
                        title="Ajustar saldo conferido"
                    >
                        <span className="material-symbols-outlined text-lg">price_change</span>
                        Atualizar Caixa
                    </button>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-surface-dark border border-border-dark text-text-primary-dark h-11 px-4 rounded-xl font-bold hover:bg-white/5 transition-all text-xs flex items-center gap-2 shadow-lg"
                    >
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        Nova Movimentação
                    </button>

                    <button
                        onClick={() => setIsNewSaleModalOpen(true)}
                        className="bg-primary text-background-dark h-11 px-6 rounded-xl font-extrabold uppercase text-xs shadow-glow-primary hover:opacity-90 transition-all flex items-center gap-2"
                        title="Venda avulsa de produtos"
                    >
                        <span className="material-symbols-outlined text-lg">shopping_cart</span>
                        Registrar Venda
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex flex-col justify-between shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-green-500">trending_up</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest mb-2">Entradas</span>
                    <span className="text-4xl font-extrabold text-green-500 font-mono">R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-surface-dark p-6 rounded-2xl border border-border-dark flex flex-col justify-between shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-red-500">trending_down</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest mb-2">Saídas</span>
                    <span className="text-4xl font-extrabold text-red-500 font-mono">R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className={`bg-surface-dark p-6 rounded-2xl border ${totals.balance >= 0 ? 'border-primary/20 shadow-glow-primary/10' : 'border-red-500/20'} border-border-dark flex flex-col justify-between shadow-xl relative overflow-hidden group border-opacity-50`}>
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <span className="material-symbols-outlined text-7xl text-primary">account_balance_wallet</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest mb-2">Saldo do Período</span>
                    <span className={`text-4xl font-extrabold font-mono ${totals.balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                        R$ {totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 bg-surface-dark rounded-2xl border border-border-dark overflow-hidden flex flex-col shadow-2xl">
                <div className="p-5 border-b border-border-dark flex flex-wrap justify-between items-center bg-background-dark/50 gap-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-text-primary-dark uppercase tracking-widest text-sm">Histórico de Movimentações</h3>
                        <span className="text-[10px] bg-input-dark text-text-secondary-dark px-2 py-0.5 rounded-full font-bold">{filteredTransactions.length} registros</span>
                    </div>
                    <div className="flex bg-background-dark p-1 rounded-xl border border-border-dark">
                        {[
                            { id: 'all', label: 'Todos', color: 'primary' },
                            { id: 'income', label: 'Entradas', color: 'green-500' },
                            { id: 'expense', label: 'Saídas', color: 'red-500' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setFilterType(tab.id as any)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-widest transition-all ${filterType === tab.id ? 'bg-primary text-background-dark shadow-glow-primary' : 'text-text-secondary-dark hover:text-white'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-surface-dark shadow-sm z-10 border-b border-border-dark">
                            <tr>
                                <th className="p-5 text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest">Informação</th>
                                <th className="p-5 text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest">Categoria / Método</th>
                                <th className="p-5 text-right text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-dark/30">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-20 text-center flex flex-col items-center justify-center gap-4">
                                        <div className="h-16 w-16 bg-input-dark rounded-full flex items-center justify-center border border-border-dark">
                                            <span className="material-symbols-outlined text-text-secondary-dark text-3xl">inbox</span>
                                        </div>
                                        <div>
                                            <p className="text-text-secondary-dark text-sm font-bold uppercase tracking-widest mb-1">Caixa Vazio</p>
                                            <p className="text-xs text-text-secondary-dark italic">Nenhuma movimentação registrada no período selecionado.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t, idx) => (
                                    <tr key={t.id} className={`hover:bg-white/5 transition-colors group ${idx === 0 ? 'bg-primary/5' : ''}`}>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className={`material-symbols-outlined text-base ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {t.type === 'income' ? 'arrow_upward' : 'arrow_downward'}
                                                    </span>
                                                    <span className="text-sm font-bold text-text-primary-dark leading-none">{t.description}</span>
                                                </div>
                                                <span className="text-[10px] text-text-secondary-dark font-mono uppercase tracking-widest ml-6">
                                                    {new Date(t.date).toLocaleString('pt-BR')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-4">
                                                    <span className="bg-input-dark border border-border-dark text-[10px] font-extrabold text-text-secondary-dark px-2 py-0.5 rounded uppercase tracking-tighter">
                                                        {t.category === 'commission' ? 'Comissão' : t.category === 'service' ? 'Serviço' : t.category}
                                                    </span>
                                                    <span className="text-[10px] text-text-secondary-dark uppercase font-extrabold tracking-widest opacity-60">
                                                        {t.paymentMethod === 'cash' ? 'Dinheiro' : t.paymentMethod}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-lg font-extrabold font-mono leading-none ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                {idx === 0 && (
                                                    <span className="text-[8px] font-extrabold text-primary uppercase bg-primary/10 px-1 rounded mt-1">Recente</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={addTransaction as any}
            />

            <NewSaleModal
                isOpen={isNewSaleModalOpen}
                onClose={() => setIsNewSaleModalOpen(false)}
                products={products}
            />

            <BalanceAdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                currentBalance={totals.balance}
                onSave={async (adjustment) => {
                    await addTransaction(adjustment);
                    setIsAdjustmentModalOpen(false);
                }}
            />
        </div>
    );
};

interface BalanceAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentBalance: number;
    onSave: (transaction: Omit<Transaction, 'id' | 'tenantId'>) => Promise<void>;
}

const BalanceAdjustmentModal: React.FC<BalanceAdjustmentModalProps> = ({ isOpen, onClose, currentBalance, onSave }) => {
    const [realBalance, setRealBalance] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRealBalance('');
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const diff = realBalance ? parseFloat(realBalance) - currentBalance : 0;
    const isPositive = diff >= 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!realBalance) return;

        setIsLoading(true);
        try {
            const amount = Math.abs(diff);
            if (amount === 0) {
                onClose();
                return;
            }

            await onSave({
                type: isPositive ? 'income' : 'expense',
                category: 'operational',
                amount: amount,
                description: `Ajuste de Caixa (Anterior: R$ ${currentBalance.toFixed(2)} | Real: R$ ${parseFloat(realBalance).toFixed(2)})`,
                paymentMethod: 'cash',
                date: new Date().toISOString(),
                relatedEntityType: 'manual'
            });
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-surface-dark rounded-2xl w-full max-w-sm border border-border-dark p-8 animate-fade-in text-text-primary-dark shadow-2xl">
                <h2 className="text-xl font-extrabold uppercase tracking-wider mb-6">Conferência de Caixa</h2>

                <div className="bg-background-dark p-5 rounded-xl border border-border-dark mb-6">
                    <span className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest block mb-1">Saldo em Sistema</span>
                    <span className={`text-2xl font-extrabold font-mono ${currentBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>R$ {currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-extrabold text-text-secondary-dark uppercase mb-2 tracking-widest">Valor Real (Físico)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-dark font-mono font-bold">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={realBalance}
                                onChange={e => setRealBalance(e.target.value)}
                                className="w-full bg-input-dark border border-border-dark rounded-xl p-4 pl-12 text-white font-mono font-extrabold text-2xl focus:border-primary outline-none"
                                placeholder="0.00"
                                autoFocus
                            />
                        </div>
                    </div>

                    {realBalance && (
                        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${isPositive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                            <span className="material-symbols-outlined">{isPositive ? 'add_circle' : 'remove_circle'}</span>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest">{isPositive ? 'Entrada' : 'Saída'} de Ajuste</span>
                                <span className="text-sm font-extrabold font-mono">R$ {Math.abs(diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-2 mt-8">
                        <button type="submit" disabled={isLoading} className="w-full py-4 bg-primary text-background-dark font-extrabold uppercase rounded-xl shadow-glow-primary hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                            {isLoading ? 'Sincronizando...' : 'Confirmar Ajuste'}
                        </button>
                        <button type="button" onClick={onClose} className="w-full py-2 text-text-secondary-dark font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Cancelar</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Financials;

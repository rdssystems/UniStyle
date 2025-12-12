import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext'; // If needed for role check
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
                <h2 className="text-xl font-bold mb-4">Nova Movimentação</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setType('income')}
                            className={`flex-1 py-2 rounded-lg font-bold ${type === 'income' ? 'bg-green-500/20 text-green-500 border border-green-500' : 'bg-input-dark text-text-secondary-dark'}`}
                        >
                            Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('expense')}
                            className={`flex-1 py-2 rounded-lg font-bold ${type === 'expense' ? 'bg-red-500/20 text-red-500 border border-red-500' : 'bg-input-dark text-text-secondary-dark'}`}
                        >
                            Saída
                        </button>
                    </div>

                    <div>
                        <label className="block text-xs text-text-secondary-dark mb-1">Valor</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded-lg p-2 text-white"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-text-secondary-dark mb-1">Descrição</label>
                        <input
                            type="text"
                            required
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded-lg p-2 text-white"
                            placeholder="Ex: Compra de toalhas"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-text-secondary-dark mb-1">Categoria</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-input-dark border border-border-dark rounded-lg p-2 text-white"
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
                            <label className="block text-xs text-text-secondary-dark mb-1">Pagamento</label>
                            <select
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                                className="w-full bg-input-dark border border-border-dark rounded-lg p-2 text-white"
                            >
                                <option value="cash" className="bg-surface-dark">Dinheiro</option>
                                <option value="card" className="bg-surface-dark">Cartão</option>
                                <option value="pix" className="bg-surface-dark">PIX</option>
                                <option value="other" className="bg-surface-dark">Outro</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-text-secondary-dark mb-1">Data</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded-lg p-2 text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary-dark hover:text-white">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
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
    const [dateRange, setDateRange] = useState<'today' | 'month' | 'custom'>('today'); // Default: Today
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
                acc.balance -= curr.amount; // Simple balance logic
            }
            return acc;
        }, { income: 0, expense: 0, balance: 0 });
    }, [filteredTransactions]);

    if (isLoadingData) return <div className="text-white p-8">Carregando financeiro...</div>;

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <header className="flex justify-between items-center">
                <h1 className="text-text-primary-dark text-4xl font-black">Caixa</h1>
                <div className="flex gap-4 items-center">
                    <button
                        onClick={() => setIsNewSaleModalOpen(true)}
                        className="bg-surface-dark border border-border-dark text-text-primary-dark px-4 py-2 rounded-lg font-bold hover:bg-white/5 flex items-center gap-2"
                        title="Venda avulsa de produtos"
                    >
                        <span className="material-symbols-outlined">shopping_cart</span>
                        Registrar Venda
                    </button>
                    <button
                        onClick={() => setIsAdjustmentModalOpen(true)}
                        className="bg-surface-dark border border-border-dark text-text-primary-dark px-4 py-2 rounded-lg font-bold hover:bg-white/5 flex items-center gap-2"
                        title="Ajustar saldo conferido"
                    >
                        <span className="material-symbols-outlined">price_change</span>
                        Atualizar Caixa
                    </button>

                    <div className="flex items-center gap-2 bg-surface-dark border border-border-dark rounded-lg p-1">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="bg-transparent text-text-primary-dark outline-none font-bold px-2 py-1"
                        >
                            <option value="today" className="bg-surface-dark">Hoje</option>
                            <option value="month" className="bg-surface-dark">Este Mês</option>
                            <option value="custom" className="bg-surface-dark">Período</option>
                        </select>

                        {dateRange === 'custom' && (
                            <div className="flex items-center gap-2 animate-fade-in border-l border-border-dark pl-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="bg-input-dark border border-border-dark rounded p-1 text-xs text-text-primary-dark"
                                />
                                <span className="text-text-secondary-dark">-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="bg-input-dark border border-border-dark rounded p-1 text-xs text-text-primary-dark"
                                />
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Nova Movimentação
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface-dark p-6 rounded-xl border border-border-dark flex flex-col justify-between">
                    <span className="text-text-secondary-dark font-medium">Entradas</span>
                    <span className="text-3xl font-black text-green-500">R$ {totals.income.toFixed(2)}</span>
                </div>
                <div className="bg-surface-dark p-6 rounded-xl border border-border-dark flex flex-col justify-between">
                    <span className="text-text-secondary-dark font-medium">Saídas</span>
                    <span className="text-3xl font-black text-red-500">R$ {totals.expense.toFixed(2)}</span>
                </div>
                <div className="bg-surface-dark p-6 rounded-xl border border-border-dark flex flex-col justify-between">
                    <span className="text-text-secondary-dark font-medium">Saldo (Período)</span>
                    <span className={`text-3xl font-black ${totals.balance >= 0 ? 'text-primary' : 'text-red-500'}`}>
                        R$ {totals.balance.toFixed(2)}
                    </span>
                </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 bg-surface-dark rounded-xl border border-border-dark overflow-hidden flex flex-col">
                <div className="p-4 border-b border-border-dark flex justify-between items-center bg-background-dark/50">
                    <h3 className="font-bold text-text-primary-dark">Histórico de Movimentações</h3>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1 rounded text-xs font-bold ${filterType === 'all' ? 'bg-primary text-black' : 'bg-input-dark text-text-secondary-dark'}`}
                        >
                            Todos
                        </button>
                        <button
                            onClick={() => setFilterType('income')}
                            className={`px-3 py-1 rounded text-xs font-bold ${filterType === 'income' ? 'bg-green-500/20 text-green-500' : 'bg-input-dark text-text-secondary-dark'}`}
                        >
                            Entradas
                        </button>
                        <button
                            onClick={() => setFilterType('expense')}
                            className={`px-3 py-1 rounded text-xs font-bold ${filterType === 'expense' ? 'bg-red-500/20 text-red-500' : 'bg-input-dark text-text-secondary-dark'}`}
                        >
                            Saídas
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-surface-dark shadow-sm z-10">
                            <tr>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase tracking-wider">Data</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase tracking-wider">Descrição</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase tracking-wider">Categoria</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase tracking-wider">Método</th>
                                <th className="p-4 text-right text-xs font-bold text-text-secondary-dark uppercase tracking-wider">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-dark">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-text-secondary-dark">Nenhuma movimentação encontrada.</td>
                                </tr>
                            ) : (
                                filteredTransactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-sm text-text-secondary-dark">
                                            {new Date(t.date).toLocaleString('pt-BR')}
                                        </td>
                                        <td className="p-4 text-text-primary-dark font-medium cursor-help" title={t.relatedEntityType ? `Origem: ${t.relatedEntityType}` : 'Manual'}>
                                            {t.description}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 bg-input-dark rounded text-xs text-text-secondary-dark capitalize">
                                                {t.category === 'commission' ? 'Comissão' : t.category === 'service' ? 'Serviço' : t.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-text-secondary-dark capitalize">
                                            {t.paymentMethod === 'cash' ? 'Dinheiro' : t.paymentMethod}
                                        </td>
                                        <td className={`p-4 text-right font-bold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                                            {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
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

    // Reset state when modal opens
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
                category: 'operational', // Could be 'adjustment' if enum allowed
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
            <div className="bg-surface-dark rounded-xl w-full max-w-sm border border-border-dark p-6 animate-fade-in text-text-primary-dark">
                <h2 className="text-xl font-bold mb-4">Atualizar Caixa</h2>
                <div className="bg-background-dark p-4 rounded-lg border border-border-dark mb-4">
                    <span className="text-sm text-text-secondary-dark block">Saldo Atual (Sistema)</span>
                    <span className={`text-xl font-bold ${currentBalance >= 0 ? 'text-primary' : 'text-red-500'}`}>R$ {currentBalance.toFixed(2)}</span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-text-secondary-dark mb-1">Valor Real em Caixa</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={realBalance}
                            onChange={e => setRealBalance(e.target.value)}
                            className="w-full bg-input-dark border border-border-dark rounded-lg p-2 text-white font-bold"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    {realBalance && (
                        <div className={`text-sm p-2 rounded ${isPositive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            Ajuste de: {isPositive ? '+' : '-'} R$ {Math.abs(diff).toFixed(2)}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-text-secondary-dark hover:text-white">Cancelar</button>
                        <button type="submit" disabled={isLoading} className="px-6 py-2 bg-primary text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-50">
                            {isLoading ? 'Salvando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Financials;

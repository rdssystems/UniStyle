import React, { useState } from 'react';
import { Client } from '../types';
import { useData } from '../contexts/DataContext';

interface BalanceAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client;
    type: 'credit' | 'debit';
}

const BalanceAdjustmentModal: React.FC<BalanceAdjustmentModalProps> = ({ isOpen, onClose, client, type }) => {
    const { updateClient, addTransaction } = useData();
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const value = parseFloat(amount);
        if (isNaN(value) || value <= 0) return;

        setIsLoading(true);
        try {
            // 1. Update Client Balance
            const newBalance = (client.balance || 0) + (type === 'credit' ? value : -value);
            await updateClient({ ...client, balance: newBalance });

            // 2. Register Transaction
            await addTransaction({
                type: type === 'credit' ? 'income' : 'expense',
                category: 'other', // Or specific category if available
                amount: value,
                description: type === 'credit'
                    ? `Crédito adicionado ao cliente ${client.name}`
                    : `Débito registrado para o cliente ${client.name}`,
                paymentMethod: paymentMethod as any,
                date: new Date().toISOString(),
                relatedEntityId: client.id,
                relatedEntityType: 'manual'
            });

            onClose();
        } catch (error) {
            console.error("Error adjusting balance:", error);
            alert("Erro ao ajustar saldo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-xl bg-surface-dark p-6 border border-border-dark shadow-glow-primary">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-primary-dark">
                        {type === 'credit' ? 'Adicionar Crédito' : 'Registrar Débito'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-text-secondary-dark">Cliente:</p>
                    <p className="text-lg font-bold text-text-primary-dark">{client.name}</p>
                    <p className="text-sm text-text-secondary-dark mt-1">Saldo Atual: <span className={(client.balance || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>R$ {(client.balance || 0).toFixed(2)}</span></p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Valor</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            min="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    {type === 'credit' && (
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-text-secondary-dark">Forma de Pagamento</label>
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            >
                                <option value="cash" className="bg-background-dark">Dinheiro</option>
                                <option value="card" className="bg-background-dark">Cartão</option>
                                <option value="pix" className="bg-background-dark">Pix</option>
                                <option value="other" className="bg-background-dark">Outro</option>
                            </select>
                        </div>
                    )}

                    <div className="mt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-border-dark bg-transparent py-3 font-bold text-text-primary-dark hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`flex-1 rounded-lg py-3 font-bold text-background-dark hover:opacity-90 transition-opacity ${type === 'credit' ? 'bg-green-500' : 'bg-red-500'}`}
                        >
                            {isLoading ? 'Salvando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default BalanceAdjustmentModal;

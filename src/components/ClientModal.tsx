import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface ClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (client: Omit<Client, 'id' | 'tenantId' | 'points' | 'status'>) => void;
    clientToEdit?: Client;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, clientToEdit }) => {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [cpf, setCpf] = useState(''); // Estado para CPF
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isMensalista, setIsMensalista] = useState(false);
    const [mensalistaValor, setMensalistaValor] = useState('');
    const [mensalistaFormaPagamento, setMensalistaFormaPagamento] = useState('cash');

    // Helper para máscara de CPF
    const handleCpfChange = (value: string) => {
        const numeric = value.replace(/\D/g, '');
        const masked = numeric
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
        setCpf(masked);
    };

    useEffect(() => {
        if (clientToEdit) {
            setName(clientToEdit.name);
            setPhone(clientToEdit.phone);
            setCpf(clientToEdit.cpf || ''); // Carregar CPF do cliente
            setAvatarUrl(clientToEdit.avatarUrl || '');
            setIsMensalista(clientToEdit.isMensalista || false);
            setMensalistaValor(clientToEdit.mensalistaValor?.toString() || '');
            setMensalistaFormaPagamento(clientToEdit.mensalistaFormaPagamento || 'cash');
        } else {
            setName('');
            setPhone('');
            setCpf('');
            setAvatarUrl('');
            setIsMensalista(false);
            setMensalistaValor('');
            setMensalistaFormaPagamento('cash');
        }
    }, [clientToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            phone,
            cpf: cpf.replace(/\D/g, ''), // Limpar máscara antes de salvar
            avatarUrl,
            isMensalista,
            mensalistaValor: isMensalista ? parseFloat(mensalistaValor) : undefined,
            mensalistaFormaPagamento: isMensalista ? mensalistaFormaPagamento as any : undefined
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl bg-surface-dark p-6 border border-border-dark shadow-glow-primary max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-primary-dark">
                        {clientToEdit ? 'Editar Cliente' : 'Novo Cliente'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: João Silva"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Telefone / WhatsApp</label>
                        <input
                            type="text"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: (11) 99999-9999"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">CPF (Opcional)</label>
                        <input
                            type="text"
                            value={cpf}
                            onChange={(e) => handleCpfChange(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="000.000.000-00"
                            maxLength={14}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">URL do Avatar (Opcional)</label>
                        <input
                            type="text"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="https://..."
                        />
                    </div>

                    {/* Mensalista Section */}
                    <div className="bg-background-dark p-4 rounded-lg border border-border-dark">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isMensalista}
                                onChange={(e) => setIsMensalista(e.target.checked)}
                                className="h-5 w-5 rounded border-border-dark bg-input-dark text-primary focus:ring-primary"
                            />
                            <span className="font-bold text-text-primary-dark">Habilitar Mensalista</span>
                        </label>

                        {isMensalista && (
                            <div className="mt-4 flex flex-col gap-4 animate-fade-in">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Valor da Mensalidade</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={mensalistaValor}
                                        onChange={(e) => setMensalistaValor(e.target.value)}
                                        className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Forma de Pagamento</label>
                                    <select
                                        value={mensalistaFormaPagamento}
                                        onChange={(e) => setMensalistaFormaPagamento(e.target.value)}
                                        className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                    >
                                        <option value="cash" className="bg-background-dark">Dinheiro</option>
                                        <option value="card" className="bg-background-dark">Cartão</option>
                                        <option value="pix" className="bg-background-dark">Pix</option>
                                        <option value="other" className="bg-background-dark">Outro</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

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
                            className="flex-1 rounded-lg bg-primary py-3 font-bold text-background-dark hover:opacity-90 transition-opacity"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ClientModal;

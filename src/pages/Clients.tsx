import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Client } from '../types';
import ClientModal from '../components/ClientModal';
import BalanceAdjustmentModal from '../components/BalanceAdjustmentModal';

const Clients = () => {
    const { tenant, user, isLoading: isLoadingTenant } = useTenant();
    const { clients, addClient, updateClient, deleteClient, isLoadingData, addTransaction } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState('');

    // Balance Modal State
    const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
    const [balanceClient, setBalanceClient] = useState<Client | null>(null);
    const [balanceType, setBalanceType] = useState<'credit' | 'debit'>('credit');

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Clientes...</div>;
    }

    const tenantClients = clients.filter(c => c.tenantId === tenant?.id);

    const handleSave = async (clientData: Omit<Client, 'id' | 'tenantId' | 'points' | 'status'>) => {
        if (!tenant) return;

        // Logic for Mensalista
        let shouldCreateTransaction = false;
        let transactionValue = 0;
        let transactionReason = "";
        const now = new Date();
        const expirationDate = new Date();
        expirationDate.setDate(now.getDate() + 30);

        // Prepare data with dates if necessary
        const finalClientData = { ...clientData };

        if (clientData.isMensalista) {
            // Check if it's a new activation or value change
            const isNewActivation = !clientToEdit || !clientToEdit.isMensalista;
            const isValueChange = clientToEdit && clientToEdit.isMensalista && clientToEdit.mensalistaValor !== clientData.mensalistaValor;

            if (isNewActivation || isValueChange) {
                shouldCreateTransaction = true;
                transactionValue = clientData.mensalistaValor || 0;
                transactionReason = isNewActivation
                    ? `Pagamento de mensalidade do cliente ${clientData.name}`
                    : `Pagamento de mensalidade (ajuste) do cliente ${clientData.name}`;

                // Set/Update dates
                finalClientData.mensalistaInicio = now.toISOString();
                finalClientData.mensalistaExpiraEm = expirationDate.toISOString();
            }
        }

        let savedClient: Client | null = null;

        if (clientToEdit) {
            savedClient = await updateClient({ ...clientToEdit, ...finalClientData });
        } else {
            const newClientData: Omit<Client, 'id' | 'tenantId'> = {
                ...finalClientData,
                status: 'Novo',
                points: 0,
                avatarUrl: clientData.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(clientData.name)}&background=random`
            };
            savedClient = await addClient(newClientData);
        }

        // Register Transaction if needed
        if (shouldCreateTransaction && savedClient && transactionValue > 0) {
            console.log("Creating Mensalista Transaction...", {
                value: transactionValue,
                client: savedClient.name
            });
            await addTransaction({
                type: 'income',
                category: 'other',
                amount: transactionValue,
                description: transactionReason,
                paymentMethod: clientData.mensalistaFormaPagamento || 'cash',
                date: new Date().toISOString(),
                relatedEntityId: savedClient.id,
                relatedEntityType: 'manual'
            });
        }

        setIsModalOpen(false);
        setClientToEdit(undefined);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
            await deleteClient(id);
        }
    };

    const openEditModal = (client: Client) => {
        setClientToEdit(client);
        setIsModalOpen(true);
    };

    const openNewModal = () => {
        setClientToEdit(undefined);
        setIsModalOpen(true);
    };

    const openBalanceModal = (client: Client, type: 'credit' | 'debit') => {
        setBalanceClient(client);
        setBalanceType(type);
        setIsBalanceModalOpen(true);
    };

    const filteredClients = tenantClients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
    );

    return (
        <div className="flex flex-col gap-6">
            <header className="flex justify-between items-center">
                <h1 className="text-text-primary-dark text-4xl font-black">Clientes</h1>
                {user?.role === 'admin' && (
                    <button
                        onClick={openNewModal}
                        className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
                    >
                        Cadastrar Cliente
                    </button>
                )}
            </header>

            <div className="bg-surface-dark p-4 rounded-lg border border-border-dark flex items-center gap-2">
                <span className="material-symbols-outlined text-text-secondary-dark">search</span>
                <input
                    type="text"
                    placeholder="Buscar cliente por nome ou telefone..."
                    className="bg-transparent border-none focus:ring-0 text-text-primary-dark w-full placeholder-text-secondary-dark"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid gap-4">
                {filteredClients.length === 0 ? (
                    <div className="text-center py-8 text-text-secondary-dark">
                        Nenhum cliente encontrado.
                    </div>
                ) : (
                    filteredClients.map((client) => (
                        <div key={client.id} className="flex items-center justify-between p-4 bg-card-dark rounded-lg border border-border-dark hover:border-primary transition-colors">
                            <div className="flex items-center gap-4">
                                <img src={client.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=random`} className="h-12 w-12 rounded-full object-cover" alt={client.name} />
                                <div>
                                    <p className="font-bold text-text-primary-dark">{client.name}</p>
                                    <p className="text-sm text-text-secondary-dark">{client.phone}</p>

                                    {/* Balance Display */}
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-xs font-bold text-text-secondary-dark uppercase">Saldo:</span>
                                        <span className={`text-sm font-bold ${(client.balance || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            R$ {(client.balance || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {/* Balance Actions */}
                                {/* Balance Actions - Visible on all screens, icon only on mobile */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openBalanceModal(client, 'credit')}
                                        className="px-2 sm:px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 text-xs font-bold hover:bg-green-500/20 transition-colors flex items-center gap-1"
                                        title="Adicionar Crédito"
                                    >
                                        <span className="material-symbols-outlined text-sm">add_circle</span>
                                        <span className="hidden sm:inline">Crédito</span>
                                    </button>
                                    <button
                                        onClick={() => openBalanceModal(client, 'debit')}
                                        className="px-2 sm:px-3 py-1.5 rounded-lg bg-red-500/10 text-red-500 text-xs font-bold hover:bg-red-500/20 transition-colors flex items-center gap-1"
                                        title="Registrar Débito"
                                    >
                                        <span className="material-symbols-outlined text-sm">remove_circle</span>
                                        <span className="hidden sm:inline">Débito</span>
                                    </button>
                                </div>

                                <div className="text-right">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${client.status === 'Ativo' ? 'bg-green-500/20 text-green-500' : client.status === 'Novo' ? 'bg-blue-500/20 text-blue-500' : 'bg-red-500/20 text-red-500'}`}>{client.status}</span>

                                        {client.isMensalista && client.mensalistaExpiraEm && (
                                            <div className="flex flex-col items-end">
                                                <span className="px-2 py-1 rounded text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                    Mensalista
                                                </span>
                                                <span className="text-[10px] text-text-secondary-dark mt-0.5 hidden sm:block">
                                                    Vence em: {Math.ceil((new Date(client.mensalistaExpiraEm).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} dias
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {user?.role === 'admin' && (
                                    <div className="flex gap-2 border-l border-border-dark pl-4 ml-2">
                                        <button
                                            onClick={() => openEditModal(client)}
                                            className="text-text-secondary-dark hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined">edit</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(client.id)}
                                            className="text-text-secondary-dark hover:text-red-500 transition-colors"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <ClientModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    clientToEdit={clientToEdit}
                />
            )}

            {isBalanceModalOpen && balanceClient && (
                <BalanceAdjustmentModal
                    isOpen={isBalanceModalOpen}
                    onClose={() => setIsBalanceModalOpen(false)}
                    client={balanceClient}
                    type={balanceType}
                />
            )}
        </div>
    );
};

export default Clients;
import React from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';

const Dashboard = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { clients, appointments, products, services, isLoadingData } = useData();

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Dashboard...</div>;
    }

    const tenantClients = clients.filter(c => c.tenantId === tenant?.id);
    const tenantAppointments = appointments.filter(a => a.tenantId === tenant?.id);
    const tenantProducts = products.filter(p => p.tenantId === tenant?.id);
    const tenantServices = services.filter(s => s.tenantId === tenant?.id);

    const today = new Date();
    const isToday = (dateString: string) => {
        const date = new Date(dateString);
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    const appointmentsToday = tenantAppointments.filter(a => isToday(a.date));
    const pendingAppointments = appointmentsToday.filter(a => a.status === 'Agendado');

    const revenueToday = appointmentsToday
        .filter(a => a.status === 'Concluído')
        .reduce((total, appointment) => {
            // Usar o totalAmount do agendamento, que já inclui serviço e produtos
            return total + (appointment.totalAmount || 0);
        }, 0);

    const lowStockProducts = tenantProducts.filter(p => p.stock <= p.minStock);

    // Novo cálculo: Quantidade total de produtos em estoque
    const totalStockQuantity = tenantProducts.reduce((total, product) => total + product.stock, 0);

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-text-primary-dark text-4xl font-black">Dashboard</h1>
                <p className="text-text-secondary-dark">Bem-vindo de volta, {tenant?.name}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6"> {/* Ajustado para 5 colunas em telas extra-grandes */}
                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-primary/20 rounded-lg">
                            <span className="material-symbols-outlined text-primary">calendar_today</span>
                        </div>
                        {/* <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">+5%</span> */}
                    </div>
                    <h3 className="text-text-secondary-dark text-sm font-medium">Agendamentos Hoje</h3>
                    <p className="text-text-primary-dark text-3xl font-black mt-1">{appointmentsToday.length}</p>
                    <p className="text-xs text-text-secondary-dark mt-2">{pendingAppointments.length} pendentes</p>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500">group</span>
                        </div>
                        {/* <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">+12%</span> */}
                    </div>
                    <h3 className="text-text-secondary-dark text-sm font-medium">Total de Clientes</h3>
                    <p className="text-text-primary-dark text-3xl font-black mt-1">{tenantClients.length}</p>
                    <p className="text-xs text-text-secondary-dark mt-2">Base ativa</p>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-green-500">payments</span>
                        </div>
                        {/* <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">+8%</span> */}
                    </div>
                    <h3 className="text-text-secondary-dark text-sm font-medium">Faturamento Hoje</h3>
                    <p className="text-text-primary-dark text-3xl font-black mt-1">R$ {revenueToday.toFixed(2)}</p>
                    <p className="text-xs text-text-secondary-dark mt-2">Serviços concluídos</p>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-red-500">inventory_2</span>
                        </div>
                        {lowStockProducts.length > 0 && (
                            <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full">Atenção</span>
                        )}
                    </div>
                    <h3 className="text-text-secondary-dark text-sm font-medium">Estoque Baixo</h3>
                    <p className="text-text-primary-dark text-3xl font-black mt-1">{lowStockProducts.length}</p>
                    <p className="text-xs text-text-secondary-dark mt-2">Produtos precisam de reposição</p>
                </div>

                {/* Novo Card: Total em Estoque */}
                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-500/20 rounded-lg">
                            <span className="material-symbols-outlined text-purple-500">warehouse</span>
                        </div>
                        {/* <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded-full">+10%</span> */}
                    </div>
                    <h3 className="text-text-secondary-dark text-sm font-medium">Total em Estoque</h3>
                    <p className="text-text-primary-dark text-3xl font-black mt-1">{totalStockQuantity}</p>
                    <p className="text-xs text-text-secondary-dark mt-2">Unidades de produtos</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <h3 className="text-text-primary-dark font-bold text-lg mb-6">Próximos Agendamentos</h3>
                    <div className="space-y-4">
                        {pendingAppointments.length === 0 ? (
                            <p className="text-text-secondary-dark text-center py-4">Nenhum agendamento pendente para hoje.</p>
                        ) : (
                            pendingAppointments.slice(0, 5).map(appointment => {
                                const client = tenantClients.find(c => c.id === appointment.clientId);
                                const service = tenantServices.find(s => s.id === appointment.serviceId);
                                const time = new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={appointment.id} className="flex items-center justify-between p-3 bg-surface-dark rounded-lg border border-border-dark">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/20 text-primary font-bold px-2 py-1 rounded text-sm">
                                                {time}
                                            </div>
                                            <div>
                                                <p className="font-bold text-text-primary-dark text-sm">{client?.name || 'Cliente'}</p>
                                                <p className="text-xs text-text-secondary-dark">{service?.title || 'Serviço'}</p>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded-full">
                                            {appointment.status}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <h3 className="text-text-primary-dark font-bold text-lg mb-6">Produtos Mais Vendidos</h3>
                    <div className="space-y-4">
                        {/* Placeholder for top selling products logic - would need sales history */}
                        <p className="text-text-secondary-dark text-center py-4">Dados insuficientes para exibir ranking.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
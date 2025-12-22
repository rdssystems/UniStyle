import React from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { clients, appointments, products, services, transactions, isLoadingData } = useData();

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Dashboard...</div>;
    }

    const tenantClients = clients.filter(c => c.tenantId === tenant?.id);
    const tenantAppointments = appointments.filter(a => a.tenantId === tenant?.id);
    const tenantProducts = products.filter(p => p.tenantId === tenant?.id);
    const tenantServices = services.filter(s => s.tenantId === tenant?.id);
    const tenantTransactions = transactions.filter(t => t.tenantId === tenant?.id);

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
            return total + (appointment.totalAmount || 0);
        }, 0);

    const cashToday = tenantTransactions
        .filter(t => isToday(t.date))
        .reduce((acc, curr) => {
            return curr.type === 'income' ? acc + curr.amount : acc - curr.amount;
        }, 0);

    const lowStockProducts = tenantProducts.filter(p => p.stock <= p.minStock);
    const totalStockQuantity = tenantProducts.reduce((total, product) => total + product.stock, 0);

    const StatCard = ({ title, value, subtext, icon, colorClass, emptyMsg, cta }: any) => {
        const isEmpty = typeof value === 'number' ? value === 0 : !value || value === 'R$ 0,00';

        return (
            <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg flex flex-col justify-between">
                <div>
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 ${colorClass} bg-opacity-20 rounded-lg`}>
                            <span className={`material-symbols-outlined ${colorClass.replace('bg-', 'text-')}`}>{icon}</span>
                        </div>
                    </div>
                    <h3 className="text-text-secondary-dark text-sm font-medium">{title}</h3>
                    {isEmpty ? (
                        <p className="text-text-secondary-dark text-sm italic mt-2">{emptyMsg}</p>
                    ) : (
                        <p className="text-text-primary-dark text-2xl font-extrabold mt-1">{value}</p>
                    )}
                </div>
                <div>
                    {isEmpty && cta ? (
                        <Link to={cta.to} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline mt-4">
                            {cta.label} <span className="material-symbols-outlined text-xs">arrow_forward</span>
                        </Link>
                    ) : (
                        <p className="text-xs text-text-secondary-dark mt-4">{subtext}</p>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-wrap justify-between items-end gap-4">
                <div>
                    <h1 className="text-text-primary-dark text-4xl font-extrabold">Dashboard</h1>
                    <p className="text-text-secondary-dark font-medium leading-relaxed">
                        Bem-vindo de volta, <span className="text-primary">{tenant?.name}</span>. Veja o que está acontecendo hoje.
                    </p>
                </div>

                {/* HUB de Ações Rápidas */}
                <div className="flex gap-3">
                    <Link
                        to="/agenda"
                        className="flex items-center gap-2 px-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-text-secondary-dark hover:text-primary hover:border-primary/30 transition-all shadow-lg group"
                    >
                        <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">event</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Abrir Agenda</span>
                    </Link>
                    <Link
                        to="/financials"
                        className="flex items-center gap-2 px-4 py-2.5 bg-surface-dark border border-border-dark rounded-xl text-text-secondary-dark hover:text-primary hover:border-primary/30 transition-all shadow-lg group"
                    >
                        <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">account_balance_wallet</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">Ir para o Caixa</span>
                    </Link>
                </div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard
                    title="Agendamentos Hoje"
                    value={appointmentsToday.length}
                    subtext={`${pendingAppointments.length} pendentes`}
                    icon="calendar_today"
                    colorClass="bg-primary"
                    emptyMsg="Nenhum agendamento para hoje"
                    cta={{ to: '/agenda', label: 'Criar agendamento' }}
                />

                <StatCard
                    title="Total de Clientes"
                    value={tenantClients.length}
                    subtext="Base ativa"
                    icon="group"
                    colorClass="bg-blue-500"
                    emptyMsg="Comece cadastrando um cliente"
                    cta={{ to: '/clients', label: 'Cadastrar cliente' }}
                />

                <StatCard
                    title="Faturamento Hoje"
                    value={`R$ ${revenueToday.toFixed(2)}`}
                    subtext="Serviços concluídos"
                    icon="payments"
                    colorClass="bg-green-500"
                    emptyMsg="Nenhuma venda hoje"
                    cta={{ to: '/financials', label: 'Registrar venda' }}
                />

                <StatCard
                    title="Saldo Caixa (Hoje)"
                    value={`R$ ${cashToday.toFixed(2)}`}
                    subtext="Termômetro financeiro"
                    icon="account_balance_wallet"
                    colorClass="bg-emerald-500"
                    emptyMsg="Caixa sem movimentação"
                />

                <StatCard
                    title="Estoque Baixo"
                    value={lowStockProducts.length}
                    subtext="Precisam de reposição"
                    icon="inventory_2"
                    colorClass="bg-red-500"
                    emptyMsg="Estoque em dia"
                />

                <StatCard
                    title="Total em Estoque"
                    value={totalStockQuantity}
                    subtext="Unidades totais"
                    icon="warehouse"
                    colorClass="bg-purple-500"
                    emptyMsg="Estoque vazio"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-text-primary-dark font-bold text-lg">Próximos Agendamentos</h3>
                        <Link to="/agenda" className="text-xs font-bold text-primary hover:underline">Ver tudo</Link>
                    </div>
                    <div className="space-y-4">
                        {pendingAppointments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-background-dark/30 rounded-lg border border-dashed border-border-dark">
                                <span className="material-symbols-outlined text-text-secondary-dark text-4xl mb-2">event_busy</span>
                                <p className="text-text-secondary-dark text-sm">Nenhum atendimento pendente para hoje.</p>
                                <Link to="/agenda" className="text-xs text-primary font-extrabold mt-2 uppercase tracking-widest">Agendar agora</Link>
                            </div>
                        ) : (
                            pendingAppointments.slice(0, 5).map(appointment => {
                                const client = tenantClients.find(c => c.id === appointment.clientId);
                                const service = tenantServices.find(s => s.id === appointment.serviceId);
                                const time = new Date(appointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                return (
                                    <div key={appointment.id} className="flex items-center justify-between p-4 bg-surface-dark rounded-lg border border-border-dark hover:border-primary/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-primary/20 text-primary font-extrabold px-2 py-1 rounded text-sm min-w-[60px] text-center">
                                                {time}
                                            </div>
                                            <div>
                                                <p className="font-bold text-text-primary-dark text-sm">{client?.name || 'Cliente'}</p>
                                                <p className="text-xs text-text-secondary-dark">{service?.title || 'Serviço'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-extrabold bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded-full border border-yellow-500/20 uppercase tracking-tighter">
                                                {appointment.status}
                                            </span>
                                            <Link to="/agenda" className="p-1 hover:bg-input-dark rounded transition-colors text-text-secondary-dark">
                                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <h3 className="text-text-primary-dark font-bold text-lg mb-6">Produtos Mais Vendidos</h3>
                    <div className="flex flex-col items-center justify-center h-[200px] text-center bg-background-dark/30 rounded-lg border border-dashed border-border-dark">
                        <span className="material-symbols-outlined text-text-secondary-dark text-4xl mb-2">analytics</span>
                        <p className="text-text-secondary-dark text-sm max-w-[250px]">
                            Registre vendas no caixa para visualizar o ranking automático de produtos.
                        </p>
                        <Link to="/financials" className="text-xs text-primary font-extrabold mt-4 uppercase tracking-widest">Ir para o caixa</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
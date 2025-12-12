import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';

const SalesReports = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { appointments, services, isLoadingData } = useData();
    const [period, setPeriod] = useState('month'); // 'week', 'month', 'year'

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Relatórios de Vendas...</div>;
    }

    const tenantAppointments = appointments.filter(a => a.tenantId === tenant?.id && a.status === 'Concluído');
    const tenantServices = services.filter(s => s.tenantId === tenant?.id);

    // Calculate total revenue
    const totalRevenue = tenantAppointments.reduce((total, appointment) => {
        const service = tenantServices.find(s => s.id === appointment.serviceId);
        return total + (service ? service.price : 0);
    }, 0);

    // Calculate revenue by service
    const revenueByService = tenantServices.map(service => {
        const count = tenantAppointments.filter(a => a.serviceId === service.id).length;
        const revenue = count * service.price;
        return { ...service, count, revenue };
    }).sort((a, b) => b.revenue - a.revenue);

    return (
        <div className="flex flex-col gap-8">
            <header className="flex justify-between items-center">
                <h1 className="text-text-primary-dark text-4xl font-black">Relatórios de Vendas</h1>
                <div className="flex bg-surface-dark rounded-lg p-1 border border-border-dark">
                    <button
                        onClick={() => setPeriod('week')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${period === 'week' ? 'bg-primary text-background-dark' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setPeriod('month')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${period === 'month' ? 'bg-primary text-background-dark' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Mês
                    </button>
                    <button
                        onClick={() => setPeriod('year')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${period === 'year' ? 'bg-primary text-background-dark' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Ano
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <h3 className="text-text-primary-dark font-bold text-lg mb-6">Desempenho por Serviço</h3>
                    <div className="space-y-4">
                        {revenueByService.map(item => (
                            <div key={item.id} className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-text-primary-dark font-medium">{item.title}</span>
                                    <span className="text-text-secondary-dark">{item.count} atendimentos</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 bg-surface-dark h-2 rounded-full overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full"
                                            style={{ width: `${(item.revenue / totalRevenue) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="font-bold text-text-primary-dark min-w-[80px] text-right">
                                        R$ {item.revenue.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {revenueByService.length === 0 && (
                            <p className="text-text-secondary-dark text-center py-8">Nenhum dado de vendas disponível.</p>
                        )}
                    </div>
                </div>

                <div className="bg-card-dark p-6 rounded-xl border border-border-dark shadow-lg">
                    <h3 className="text-text-primary-dark font-bold text-lg mb-6">Resumo do Período</h3>
                    <div className="space-y-6">
                        <div className="p-4 bg-surface-dark rounded-lg border border-border-dark text-center">
                            <p className="text-text-secondary-dark text-sm mb-1">Faturamento Total</p>
                            <p className="text-3xl font-black text-green-500">R$ {totalRevenue.toFixed(2)}</p>
                        </div>

                        <div className="p-4 bg-surface-dark rounded-lg border border-border-dark text-center">
                            <p className="text-text-secondary-dark text-sm mb-1">Ticket Médio</p>
                            <p className="text-3xl font-black text-blue-500">
                                R$ {tenantAppointments.length > 0 ? (totalRevenue / tenantAppointments.length).toFixed(2) : '0.00'}
                            </p>
                        </div>

                        <div className="p-4 bg-surface-dark rounded-lg border border-border-dark text-center">
                            <p className="text-text-secondary-dark text-sm mb-1">Total de Atendimentos</p>
                            <p className="text-3xl font-black text-text-primary-dark">{tenantAppointments.length}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesReports;
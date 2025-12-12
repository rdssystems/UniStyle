import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';

interface ProfessionalHistoryProps {
    professionalId: string;
}

const ProfessionalHistory: React.FC<ProfessionalHistoryProps> = ({ professionalId }) => {
    const { appointments, commissions, services } = useData();
    const [filterPeriod, setFilterPeriod] = useState<'day' | 'week' | 'month'>('month');

    const stats = useMemo(() => {
        if (!professionalId) return null;

        const myAppointments = appointments.filter(a => a.professionalId === professionalId);
        const myCommissions = commissions.filter(c => c.professionalId === professionalId);

        const now = new Date();
        const startOfPeriod = new Date(now);
        startOfPeriod.setHours(0, 0, 0, 0);

        if (filterPeriod === 'day') {
            // Já está no início do dia
        } else if (filterPeriod === 'week') {
            const day = startOfPeriod.getDay();
            const diff = startOfPeriod.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
            startOfPeriod.setDate(diff);
        } else if (filterPeriod === 'month') {
            startOfPeriod.setDate(1);
        }

        const filteredAppointments = myAppointments.filter(a => new Date(a.date) >= startOfPeriod);


        // Histórico (Calculated first to be source of truth for totals)
        const history = filteredAppointments
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(app => {
                const commission = myCommissions.find(c => c.appointmentId === app.id);
                const service = services.find(s => s.id === app.serviceId);
                return {
                    ...app,
                    serviceName: service?.title || 'Serviço excluído',
                    commissionAmount: commission?.amount || 0,
                    commissionStatus: commission?.status || 'N/A'
                };
            });

        // Calculate totals based on the history items (displayed rows)
        const totalCommission = history.reduce((sum, item) => sum + item.commissionAmount, 0);
        const totalAppointments = history.length;

        // Ticket Médio
        const completedApps = history.filter(a => a.status === 'Concluído');
        const totalValue = completedApps.reduce((sum, a) => sum + (a.totalAmount || 0), 0);
        const averageTicket = completedApps.length > 0 ? totalValue / completedApps.length : 0;

        return {
            totalCommission,
            totalAppointments,
            averageTicket,
            history
        };
    }, [professionalId, appointments, commissions, services, filterPeriod]);

    if (!stats) return <div className="text-white p-4">Carregando dados...</div>;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-end">
                <div className="flex bg-surface-dark rounded-lg p-1 border border-border-dark">
                    <button
                        onClick={() => setFilterPeriod('day')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterPeriod === 'day' ? 'bg-primary text-background-dark' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Dia
                    </button>
                    <button
                        onClick={() => setFilterPeriod('week')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterPeriod === 'week' ? 'bg-primary text-background-dark' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Semana
                    </button>
                    <button
                        onClick={() => setFilterPeriod('month')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${filterPeriod === 'month' ? 'bg-primary text-background-dark' : 'text-text-secondary-dark hover:text-text-primary-dark'}`}
                    >
                        Mês
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex flex-col justify-between">
                    <span className="text-text-secondary-dark font-medium text-sm">Comissões</span>
                    <span className="text-2xl font-black text-green-500">R$ {stats.totalCommission.toFixed(2)}</span>
                </div>
                <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex flex-col justify-between">
                    <span className="text-text-secondary-dark font-medium text-sm">Atendimentos</span>
                    <span className="text-2xl font-black text-primary">{stats.totalAppointments}</span>
                </div>
                <div className="bg-surface-dark p-4 rounded-xl border border-border-dark flex flex-col justify-between">
                    <span className="text-text-secondary-dark font-medium text-sm">Ticket Médio</span>
                    <span className="text-2xl font-black text-blue-400">R$ {stats.averageTicket.toFixed(2)}</span>
                </div>
            </div>

            <div className="bg-surface-dark rounded-xl border border-border-dark overflow-hidden flex flex-col max-h-[400px]">
                <div className="p-3 border-b border-border-dark bg-background-dark/50">
                    <h3 className="font-bold text-text-primary-dark text-sm">Histórico Detalhado</h3>
                </div>
                <div className="overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-surface-dark shadow-sm z-10">
                            <tr>
                                <th className="p-3 text-xs font-bold text-text-secondary-dark uppercase">Data</th>
                                <th className="p-3 text-xs font-bold text-text-secondary-dark uppercase">Serviço</th>
                                <th className="p-3 text-xs font-bold text-text-secondary-dark uppercase">Status</th>
                                <th className="p-3 text-right text-xs font-bold text-text-secondary-dark uppercase">Total</th>
                                <th className="p-3 text-right text-xs font-bold text-text-secondary-dark uppercase">Comissão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-dark">
                            {stats.history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-6 text-center text-text-secondary-dark text-sm">Nenhum registro neste período.</td>
                                </tr>
                            ) : (
                                stats.history.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-3 text-sm text-text-secondary-dark">
                                            {new Date(item.date).toLocaleDateString()} <span className="text-xs opacity-50">{new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="p-3 text-text-primary-dark font-medium text-sm">
                                            {item.serviceName}
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold 
                                                ${item.status === 'Concluído' ? 'bg-blue-500/20 text-blue-500' :
                                                    item.status === 'Confirmado' ? 'bg-green-500/20 text-green-500' :
                                                        'bg-gray-500/20 text-gray-500'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right text-text-primary-dark font-bold text-sm">
                                            R$ {(item.totalAmount || 0).toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right text-green-500 font-bold text-sm">
                                            {item.commissionAmount > 0 ? `R$ ${item.commissionAmount.toFixed(2)}` : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProfessionalHistory;

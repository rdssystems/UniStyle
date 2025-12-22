import React, { useState, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Client, Appointment, Service, Professional, CRMTag } from '../types';
import CRMProfileModal from '../components/CRMProfileModal';

const CRM = () => {
    const { clients, appointments, services, professionals, crmTags } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [vipFilter, setVipFilter] = useState('all');
    const [profFilter, setProfFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'name' | 'lastVisit' | 'totalSpent'>('name');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // Cálculos de CRM simplificados para a lista
    const clientStats = useMemo(() => {
        const stats: Record<string, any> = {};
        clients.forEach(client => {
            const clientApps = appointments
                .filter(a => a.clientId === client.id && a.status === 'Concluído')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            const lastVisit = clientApps.length > 0 ? clientApps[0].date : null;
            const totalSpent = clientApps.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
            const avgTicket = clientApps.length > 0 ? totalSpent / clientApps.length : 0;

            let avgFreq = 0;
            if (clientApps.length > 1) {
                let totalDays = 0;
                for (let i = 0; i < clientApps.length - 1; i++) {
                    const d1 = new Date(clientApps[i].date);
                    const d2 = new Date(clientApps[i + 1].date);
                    totalDays += (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
                }
                avgFreq = totalDays / (clientApps.length - 1);
            }

            let status = 'Novo';
            if (lastVisit) {
                const daysSinceLast = (new Date().getTime() - new Date(lastVisit).getTime()) / (1000 * 60 * 60 * 24);
                status = daysSinceLast > 45 ? 'Inativo' : 'Ativo';
            }

            stats[client.id] = {
                lastVisit,
                avgFreq: Math.round(avgFreq),
                avgTicket,
                status: client.isVip ? 'VIP' : status,
                totalSpent,
                visitCount: clientApps.length
            };
        });
        return stats;
    }, [clients, appointments]);

    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const stats = clientStats[client.id];
            const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.phone.includes(searchTerm);

            const matchesStatus = statusFilter === 'all' || stats.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesVip = vipFilter === 'all' || (vipFilter === 'vip' && client.isVip) || (vipFilter === 'regular' && !client.isVip);

            // Intelligence: Filter by professional most attended
            const clientApps = appointments.filter(a => a.clientId === client.id);
            const profCounts: Record<string, number> = {};
            clientApps.forEach(a => profCounts[a.professionalId] = (profCounts[a.professionalId] || 0) + 1);
            const topProfId = Object.entries(profCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
            const matchesProf = profFilter === 'all' || topProfId === profFilter;

            return matchesSearch && matchesStatus && matchesVip && matchesProf;
        }).sort((a, b) => {
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'lastVisit') {
                const da = clientStats[a.id].lastVisit ? new Date(clientStats[a.id].lastVisit).getTime() : 0;
                const db = clientStats[b.id].lastVisit ? new Date(clientStats[b.id].lastVisit).getTime() : 0;
                return db - da;
            }
            if (sortBy === 'totalSpent') return clientStats[b.id].totalSpent - clientStats[a.id].totalSpent;
            return 0;
        });
    }, [clients, clientStats, searchTerm, statusFilter, vipFilter, profFilter, sortBy, appointments]);

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-text-primary-dark text-4xl font-extrabold">CRM de Clientes</h1>
                    <p className="text-text-secondary-dark">Relacionamento, inteligência e fidelização.</p>
                </div>
            </header>

            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-surface-dark p-6 rounded-xl border border-border-dark">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-text-secondary-dark uppercase">Buscar Cliente</label>
                    <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-dark text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-11 bg-background-dark border border-border-dark rounded-lg pl-10 pr-4 text-text-primary-dark focus:border-primary outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-text-secondary-dark uppercase">Status CRM</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-11 bg-background-dark border border-border-dark rounded-lg px-4 text-text-primary-dark focus:border-primary outline-none transition-all"
                    >
                        <option value="all">Todos os Status</option>
                        <option value="ativo">Ativos</option>
                        <option value="inativo">Inativos</option>
                        <option value="novo">Novos</option>
                        <option value="vip">VIPs</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-text-secondary-dark uppercase">Classificação</label>
                    <select
                        value={vipFilter}
                        onChange={(e) => setVipFilter(e.target.value)}
                        className="h-11 bg-background-dark border border-border-dark rounded-lg px-4 text-text-primary-dark focus:border-primary outline-none transition-all"
                    >
                        <option value="all">Todas as Classificações</option>
                        <option value="vip">Apenas VIP</option>
                        <option value="regular">Apenas Regulares</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-text-secondary-dark uppercase">Profissional Mais Frequente</label>
                    <select
                        value={profFilter}
                        onChange={(e) => setProfFilter(e.target.value)}
                        className="h-11 bg-background-dark border border-border-dark rounded-lg px-4 text-text-primary-dark focus:border-primary outline-none transition-all"
                    >
                        <option value="all">Todos os Profissionais</option>
                        {professionals.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex justify-end gap-2 px-2">
                <span className="text-[10px] font-bold text-text-secondary-dark uppercase flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">sort</span> Ordenar por:
                </span>
                <button onClick={() => setSortBy('name')} className={`text-[10px] font-bold uppercase ${sortBy === 'name' ? 'text-primary underline' : 'text-text-secondary-dark'}`}>Nome</button>
                <button onClick={() => setSortBy('lastVisit')} className={`text-[10px] font-bold uppercase ${sortBy === 'lastVisit' ? 'text-primary underline' : 'text-text-secondary-dark'}`}>Última Visita</button>
                <button onClick={() => setSortBy('totalSpent')} className={`text-[10px] font-bold uppercase ${sortBy === 'totalSpent' ? 'text-primary underline' : 'text-text-secondary-dark'}`}>Valor Gasto</button>
            </div>

            {/* Tabela CRM */}
            <div className="bg-surface-dark rounded-xl border border-border-dark overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border-dark">
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase">Cliente</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase">Status</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase text-center">Última Visita</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase text-center">Frequência</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase text-right">Ticket Médio</th>
                                <th className="p-4 text-xs font-bold text-text-secondary-dark uppercase text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-text-secondary-dark italic">
                                        Nenhum cliente encontrado com os filtros aplicados.
                                    </td>
                                </tr>
                            ) : (
                                filteredClients.map(client => {
                                    const stats = clientStats[client.id];
                                    return (
                                        <tr key={client.id} className="border-b border-border-dark/50 hover:bg-background-dark/30 transition-colors">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-input-dark flex items-center justify-center overflow-hidden border border-border-dark">
                                                        {client.avatarUrl ? (
                                                            <img src={client.avatarUrl} alt={client.name} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-text-secondary-dark">person</span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-primary-dark text-sm">{client.name}</span>
                                                        <span className="text-xs text-text-secondary-dark font-mono">{client.phone}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold uppercase ${stats.status === 'VIP' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                                                    stats.status === 'Ativo' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                        stats.status === 'Inativo' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                            'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                                    }`}>
                                                    {stats.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className="text-sm font-medium text-text-primary-dark">
                                                    {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString('pt-BR') : 'Sem visitas'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold text-text-primary-dark">{stats.avgFreq || 0} dias</span>
                                                    <span className="text-[10px] text-text-secondary-dark uppercase font-medium">Médio</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-sm font-extrabold text-primary font-mono">
                                                    {stats.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => setSelectedClientId(client.id)}
                                                    className="inline-flex items-center gap-2 px-3 py-2 bg-input-dark hover:bg-primary hover:text-background-dark text-text-primary-dark rounded-lg text-xs font-bold transition-all border border-border-dark"
                                                >
                                                    <span className="material-symbols-outlined text-sm">analytics</span>
                                                    Perfil CRM
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedClientId && (
                <CRMProfileModal
                    clientId={selectedClientId}
                    onClose={() => setSelectedClientId(null)}
                />
            )}
        </div>
    );
};

export default CRM;

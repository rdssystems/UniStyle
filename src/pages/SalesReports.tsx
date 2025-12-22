import React, { useState, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SalesReports = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { appointments, services, transactions, professionals, clients, products, isLoadingData } = useData();

    const [period, setPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
    const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Relatórios de Vendas...</div>;
    }

    // --- Period Logic ---
    const filteredData = useMemo(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();
        end.setHours(23, 59, 59, 999);

        if (period === 'week') {
            start.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            start.setMonth(now.getMonth() - 1);
        } else if (period === 'year') {
            start.setFullYear(now.getFullYear() - 1);
        } else {
            start = new Date(startDate);
            end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
        }
        start.setHours(0, 0, 0, 0);

        const filteredAppointments = appointments.filter(a => {
            const d = new Date(a.date);
            return a.tenantId === tenant?.id && a.status === 'Concluído' && d >= start && d <= end;
        });

        const filteredTransactions = transactions.filter(t => {
            const d = new Date(t.date);
            return t.tenantId === tenant?.id && d >= start && d <= end;
        });

        return { filteredAppointments, filteredTransactions, start, end };
    }, [appointments, transactions, period, startDate, endDate, tenant]);

    // --- Calculations ---
    const stats = useMemo(() => {
        const { filteredAppointments, filteredTransactions } = filteredData;

        // Faturamento: Appointments (Services) + Transactions (Type income, Category product)
        const serviceRevenue = filteredAppointments.reduce((acc, app) => {
            const service = services.find(s => s.id === app.serviceId);
            return acc + (service?.price || 0);
        }, 0);

        const productSales = filteredTransactions.filter(t => t.type === 'income' && t.category === 'product');
        const productRevenue = productSales.reduce((acc, t) => acc + t.amount, 0);

        const totalRevenue = serviceRevenue + productRevenue;

        // Custo Total: Transactions (Type expense)
        const totalCost = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        const grossProfit = totalRevenue - totalCost;

        // Ticket Médio
        const averageTicket = filteredAppointments.length > 0 ? totalRevenue / filteredAppointments.length : 0;

        // % Recorrência: Clientes com > 1 atendimento vs total únicos
        const clientIds = filteredAppointments.map(a => a.clientId);
        const uniqueClients = new Set(clientIds);
        const recurrentCount = [...uniqueClients].filter(id => clientIds.filter(cid => cid === id).length > 1).length;
        const recurrenceRate = uniqueClients.size > 0 ? (recurrentCount / uniqueClients.size) * 100 : 0;

        return { totalRevenue, totalCost, grossProfit, averageTicket, recurrenceRate, totalAtendimentos: filteredAppointments.length };
    }, [filteredData, services]);

    // --- Rankings ---
    const rankings = useMemo(() => {
        const { filteredAppointments, filteredTransactions } = filteredData;

        // Barbeiros
        const professionalStats = professionals.filter(p => p.tenantId === tenant?.id).map(p => {
            const apps = filteredAppointments.filter(a => a.professionalId === p.id);
            const total = apps.reduce((acc, app) => {
                const s = services.find(srv => srv.id === app.serviceId);
                return acc + (s?.price || 0);
            }, 0);
            return { name: p.name, count: apps.length, total };
        }).sort((a, b) => b.total - a.total);

        // Clientes Top 5
        const clientStats = clients.filter(c => c.tenantId === tenant?.id).map(c => {
            const apps = filteredAppointments.filter(a => a.clientId === c.id);
            const total = apps.reduce((acc, app) => {
                const s = services.find(srv => srv.id === app.serviceId);
                return acc + (s?.price || 0);
            }, 0);
            return { name: c.name, total };
        }).sort((a, b) => b.total - a.total).slice(0, 5);

        // Top Produtos por Margem (Margem = (Preço - Custo) / Preço)
        const productStats = products.filter(p => p.tenantId === tenant?.id && p.price > 0).map(p => {
            const margin = ((p.price - (p.costPrice || 0)) / p.price) * 100;
            return { name: p.name, price: p.price, cost: p.costPrice || 0, margin };
        }).sort((a, b) => b.margin - a.margin).slice(0, 5);

        // Desempenho por Serviço (com Ticket Médio)
        const serviceStats = services.filter(s => s.tenantId === tenant?.id).map(service => {
            const apps = filteredAppointments.filter(a => a.serviceId === service.id);
            const revenue = apps.length * service.price;
            const avg = apps.length > 0 ? revenue / apps.length : 0;
            return { title: service.title, count: apps.length, revenue, avg };
        }).sort((a, b) => b.revenue - a.revenue);

        return { professionalStats, clientStats, productStats, serviceStats };
    }, [filteredData, professionals, services, clients, products, tenant]);

    // --- Chart Data ---
    const chartData = useMemo(() => {
        const { filteredAppointments, filteredTransactions, start, end } = filteredData;
        const days = [];
        const curr = new Date(start);

        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            const appRev = filteredAppointments.filter(a => a.date.startsWith(dateStr)).reduce((acc, app) => {
                const s = services.find(srv => srv.id === app.serviceId);
                return acc + (s?.price || 0);
            }, 0);

            const transRev = filteredTransactions.filter(t => t.date.startsWith(dateStr) && t.type === 'income' && t.category === 'product').reduce((acc, t) => acc + t.amount, 0);

            days.push({
                name: curr.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                valor: appRev + transRev
            });
            curr.setDate(curr.getDate() + 1);
        }
        return days;
    }, [filteredData, services]);

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header com Filtros */}
            <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-text-primary-dark text-4xl font-extrabold">Inteligência de Vendas</h1>
                    <p className="text-text-secondary-dark uppercase tracking-widest text-[10px] font-extrabold opacity-60">Visão analítica do seu negócio</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-surface-dark p-2 rounded-2xl border border-border-dark shadow-xl">
                    <div className="flex bg-background-dark/50 rounded-xl p-1 border border-border-dark/30">
                        {['week', 'month', 'year', 'custom'].map(p => (
                            <button
                                key={p}
                                onClick={() => setPeriod(p as any)}
                                className={`px-4 py-2 rounded-lg text-[10px] uppercase font-extrabold tracking-widest transition-all ${period === p ? 'bg-primary text-background-dark shadow-glow-primary' : 'text-text-secondary-dark hover:text-white'}`}
                            >
                                {p === 'week' ? 'Semana' : p === 'month' ? 'Mês' : p === 'year' ? 'Ano' : 'Personalizado'}
                            </button>
                        ))}
                    </div>

                    {period === 'custom' && (
                        <div className="flex items-center gap-2 animate-fade-in px-2">
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background-dark text-primary border border-border-dark rounded-lg p-1.5 text-[10px] font-extrabold outline-none" />
                            <span className="text-text-secondary-dark text-[10px] font-extrabold">ATÉ</span>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background-dark text-primary border border-border-dark rounded-lg p-1.5 text-[10px] font-extrabold outline-none" />
                        </div>
                    )}
                </div>
            </header>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                    { label: 'Faturamento', value: stats.totalRevenue, color: 'text-green-500', icon: 'payments' },
                    { label: 'Ticket Médio', value: stats.averageTicket, color: 'text-blue-500', icon: 'receipt_long' },
                    { label: 'Custo Total', value: stats.totalCost, color: 'text-red-500', icon: 'trending_down' },
                    { label: 'Lucro Bruto', value: stats.grossProfit, color: 'text-primary', icon: 'account_balance_wallet' },
                    { label: '% Recorrência', value: stats.recurrenceRate, color: 'text-purple-500', icon: 'group_add', isPercent: true }
                ].map(stat => (
                    <div key={stat.label} className="bg-surface-dark p-5 rounded-2xl border border-border-dark shadow-xl hover:translate-y-[-4px] transition-all group">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest">{stat.label}</span>
                            <span className={`material-symbols-outlined text-sm ${stat.color} opacity-40 group-hover:opacity-100 transition-opacity`}>{stat.icon}</span>
                        </div>
                        <p className={`text-2xl font-extrabold ${stat.color}`}>
                            {stat.isPercent ? `${stat.value.toFixed(1)}%` : `R$ ${stat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                        </p>
                    </div>
                ))}
            </div>

            {/* Gráfico de Tendência */}
            <div className="bg-surface-dark p-6 rounded-3xl border border-border-dark shadow-2xl overflow-hidden">
                <h3 className="text-text-primary-dark font-extrabold uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">analytics</span>
                    Tendência de Faturamento
                </h3>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="name" stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#ffffff30" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#181410', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                itemStyle={{ color: 'var(--primary-color)', fontWeight: 'bold' }}
                            />
                            <Area type="monotone" dataKey="valor" stroke="var(--primary-color)" strokeWidth={4} fillOpacity={1} fill="url(#colorVal)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Rankings e Detalhes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ranking de Barbeiros */}
                <div className="bg-surface-dark p-6 rounded-3xl border border-border-dark shadow-xl">
                    <h3 className="text-text-primary-dark font-extrabold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-400">content_cut</span>
                        Performance por Barbeiro
                    </h3>
                    <div className="space-y-4">
                        {rankings.professionalStats.map((p, idx) => (
                            <div key={p.name} className="flex items-center gap-4 group">
                                <span className="text-[10px] font-extrabold text-text-secondary-dark w-4">{idx + 1}.</span>
                                <div className="flex-1">
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-text-primary-dark">{p.name}</span>
                                        <span className="text-primary">R$ {p.total.toFixed(2)}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-background-dark rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500/50 rounded-full transition-all duration-1000"
                                            style={{ width: `${(p.total / stats.totalRevenue) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[8px] text-text-secondary-dark uppercase tracking-tighter mt-1 block">{p.count} atendimentos concluídos</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Clientes */}
                <div className="bg-surface-dark p-6 rounded-3xl border border-border-dark shadow-xl">
                    <h3 className="text-text-primary-dark font-extrabold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-400">stars</span>
                        Top Clientes (Gasto Acumulado)
                    </h3>
                    <div className="bg-background-dark/30 rounded-2xl overflow-hidden border border-border-dark/30">
                        {rankings.clientStats.map((c, idx) => (
                            <div key={c.name} className="flex items-center justify-between p-4 border-b border-border-dark/30 last:border-0 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold text-xs">
                                        {idx + 1}
                                    </div>
                                    <span className="text-xs font-extrabold text-text-primary-dark">{c.name}</span>
                                </div>
                                <span className="text-sm font-extrabold text-green-500 font-mono">R$ {c.total.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Produtos por Margem */}
                <div className="bg-surface-dark p-6 rounded-3xl border border-border-dark shadow-xl">
                    <h3 className="text-text-primary-dark font-extrabold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-green-400">payments</span>
                        Produtos com Maior Margem de Lucro
                    </h3>
                    <div className="space-y-4">
                        {rankings.productStats.map(p => (
                            <div key={p.name} className="bg-background-dark/50 p-4 rounded-2xl border border-border-dark/30 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-extrabold text-text-primary-dark">{p.name}</p>
                                    <p className="text-[8px] text-text-secondary-dark uppercase tracking-widest mt-1">
                                        Custo: R$ {p.cost.toFixed(2)} | Venda: R$ {p.price.toFixed(2)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-extrabold text-primary">{p.margin.toFixed(0)}%</span>
                                    <p className="text-[8px] text-text-secondary-dark uppercase tracking-widest">Margem Bruta</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desempenho por Serviço */}
                <div className="bg-surface-dark p-6 rounded-3xl border border-border-dark shadow-xl">
                    <h3 className="text-text-primary-dark font-extrabold uppercase tracking-widest text-xs mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-yellow-500">dry_cleaning</span>
                        Desempenho por Serviço
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-background-dark/50">
                                <tr>
                                    <th className="px-4 py-3 text-[9px] font-extrabold uppercase text-text-secondary-dark tracking-tighter">Serviço</th>
                                    <th className="px-4 py-3 text-[9px] font-extrabold uppercase text-text-secondary-dark tracking-tighter text-center">Volume</th>
                                    <th className="px-4 py-3 text-[9px] font-extrabold uppercase text-text-secondary-dark tracking-tighter text-right">R$ Total</th>
                                    <th className="px-4 py-3 text-[9px] font-extrabold uppercase text-text-secondary-dark tracking-tighter text-right">Ticket Médio</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark/30">
                                {rankings.serviceStats.map(s => (
                                    <tr key={s.title} className="hover:bg-white/5 transition-colors">
                                        <td className="px-4 py-3 text-xs font-bold text-text-primary-dark">{s.title}</td>
                                        <td className="px-4 py-3 text-xs text-center text-text-secondary-dark">{s.count}</td>
                                        <td className="px-4 py-3 text-xs text-right font-extrabold text-text-primary-dark">R$ {s.revenue.toFixed(2)}</td>
                                        <td className="px-4 py-3 text-xs text-right font-extrabold text-primary">R$ {s.avg.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesReports;
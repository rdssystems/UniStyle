import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { Client, Appointment, Service, Professional, CRMTag, ClientCRMNote } from '../types';

interface CRMProfileModalProps {
    clientId: string;
    onClose: () => void;
}

const CRMProfileModal = ({ clientId, onClose }: CRMProfileModalProps) => {
    const {
        clients, appointments, services, professionals, crmTags,
        updateClient, addClientTag, removeClientTag, addCRMTag,
        addClientNote, getClientNotes
    } = useData();

    const [activeTab, setActiveTab] = useState<'summary' | 'history' | 'preferences' | 'tags' | 'notes'>('summary');
    const [notes, setNotes] = useState<ClientCRMNote[]>([]);
    const [isLoadingNotes, setIsLoadingNotes] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [isSavingPref, setIsSavingPref] = useState(false);

    const client = clients.find(c => c.id === clientId);

    // Cálculos de CRM
    const stats = useMemo(() => {
        if (!client) return null;
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

        // Serviços mais realizados
        const serviceCounts: Record<string, number> = {};
        const professionalCounts: Record<string, number> = {};

        clientApps.forEach(app => {
            serviceCounts[app.serviceId] = (serviceCounts[app.serviceId] || 0) + 1;
            professionalCounts[app.professionalId] = (professionalCounts[app.professionalId] || 0) + 1;
        });

        const topServiceId = Object.entries(serviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        const topProfId = Object.entries(professionalCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

        return {
            lastVisit,
            avgFreq: Math.round(avgFreq),
            avgTicket,
            totalSpent,
            visitCount: clientApps.length,
            topService: services.find(s => s.id === topServiceId)?.title || 'N/A',
            topProf: professionals.find(p => p.id === topProfId)?.name || 'N/A'
        };
    }, [client, appointments, services, professionals]);

    useEffect(() => {
        if (activeTab === 'notes' && client) {
            loadNotes();
        }
    }, [activeTab, client]);

    const loadNotes = async () => {
        setIsLoadingNotes(true);
        const fetchedNotes = await getClientNotes(clientId);
        setNotes(fetchedNotes);
        setIsLoadingNotes(false);
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || !client) return;
        const addedNote = await addClientNote({ clientId, content: newNote });
        if (addedNote) {
            setNotes(prev => [addedNote, ...prev]);
            setNewNote('');
        }
    };

    const toggleTag = async (tagId: string) => {
        if (!client) return;
        const hasTag = client.tags?.some(t => t.id === tagId);
        if (hasTag) {
            await removeClientTag(clientId, tagId);
        } else {
            await addClientTag(clientId, tagId);
        }
    };

    const updatePreferences = async (updates: any) => {
        if (!client) return;
        setIsSavingPref(true);
        await updateClient({
            ...client,
            preferences: {
                ...client.preferences,
                ...updates
            }
        } as Client);
        setIsSavingPref(false);
    };

    if (!client) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-surface-dark w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border-dark shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-border-dark flex items-start justify-between bg-background-dark/30">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-input-dark flex items-center justify-center overflow-hidden border-2 border-primary shadow-glow-primary">
                            {client.avatarUrl ? (
                                <img src={client.avatarUrl} alt={client.name} className="h-full w-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-3xl text-primary">person</span>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-text-primary-dark">{client.name}</h2>
                            <div className="flex items-center gap-2">
                                <span className="text-text-secondary-dark font-mono">{client.phone}</span>
                                <span className="h-1 w-1 rounded-full bg-text-secondary-dark"></span>
                                <span className={`text-xs font-bold ${client.isVip ? 'text-yellow-500' : 'text-primary'}`}>
                                    {client.isVip ? 'CLIENTE VIP' : 'CLIENTE REGULAR'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-input-dark text-text-secondary-dark transition-all">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex bg-background-dark/50 p-2 overflow-x-auto shrink-0 border-b border-border-dark">
                    {[
                        { id: 'summary', icon: 'analytics', label: 'Resumo' },
                        { id: 'history', icon: 'history', label: 'Histórico' },
                        { id: 'preferences', icon: 'favorite', label: 'Preferências' },
                        { id: 'tags', icon: 'sell', label: 'Tags' },
                        { id: 'notes', icon: 'description', label: 'Anotações' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'bg-primary text-background-dark shadow-glow-primary'
                                    : 'text-text-secondary-dark hover:text-text-primary-dark hover:bg-surface-dark'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {activeTab === 'summary' && stats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                                        <p className="text-[10px] font-bold text-text-secondary-dark uppercase mb-1">Total Gasto</p>
                                        <p className="text-xl font-black text-primary font-mono">{stats.totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                    <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                                        <p className="text-[10px] font-bold text-text-secondary-dark uppercase mb-1">Ticket Médio</p>
                                        <p className="text-xl font-black text-text-primary-dark font-mono">{stats.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                    <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                                        <p className="text-[10px] font-bold text-text-secondary-dark uppercase mb-1">Total de Visitas</p>
                                        <p className="text-xl font-black text-text-primary-dark">{stats.visitCount}</p>
                                    </div>
                                    <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                                        <p className="text-[10px] font-bold text-text-secondary-dark uppercase mb-1">Freq. Média</p>
                                        <p className="text-xl font-black text-text-primary-dark">{stats.avgFreq} dias</p>
                                    </div>
                                </div>
                                <div className="bg-background-dark p-4 rounded-xl border border-border-dark">
                                    <p className="text-[10px] font-bold text-text-secondary-dark uppercase mb-3">Ranking de Inteligência</p>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-center bg-surface-dark p-3 rounded-lg border border-border-dark">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-primary">cut</span>
                                                <span className="text-xs font-bold text-text-secondary-dark">Serviço Favorito</span>
                                            </div>
                                            <span className="text-sm font-black text-text-primary-dark">{stats.topService}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-surface-dark p-3 rounded-lg border border-border-dark">
                                            <div className="flex items-center gap-3">
                                                <span className="material-symbols-outlined text-primary">badge</span>
                                                <span className="text-xs font-bold text-text-secondary-dark">Profissional Favorito</span>
                                            </div>
                                            <span className="text-sm font-black text-text-primary-dark">{stats.topProf}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col gap-4">
                                <div className="bg-background-dark p-5 rounded-xl border border-border-dark flex-1 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <span className="material-symbols-outlined text-8xl">contact_support</span>
                                    </div>
                                    <h3 className="text-sm font-bold text-primary uppercase mb-4">Análise Comportamental</h3>
                                    <ul className="flex flex-col gap-4">
                                        <li className="flex gap-3">
                                            <span className="material-symbols-outlined text-green-500">check_circle</span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-text-primary-dark">Fidelidade</span>
                                                <span className="text-xs text-text-secondary-dark">
                                                    {stats.visitCount > 5 ? 'Cliente recorrente de alta fidelidade.' : 'Em fase de fidelização inicial.'}
                                                </span>
                                            </div>
                                        </li>
                                        <li className="flex gap-3">
                                            <span className="material-symbols-outlined text-blue-500">info</span>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-text-primary-dark">Última Visita</span>
                                                <span className="text-xs text-text-secondary-dark">
                                                    Visitou as {stats.lastVisit ? new Date(stats.lastVisit).toLocaleDateString('pt-BR') : 'nunca'}.
                                                </span>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="flex flex-col gap-4">
                            {appointments.filter(a => a.clientId === client.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).length === 0 ? (
                                <p className="text-center text-text-secondary-dark italic p-8">Nenhum atendimento registrado.</p>
                            ) : (
                                appointments
                                    .filter(a => a.clientId === client.id)
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(app => {
                                        const service = services.find(s => s.id === app.serviceId);
                                        const prof = professionals.find(p => p.id === app.professionalId);
                                        return (
                                            <div key={app.id} className="bg-background-dark p-4 rounded-xl border border-border-dark flex flex-wrap justify-between items-center gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col items-center justify-center bg-surface-dark border border-border-dark w-16 h-16 rounded-lg">
                                                        <span className="text-[10px] font-bold uppercase text-text-secondary-dark">{new Date(app.date).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                                        <span className="text-lg font-black text-text-primary-dark">{new Date(app.date).getDate()}</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-text-primary-dark">{service?.title || 'Serviço Removido'}</span>
                                                        <span className="text-xs text-text-secondary-dark flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-[14px]">person</span>
                                                            {prof?.name || 'Profissional'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-sm font-black text-primary font-mono">
                                                        {app.totalAmount?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                                                    </span>
                                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${app.status === 'Concluído' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                            app.status === 'Cancelado' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                                'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                        }`}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col gap-6">
                                <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                                    <span className="material-symbols-outlined">settings</span> Configuração de Perfil
                                </h3>
                                <div className="bg-background-dark p-6 rounded-xl border border-border-dark flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-text-primary-dark">Cliente VIP</span>
                                            <span className="text-xs text-text-secondary-dark">Destacar cliente como prioridade</span>
                                        </div>
                                        <button
                                            onClick={() => updateClient({ ...client, isVip: !client.isVip } as Client)}
                                            className={`relative w-12 h-6 rounded-full transition-all ${client.isVip ? 'bg-primary' : 'bg-input-dark'}`}
                                        >
                                            <div className={`absolute top-1 h-4 w-4 bg-white rounded-full transition-all ${client.isVip ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-text-secondary-dark uppercase">Profissional Preferido</label>
                                    <select
                                        value={client.preferences?.preferredProfessionalId || ''}
                                        onChange={(e) => updatePreferences({ preferredProfessionalId: e.target.value })}
                                        className="h-12 bg-background-dark border border-border-dark rounded-lg px-4 text-text-primary-dark focus:border-primary outline-none transition-all"
                                    >
                                        <option value="">Nenhum</option>
                                        {professionals.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold text-text-secondary-dark uppercase">Horário de Preferência</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: Terça às 14h"
                                        value={client.preferences?.preferredTime || ''}
                                        onChange={(e) => updatePreferences({ preferredTime: e.target.value })}
                                        className="h-12 bg-background-dark border border-border-dark rounded-lg px-4 text-text-primary-dark focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-6">
                                <h3 className="text-sm font-bold text-primary uppercase flex items-center gap-2">
                                    <span className="material-symbols-outlined">description</span> Observações Fixas
                                </h3>
                                <textarea
                                    rows={10}
                                    placeholder="Ex: Não gosta de navalha, prefere corte na tesoura..."
                                    value={client.preferences?.notes || ''}
                                    onChange={(e) => updatePreferences({ notes: e.target.value })}
                                    className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-text-primary-dark focus:border-primary outline-none transition-all resize-none"
                                />
                                <p className="text-xs text-text-secondary-dark italic text-right">
                                    {isSavingPref ? 'Salvando...' : 'As alterações são salvas automaticamente.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tags' && (
                        <div className="flex flex-col gap-8">
                            <div className="flex flex-col gap-4">
                                <h3 className="text-sm font-bold text-text-secondary-dark uppercase">Tags Associadas</h3>
                                <div className="flex flex-wrap gap-2 min-h-[50px] bg-background-dark/30 p-4 rounded-xl border border-dashed border-border-dark">
                                    {client.tags && client.tags.length > 0 ? (
                                        client.tags.map(tag => (
                                            <span
                                                key={tag.id}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-background-dark border border-border-dark text-text-primary-dark"
                                                style={{ borderLeft: `4px solid ${tag.color}` }}
                                            >
                                                {tag.name}
                                                <button onClick={() => toggleTag(tag.id)} className="hover:text-red-500">
                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                </button>
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-xs text-text-secondary-dark italic">Nenhuma tag associada a este cliente.</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                <h3 className="text-sm font-bold text-text-secondary-dark uppercase">Tags Disponíveis</h3>
                                <div className="flex flex-wrap gap-3">
                                    {crmTags.length === 0 ? (
                                        <div className="flex flex-col gap-4">
                                            <p className="text-xs text-text-secondary-dark italic">Nenhuma tag criada.</p>
                                            <button
                                                onClick={async () => {
                                                    await addCRMTag({ name: 'VIP', color: '#eab308' });
                                                    await addCRMTag({ name: 'Frequente', color: '#22c55e' });
                                                    await addCRMTag({ name: 'Promocional', color: '#3b82f6' });
                                                    await addCRMTag({ name: 'Exigente', color: '#ef4444' });
                                                }}
                                                className="text-xs text-primary underline text-left"
                                            >
                                                Criar tags sugestivas iniciais
                                            </button>
                                        </div>
                                    ) : (
                                        crmTags.map(tag => {
                                            const isActive = client.tags?.some(t => t.id === tag.id);
                                            return (
                                                <button
                                                    key={tag.id}
                                                    onClick={() => toggleTag(tag.id)}
                                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${isActive
                                                            ? 'bg-primary text-background-dark border-primary'
                                                            : 'bg-background-dark text-text-secondary-dark border-border-dark hover:border-text-secondary-dark'
                                                        }`}
                                                >
                                                    {tag.name}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notes' && (
                        <div className="flex flex-col gap-8 h-full">
                            <form onSubmit={handleAddNote} className="flex flex-col gap-3 shrink-0">
                                <label className="text-xs font-bold text-text-secondary-dark uppercase">Nova Anotação de CRM</label>
                                <div className="flex flex-col gap-3">
                                    <textarea
                                        rows={3}
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Escreva algo sobre este atendimento ou observação relevante..."
                                        className="w-full bg-background-dark border border-border-dark rounded-xl p-4 text-text-primary-dark focus:border-primary outline-none transition-all resize-none"
                                    />
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="px-6 py-2.5 bg-primary text-background-dark rounded-lg text-sm font-black shadow-glow-primary hover:opacity-90 transition-all flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">add_comment</span>
                                            Adicionar Registro
                                        </button>
                                    </div>
                                </div>
                            </form>

                            <div className="flex-1 flex flex-col gap-4 overflow-y-visible">
                                <h3 className="text-sm font-bold text-text-secondary-dark uppercase">Histórico de Mensagens</h3>
                                <div className="flex flex-col gap-4">
                                    {isLoadingNotes ? (
                                        <p className="text-center text-text-secondary-dark italic text-xs">Carregando histórico...</p>
                                    ) : notes.length === 0 ? (
                                        <p className="text-center text-text-secondary-dark italic text-xs">Nenhum registro histórico.</p>
                                    ) : (
                                        notes.map(note => (
                                            <div key={note.id} className="bg-background-dark p-4 rounded-xl border border-border-dark relative group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="text-[10px] font-black text-primary uppercase">{note.authorName}</span>
                                                    <span className="text-[10px] text-text-secondary-dark font-mono">{new Date(note.createdAt).toLocaleString('pt-BR')}</span>
                                                </div>
                                                <p className="text-sm text-text-primary-dark leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Insight */}
                <div className="p-4 bg-background-dark shrink-0 border-t border-border-dark flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined text-sm">lightbulb</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest italic">Insight CRM Vizzu</span>
                    </div>
                    {stats && stats.lastVisit && (
                        <span className="text-[10px] font-bold text-text-secondary-dark uppercase">
                            Status: {stats.status} • Última visita há {Math.floor((new Date().getTime() - new Date(stats.lastVisit).getTime()) / (1000 * 60 * 60 * 24))} dias
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CRMProfileModal;

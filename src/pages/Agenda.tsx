import React, { useState, useMemo } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Appointment } from '../types';
import AppointmentModal from '../components/AppointmentModal';
import CheckoutModal from '../components/CheckoutModal';
import ConflictModal from '../components/ConflictModal';

const Agenda = () => {
    const { tenant, user, isLoading: isLoadingTenant } = useTenant();
    const { appointments, clients, professionals, services, addAppointment, updateAppointment, deleteAppointment, isLoadingData } = useData();

    const isBarber = user?.role === 'barber';
    const canCheckout = !isBarber || tenant?.allowBarberCheckout !== false;

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [filterProfessionalId, setFilterProfessionalId] = useState<string | 'all'>('all');

    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | undefined>(undefined);
    const [appointmentToCheckout, setAppointmentToCheckout] = useState<Appointment | undefined>(undefined);

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary font-display">Carregando Agenda...</div>;
    }

    const tenantProfessionals = professionals.filter(p => p.tenantId === tenant?.id);

    // Optimized filtering and grouping
    const dailyAppointments = useMemo(() => {
        return appointments.filter(a => {
            const appDate = new Date(a.date);
            const isSameDay = appDate.getDate() === selectedDate.getDate() &&
                appDate.getMonth() === selectedDate.getMonth() &&
                appDate.getFullYear() === selectedDate.getFullYear();

            const matchesProfessional = filterProfessionalId === 'all' || a.professionalId === filterProfessionalId;

            return a.tenantId === tenant?.id && isSameDay && matchesProfessional;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [appointments, selectedDate, filterProfessionalId, tenant]);

    const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'tenantId'>): Promise<boolean> => {
        if (!tenant) return false;
        const result = await addAppointment(appointmentData);
        if (result.success) return true;
        if (result.conflict) setIsConflictModalOpen(true);
        return false;
    };

    const handleUpdateAppointmentData = async (appointmentData: Omit<Appointment, 'id' | 'tenantId'>, baseAppointment?: Appointment): Promise<boolean> => {
        const target = baseAppointment || appointmentToEdit;
        if (!tenant || !target) return false;

        const result = await updateAppointment({ ...target, ...appointmentData });
        if (result.success) return true;

        if (result.conflict) {
            setIsConflictModalOpen(true);
        } else {
            alert(`Falha ao salvar: ${result.error || 'Erro desconhecido'}`);
        }
        return false;
    };

    const openEditModal = (appointment: Appointment) => {
        setAppointmentToEdit(appointment);
        setIsAppointmentModalOpen(true);
    };

    const openNewAppointmentModal = () => {
        setAppointmentToEdit(undefined);
        setIsAppointmentModalOpen(true);
    };

    const openCheckoutModal = (appointment: Appointment) => {
        setAppointmentToCheckout(appointment);
        setIsCheckoutModalOpen(true);
    };

    const getClient = (id: string) => clients.find(c => c.id === id);
    const getProfessional = (id: string) => professionals.find(p => p.id === id);
    const getService = (id: string) => services.find(s => s.id === id);

    const isToday = (date: Date) => {
        const now = new Date();
        return date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
    };

    const handleStatusAction = async (appointment: Appointment, e: React.MouseEvent) => {
        e.stopPropagation();
        console.log("handleStatusAction clicado para:", appointment.status);

        if (appointment.status === 'Agendado' || appointment.status === 'Confirmado') {
            console.log("Tentando iniciar atendimento...");
            await handleUpdateAppointmentData({
                clientId: appointment.clientId,
                professionalId: appointment.professionalId,
                serviceId: appointment.serviceId,
                date: appointment.date,
                status: 'Em Atendimento',
                notes: appointment.notes
            }, appointment);
            console.log("Início de atendimento solicitado", appointment.id);
        } else if (appointment.status === 'Em Atendimento') {
            if (!canCheckout) {
                alert('Atenção: Somente o administrador pode concluir atendimentos e realizar cobranças nesta barbearia.');
                return;
            }
            openCheckoutModal(appointment);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-10 max-w-5xl mx-auto">
            {/* TOOLBAR SUPERIOR */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex flex-col gap-1">
                    <h1 className="text-text-primary-dark text-4xl font-extrabold font-display">Agenda</h1>
                    <div className="flex items-center gap-4">
                        <div className="flex bg-surface-dark border border-border-dark rounded-xl p-1 shadow-lg">
                            <button
                                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                                className="p-2 hover:bg-white/5 rounded-lg text-text-secondary-dark transition-all"
                            >
                                <span className="material-symbols-outlined text-xl">chevron_left</span>
                            </button>
                            <div className="px-4 py-2 flex flex-col items-center min-w-[180px]">
                                <span className="text-xs font-extrabold uppercase tracking-widest text-primary">
                                    {isToday(selectedDate) ? 'Hoje' : selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </span>
                                <span className="text-sm font-bold text-text-primary-dark">
                                    {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                                className="p-2 hover:bg-white/5 rounded-lg text-text-secondary-dark transition-all"
                            >
                                <span className="material-symbols-outlined text-xl">chevron_right</span>
                            </button>
                        </div>

                        {!isToday(selectedDate) && (
                            <button
                                onClick={() => setSelectedDate(new Date())}
                                className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary-dark hover:text-primary transition-colors border-b border-border-dark"
                            >
                                Voltar para hoje
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <button
                        onClick={openNewAppointmentModal}
                        className="flex-1 md:flex-none bg-primary text-background-dark px-8 h-14 rounded-2xl font-extrabold uppercase text-xs shadow-glow-primary hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-xl">add_circle</span>
                        Novo Agendamento
                    </button>
                </div>
            </header>

            {/* SELETOR DE PROFISSIONAIS (FILTRO) */}
            <div className="flex items-center gap-4 bg-surface-dark/50 p-3 rounded-2xl border border-border-dark overflow-x-auto no-scrollbar shadow-inner">
                <button
                    onClick={() => setFilterProfessionalId('all')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition-all whitespace-nowrap 
                        ${filterProfessionalId === 'all' ? 'bg-primary text-background-dark shadow-glow-primary' : 'text-text-secondary-dark hover:text-white'}`}
                >
                    Todos
                </button>
                <div className="w-px h-6 bg-border-dark mx-1 opacity-50"></div>
                {tenantProfessionals.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setFilterProfessionalId(p.id)}
                        className={`flex items-center gap-3 px-5 py-2 rounded-xl transition-all whitespace-nowrap border
                            ${filterProfessionalId === p.id
                                ? 'bg-background-dark border-primary/50 text-text-primary-dark shadow-lg ring-1 ring-primary/20'
                                : 'bg-transparent border-transparent text-text-secondary-dark hover:border-border-dark hover:text-white'}`}
                    >
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center font-bold text-[10px] uppercase
                            ${filterProfessionalId === p.id ? 'bg-primary text-background-dark' : 'bg-surface-dark text-text-secondary-dark'}`}>
                            {p.name.charAt(0)}
                        </div>
                        <span className="text-[10px] font-extrabold uppercase tracking-widest">{p.name.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* LISTA DE ATENDIMENTOS (TIMELINE) */}
            <div className="flex flex-col gap-4">
                {dailyAppointments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-surface-dark/20 rounded-[32px] border-2 border-dashed border-border-dark/50">
                        <div className="h-20 w-20 rounded-full bg-surface-dark flex items-center justify-center mb-6 border border-border-dark">
                            <span className="material-symbols-outlined text-4xl text-text-secondary-dark opacity-30">calendar_add_on</span>
                        </div>
                        <h3 className="text-xl font-extrabold text-text-primary-dark mb-2">Sua agenda está livre!</h3>
                        <p className="text-text-secondary-dark text-sm max-w-sm mb-8">
                            Não há agendamentos para {filterProfessionalId === 'all' ? 'este dia' : 'este profissional'} nesta data. Aproveite para organizar o espaço ou prospectar clientes!
                        </p>
                        <button
                            onClick={openNewAppointmentModal}
                            className="bg-surface-dark border border-border-dark text-primary px-8 py-3 rounded-xl font-extrabold uppercase text-[10px] tracking-widest hover:bg-primary hover:text-background-dark transition-all"
                        >
                            Criar Primeiro Agendamento
                        </button>
                    </div>
                ) : (
                    dailyAppointments.map((appointment, idx) => {
                        const client = getClient(appointment.clientId);
                        const service = getService(appointment.serviceId);
                        const prof = getProfessional(appointment.professionalId);

                        const time = new Date(appointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        const isCompleted = appointment.status === 'Concluído';
                        const isCanceled = appointment.status === 'Cancelado';
                        const isInProgress = appointment.status === 'Em Atendimento';

                        // Check if it's the current time range
                        const appDate = new Date(appointment.date);
                        const now = new Date();
                        const isLiveNow = isToday(selectedDate) &&
                            now.getHours() === appDate.getHours() &&
                            Math.abs(now.getMinutes() - appDate.getMinutes()) < 45;

                        return (
                            <div
                                key={appointment.id}
                                onClick={() => openEditModal(appointment)}
                                className={`group relative flex items-stretch gap-6 p-1 transition-all hover:scale-[1.01] cursor-pointer 
                                    ${isCanceled ? 'opacity-40 grayscale-[0.8]' : ''}`}
                            >
                                {/* Time Side Indicator */}
                                <div className="flex flex-col items-center justify-center min-w-[70px] py-4">
                                    <span className={`text-lg font-black font-mono transition-colors ${isInProgress ? 'text-yellow-500' : isLiveNow ? 'text-primary' : 'text-text-secondary-dark'}`}>
                                        {time}
                                    </span>
                                    {isLiveNow && !isCompleted && !isCanceled && (
                                        <span className="text-[8px] font-black uppercase tracking-tighter text-primary animate-pulse">Agora</span>
                                    )}
                                </div>

                                {/* Appointment Card */}
                                <div className={`flex-1 bg-surface-dark rounded-3xl border border-border-dark p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all shadow-xl
                                    ${isInProgress ? 'border-yellow-500/50 shadow-yellow-500/5 hover:border-yellow-500 ring-1 ring-yellow-500/20' :
                                        isLiveNow ? 'border-primary/50 shadow-glow-primary/5 hover:border-primary' :
                                            'hover:border-border-dark/80 hover:bg-white/[0.02]'}`}>

                                    <div className="flex flex-1 items-center gap-5 w-full">
                                        {/* Client Info - Avatar Minorado */}
                                        <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-surface-dark to-background-dark border border-border-dark flex items-center justify-center text-primary font-extrabold text-lg shadow-inner">
                                            {client?.name.charAt(0)}
                                        </div>

                                        <div className="flex flex-col flex-1 overflow-hidden">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="text-lg font-extrabold text-text-primary-dark truncate">{client?.name || 'Cliente Removido'}</h4>
                                                {isCompleted && <span className="material-symbols-outlined text-green-500 text-sm">check_circle</span>}

                                                {/* Label Em Atendimento */}
                                                {isInProgress && (
                                                    <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 text-[10px] font-black px-2.5 py-1 rounded-full border border-yellow-500/30 uppercase tracking-widest animate-pulse">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"></span>
                                                        Em Atendimento
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1">
                                                <div className="flex items-center gap-1.5 text-text-secondary-dark/80 bg-background-dark/30 px-2 py-0.5 rounded-lg border border-border-dark/30">
                                                    <span className="material-symbols-outlined text-[14px] text-primary/60">dry_cleaning</span>
                                                    <span className="text-[11px] font-bold">{service?.title || 'Serviço'}</span>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[14px] text-blue-400">content_cut</span>
                                                    <span className="text-xs font-extrabold uppercase tracking-widest text-text-primary-dark/90">
                                                        {prof?.name || 'Barbeiro'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Financials & Status */}
                                    <div className="flex items-center gap-6 w-full md:w-auto md:border-l md:border-border-dark/30 md:pl-6 border-t md:border-t-0 pt-4 md:pt-0">
                                        <div className="flex flex-col items-start md:items-end justify-center min-w-[100px]">
                                            <span className="text-[10px] font-extrabold text-text-secondary-dark uppercase tracking-widest opacity-40">Valor do serviço</span>
                                            <span className="text-xl font-black font-mono text-text-primary-dark">R$ {service?.price.toFixed(2)}</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {!isCompleted && !isCanceled ? (
                                                <button
                                                    onClick={(e) => handleStatusAction(appointment, e)}
                                                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95
                                                        ${isInProgress
                                                            ? (canCheckout
                                                                ? 'bg-green-500 text-background-dark shadow-green-500/20 hover:bg-green-400'
                                                                : 'bg-background-dark text-yellow-500/50 border border-yellow-500/20 cursor-not-allowed')
                                                            : 'bg-primary text-background-dark shadow-glow-primary hover:opacity-90'}`}
                                                >
                                                    {isInProgress ? (canCheckout ? 'Concluir' : 'Em Atendimento') : 'Iniciar'}
                                                </button>
                                            ) : (
                                                <div className={`px-4 py-2 rounded-xl border flex items-center gap-2
                                                    ${isCompleted ? 'bg-blue-500/5 border-blue-500/20 text-blue-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{isCompleted ? 'Concluído' : 'Cancelado'}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSave={appointmentToEdit ? handleUpdateAppointmentData : handleSaveAppointment}
                onDelete={deleteAppointment}
                appointmentToEdit={appointmentToEdit}
                selectedDate={selectedDate}
            />

            {
                isCheckoutModalOpen && appointmentToCheckout && (
                    <CheckoutModal
                        isOpen={isCheckoutModalOpen}
                        onClose={() => setIsCheckoutModalOpen(false)}
                        appointment={appointmentToCheckout}
                        servicePrice={getService(appointmentToCheckout.serviceId)?.price || 0}
                    />
                )
            }

            <ConflictModal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                message="Este horário já está ocupado. Por favor, atualize a página e verifique o horário desejado."
            />
        </div >
    );
};

export default Agenda;
import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Appointment } from '../types';
import AppointmentModal from '../components/AppointmentModal';
import CheckoutModal from '../components/CheckoutModal'; // Importar o novo modal
import ConflictModal from '../components/ConflictModal';

const LOCAL_STORAGE_DATE_KEY = 'agendaSelectedDate';

const Agenda = () => {
    const { tenant, user, isLoading: isLoadingTenant } = useTenant(); // Adicionar user
    const { appointments, clients, professionals, services, addAppointment, updateAppointment, deleteAppointment, isLoadingData } = useData();

    // Inicializa selectedDate a partir do localStorage ou com a data atual
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        if (typeof window !== 'undefined') {
            const storedDate = localStorage.getItem(LOCAL_STORAGE_DATE_KEY);
            if (storedDate) {
                return new Date(storedDate);
            }
        }
        return new Date();
    });

    // Salva selectedDate no localStorage sempre que ela muda
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_STORAGE_DATE_KEY, selectedDate.toISOString());
        }
    }, [selectedDate]);

    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
    const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
    const [appointmentToEdit, setAppointmentToEdit] = useState<Appointment | undefined>(undefined);
    const [appointmentToCheckout, setAppointmentToCheckout] = useState<Appointment | undefined>(undefined);

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Agenda...</div>;
    }

    // Filter appointments for current tenant and selected date
    const tenantAppointments = appointments.filter(a => {
        const appDate = new Date(a.date);
        return a.tenantId === tenant?.id &&
            appDate.getDate() === selectedDate.getDate() &&
            appDate.getMonth() === selectedDate.getMonth() &&
            appDate.getFullYear() === selectedDate.getFullYear();
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Ordenar por horário

    const handleSaveAppointment = async (appointmentData: Omit<Appointment, 'id' | 'tenantId'>): Promise<boolean> => {
        console.log('handleSaveAppointment chamado com:', appointmentData);
        if (!tenant) {
            console.error('Tenant não encontrado');
            return false;
        }

        const result = await addAppointment(appointmentData);
        if (result.success) {
            console.log('Agendamento criado com sucesso');
            return true;
        }

        if (result.conflict) {
            setIsConflictModalOpen(true);
        } else {
            console.error('Falha ao criar agendamento:', result.error);
        }
        return false;
    };

    const handleUpdateAppointment = async (appointmentData: Omit<Appointment, 'id' | 'tenantId'>): Promise<boolean> => {
        if (!tenant || !appointmentToEdit) return false;

        const result = await updateAppointment({ ...appointmentToEdit, ...appointmentData });
        if (result.success) {
            return true;
        }

        if (result.conflict) {
            setIsConflictModalOpen(true);
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

    // Helper to get names
    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Cliente Removido';
    const getProfessionalName = (id: string) => professionals.find(p => p.id === id)?.name || 'Profissional Removido';
    const getServiceName = (id: string) => services.find(s => s.id === id)?.title || 'Serviço Removido';
    const getServicePrice = (id: string) => services.find(s => s.id === id)?.price || 0;


    const timeSlots = Array.from({ length: 25 }, (_, i) => 8 + (i * 0.5)); // 8:00 to 20:00 (30 min intervals)

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-text-primary-dark text-4xl font-black">Agenda</h1>
                    <div className="flex items-center gap-2 bg-surface-dark p-1 rounded-lg border border-border-dark">
                        <button
                            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))}
                            className="p-1 hover:text-primary text-text-secondary-dark transition-colors"
                        >
                            <span className="material-symbols-outlined">chevron_left</span>
                        </button>
                        <span className="font-bold text-text-primary-dark min-w-[150px] text-center">
                            {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                        <button
                            onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))}
                            className="p-1 hover:text-primary text-text-secondary-dark transition-colors"
                        >
                            <span className="material-symbols-outlined">chevron_right</span>
                        </button>
                    </div>
                </div>
                <button
                    onClick={openNewAppointmentModal}
                    className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    Novo Agendamento
                </button>
            </header>

            <div className="flex-1 bg-surface-dark rounded-xl border border-border-dark overflow-y-auto">
                <div className="grid grid-cols-[80px_1fr] divide-x divide-border-dark min-h-full">
                    <div className="divide-y divide-border-dark">
                        {timeSlots.map(hour => (
                            <div key={hour} className="h-16 flex items-start justify-center pt-2 text-sm font-bold text-text-secondary-dark">
                                {Math.floor(hour)}:{hour % 1 === 0 ? '00' : '30'}
                            </div>
                        ))}
                    </div>
                    <div className="relative divide-y divide-border-dark">
                        {timeSlots.map(hour => (
                            <div key={hour} className="h-16 relative group hover:bg-white/5 transition-colors">
                                {/* Render appointments for this slot */}
                                {tenantAppointments
                                    .filter(a => {
                                        const date = new Date(a.date);
                                        const appHour = date.getHours();
                                        const appMinutes = date.getMinutes();
                                        const slotHour = Math.floor(hour);
                                        const isHalfHourSlot = hour % 1 !== 0;

                                        // Match if hours are same AND minutes match the slot (0-29 for full hour, 30-59 for half hour)
                                        return appHour === slotHour && (isHalfHourSlot ? appMinutes >= 30 : appMinutes < 30);
                                    })
                                    .map(appointment => {
                                        const isCompleted = appointment.status === 'Concluído';
                                        const isCanceled = appointment.status === 'Cancelado';
                                        const isInProgress = appointment.status === 'Em Atendimento';

                                        const handleCardClick = () => {
                                            openEditModal(appointment);
                                        };

                                        const handleStatusAction = async (e: React.MouseEvent) => {
                                            e.stopPropagation();
                                            if (appointment.status === 'Agendado' || appointment.status === 'Confirmado') {
                                                await handleUpdateAppointment({ ...appointment, status: 'Em Atendimento' });
                                            } else if (appointment.status === 'Em Atendimento') {
                                                openCheckoutModal(appointment);
                                            }
                                        };

                                        return (
                                            <div
                                                key={appointment.id}
                                                onClick={handleCardClick}
                                                className={`absolute left-2 right-2 top-1 bottom-1 bg-card-dark border-l-4 rounded px-3 py-1 shadow-lg flex items-center justify-between cursor-pointer hover:brightness-110 transition-all z-10
                                                    ${isCompleted ? 'border-blue-500 opacity-80' :
                                                        isCanceled ? 'border-red-500 opacity-60' :
                                                            isInProgress ? 'border-yellow-500 ring-1 ring-yellow-500/50' :
                                                                'border-primary'}`}
                                            >
                                                {/* Left Section: Name & Service */}
                                                <div className="flex items-center gap-4 overflow-hidden">
                                                    <span className="font-bold text-text-primary-dark text-sm truncate min-w-[100px] max-w-[150px]">{getClientName(appointment.clientId)}</span>

                                                    <div className="h-4 w-px bg-border-dark/50 mx-2 hidden sm:block"></div>

                                                    <span className="text-xs text-text-secondary-dark truncate max-w-[120px] hidden sm:block" title={getServiceName(appointment.serviceId)}>
                                                        {getServiceName(appointment.serviceId)}
                                                    </span>
                                                </div>

                                                {/* Middle Section: Professional */}
                                                <div className="text-[10px] text-text-secondary-dark/70 flex items-center gap-1 truncate hidden md:flex">
                                                    <span className="material-symbols-outlined text-[10px]">person</span>
                                                    <span>{getProfessionalName(appointment.professionalId)}</span>
                                                </div>

                                                {/* Right Section: Status & Actions */}
                                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                                    {/* In-progress Indicator */}
                                                    {isInProgress && (
                                                        <span className="flex h-2 w-2 rounded-full bg-yellow-500 animate-pulse" title="Em Atendimento"></span>
                                                    )}

                                                    {/* Price (if completed) */}
                                                    {isCompleted && appointment.totalAmount !== undefined && (
                                                        <span className="text-xs text-green-500 font-bold hidden lg:block">
                                                            R$ {appointment.totalAmount.toFixed(2)}
                                                        </span>
                                                    )}

                                                    {/* Action Button or Status Badge */}
                                                    <div onClick={(e) => e.stopPropagation()}>
                                                        {!isCompleted && !isCanceled ? (
                                                            <button
                                                                onClick={handleStatusAction}
                                                                className={`px-3 py-1 rounded text-[10px] font-bold transition-all shadow-sm uppercase tracking-wide
                                                                    ${isInProgress
                                                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                                                        : 'bg-primary text-background-dark hover:opacity-90'
                                                                    }`}
                                                            >
                                                                {isInProgress ? 'Concluir' : 'Iniciar'}
                                                            </button>
                                                        ) : (
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isCompleted ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
                                                                }`}>
                                                                {isCompleted ? 'Concluído' : 'Cancelado'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <AppointmentModal
                isOpen={isAppointmentModalOpen}
                onClose={() => setIsAppointmentModalOpen(false)}
                onSave={appointmentToEdit ? handleUpdateAppointment : handleSaveAppointment}
                onDelete={deleteAppointment}
                appointmentToEdit={appointmentToEdit}
                selectedDate={selectedDate}
            />

            {isCheckoutModalOpen && appointmentToCheckout && (
                <CheckoutModal
                    isOpen={isCheckoutModalOpen}
                    onClose={() => setIsCheckoutModalOpen(false)}
                    appointment={appointmentToCheckout}
                    servicePrice={getServicePrice(appointmentToCheckout.serviceId)}
                />
            )}

            <ConflictModal
                isOpen={isConflictModalOpen}
                onClose={() => setIsConflictModalOpen(false)}
                message="O barbeiro já tem um agendamento neste horário."
            />
        </div>
    );
};

export default Agenda;
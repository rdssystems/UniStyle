import React, { useState, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';
import { Professional, Service, Appointment, Client, DailyHours, DayOfWeek, PublicIdentificationResponse, PublicTokenVerificationResponse } from '../types';
import { supabase } from '../integrations/supabase/client'; // Importar o cliente Supabase

// --- Helpers for Masking ---
const maskCPF = (value: string) => {
    return value
        .replace(/\D/g, '') // Remove non-digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .replace(/(-\d{2})\d+?$/, '$1'); // Capture max length
};

const maskPhone = (value: string) => {
    return value.replace(/\D/g, '').slice(0, 11);
};


const PublicBooking = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { professionals, services, appointments, addAppointment, addClient, isLoadingData, refreshData } = useData();

    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [clientName, setClientName] = useState<string>('');
    const [clientPhone, setClientPhone] = useState<string>('');
    const [currentProfessionalIndex, setCurrentProfessionalIndex] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    // Ensure URL has tenant param if logged in
    useEffect(() => {
        if (tenant?.slug) {
            const currentTenantParam = searchParams.get('tenant');
            if (currentTenantParam !== tenant.slug) {
                setSearchParams(prev => {
                    prev.set('tenant', tenant.slug);
                    return prev;
                }, { replace: true });
            }
        }
    }, [tenant?.slug, searchParams, setSearchParams]);

    // Auth State
    const [identificationStep, setIdentificationStep] = useState<'loading' | 'identify' | 'booking'>('loading');
    const [authPhone, setAuthPhone] = useState('');
    const [authName, setAuthName] = useState('');
    const [authCpf, setAuthCpf] = useState('');
    const [isRegistering, setIsRegistering] = useState(false); // Toggle between Login and Register
    const [identifiedClient, setIdentifiedClient] = useState<{ id: string, name: string, phone: string, cpf?: string } | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isBookingSuccess, setIsBookingSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHours, setShowHours] = useState(false);
    const [showAppointments, setShowAppointments] = useState(false);
    const [clientAppointments, setClientAppointments] = useState<any[]>([]);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

    const tenantProfessionals = professionals.filter(p => p.tenantId === tenant?.id);
    const tenantServices = services.filter(s => s.tenantId === tenant?.id);
    const tenantAppointments = appointments.filter(a => a.tenantId === tenant?.id);

    // Update selectedProfessionalId when carousel index changes
    useEffect(() => {
        if (tenantProfessionals.length > 0 && identificationStep === 'booking') {
            setSelectedProfessionalId(tenantProfessionals[currentProfessionalIndex]?.id || '');
        }
    }, [currentProfessionalIndex, tenantProfessionals, identificationStep]);



    const getDayOfWeek = (date: Date): DayOfWeek => {
        const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    };

    const getBusinessHoursForDay = (date: Date): DailyHours | undefined => {
        if (!tenant?.businessHours) return undefined;
        const day = getDayOfWeek(date);
        const hours = tenant.businessHours[day];
        return hours;
    };

    const generateTimeSlots = useMemo(() => {
        if (!selectedProfessionalId || !selectedServiceId || !tenant || isLoadingData) return [];

        const service = tenantServices.find(s => s.id === selectedServiceId);
        if (!service) return [];

        const businessHours = getBusinessHoursForDay(selectedDate);
        if (!businessHours || businessHours.isClosed) return [];

        const slots: { time: string; available: boolean }[] = [];
        const [openHour, openMinute] = businessHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = businessHours.close.split(':').map(Number);

        let currentTime = new Date(selectedDate);
        currentTime.setHours(openHour, openMinute, 0, 0);

        const closingTime = new Date(selectedDate);
        closingTime.setHours(closeHour, closeMinute, 0, 0);

        const now = new Date();
        if (selectedDate.toDateString() === now.toDateString() && currentTime.getTime() < now.getTime()) {
            const currentMinutes = now.getMinutes();
            const interval = 5;
            const remainder = currentMinutes % interval;
            const minutesToAdd = remainder === 0 ? 0 : interval - remainder;

            now.setMinutes(currentMinutes + minutesToAdd, 0, 0);
            currentTime = now;
        }


        while (currentTime.getTime() + (service.durationMinutes * 60 * 1000) <= closingTime.getTime()) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(currentTime.getTime() + (service.durationMinutes * 60 * 1000));

            const isSlotBooked = tenantAppointments.some(app => {
                const appStart = new Date(app.date);
                const appService = tenantServices.find(s => s.id === app.serviceId);
                const appEnd = new Date(appStart.getTime() + (appService?.durationMinutes || 0) * 60 * 1000);

                return app.professionalId === selectedProfessionalId &&
                    app.status !== 'Cancelado' &&
                    (
                        (slotStart < appEnd && slotEnd > appStart)
                    );
            });

            slots.push({
                time: slotStart.toTimeString().slice(0, 5),
                available: !isSlotBooked
            });

            currentTime.setMinutes(currentTime.getMinutes() + 30);
        }

        return slots;
    }, [selectedProfessionalId, selectedServiceId, selectedDate, tenant, tenantServices, tenantAppointments, isLoadingData]);

    const datesToDisplay = useMemo(() => {
        if (!tenant?.businessHours) return [];
        const dates: Date[] = [];
        const daysToShow = tenant.businessHours.bookingWindowDays || 30;
        let daysFound = 0;
        let currentIter = 0;
        const maxIter = 60;

        while (daysFound < daysToShow && currentIter < maxIter) {
            const date = new Date();
            date.setDate(date.getDate() + currentIter);

            const hours = getBusinessHoursForDay(date);
            if (hours && !hours.isClosed) {
                dates.push(date);
                daysFound++;
            }
            currentIter++;
        }
        return dates;
    }, [tenant?.businessHours, getBusinessHoursForDay]);

    // Auth Logic
    const verifyToken = async () => {
        const token = Cookies.get('barber_client_token');
        if (!token) {
            setIdentificationStep('identify');
            return;
        }

        const { data, error } = await supabase.rpc('public_verify_token', { p_token: token });

        if (data && (data as any).valid) {
            const client = (data as any).client;
            setIdentifiedClient(client);
            setClientName(client.name);
            setClientPhone(client.phone);
            setIdentificationStep('booking');
        } else {
            Cookies.remove('barber_client_token');
            setIdentificationStep('identify');
        }
    };

    useEffect(() => {
        if (tenant) {
            verifyToken();
        }
    }, [tenant?.id]);

    const handleIdentification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;
        setIsAuthenticating(true);

        const cleanPhone = authPhone.replace(/\D/g, '');
        const cleanCpf = authCpf.replace(/\D/g, '');

        const payload = {
            p_tenant_id: tenant.id,
            p_cpf: cleanCpf || null,
            p_phone: isRegistering ? cleanPhone : null,
            p_name: isRegistering ? authName : null
        };

        const { data, error } = await supabase.rpc('public_identify_client', payload);

        setIsAuthenticating(false);

        if (error) {
            alert('Erro ao identificar. Tente novamente.');
            console.error(error);
            return;
        }

        const response = data as PublicIdentificationResponse;

        if (response.status === 'success' && response.token && response.client) {
            Cookies.set('barber_client_token', response.token, { expires: 365, secure: true, sameSite: 'Strict' });
            setIdentifiedClient(response.client);
            setClientName(response.client.name);
            setClientPhone(response.client.phone);
            setIdentificationStep('booking');
        } else if (response.status === 'ambiguous') {
            alert(response.message || 'Múltiplos clientes encontrados. Por favor, identifique-se pelo CPF ou Telefone.');
            setAuthName('');
        } else {
            if (response.message?.includes('Phone is required')) {
                alert('CPF não encontrado. Por favor, clique em "Primeiro Acesso?" para se cadastrar.');
            } else {
                alert(response.message || 'Erro desconhecido.');
            }
        }
    };

    const handleLogout = () => {
        Cookies.remove('barber_client_token');
        setIdentifiedClient(null);
        setClientName('');
        setClientPhone('');
        setAuthCpf('');
        setAuthName('');
        setAuthPhone('');
        setIdentificationStep('identify');
        setSelectedProfessionalId('');
        setSelectedServiceId('');
        setSelectedDate(new Date());
        setSelectedTime('');
        setShowAppointments(false);
        setClientAppointments([]);
    };

    const fetchClientAppointments = async () => {
        if (!identifiedClient) return;

        try {
            const token = Cookies.get('barber_client_token');
            if (!token) return;

            setIsLoadingAppointments(true);
            const { data, error } = await supabase.rpc('public_get_client_appointments', { p_token: token });
            setIsLoadingAppointments(false);

            if (error) {
                console.error('Error fetching appointments:', error);
                alert('Erro ao buscar agendamentos.');
                return;
            }

            setClientAppointments(data || []);
        } catch (error) {
            console.error('Unexpected error fetching appointments:', error);
            setIsLoadingAppointments(false);
        }
    };

    useEffect(() => {
        if (showAppointments && identifiedClient) {
            fetchClientAppointments();
        }
    }, [showAppointments, identifiedClient]);

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || !selectedProfessionalId || !selectedServiceId || !selectedDate || !selectedTime || !clientName || !clientPhone) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        setIsSubmitting(true);

        let clientId = identifiedClient?.id;

        if (!clientId) {
            const newClientData: Omit<Client, 'id' | 'tenantId'> = {
                name: clientName,
                phone: clientPhone,
                status: 'Novo',
                points: 0,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`
            };

            const createdClient = await addClient(newClientData);
            if (!createdClient) {
                alert('Erro ao cadastrar cliente. Tente novamente.');
                setIsSubmitting(false);
                return;
            }
            clientId = createdClient.id;
        }

        const dateTime = new Date(selectedDate);
        const [hour, minute] = selectedTime.split(':').map(Number);
        dateTime.setHours(hour, minute, 0, 0);

        const newAppointmentData: Omit<Appointment, 'id' | 'tenantId'> = {
            clientId: clientId,
            professionalId: selectedProfessionalId,
            serviceId: selectedServiceId,
            date: dateTime.toISOString(),
            status: 'Agendado',
            notes: `Agendamento público por ${clientName}`
        };

        const result = await addAppointment(newAppointmentData);

        if (result.success) {
            setIsBookingSuccess(true);
            setSelectedProfessionalId('');
            setSelectedServiceId('');
            setSelectedDate(new Date());
            setSelectedTime('');
        } else if (result.conflict || result.error?.includes('Falha ao salvar atendimento')) {
            // Se houve conflito ou erro de salvamento (que geralmente é conflito no banco), forçamos refresh
            await refreshData();
            alert('Sentimos muito, o horário acabou de ser ocupado. Por favor, escolha outro horário.');
        } else {
            alert(result.error || 'Erro ao agendar serviço. Tente novamente.');
        }
        setIsSubmitting(false);
    };

    const handleCancelAppointment = async (appointmentId: string) => {
        if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return;

        const token = Cookies.get('barber_client_token');
        if (!token) return;

        const { data, error } = await supabase.rpc('public_cancel_appointment', {
            p_appointment_id: appointmentId,
            p_token: token,
            p_reason: 'Cancelado pelo cliente via Web'
        });

        if (error) {
            console.error('Erro ao cancelar:', error);
            alert('Erro ao cancelar agendamento.');
            return;
        }

        const response = data as { success: boolean, error?: string };

        if (!response.success) {
            alert(response.error || 'Erro ao cancelar agendamento.');
        } else {
            alert('Agendamento cancelado com sucesso!');
            fetchClientAppointments();
        }
    };

    if (isLoadingTenant || isLoadingData) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-dark text-text-primary-dark">
                Carregando informações da barbearia...
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-dark text-text-primary-dark p-8 text-center flex-col gap-4">
                <span className="material-symbols-outlined text-6xl text-text-secondary-dark">store_off</span>
                <h2 className="text-xl font-bold">Barbearia não encontrada</h2>
                <p className="text-text-secondary-dark max-w-md">
                    Parece que o link que você acessou está incompleto ou incorreto.
                </p>
                <div className="bg-input-dark p-4 rounded-lg text-sm text-left w-full max-w-md border border-border-dark">
                    <p className="font-bold mb-2">Como acessar:</p>
                    <p className="text-text-secondary-dark">Use o link fornecido pela barbearia, que deve se parecer com:</p>
                    <code className="block mt-2 text-primary bg-background-dark p-2 rounded">
                        /booking?tenant=nome-da-barbearia
                    </code>
                </div>
            </div>
        );
    }

    const backgroundImageUrl = tenant?.theme.backgroundImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG_oTiQQfPMIcDpRhMvtR9Fgg25nGTX94ZkOYStzVYYXRtGRXvMCtPEfCwuq0Ww5IUpw1uysJhOo3BhC1Cy0Rje0OUDH37XxU-Qg6kX1RnlS9tL4CY5x52yAuCGfGz7q_GNjdUHpRBykgYbWCaf9Cbodw5IOEXWK5FrZuwg_AOpg71W_ikOsMIpeg7kDZVCJubkJrKWN8kKXXH43vuHMqZ3-FAHX2kW6TaY-czTt0fbBEyV-r35-IaAdm5OCryTLmx7EMu7eLdKs';

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background-dark bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: `url('${backgroundImageUrl}')` }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            <div className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center rounded-xl bg-card-dark/80 p-6 shadow-glow-primary backdrop-blur-md md:p-8">
                <div className="mb-4 flex flex-col items-center">
                    <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-input-dark text-primary overflow-hidden shadow-glow-primary">
                        {tenant.theme.logoUrl ? (
                            <img src={tenant.theme.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined !text-4xl">content_cut</span>
                        )}
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-wider text-text-primary-dark text-center">{tenant.name}</h1>
                    {tenant.address && (
                        <p className="text-text-secondary-dark text-xs mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {tenant.address}
                        </p>
                    )}
                    <p className="text-text-secondary-dark text-xs mt-1">Agende seu horário</p>

                    <div className="flex gap-3 items-center">
                        <button
                            onClick={() => setShowHours(!showHours)}
                            className="mt-2 text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            {showHours ? 'Ocultar Horários' : 'Ver Horários'}
                        </button>

                        <button
                            onClick={async () => {
                                await refreshData();
                                // Feedback visual simples
                                const btn = document.getElementById('refresh-btn');
                                if (btn) btn.classList.add('animate-spin');
                                setTimeout(() => {
                                    if (btn) btn.classList.remove('animate-spin');
                                }, 1000);
                            }}
                            className="mt-2 text-[10px] font-bold text-text-secondary-dark hover:text-primary flex items-center gap-1 transition-colors"
                        >
                            <span id="refresh-btn" className="material-symbols-outlined text-xs">refresh</span>
                            Sincronizar
                        </button>

                        {identifiedClient && (
                            <button
                                onClick={() => setShowAppointments(!showAppointments)}
                                className="mt-2 text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-xs">history</span>
                                {showAppointments ? 'Voltar' : 'Meus Agendamentos'}
                            </button>
                        )}
                    </div>

                    {showHours && (
                        <div className="mt-4 w-full bg-input-dark/50 rounded-lg p-4 border border-border-dark animate-in fade-in slide-in-from-top-2">
                            <h3 className="text-sm font-bold text-text-primary-dark mb-2 text-center">Horários de Atendimento</h3>
                            <div className="grid grid-cols-1 gap-1">
                                {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as DayOfWeek[]).map(day => {
                                    const hours = tenant.businessHours[day];
                                    const dayName = {
                                        monday: 'Segunda', tuesday: 'Terça', wednesday: 'Quarta', thursday: 'Quinta',
                                        friday: 'Sexta', saturday: 'Sábado', sunday: 'Domingo'
                                    }[day];
                                    const isOpen = !hours?.isClosed;

                                    return (
                                        <div key={day} className="flex justify-between text-xs text-text-secondary-dark border-b border-border-dark/50 last:border-0 py-1">
                                            <span>{dayName}</span>
                                            <span className={isOpen ? 'text-text-primary-dark' : 'text-red-400'}>
                                                {isOpen ? `${hours.open} - ${hours.close}` : 'Fechado'}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {showAppointments && identifiedClient && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-text-primary-dark">Meus Agendamentos</h2>
                            <button
                                onClick={() => setShowAppointments(false)}
                                className="text-xs text-primary hover:underline"
                            >
                                Voltar
                            </button>
                        </div>

                        {isLoadingAppointments ? (
                            <div className="flex justify-center p-8">
                                <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                            </div>
                        ) : clientAppointments.length > 0 ? (
                            <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {clientAppointments.map((app) => {
                                    const date = new Date(app.date);
                                    const isCompleted = app.status === 'Concluído';
                                    const isCanceled = app.status === 'Cancelado';

                                    return (
                                        <div
                                            key={app.id}
                                            className={`p-4 rounded-lg border flex justify-between items-center ${isCompleted
                                                ? 'bg-card-dark/50 border-border-dark opacity-70 grayscale-[0.5]'
                                                : isCanceled
                                                    ? 'bg-red-500/10 border-red-500/30 opacity-60'
                                                    : 'bg-card-dark border-primary/30 shadow-glow-primary-sm'
                                                }`}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-text-primary-dark text-base">{app.service_title}</span>
                                                    {isCompleted && <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded uppercase font-bold">Concluído</span>}
                                                    {isCanceled && <span className="text-[10px] bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase font-bold">Cancelado</span>}
                                                    {!isCompleted && !isCanceled && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded uppercase font-bold">{app.status}</span>}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-text-secondary-dark">
                                                    <span className="capitalize">{date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                                                    <span>•</span>
                                                    <span>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-text-secondary-dark/70">
                                                    <span className="material-symbols-outlined text-[10px]">person</span>
                                                    <span>{app.professional_name}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                {!isCompleted && !isCanceled && (
                                                    <div>
                                                        {(() => {
                                                            const cancellationWindow = tenant?.cancellationWindowMinutes || 120;
                                                            const now = new Date();
                                                            const minutesUntil = (date.getTime() - now.getTime()) / (1000 * 60);

                                                            if (minutesUntil >= cancellationWindow) {
                                                                return (
                                                                    <button
                                                                        onClick={() => handleCancelAppointment(app.id)}
                                                                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors border border-red-500/20"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                );
                                                            } else {
                                                                return (
                                                                    <span className="text-[10px] text-text-secondary-dark/50 italic text-right block max-w-[100px] leading-tight">
                                                                        Cancelamento indisponível
                                                                        <br />
                                                                        (Min: {cancellationWindow} min)
                                                                    </span>
                                                                );
                                                            }
                                                        })()}
                                                    </div>
                                                )}

                                                {app.total_amount && (
                                                    <div className="font-bold text-text-primary-dark text-sm">
                                                        R$ {app.total_amount.toFixed(2)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-text-secondary-dark py-8">
                                Você ainda não possui agendamentos.
                            </p>
                        )}
                    </div>
                )}

                {!showAppointments && identificationStep === 'loading' && (
                    <div className="flex flex-col items-center justify-center p-8">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                        <p className="mt-4 text-text-secondary-dark">Verificando identificação...</p>
                    </div>
                )}

                {!showAppointments && identificationStep === 'identify' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-full max-w-sm mx-auto animate-fade-in relative z-10">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-black text-text-primary-dark mb-1">
                                    {isRegistering ? 'Crie sua conta' : 'Bem-vindo de volta!'}
                                </h2>
                                <p className="text-xs text-text-secondary-dark">
                                    {isRegistering
                                        ? 'Preencha seus dados para agendar.'
                                        : 'Informe seu CPF para acessar.'}
                                </p>
                            </div>

                            <form onSubmit={handleIdentification} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-bold text-text-secondary-dark uppercase tracking-wider text-center">CPF</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary-dark group-focus-within:text-primary transition-colors text-lg">badge</span>
                                        <input
                                            type="text"
                                            placeholder="000.000.000-00"
                                            value={authCpf}
                                            onChange={(e) => setAuthCpf(maskCPF(e.target.value))}
                                            maxLength={14}
                                            className="h-11 w-full rounded-lg bg-background-dark border-2 border-border-dark pl-11 pr-4 text-base font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-text-secondary-dark/50 text-center shadow-inner"
                                        />
                                    </div>
                                </div>

                                {isRegistering && (
                                    <div className="flex flex-col gap-4 animate-fade-in">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-text-secondary-dark uppercase tracking-wider text-center">Nome Completo</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary-dark group-focus-within:text-primary transition-colors text-lg">person</span>
                                                <input
                                                    type="text"
                                                    placeholder="Seu nome"
                                                    value={authName}
                                                    onChange={(e) => setAuthName(e.target.value)}
                                                    className="h-11 w-full rounded-lg bg-background-dark border-2 border-border-dark pl-11 pr-4 text-base font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-text-secondary-dark/50 text-center shadow-inner"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-bold text-text-secondary-dark uppercase tracking-wider text-center">WhatsApp</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary-dark group-focus-within:text-primary transition-colors text-lg">phone_iphone</span>
                                                <input
                                                    type="tel"
                                                    placeholder="34999999999"
                                                    value={authPhone}
                                                    onChange={(e) => setAuthPhone(maskPhone(e.target.value))}
                                                    className="h-11 w-full rounded-lg bg-background-dark border-2 border-border-dark pl-11 pr-4 text-base font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all placeholder:text-text-secondary-dark/50 text-center shadow-inner"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={!authCpf || isAuthenticating || (isRegistering && (!authName || !authPhone))}
                                    className="mt-1 w-full rounded-lg bg-primary py-3 text-base font-black text-background-dark shadow-glow-primary transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 uppercase tracking-wide"
                                >
                                    {isAuthenticating ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                                            <span>Processando...</span>
                                        </div>
                                    ) : (
                                        isRegistering ? 'Concluir Cadastro' : 'Entrar'
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 pt-4 border-t border-border-dark text-center">
                                {isRegistering ? (
                                    <button
                                        type="button"
                                        onClick={() => setIsRegistering(false)}
                                        className="text-text-primary-dark hover:text-primary font-medium transition-colors text-xs flex items-center justify-center gap-2 mx-auto"
                                    >
                                        <span className="material-symbols-outlined text-base">arrow_back</span>
                                        Já tenho cadastro
                                    </button>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <p className="text-text-secondary-dark text-[10px]">Não tem cadastro?</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsRegistering(true)}
                                            className="text-primary hover:text-primary-light font-bold transition-colors text-sm flex items-center justify-center gap-1 mx-auto hover:underline decoration-2 underline-offset-4"
                                        >
                                            Primeiro Acesso? Clique aqui
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {!showAppointments && identificationStep === 'booking' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 w-full">
                        <div className="flex items-center justify-between mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                    {identifiedClient?.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-text-secondary-dark leading-none">Identificado como</span>
                                    <span className="font-bold text-text-primary-dark text-sm">{identifiedClient?.name}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-[10px] text-red-400 hover:text-red-300 underline"
                            >
                                Sair
                            </button>
                        </div>

                        {isBookingSuccess ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center animate-in zoom-in-95 duration-500">
                                <div className="h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 mb-4 shadow-glow-primary">
                                    <span className="material-symbols-outlined text-5xl">check_circle</span>
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2 tracking-tight">Agendamento Realizado!</h2>
                                <p className="text-text-secondary-dark text-sm max-w-xs mb-6">Tudo pronto! Seu horário foi reservado com sucesso.</p>
                                <button
                                    onClick={() => {
                                        setIsBookingSuccess(false);
                                        navigate(`/${tenant?.slug}`);
                                    }}
                                    className="px-6 py-3 bg-primary text-background-dark font-black rounded-lg hover:scale-105 transition-transform uppercase tracking-wider shadow-glow-primary text-sm"
                                >
                                    Novo agendamento
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleBooking} className="flex flex-col gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] font-black text-text-secondary-dark/60 uppercase tracking-[0.2em] pl-1">Escolha seu Especialista</label>

                                    {tenantProfessionals.length > 0 ? (
                                        <div className="relative group/carousel px-4">
                                            <button
                                                type="button"
                                                onClick={() => setCurrentProfessionalIndex(prev => prev > 0 ? prev - 1 : tenantProfessionals.length - 1)}
                                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-surface-dark/80 border border-white/5 backdrop-blur-md flex items-center justify-center text-primary shadow-xl hover:bg-primary hover:text-background-dark transition-all duration-300"
                                            >
                                                <span className="material-symbols-outlined">chevron_left</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setCurrentProfessionalIndex(prev => prev < tenantProfessionals.length - 1 ? prev + 1 : 0)}
                                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-surface-dark/80 border border-white/5 backdrop-blur-md flex items-center justify-center text-primary shadow-xl hover:bg-primary hover:text-background-dark transition-all duration-300"
                                            >
                                                <span className="material-symbols-outlined">chevron_right</span>
                                            </button>

                                            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-surface-dark/40 to-background-dark/80 backdrop-blur-2xl shadow-2xl relative">
                                                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5">
                                                    <div className="relative shrink-0">
                                                        <div className="h-24 w-24 sm:h-32 sm:w-32 rounded-2xl overflow-hidden ring-3 ring-primary/20 shadow-glow-primary/10">
                                                            {tenantProfessionals[currentProfessionalIndex]?.avatarUrl ? (
                                                                <img
                                                                    src={tenantProfessionals[currentProfessionalIndex].avatarUrl}
                                                                    alt={tenantProfessionals[currentProfessionalIndex].name}
                                                                    className="h-full w-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="h-full w-full bg-background-dark flex items-center justify-center text-primary/40">
                                                                    <span className="material-symbols-outlined text-4xl">person</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background-dark border-2 border-background-dark flex items-center justify-center shadow-2xl">
                                                            <span className="h-3 w-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse"></span>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h4 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                                                                {tenantProfessionals[currentProfessionalIndex]?.name}
                                                            </h4>
                                                            <span className="material-symbols-outlined text-primary fill-current text-sm">verified</span>
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="flex items-center gap-1 bg-yellow-500/10 px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                                                                <span className="material-symbols-outlined text-yellow-500 text-[10px] fill-current">star</span>
                                                                <span className="text-xs font-black text-yellow-500">{tenantProfessionals[currentProfessionalIndex]?.rating || '5.0'}</span>
                                                            </div>
                                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                                                                {tenantProfessionals[currentProfessionalIndex]?.reviews || '0'} Avaliações
                                                            </span>
                                                        </div>

                                                        <div className="flex flex-wrap justify-center sm:justify-start gap-1.5">
                                                            {(tenantProfessionals[currentProfessionalIndex]?.specialties || ['Barba', 'Cabelo']).slice(0, 3).map((spec, i) => (
                                                                <span key={i} className="text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded-lg">
                                                                    {spec}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="absolute top-3 right-3 bg-primary text-background-dark h-6 w-6 rounded-full flex items-center justify-center shadow-lg border-2 border-primary shadow-glow-primary">
                                                    <span className="material-symbols-outlined text-sm font-black">check</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-center gap-1.5 mt-3">
                                                {tenantProfessionals.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setCurrentProfessionalIndex(i)}
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentProfessionalIndex ? 'w-8 bg-primary shadow-glow-primary' : 'w-2 bg-white/10 hover:bg-white/30'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 bg-surface-dark/40 border-2 border-dashed border-white/5 rounded-[2.5rem] text-center text-text-secondary-dark italic">
                                            Nenhum especialista disponível no momento.
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-text-secondary-dark" htmlFor="service">Serviço</label>
                                    {tenantServices.length > 0 ? (
                                        <select
                                            id="service"
                                            className="h-11 w-full rounded-lg border-2 border-border-dark bg-background-dark px-4 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner"
                                            value={selectedServiceId}
                                            onChange={(e) => setSelectedServiceId(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione um serviço</option>
                                            {tenantServices.map(s => (
                                                <option key={s.id} value={s.id}>{s.title} - R$ {s.price.toFixed(2)}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-text-secondary-dark text-sm p-3 bg-input-dark rounded-lg border border-border-dark">
                                            Nenhum serviço disponível.
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs font-medium text-text-secondary-dark">Data</label>
                                    <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                                        {datesToDisplay.map(date => {
                                            const day = date.toLocaleDateString('pt-BR', { weekday: 'short' });
                                            const dayNum = date.getDate();
                                            const month = date.toLocaleDateString('pt-BR', { month: 'short' });
                                            const isSelected = selectedDate.toDateString() === date.toDateString();
                                            const businessHours = getBusinessHoursForDay(date);
                                            const isClosed = businessHours?.isClosed;

                                            return (
                                                <button
                                                    key={date.toISOString()}
                                                    type="button"
                                                    onClick={() => {
                                                        if (!isClosed) {
                                                            setSelectedDate(date);
                                                            setSelectedTime('');
                                                        }
                                                    }}
                                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-200 min-w-[70px] ${isSelected
                                                        ? 'bg-primary text-background-dark border-primary shadow-glow-primary'
                                                        : isClosed
                                                            ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed opacity-70'
                                                            : 'bg-input-dark text-text-primary-dark border-border-dark hover:bg-surface-dark'
                                                        }`}
                                                    disabled={isClosed}
                                                >
                                                    <span className="text-[10px] uppercase leading-none">{day.replace('.', '')}</span>
                                                    <span className="text-lg font-bold my-0.5">{dayNum}</span>
                                                    <span className="text-[10px] uppercase leading-none">{month.replace('.', '')}</span>
                                                    {isClosed && <span className="text-[8px] mt-0.5 text-red-400">Fechado</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {selectedProfessionalId && selectedServiceId && selectedDate && (
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-text-secondary-dark">Horário</label>
                                        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                                            {generateTimeSlots.length > 0 ? (
                                                generateTimeSlots.map(({ time, available }) => (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => available && setSelectedTime(time)}
                                                        disabled={!available}
                                                        className={`px-3 py-1.5 rounded-lg border transition-all duration-200 text-sm ${!available
                                                            ? 'bg-input-dark/50 text-text-secondary-dark border-border-dark/50 cursor-not-allowed opacity-50'
                                                            : selectedTime === time
                                                                ? 'bg-primary text-background-dark border-primary shadow-glow-primary'
                                                                : 'bg-input-dark text-text-primary-dark border-border-dark hover:bg-surface-dark'
                                                            }`}
                                                    >
                                                        {time}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="col-span-full text-center text-text-secondary-dark py-2 text-xs">
                                                    Nenhum horário disponível.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-2 flex flex-col items-center">
                                    <button
                                        className="w-full rounded-lg bg-primary py-3 text-base font-black text-background-dark shadow-glow-primary transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
                                        type="submit"
                                        disabled={isSubmitting || !selectedProfessionalId || !selectedServiceId || !selectedDate || !selectedTime}
                                    >
                                        {isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PublicBooking;

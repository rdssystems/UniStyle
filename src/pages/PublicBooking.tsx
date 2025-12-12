import React, { useState, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import { supabase } from '../integrations/supabase/client';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';
import { Professional, Service, Appointment, Client, DailyHours, DayOfWeek, PublicIdentificationResponse, PublicTokenVerificationResponse } from '../types';

const PublicBooking = () => {
    const { tenant, isLoading: isLoadingTenant } = useTenant();
    const { professionals, services, appointments, addAppointment, addClient, isLoadingData } = useData();

    const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [selectedTime, setSelectedTime] = useState<string>('');
    const [clientName, setClientName] = useState<string>('');
    const [clientPhone, setClientPhone] = useState<string>('');

    // Ensure URL has tenant param if logged in
    useEffect(() => {
        if (tenant && !window.location.search.includes('tenant=')) {
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('tenant', tenant.slug);
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [tenant]);

    // Auth State
    const [identificationStep, setIdentificationStep] = useState<'loading' | 'identify' | 'booking'>('loading');
    const [authPhone, setAuthPhone] = useState('');
    const [authName, setAuthName] = useState('');
    const [identifiedClient, setIdentifiedClient] = useState<{ id: string, name: string, phone: string } | null>(null);
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

    const getDayOfWeek = (date: Date): DayOfWeek => {
        const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        return days[date.getDay()];
    };

    const getBusinessHoursForDay = (date: Date): DailyHours | undefined => {
        if (!tenant?.businessHours) return undefined;
        const day = getDayOfWeek(date);
        const hours = tenant.businessHours[day];
        // console.log(`Checking hours for ${date.toDateString()} (${day}):`, hours); // Debug log
        return hours;
    };

    const generateTimeSlots = useMemo(() => {
        if (!selectedProfessionalId || !selectedServiceId || !tenant || isLoadingData) return [];

        const service = tenantServices.find(s => s.id === selectedServiceId);
        if (!service) return []; // No service found, no slots can be generated

        const businessHours = getBusinessHoursForDay(selectedDate);
        if (!businessHours || businessHours.isClosed) return []; // Day is closed or no business hours defined

        const slots: { time: string; available: boolean }[] = [];
        const [openHour, openMinute] = businessHours.open.split(':').map(Number);
        const [closeHour, closeMinute] = businessHours.close.split(':').map(Number);

        let currentTime = new Date(selectedDate);
        currentTime.setHours(openHour, openMinute, 0, 0);

        const closingTime = new Date(selectedDate);
        closingTime.setHours(closeHour, closeMinute, 0, 0);

        // Ensure current time is not before now for today's date
        const now = new Date();
        if (selectedDate.toDateString() === now.toDateString() && currentTime.getTime() < now.getTime()) {
            // Round up to the next half hour if current time is past now
            const currentMinutes = now.getMinutes();
            const nextHalfHour = currentMinutes < 30 ? 30 : 60;
            now.setMinutes(nextHalfHour, 0, 0);
            if (now.getMinutes() === 0 && nextHalfHour === 60) { // If it rolled over to next hour
                now.setHours(now.getHours() + 1);
            }
            currentTime = now;
        }


        while (currentTime.getTime() + (service.durationMinutes * 60 * 1000) <= closingTime.getTime()) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(currentTime.getTime() + (service.durationMinutes * 60 * 1000));

            const isSlotBooked = tenantAppointments.some(app => {
                const appStart = new Date(app.date);
                const appService = tenantServices.find(s => s.id === app.serviceId);
                const appEnd = new Date(appStart.getTime() + (appService?.durationMinutes || 0) * 60 * 1000);

                // Check for overlap with existing appointments for the selected professional
                return app.professionalId === selectedProfessionalId &&
                    (
                        (slotStart < appEnd && slotEnd > appStart) // New slot overlaps existing
                    );
            });

            slots.push({
                time: slotStart.toTimeString().slice(0, 5),
                available: !isSlotBooked
            });

            currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 minutes for next slot
        }

        return slots;
    }, [selectedProfessionalId, selectedServiceId, selectedDate, tenant, tenantServices, tenantAppointments, isLoadingData]);

    const datesToDisplay = useMemo(() => {
        if (!tenant?.businessHours) return [];
        console.log('Tenant Business Hours:', tenant.businessHours); // Debug log

        const dates: Date[] = [];
        const daysToShow = tenant.businessHours.bookingWindowDays || 30; // Default to 30 if not set
        let daysFound = 0;
        let currentIter = 0;
        const maxIter = 60; // Safety break to prevent infinite loops

        while (daysFound < daysToShow && currentIter < maxIter) {
            const date = new Date();
            date.setDate(date.getDate() + currentIter);

            const hours = getBusinessHoursForDay(date);
            // Include the date if it's open
            if (hours && !hours.isClosed) {
                dates.push(date);
                daysFound++;
            }
            currentIter++;
        }
        return dates;
    }, [tenant?.businessHours]);

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
            Cookies.remove('barber_client_token'); // Invalid token
            setIdentificationStep('identify');
        }
    };

    useEffect(() => {
        if (tenant) {
            verifyToken();
        }
    }, [tenant]);

    const handleIdentification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;
        setIsAuthenticating(true);

        const { data, error } = await supabase.rpc('public_identify_client', {
            p_tenant_id: tenant.id,
            p_phone: authPhone || null,
            p_name: authName || null
        });

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
            alert(response.message || 'Múltiplos clientes encontrados. Por favor, identifique-se pelo telefone.');
            setAuthName(''); // Clear name to force phone usage or refinement
        } else {
            alert(response.message || 'Erro desconhecido.');
        }
    };

    const handleLogout = () => {
        Cookies.remove('barber_client_token');
        setIdentifiedClient(null);
        setClientName('');
        setClientPhone('');
        setIdentificationStep('identify');
        // Reset booking form
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
            // Create a new client ONLY if not identified
            // Ideally we should also check if phone exists via RPC, but for now let's rely on the fact 
            // that if they are strictly new (no token), we create. 
            // IF the user entered a phone that EXISTS, addClient (if implemented safely) should maybe return existing?
            // But existing addClient likely just inserts.
            // Given the requirements, we should trust the identification flow. 
            // If the user skipped identification (how?), they might create a duplicate. 
            // But we made identification mandatory (step 'identify').
            // Wait, if identificationStep is 'booking', identifiedClient MUST be set if we came via token or valid login.
            // Check: verifyToken sets it. handleIdentification sets it.
            // So clientId SHOULD be available if we are in this step.

            // BUT, what if the user manually manipulated state? 
            // Let's assume identifiedClient is source of truth.

            const newClientData: Omit<Client, 'id' | 'tenantId'> = {
                name: clientName,
                phone: clientPhone,
                status: 'Novo',
                points: 0,
                avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName)}&background=random`
            };

            // Fallback if somehow identifiedClient is null but we are here (should not happen in normal flow)
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
            clientId: clientId, // Use the resolved clientId
            professionalId: selectedProfessionalId,
            serviceId: selectedServiceId,
            date: dateTime.toISOString(),
            status: 'Agendado',
            notes: `Agendamento público por ${clientName}`
        };

        const createdAppointment = await addAppointment(newAppointmentData);

        if (createdAppointment) {
            setIsBookingSuccess(true);
            // Reset form
            setSelectedProfessionalId('');
            setSelectedServiceId('');
            setSelectedDate(new Date());
            setSelectedTime('');
            setClientName('');
            setClientPhone('');
        } else {
            alert('Erro ao agendar serviço. Tente novamente.');
        }
        setIsSubmitting(false);
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
            <div className="relative z-10 flex w-full max-w-2xl flex-col items-center justify-center rounded-xl bg-card-dark/80 p-8 shadow-glow-primary backdrop-blur-md md:p-12">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-input-dark text-primary overflow-hidden shadow-glow-primary">
                        {tenant.theme.logoUrl ? (
                            <img src={tenant.theme.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                            <span className="material-symbols-outlined !text-5xl">content_cut</span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-wider text-text-primary-dark text-center">{tenant.name}</h1>
                    {tenant.address && (
                        <p className="text-text-secondary-dark text-sm mt-1 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {tenant.address}
                        </p>
                    )}
                    <p className="text-text-secondary-dark text-sm mt-2">Agende seu horário</p>

                    <button
                        onClick={() => setShowHours(!showHours)}
                        className="mt-3 text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {showHours ? 'Ocultar Horários' : 'Ver Horários de Funcionamento'}
                    </button>

                    {/* Meus Agendamentos Button - Only if identified */}
                    {identifiedClient && (
                        <button
                            onClick={() => setShowAppointments(!showAppointments)}
                            className="mt-3 text-xs font-bold text-primary hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">history</span>
                            {showAppointments ? 'Voltar para Agendamento' : 'Meus Agendamentos'}
                        </button>
                    )}

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

                                    // Logic inverted: isClosed = false means OPEN. 
                                    // If hours.isClosed is undefined, assume closed? No, default schema says false.
                                    // Let's check the logic from BusinessHoursSettings. 
                                    // In Settings: Checked = !isClosed (Open). 
                                    // So if !isClosed is true, it is OPEN.
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
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-text-primary-dark">Meus Agendamentos</h2>
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
                                            {app.total_amount && (
                                                <div className="font-bold text-text-primary-dark text-sm">
                                                    R$ {app.total_amount.toFixed(2)}
                                                </div>
                                            )}
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

                {identificationStep === 'loading' && (
                    <div className="flex flex-col items-center justify-center p-8">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                        <p className="mt-4 text-text-secondary-dark">Verificando identificação...</p>
                    </div>
                )}

                {identificationStep === 'identify' && (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4">
                        <h2 className="text-xl font-bold text-text-primary-dark text-center mb-6">Identifique-se para continuar</h2>

                        <form onSubmit={handleIdentification} className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-secondary-dark">Telefone (Recomendado)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary-dark">phone_iphone</span>
                                    <input
                                        type="tel"
                                        placeholder="(XX) XXXXX-XXXX"
                                        value={authPhone}
                                        onChange={(e) => setAuthPhone(e.target.value)}
                                        className="h-14 w-full rounded-lg bg-input-dark pl-12 pr-4 text-base text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>

                            <div className="relative flex items-center py-2">
                                <div className="flex-grow border-t border-border-dark"></div>
                                <span className="flex-shrink px-4 text-text-secondary-dark text-xs uppercase">Ou pelo nome</span>
                                <div className="flex-grow border-t border-border-dark"></div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-secondary-dark">Nome Completo</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-secondary-dark">person</span>
                                    <input
                                        type="text"
                                        placeholder="Seu nome e sobrenome"
                                        value={authName}
                                        onChange={(e) => setAuthName(e.target.value)}
                                        className="h-14 w-full rounded-lg bg-input-dark pl-12 pr-4 text-base text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={(!authPhone && !authName) || isAuthenticating}
                                className="mt-4 w-full rounded-lg bg-primary py-4 text-lg font-bold text-background-dark shadow-glow-primary transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isAuthenticating ? 'Identificando...' : 'Continuar'}
                            </button>
                        </form>
                    </div>
                )}

                {identificationStep === 'booking' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 w-full">
                        <div className="flex items-center justify-between mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                    {identifiedClient?.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm text-text-secondary-dark">Identificado como</span>
                                    <span className="font-bold text-text-primary-dark">{identifiedClient?.name}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-red-400 hover:text-red-300 underline"
                            >
                                Sair / Trocar
                            </button>
                        </div>
                        {isBookingSuccess ? (
                            <div className="text-center text-green-500 text-xl font-bold">
                                <span className="material-symbols-outlined !text-6xl text-green-500 mb-4">check_circle</span>
                                <p>Agendamento realizado com sucesso!</p>
                                <p className="text-base text-text-secondary-dark mt-2">Aguardamos você!</p>
                                <button
                                    onClick={() => setIsBookingSuccess(false)}
                                    className="mt-6 bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
                                >
                                    Fazer outro agendamento
                                </button>
                            </div>
                        ) : (
                            <form className="flex w-full flex-col gap-6" onSubmit={handleBooking}>
                                {/* Professional Selection */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark" htmlFor="professional">Barbeiro</label>
                                    {tenantProfessionals.length > 0 ? (
                                        <select
                                            id="professional"
                                            className="h-14 w-full rounded-lg border-none bg-input-dark p-4 text-base text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={selectedProfessionalId}
                                            onChange={(e) => setSelectedProfessionalId(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione um barbeiro</option>
                                            {tenantProfessionals.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-text-secondary-dark text-sm p-3 bg-input-dark rounded-lg border border-border-dark">
                                            Nenhum barbeiro disponível. Por favor, entre em contato com o estabelecimento.
                                        </p>
                                    )}
                                </div>

                                {/* Service Selection */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark" htmlFor="service">Serviço</label>
                                    {tenantServices.length > 0 ? (
                                        <select
                                            id="service"
                                            className="h-14 w-full rounded-lg border-none bg-input-dark p-4 text-base text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={selectedServiceId}
                                            onChange={(e) => setSelectedServiceId(e.target.value)}
                                            required
                                        >
                                            <option value="">Selecione um serviço</option>
                                            {tenantServices.map(s => (
                                                <option key={s.id} value={s.id}>{s.title} - R$ {s.price.toFixed(2)} ({s.durationMinutes} min)</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-text-secondary-dark text-sm p-3 bg-input-dark rounded-lg border border-border-dark">
                                            Nenhum serviço disponível. Por favor, entre em contato com o estabelecimento.
                                        </p>
                                    )}
                                </div>

                                {/* Date Selection */}
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Data</label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
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
                                                            setSelectedTime(''); // Reset time when date changes
                                                        }
                                                    }}
                                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200 min-w-[80px] ${isSelected
                                                        ? 'bg-primary text-background-dark border-primary shadow-glow-primary'
                                                        : isClosed
                                                            ? 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed opacity-70'
                                                            : 'bg-input-dark text-text-primary-dark border-border-dark hover:bg-surface-dark'
                                                        }`}
                                                    disabled={isClosed}
                                                >
                                                    <span className="text-xs uppercase">{day.replace('.', '')}</span>
                                                    <span className="text-xl font-bold">{dayNum}</span>
                                                    <span className="text-xs uppercase">{month.replace('.', '')}</span>
                                                    {isClosed && <span className="text-[10px] mt-1 text-red-400">Fechado</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Time Selection */}
                                {selectedProfessionalId && selectedServiceId && selectedDate && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-medium text-text-secondary-dark">Horário</label>
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                            {generateTimeSlots.length > 0 ? (
                                                generateTimeSlots.map(({ time, available }) => (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        onClick={() => available && setSelectedTime(time)}
                                                        disabled={!available}
                                                        className={`px-4 py-2 rounded-lg border transition-all duration-200 ${!available
                                                            ? 'bg-input-dark/50 text-text-secondary-dark border-border-dark/50 cursor-not-allowed opacity-50 decoration-slice'
                                                            : selectedTime === time
                                                                ? 'bg-primary text-background-dark border-primary shadow-glow-primary'
                                                                : 'bg-input-dark text-text-primary-dark border-border-dark hover:bg-surface-dark'
                                                            }`}
                                                    >
                                                        {time}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="col-span-full text-center text-text-secondary-dark py-4">
                                                    Nenhum horário disponível para esta data e serviço.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Client Information - Omitted as we have identifiedClient */}
                                {/* We can still allow editing email if needed, or confirming details */}
                                {/* For now, simplified: we use the identified info. */}




                                <div className="mt-4 flex flex-col items-center gap-4">
                                    <button
                                        className="w-full rounded-lg bg-primary py-4 text-lg font-bold text-background-dark shadow-glow-primary transition-all duration-300 hover:scale-[1.02] hover:shadow-glow-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card-dark disabled:opacity-50 disabled:cursor-not-allowed"
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
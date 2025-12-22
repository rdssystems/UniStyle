import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Professional, Product, Service, Appointment, StockMovement, Transaction, Commission, CRMTag, ClientCRMNote } from '../types';
import { supabase } from '../integrations/supabase/client';
import { useTenant } from './TenantContext';
import { camelToSnake, snakeToCamel } from '../utils/format';

interface DataContextType {
    clients: Client[];
    professionals: Professional[];
    products: Product[];
    services: Service[];
    appointments: Appointment[];
    stockMovements: StockMovement[];
    transactions: Transaction[];
    commissions: Commission[];
    addClient: (client: Omit<Client, 'id' | 'tenantId'>) => Promise<Client | null>;
    updateClient: (client: Client) => Promise<Client | null>;
    deleteClient: (id: string) => Promise<boolean>;
    addProfessional: (professional: Omit<Professional, 'id' | 'tenantId' | 'rating' | 'reviews'>) => Promise<Professional | null>;
    updateProfessional: (professional: Professional) => Promise<Professional | null>;
    deleteProfessional: (id: string) => Promise<boolean>;
    addProduct: (product: Omit<Product, 'id' | 'tenantId'>) => Promise<Product | null>;
    updateProduct: (product: Product) => Promise<Product | null>;
    deleteProduct: (id: string) => Promise<boolean>;
    addService: (service: Omit<Service, 'id' | 'tenantId'>) => Promise<Service | null>;
    updateService: (service: Service) => Promise<Service | null>;
    deleteService: (id: string) => Promise<boolean>;
    addAppointment: (appointment: Omit<Appointment, 'id' | 'tenantId'>) => Promise<{ success: boolean; error?: string; conflict?: boolean }>;
    updateAppointment: (appointment: Appointment) => Promise<{ success: boolean; error?: string; conflict?: boolean }>;
    deleteAppointment: (id: string) => Promise<boolean>;
    addStockMovement: (movement: Omit<StockMovement, 'id' | 'tenantId'>) => Promise<boolean>;
    addTransaction: (transaction: Omit<Transaction, 'id' | 'tenantId'>) => Promise<Transaction | null>;
    updateTransaction: (transaction: Transaction) => Promise<Transaction | null>;
    addCommission: (commission: Omit<Commission, 'id' | 'tenantId'>) => Promise<Commission | null>;
    updateCommission: (commission: Commission) => Promise<Commission | null>;
    crmTags: CRMTag[];
    addCRMTag: (tag: Omit<CRMTag, 'id' | 'tenantId'>) => Promise<CRMTag | null>;
    updateCRMTag: (tag: CRMTag) => Promise<CRMTag | null>;
    deleteCRMTag: (id: string) => Promise<boolean>;
    addClientTag: (clientId: string, tagId: string) => Promise<boolean>;
    removeClientTag: (clientId: string, tagId: string) => Promise<boolean>;
    addClientNote: (note: Omit<ClientCRMNote, 'id' | 'tenantId' | 'authorId' | 'createdAt'>) => Promise<ClientCRMNote | null>;
    getClientNotes: (clientId: string) => Promise<ClientCRMNote[]>;
    refreshData: () => Promise<void>;
    isLoadingData: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
    const { tenant, user, isLoading: isLoadingTenant } = useTenant();
    const [clients, setClients] = useState<Client[]>([]);
    const [professionals, setProfessionals] = useState<Professional[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [crmTags, setCrmTags] = useState<CRMTag[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    const fetchTenantData = async (currentTenantId: string) => {
        setIsLoadingData(true);
        try {
            const { data: clientsData, error: clientsError } = await supabase.from('clients').select('*').eq('tenant_id', currentTenantId);
            if (clientsError) throw clientsError;
            setClients(snakeToCamel(clientsData) as Client[]);

            const { data: professionalsData, error: professionalsError } = await supabase.from('professionals').select('*').eq('tenant_id', currentTenantId);
            if (professionalsError) throw professionalsError;
            setProfessionals(snakeToCamel(professionalsData) as Professional[]);

            const { data: productsData, error: productsError } = await supabase.from('products').select('*').eq('tenant_id', currentTenantId);
            if (productsError) throw productsError;
            setProducts(snakeToCamel(productsData) as Product[]);

            const { data: servicesData, error: servicesError } = await supabase.from('services').select('*').eq('tenant_id', currentTenantId);
            if (servicesError) throw servicesError;
            setServices(snakeToCamel(servicesData) as Service[]);

            let appointmentQuery = supabase.from('appointments').select('*').eq('tenant_id', currentTenantId);

            // If user is not logged in (public view), use the secure RPC or skip fetching raw appointments if risk is too high.
            // However, PublicBooking currently relies on 'appointments' state.
            // We configured RLS to blocking anon from 'appointments' table select.
            // So standard select will fail for anon. We must use RPC if no user.
            if (!user) {
                // Public View: Fetch using RPC for availability only
                const { data: publicApps, error: publicAppsError } = await supabase.rpc('get_public_appointments', { p_tenant_id: currentTenantId });
                if (publicAppsError) throw publicAppsError;

                // Map to Appointment type (filling missing fields with safe defaults)
                const mappedApps = (publicApps || []).map((app: any) => ({
                    id: app.id,
                    tenantId: currentTenantId,
                    clientId: 'public', // Hidden
                    professionalId: app.professional_id,
                    serviceId: app.service_id,
                    date: app.date,
                    status: app.status,
                    notes: '', // Hidden
                    createdAt: new Date().toISOString(), // Dummy
                    totalAmount: 0,
                    productsSold: 0
                }));
                setAppointments(mappedApps as Appointment[]);
            }
            else if (user?.role === 'barber') {
                // Barbeiros agora veem todos os agendamentos da barbearia (apenas leitura controlada pelo RLS se necessário,
                // mas o usuário pediu para eles verem uns aos outros).
                // Não adicionamos filtro de professional_id aqui para permitir a visão global.
            }
            if (user) {
                const { data: appointmentsData, error: appointmentsError } = await appointmentQuery;
                if (appointmentsError) throw appointmentsError;
                setAppointments(snakeToCamel(appointmentsData) as Appointment[]);
            }

            const { data: movementsData, error: movementsError } = await supabase.from('stock_movements').select('*').eq('tenant_id', currentTenantId).order('date', { ascending: false });
            if (movementsError) throw movementsError;
            setStockMovements(snakeToCamel(movementsData) as StockMovement[]);

            const { data: transData, error: transError } = await supabase.from('transactions').select('*').eq('tenant_id', currentTenantId).order('date', { ascending: false });
            if (transError) throw transError;
            setTransactions(snakeToCamel(transData) as Transaction[]);

            const { data: commData, error: commError } = await supabase.from('commissions').select('*').eq('tenant_id', currentTenantId).order('date', { ascending: false });
            if (commError) throw commError;
            setCommissions(snakeToCamel(commData) as Commission[]);

            const { data: tagsData, error: tagsError } = await supabase.from('crm_tags').select('*').eq('tenant_id', currentTenantId);
            if (tagsError) throw tagsError;
            setCrmTags(snakeToCamel(tagsData) as CRMTag[]);

            // Fetch relations
            const { data: relationsData, error: relationsError } = await supabase
                .from('client_tags_relation')
                .select('client_id, tag_id')
                .in('client_id', (clientsData || []).map(c => c.id));

            if (!relationsError && relationsData) {
                // Attach tags to clients locally
                const mappedClients = (snakeToCamel(clientsData) as Client[]).map(client => {
                    const clientTagIds = relationsData.filter(r => r.client_id === client.id).map(r => r.tag_id);
                    const clientTags = (snakeToCamel(tagsData) as CRMTag[]).filter(t => clientTagIds.includes(t.id));
                    return { ...client, tags: clientTags };
                });
                setClients(mappedClients);
            } else {
                setClients(snakeToCamel(clientsData) as Client[]);
            }

        } catch (error) {
            console.error('Erro ao buscar dados do tenant:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (!isLoadingTenant && tenant?.id) { // Allow fetch if tenant exists, even if user is null
            fetchTenantData(tenant.id);

            // Realtime Subscription
            const channel = supabase
                .channel(`public:data_changes:${tenant.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'appointments',
                        filter: `tenant_id=eq.${tenant.id}`,
                    },
                    (payload) => {
                        console.log('Realtime appointment change:', payload);

                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const newAppointment = snakeToCamel(payload.new) as Appointment;
                            setAppointments(prev => {
                                const exists = prev.some(a => a.id === newAppointment.id);
                                if (exists) {
                                    return prev.map(a => a.id === newAppointment.id ? newAppointment : a);
                                }
                                return [...prev, newAppointment];
                            });
                        }
                        else if (payload.eventType === 'DELETE') {
                            const deletedId = payload.old.id;
                            setAppointments(prev => prev.filter(a => a.id !== deletedId));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'clients',
                        filter: `tenant_id=eq.${tenant.id}`,
                    },
                    (payload) => {
                        console.log('Realtime client change:', payload);
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const newClient = snakeToCamel(payload.new) as Client;
                            setClients(prev => {
                                const exists = prev.some(c => c.id === newClient.id);
                                if (exists) {
                                    return prev.map(c => c.id === newClient.id ? newClient : c);
                                }
                                return [...prev, newClient];
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setClients(prev => prev.filter(c => c.id !== payload.old.id));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const newProduct = snakeToCamel(payload.new) as Product;
                            setProducts(prev => {
                                const exists = prev.some(p => p.id === newProduct.id);
                                if (exists) return prev.map(p => p.id === newProduct.id ? newProduct : p);
                                return [...prev, newProduct];
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setProducts(prev => prev.filter(p => p.id !== payload.old.id));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'services', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const newService = snakeToCamel(payload.new) as Service;
                            setServices(prev => {
                                const exists = prev.some(s => s.id === newService.id);
                                if (exists) return prev.map(s => s.id === newService.id ? newService : s);
                                return [...prev, newService];
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setServices(prev => prev.filter(s => s.id !== payload.old.id));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'professionals', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const newProf = snakeToCamel(payload.new) as Professional;
                            setProfessionals(prev => {
                                const exists = prev.some(p => p.id === newProf.id);
                                if (exists) return prev.map(p => p.id === newProf.id ? newProf : p);
                                return [...prev, newProf];
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setProfessionals(prev => prev.filter(p => p.id !== payload.old.id));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                            const newTrans = snakeToCamel(payload.new) as Transaction;
                            setTransactions(prev => {
                                const exists = prev.some(t => t.id === newTrans.id);
                                if (exists) return prev.map(t => t.id === newTrans.id ? newTrans : t);
                                return [newTrans, ...prev];
                            });
                        } else if (payload.eventType === 'DELETE') {
                            setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
                        }
                    }
                )
                .subscribe((status) => {
                    console.log(`[Realtime] Escutando mudanças para o tenant: ${tenant.id}. Status:`, status);
                });

            return () => {
                console.log('[Realtime] Unsubscribing...');
                supabase.removeChannel(channel);
            };

        } else if (!isLoadingTenant && !tenant) {
            setClients([]);
            setProfessionals([]);
            setProducts([]);
            setServices([]);
            setAppointments([]);
            setStockMovements([]);
            setTransactions([]);
            setCommissions([]);
            setIsLoadingData(false);
        }
    }, [tenant?.id, isLoadingTenant, user?.id, user?.role]);

    const createItem = async <T extends { id: string, tenantId: string }>(tableName: string, item: Omit<T, 'id' | 'tenantId'>, currentTenantId: string): Promise<T | null> => {
        const itemWithTenant = { ...item, tenantId: currentTenantId };
        const { data, error } = await supabase.from(tableName).insert(camelToSnake(itemWithTenant)).select().single();
        if (error) { console.error(`Erro ao adicionar ${tableName}:`, error.message); return null; }
        return snakeToCamel(data) as T;
    };

    const updateItem = async <T extends { id: string, tenantId: string }>(tableName: string, item: T, currentTenantId: string): Promise<T | null> => {
        const { id, tenantId, ...itemData } = item as any;
        const { data, error } = await supabase.from(tableName).update(camelToSnake(itemData)).eq('id', id).eq('tenant_id', currentTenantId).select().single();
        if (error) { console.error(`Erro ao atualizar ${tableName}:`, error.message); return null; }
        return snakeToCamel(data) as T;
    };

    const deleteItem = async (tableName: string, id: string, currentTenantId: string): Promise<boolean> => {
        const { error } = await supabase.from(tableName).delete().eq('id', id).eq('tenant_id', currentTenantId);
        if (error) { console.error(`Erro ao deletar ${tableName}:`, error.message); return false; }
        return true;
    };

    // --- PERMISSION CHECKS ---

    const addClient = async (client: Omit<Client, 'id' | 'tenantId'>) => {
        if (user?.role === 'barber') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const newClient = await createItem<Client>('clients', client, tenant.id);
        if (newClient) setClients(prev => [...prev, newClient]);
        return newClient;
    };
    const updateClient = async (client: Client) => {
        if (user?.role === 'barber') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const updatedClient = await updateItem<Client>('clients', client, tenant.id);
        if (updatedClient) setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
        return updatedClient;
    };
    const deleteClient = async (id: string) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return false; }
        if (!tenant?.id) return false;
        const success = await deleteItem('clients', id, tenant.id);
        if (success) setClients(prev => prev.filter(c => c.id !== id));
        return success;
    };

    const addProfessional = async (professional: Omit<Professional, 'id' | 'tenantId' | 'rating' | 'reviews'>) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const { data, error } = await supabase.functions.invoke('create-professional', { body: { ...professional, tenantId: tenant.id } });
        if (error) {
            console.error('Erro ao invocar a função create-professional:', error);
            // Check if the error object has a 'message' property from the Edge Function's response
            const errorMessage = error.message || 'Erro desconhecido ao cadastrar profissional.';
            alert(`Erro ao cadastrar profissional: ${errorMessage}`);
            return null;
        }
        const newProfessional = snakeToCamel(data) as Professional;
        setProfessionals(prev => [...prev, newProfessional]);
        return newProfessional;
    };
    const updateProfessional = async (professional: Professional) => {
        // Allow admin OR the professional themselves
        const isSelfUpdate = user?.role === 'barber' && professional.userId === user.id;
        if (user?.role !== 'admin' && !isSelfUpdate) { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const { password, ...profData } = professional;
        // Incluir commissionPercentage no update
        const updatedProfessional = await updateItem<Professional>('professionals', { ...profData, commissionPercentage: professional.commissionPercentage } as Professional, tenant.id);
        if (updatedProfessional) setProfessionals(prev => prev.map(p => p.id === updatedProfessional.id ? updatedProfessional : p));
        return updatedProfessional;
    };
    const deleteProfessional = async (id: string) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return false; }
        if (!tenant?.id) return false;
        const success = await deleteItem('professionals', id, tenant.id);
        if (success) setProfessionals(prev => prev.filter(p => p.id !== id));
        return success;
    };

    const addProduct = async (product: Omit<Product, 'id' | 'tenantId'>) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const newProduct = await createItem<Product>('products', product, tenant.id);
        if (newProduct) setProducts(prev => [...prev, newProduct]);
        return newProduct;
    };
    const updateProduct = async (product: Product) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const updatedProduct = await updateItem<Product>('products', product, tenant.id);
        if (updatedProduct) setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        return updatedProduct;
    };
    const deleteProduct = async (id: string) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return false; }
        if (!tenant?.id) return false;
        const success = await deleteItem('products', id, tenant.id);
        if (success) setProducts(prev => prev.filter(p => p.id !== id));
        return success;
    };

    const addService = async (service: Omit<Service, 'id' | 'tenantId'>) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const newService = await createItem<Service>('services', service, tenant.id);
        if (newService) setServices(prev => [...prev, newService]);
        return newService;
    };
    const updateService = async (service: Service) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return null; }
        if (!tenant?.id) return null;
        const updatedService = await updateItem<Service>('services', service, tenant.id);
        if (updatedService) setServices(prev => prev.map(s => s.id === updatedService.id ? updatedService : s));
        return updatedService;
    };
    const deleteService = async (id: string) => {
        if (user?.role !== 'admin') { alert('Acesso negado.'); return false; }
        if (!tenant?.id) return false;
        const success = await deleteItem('services', id, tenant.id);
        if (success) setServices(prev => prev.filter(s => s.id !== id));
        return success;
    };

    const checkAppointmentOverlap = (
        newAppointment: Omit<Appointment, 'id' | 'tenantId'>,
        existingAppointments: Appointment[],
        currentServices: Service[],
        excludeAppointmentId?: string // Para edição, exclui o próprio agendamento
    ): boolean => {
        const newService = currentServices.find(s => s.id === newAppointment.serviceId);
        if (!newService) {
            console.error('Serviço não encontrado para o novo agendamento.');
            return true; // Considerar como sobreposição para evitar agendamentos inválidos
        }

        const newStart = new Date(newAppointment.date);
        const newEnd = new Date(newStart.getTime() + newService.durationMinutes * 60 * 1000);

        console.log('Verificando sobreposição para:', { newStart, newEnd, professionalId: newAppointment.professionalId });

        for (const existingApp of existingAppointments) {
            if (existingApp.id === excludeAppointmentId || existingApp.status === 'Cancelado') {
                continue; // Ignora o próprio agendamento sendo editado ou agendamentos cancelados
            }

            if (existingApp.professionalId === newAppointment.professionalId) {
                const existingService = currentServices.find(s => s.id === existingApp.serviceId);
                if (!existingService) {
                    console.warn(`Serviço não encontrado para agendamento existente ${existingApp.id}.`);
                    continue;
                }

                const existingStart = new Date(existingApp.date);
                const existingEnd = new Date(existingStart.getTime() + existingService.durationMinutes * 60 * 1000);

                // Verifica se há sobreposição
                if (newStart < existingEnd && newEnd > existingStart) {
                    console.warn('Sobreposição encontrada com:', existingApp);
                    return true; // Há sobreposição
                }
            }
        }
        return false; // Não há sobreposição
    };

    const addAppointment = async (appointment: Omit<Appointment, 'id' | 'tenantId'>): Promise<{ success: boolean; error?: string; conflict?: boolean }> => {
        console.log('addAppointment chamado com:', appointment);
        if (!tenant?.id) {
            console.error('Tenant não encontrado');
            return { success: false, error: 'Tenant não encontrado' };
        }

        // Validamos se o usuário tem permissão para o tenant, mas permitimos que barbeiros agendem para colegas
        if (user) {
            if (user.tenantId !== tenant.id) {
                return { success: false, error: 'Acesso negado ao tenant.' };
            }
        }

        if (checkAppointmentOverlap(appointment, appointments, services)) {
            console.warn('Conflito de horário detectado');
            return { success: false, conflict: true };
        }

        const newAppointment = await createItem<Appointment>('appointments', appointment, tenant.id);
        if (newAppointment) {
            console.log('Agendamento criado no banco:', newAppointment);
            setAppointments(prev => [...prev, newAppointment]);
            return { success: true };
        } else {
            console.error('Falha ao criar agendamento no banco');
            return { success: false, error: 'Falha ao salvar atendimento. Por favor, atualize a página e verifique o horário desejado.' };
        }
    };

    const updateAppointment = async (appointment: Appointment): Promise<{ success: boolean; error?: string; conflict?: boolean }> => {
        if (!tenant?.id || !user) return { success: false, error: 'Tenant ou usuário não encontrado' };

        // Bloqueio de segurança por tenant
        if (user.tenantId !== tenant.id) {
            return { success: false, error: 'Acesso negado ao tenant.' };
        }

        // Encontra o agendamento original para comparar
        const originalAppointment = appointments.find(a => a.id === appointment.id);

        // Só realiza a verificação de sobreposição se o profissional ou a data/hora foram alterados
        const professionalOrDateTimeChanged =
            originalAppointment?.professionalId !== appointment.professionalId ||
            originalAppointment?.date !== appointment.date;

        if (professionalOrDateTimeChanged && checkAppointmentOverlap(appointment, appointments, services, appointment.id)) {
            console.warn('Conflito de horário detectado na atualização');
            return { success: false, conflict: true };
        }

        // Limpar campos protegidos/gerados automaticamente
        const { tenantId, createdAt, ...updatePayload } = appointment as any;

        const updatedAppointment = await updateItem<Appointment>('appointments', updatePayload as Appointment, tenant.id);
        if (updatedAppointment) {
            setAppointments(prev => prev.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
            return { success: true };
        }
        return { success: false, error: 'Falha ao atualizar agendamento. Por favor, atualize a página e tente novamente.' };
    };

    const deleteAppointment = async (id: string) => {
        if (!tenant?.id || !user) return false;
        const appointmentToDelete = appointments.find(a => a.id === id);
        const selfProfessional = professionals.find(p => p.userId === user.id);
        if (user.role === 'barber' && (!selfProfessional || appointmentToDelete?.professionalId !== selfProfessional.id)) {
            alert('Você só pode deletar seus próprios agendamentos.');
            return false;
        }
        const success = await deleteItem('appointments', id, tenant.id);
        if (success) setAppointments(prev => prev.filter(a => a.id !== id));
        return success;
    };

    const addStockMovement = async (movement: Omit<StockMovement, 'id' | 'tenantId'>): Promise<boolean> => {
        if (!tenant?.id || !user) return false;

        // 1. Create the movement
        const newMovement = await createItem<StockMovement>('stock_movements', { ...movement, userId: user.id }, tenant.id);
        if (!newMovement) return false;

        // 2. Update local state for movements (realtime might handle this, but for immediate feedback)
        // setStockMovements(prev => [newMovement, ...prev]); // Realtime handles this if enabled

        // 3. Update product stock
        const product = products.find(p => p.id === movement.productId);
        if (product) {
            let newStock = product.stock;
            if (movement.type === 'entry') {
                newStock += movement.quantity;
            } else {
                newStock -= movement.quantity;
            }

            // Allow negative stock? Usually no, but let's just log it. 
            // The database constraint check (quantity > 0) is for the movement quantity, not the stock.

            const updatedProduct = await updateItem<Product>('products', { ...product, stock: newStock }, tenant.id);
            if (updatedProduct) {
                setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
            } else {
                console.error("Failed to update product stock");
                // Should we rollback the movement? Ideally yes, transactions. 
                // But Supabase doesn't support client-side transactions easily without RPC.
                // For now, we assume success or manual fix.
            }
        }

        return true;
    };

    const addTransaction = async (transaction: Omit<Transaction, 'id' | 'tenantId'>): Promise<Transaction | null> => {
        if (!tenant?.id) return null;
        const newTransaction = await createItem<Transaction>('transactions', transaction, tenant.id);
        if (newTransaction) {
            setTransactions(prev => [newTransaction, ...prev]); // Optimistic update / Realtime
        }
        return newTransaction;
    };

    const updateTransaction = async (transaction: Transaction): Promise<Transaction | null> => {
        if (!tenant?.id) return null;
        const updated = await updateItem<Transaction>('transactions', transaction, tenant.id);
        if (updated) {
            setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
        }
        return updated;
    };

    const addCommission = async (commission: Omit<Commission, 'id' | 'tenantId'>): Promise<Commission | null> => {
        if (!tenant?.id) return null;
        const newCommission = await createItem<Commission>('commissions', commission, tenant.id);
        if (newCommission) {
            setCommissions(prev => [newCommission, ...prev]);
        }
        return newCommission;
    };

    const updateCommission = async (commission: Commission): Promise<Commission | null> => {
        if (!tenant?.id) return null;
        const updated = await updateItem<Commission>('commissions', commission, tenant.id);
        if (updated) {
            setCommissions(prev => prev.map(c => c.id === updated.id ? updated : c));
        }
        return updated;
    };

    // --- CRM ---
    const addCRMTag = async (tag: Omit<CRMTag, 'id' | 'tenantId'>) => {
        if (!tenant?.id) return null;
        const newTag = await createItem<CRMTag>('crm_tags', tag, tenant.id);
        if (newTag) setCrmTags(prev => [...prev, newTag]);
        return newTag;
    };

    const updateCRMTag = async (tag: CRMTag) => {
        if (!tenant?.id) return null;
        const updated = await updateItem<CRMTag>('crm_tags', tag, tenant.id);
        if (updated) setCrmTags(prev => prev.map(t => t.id === updated.id ? updated : t));
        return updated;
    };

    const deleteCRMTag = async (id: string) => {
        if (!tenant?.id) return false;
        const success = await deleteItem('crm_tags', id, tenant.id);
        if (success) setCrmTags(prev => prev.filter(t => t.id !== id));
        return success;
    };

    const addClientTag = async (clientId: string, tagId: string) => {
        const { error } = await supabase.from('client_tags_relation').insert({ client_id: clientId, tag_id: tagId });
        if (error) return false;
        const tag = crmTags.find(t => t.id === tagId);
        if (tag) {
            setClients(prev => prev.map(c => c.id === clientId ? { ...c, tags: [...(c.tags || []), tag] } : c));
        }
        return true;
    };

    const removeClientTag = async (clientId: string, tagId: string) => {
        const { error } = await supabase.from('client_tags_relation').delete().eq('client_id', clientId).eq('tag_id', tagId);
        if (error) return false;
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, tags: (c.tags || []).filter(t => t.id !== tagId) } : c));
        return true;
    };

    const addClientNote = async (note: Omit<ClientCRMNote, 'id' | 'tenantId' | 'authorId' | 'createdAt'>) => {
        if (!tenant?.id || !user) return null;
        const noteWithMeta = { ...note, tenantId: tenant.id, authorId: user.id };
        const { data, error } = await supabase.from('client_crm_notes').insert(camelToSnake(noteWithMeta)).select().single();
        if (error) return null;
        const newNote = snakeToCamel(data) as ClientCRMNote;
        return { ...newNote, authorName: user.name };
    };

    const getClientNotes = async (clientId: string) => {
        if (!tenant?.id) return [];
        // Note: Joining with profiles to get author name
        const { data, error } = await supabase
            .from('client_crm_notes')
            .select('*, author:profiles(first_name, last_name)')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (error) return [];
        return (data || []).map(n => ({
            ...snakeToCamel(n),
            authorName: n.author ? `${n.author.first_name || ''} ${n.author.last_name || ''}`.trim() : 'Sistema'
        })) as ClientCRMNote[];
    };

    const refreshData = async () => {
        if (tenant?.id) {
            await fetchTenantData(tenant.id);
        }
    };

    return (
        <DataContext.Provider value={{
            clients, professionals, products, services, appointments,
            addClient, updateClient, deleteClient,
            addProfessional, updateProfessional, deleteProfessional,
            addProduct, updateProduct, deleteProduct,
            addService, updateService, deleteService,
            addAppointment, updateAppointment, deleteAppointment,
            stockMovements, addStockMovement,
            transactions, addTransaction, updateTransaction,
            commissions, addCommission, updateCommission,
            crmTags, addCRMTag, updateCRMTag, deleteCRMTag,
            addClientTag, removeClientTag,
            addClientNote, getClientNotes,
            refreshData,
            isLoadingData
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};

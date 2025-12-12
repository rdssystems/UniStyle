import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Client, Professional, Product, Service, Appointment, StockMovement, Transaction, Commission } from '../types';
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
            if (user?.role === 'barber') {
                const professional = (snakeToCamel(professionalsData) as Professional[]).find(p => p.userId === user.id);
                if (professional) {
                    appointmentQuery = appointmentQuery.eq('professional_id', professional.id);
                } else {
                    setAppointments([]);
                }
            }
            const { data: appointmentsData, error: appointmentsError } = await appointmentQuery;

            if (appointmentsError) throw appointmentsError;
            setAppointments(snakeToCamel(appointmentsData) as Appointment[]);

            const { data: movementsData, error: movementsError } = await supabase.from('stock_movements').select('*').eq('tenant_id', currentTenantId).order('date', { ascending: false });
            if (movementsError) throw movementsError;
            setStockMovements(snakeToCamel(movementsData) as StockMovement[]);

            const { data: transData, error: transError } = await supabase.from('transactions').select('*').eq('tenant_id', currentTenantId).order('date', { ascending: false });
            if (transError) throw transError;
            setTransactions(snakeToCamel(transData) as Transaction[]);

            const { data: commData, error: commError } = await supabase.from('commissions').select('*').eq('tenant_id', currentTenantId).order('date', { ascending: false });
            if (commError) throw commError;
            setCommissions(snakeToCamel(commData) as Commission[]);

        } catch (error) {
            console.error('Erro ao buscar dados do tenant:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    useEffect(() => {
        if (!isLoadingTenant && tenant?.id && user) {
            fetchTenantData(tenant.id);

            // Realtime Subscription
            const channel = supabase
                .channel('public:data_changes')
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
                        const newAppointment = snakeToCamel(payload.new) as Appointment;

                        // Handle INSERT
                        if (payload.eventType === 'INSERT') {
                            // If user is barber, only add if it belongs to them
                            if (user.role === 'barber') {
                                const selfProfessional = professionals.find(p => p.userId === user.id);
                                if (selfProfessional && newAppointment.professionalId === selfProfessional.id) {
                                    setAppointments(prev => [...prev, newAppointment]);
                                }
                            } else {
                                // Admin sees all
                                setAppointments(prev => [...prev, newAppointment]);
                            }
                        }
                        // Handle UPDATE
                        else if (payload.eventType === 'UPDATE') {
                            setAppointments(prev => prev.map(a => a.id === newAppointment.id ? newAppointment : a));
                        }
                        // Handle DELETE
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
                        const newClient = snakeToCamel(payload.new) as Client;

                        if (payload.eventType === 'INSERT') {
                            setClients(prev => [...prev, newClient]);
                        } else if (payload.eventType === 'UPDATE') {
                            setClients(prev => prev.map(c => c.id === newClient.id ? newClient : c));
                        } else if (payload.eventType === 'DELETE') {
                            setClients(prev => prev.filter(c => c.id !== payload.old.id));
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'stock_movements',
                        filter: `tenant_id=eq.${tenant.id}`,
                    },
                    (payload) => {
                        console.log('Realtime stock movement:', payload);
                        const newMovement = snakeToCamel(payload.new) as StockMovement;
                        if (payload.eventType === 'INSERT') {
                            setStockMovements(prev => [newMovement, ...prev]);
                        }
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'transactions', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        const newTrans = snakeToCamel(payload.new) as Transaction;
                        if (payload.eventType === 'INSERT') setTransactions(prev => [newTrans, ...prev]);
                        else if (payload.eventType === 'UPDATE') setTransactions(prev => prev.map(t => t.id === newTrans.id ? newTrans : t));
                        else if (payload.eventType === 'DELETE') setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'commissions', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        const newComm = snakeToCamel(payload.new) as Commission;
                        if (payload.eventType === 'INSERT') setCommissions(prev => [newComm, ...prev]);
                        else if (payload.eventType === 'UPDATE') setCommissions(prev => prev.map(c => c.id === newComm.id ? newComm : c));
                        else if (payload.eventType === 'DELETE') setCommissions(prev => prev.filter(c => c.id !== payload.old.id));
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'products', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        const newProduct = snakeToCamel(payload.new) as Product;
                        if (payload.eventType === 'INSERT') setProducts(prev => [...prev, newProduct]);
                        else if (payload.eventType === 'UPDATE') setProducts(prev => prev.map(p => p.id === newProduct.id ? newProduct : p));
                        else if (payload.eventType === 'DELETE') setProducts(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'services', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        const newService = snakeToCamel(payload.new) as Service;
                        if (payload.eventType === 'INSERT') setServices(prev => [...prev, newService]);
                        else if (payload.eventType === 'UPDATE') setServices(prev => prev.map(s => s.id === newService.id ? newService : s));
                        else if (payload.eventType === 'DELETE') setServices(prev => prev.filter(s => s.id !== payload.old.id));
                    }
                )
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'professionals', filter: `tenant_id=eq.${tenant.id}` },
                    (payload) => {
                        const newProf = snakeToCamel(payload.new) as Professional;
                        if (payload.eventType === 'INSERT') setProfessionals(prev => [...prev, newProf]);
                        else if (payload.eventType === 'UPDATE') setProfessionals(prev => prev.map(p => p.id === newProf.id ? newProf : p));
                        else if (payload.eventType === 'DELETE') setProfessionals(prev => prev.filter(p => p.id !== payload.old.id));
                    }
                )
                .subscribe();

            return () => {
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
        const { id, ...itemData } = item;
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
        if (!tenant?.id || !user) {
            console.error('Tenant ou usuário não encontrado');
            return { success: false, error: 'Tenant ou usuário não encontrado' };
        }
        const selfProfessional = professionals.find(p => p.userId === user.id);
        if (user.role === 'barber' && (!selfProfessional || appointment.professionalId !== selfProfessional.id)) {
            return { success: false, error: 'Você só pode criar agendamentos para si mesmo.' };
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
            return { success: false, error: 'Falha ao criar agendamento' };
        }
    };

    const updateAppointment = async (appointment: Appointment): Promise<{ success: boolean; error?: string; conflict?: boolean }> => {
        if (!tenant?.id || !user) return { success: false, error: 'Tenant ou usuário não encontrado' };
        const selfProfessional = professionals.find(p => p.userId === user.id);
        if (user.role === 'barber' && (!selfProfessional || appointment.professionalId !== selfProfessional.id)) {
            return { success: false, error: 'Você só pode atualizar seus próprios agendamentos.' };
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

        // Incluir totalAmount e productsSold na atualização
        const { totalAmount, productsSold, ...restOfAppointment } = appointment;
        const updatedData = {
            ...restOfAppointment,
            totalAmount: totalAmount !== undefined ? totalAmount : null, // Garante que seja null se não definido
            productsSold: productsSold !== undefined ? productsSold : null, // Garante que seja null se não definido
        };

        const updatedAppointment = await updateItem<Appointment>('appointments', updatedData as Appointment, tenant.id);
        if (updatedAppointment) {
            setAppointments(prev => prev.map(a => a.id === updatedAppointment.id ? updatedAppointment : a));
            return { success: true };
        }
        return { success: false, error: 'Falha ao atualizar agendamento' };
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
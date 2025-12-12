import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Tenant, User, BusinessHours, DailyHours } from '../types';
import { supabase } from '../integrations/supabase/client'; // Importar o cliente Supabase

interface TenantContextType {
    tenant: Tenant | null;
    user: User | null;
    login: (email: string, password: string) => Promise<{ error: string | null }>;
    logout: () => Promise<void>;
    updateTenant: (updates: Partial<Tenant>) => Promise<{ error: string | null }>;
    isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasLoadedRef = React.useRef(false);

    const fetchSessionAndData = useCallback(async (silent = false) => {
        if (!silent) {
            setIsLoading(true);
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
            console.error('Erro ao obter sessão:', sessionError);
            setUser(null);
            setTenant(null);
            if (!silent) setIsLoading(false);
            return;
        }

        if (session?.user) {
            // Fetch user profile, incluindo a role
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*, role') // Garantir que a role seja selecionada
                .eq('id', session.user.id)
                .single();

            if (profileError) {
                console.error('Erro ao buscar perfil do usuário:', profileError);
                setUser(null);
                setTenant(null);
                if (!silent) setIsLoading(false);
                return;
            }

            const currentUser: User = {
                id: session.user.id,
                email: session.user.email || '',
                name: profileData.first_name || session.user.email?.split('@')[0] || '',
                role: profileData.role || 'barber', // Usar a role do banco de dados
                tenantId: profileData.tenant_id,
                avatarUrl: profileData.avatar_url,
            };

            // Avoid unnecessary state updates
            setUser(prev => JSON.stringify(prev) === JSON.stringify(currentUser) ? prev : currentUser);

            // Fetch tenant data
            const { data: tenantData, error: tenantError } = await supabase
                .from('tenants')
                .select('*')
                .eq('id', profileData.tenant_id)
                .single();

            if (tenantError) {
                console.error('Erro ao buscar dados do tenant:', tenantError);
                setTenant(null);
                if (!silent) setIsLoading(false);
                return;
            }

            const currentTenant: Tenant = {
                id: tenantData.id,
                name: tenantData.name,
                slug: tenantData.slug,
                theme: {
                    primaryColor: tenantData.primary_color,
                    logoUrl: tenantData.logo_url,
                    backgroundImageUrl: tenantData.background_image_url,
                },
                businessHours: tenantData.business_hours as BusinessHours,
                address: tenantData.address || (tenantData.business_hours as any)?.address,
            };

            // Avoid unnecessary state updates
            setTenant(prev => JSON.stringify(prev) === JSON.stringify(currentTenant) ? prev : currentTenant);
        } else {
            setUser(null);
            setTenant(null);
        }

        if (!silent) {
            setIsLoading(false);
        }
        hasLoadedRef.current = true;
    }, []);

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}` : '255 123 0'; // Default orange
    };

    useEffect(() => {
        if (tenant?.theme.primaryColor) {
            const rgb = hexToRgb(tenant.theme.primaryColor);
            document.documentElement.style.setProperty('--primary-rgb', rgb);
        } else {
            document.documentElement.style.setProperty('--primary-rgb', '255 123 0'); // Default
        }
    }, [tenant?.theme.primaryColor]);

    useEffect(() => {
        // Define o estado inicial como carregando. O listener irá resolver isso.
        setIsLoading(true);

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                // Se for apenas uma atualização de token em segundo plano (alt-tab), 
                // fazemos o fetch de dados silenciosamente para evitar o flash de 'Carregando...'.
                // TAMBÉM forçamos silent se já tivermos carregado os dados inicialmente (hasLoadedRef.current)
                const isSilent = event === 'TOKEN_REFRESHED' || hasLoadedRef.current;
                fetchSessionAndData(isSilent);
            } else {
                // Se não houver sessão (SIGNED_OUT ou INITIAL_SESSION sem usuário), para de carregar.
                setUser(null);
                setTenant(null);
                setIsLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchSessionAndData]);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            console.error('Erro de login:', error.message);
            setIsLoading(false);
            return { error: error.message };
        }

        // Após o login, força o carregamento visível (silent=false)
        await fetchSessionAndData(false);
        return { error: null };
    };

    const logout = async () => {
        setIsLoading(true);
        const { error } = await supabase.auth.signOut();
        setIsLoading(false);
        if (error) {
            console.error('Erro ao fazer logout:', error.message);
        }
        setUser(null);
        setTenant(null);
    };

    const updateTenant = async (updates: Partial<Tenant>) => {
        if (!tenant) return { error: 'Nenhum tenant ativo para atualizar.' };

        setIsLoading(true);
        const { data, error } = await supabase
            .from('tenants')
            .update({
                name: updates.name,
                slug: updates.slug,
                primary_color: updates.theme?.primaryColor,
                logo_url: updates.theme?.logoUrl,
                background_image_url: updates.theme?.backgroundImageUrl,
                business_hours: {
                    ...updates.businessHours,
                    address: updates.address // Store address in business_hours JSONB
                },
            })
            .eq('id', tenant.id)
            .select()
            .single();

        setIsLoading(false);
        if (error) {
            console.error('Erro ao atualizar tenant:', error.message);
            return { error: error.message };
        }

        if (data) {
            const updatedTenant: Tenant = {
                id: data.id,
                name: data.name,
                slug: data.slug,
                theme: {
                    primaryColor: data.primary_color,
                    logoUrl: data.logo_url,
                    backgroundImageUrl: data.background_image_url,
                },
                businessHours: data.business_hours as BusinessHours,
                address: data.address || (data.business_hours as any)?.address,
            };
            setTenant(updatedTenant);
        }
        return { error: null };
    };

    return (
        <TenantContext.Provider value={{ tenant, user, login, logout, updateTenant, isLoading }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
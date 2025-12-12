import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { supabase } from '../integrations/supabase/client';
import BusinessHoursSettings from '../components/BusinessHoursSettings';

const Settings = () => {
    const { tenant, user, updateTenant, isLoading: isLoadingTenant } = useTenant();
    const [name, setName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
    const [address, setAddress] = useState('');
    const [bookingWindowDays, setBookingWindowDays] = useState(30); // Default 30
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const isBarber = user?.role === 'barber';

    useEffect(() => {
        if (tenant) {
            setName(tenant.name);
            setPrimaryColor(tenant.theme.primaryColor);
            setLogoUrl(tenant.theme.logoUrl || '');
            setBackgroundImageUrl(tenant.theme.backgroundImageUrl || '');
            setAddress(tenant.address || '');
            setBookingWindowDays(tenant.businessHours.bookingWindowDays || 30);
        }
    }, [tenant]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !tenant) {
            return;
        }

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${tenant.id}/logo/${Math.random()}.${fileExt}`; // Updated path structure if needed, but keeping simple for now or trying to separate
        // Actually, let's keep it simple or use a subfolder if we can?
        // The original code was `${tenant.id}/${Math.random()}.${fileExt}`. 
        // I will stick to the pattern but I should probably verify if I should organize better.
        // Let's use `logos/${tenant.id}/${fileName}` if the bucket is logos... 
        // The original code uses .from('logos').upload(filePath) where filePath = `${tenant.id}/${...}`
        // So it is inside a folder named by tenant ID.

        const filePath = `${tenant.id}/${Math.random()}.${fileExt}`;

        setIsUploading(true);

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading logo:', uploadError);
            alert('Erro ao fazer upload do logo.');
            setIsUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath);

        setLogoUrl(publicUrl);
        setIsUploading(false);
    };

    const handleBackgroundImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !tenant) {
            return;
        }

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        // Use a prefix for background to distinguish or just put in same folder? 
        // Same folder is fine, maybe add 'bg-' prefix to filename
        const fileName = `${tenant.id}/bg-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setIsUploading(true);

        const { error: uploadError } = await supabase.storage
            .from('logos') // Reusing 'logos' bucket as planned
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading background:', uploadError);
            alert('Erro ao fazer upload da imagem de fundo.');
            setIsUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath);

        setBackgroundImageUrl(publicUrl);
        setIsUploading(false);
    };

    const handleSaveGeneralSettings = async () => {
        if (tenant) {
            setIsSaving(true);
            const { error } = await updateTenant({
                name,
                theme: { ...tenant.theme, primaryColor, logoUrl, backgroundImageUrl }, // Include backgroundImageUrl
                address,
                businessHours: {
                    ...tenant.businessHours,
                    bookingWindowDays
                }
            });
            setIsSaving(false);
            if (!error) {
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 3000);
            } else {
                alert(`Erro ao salvar configurações gerais: ${error}`);
            }
        }
    };

    if (isLoadingTenant) {
        return (
            <div className="flex h-screen items-center justify-center bg-background-dark text-primary">
                Carregando configurações...
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-text-primary-dark text-4xl font-black">Configurações</h1>
                    <p className="text-text-secondary-dark">
                        {isBarber ? "Visualizando dados da barbearia e preferências do sistema." : "Gerencie os dados da sua barbearia e preferências do sistema."}
                    </p>
                </div>
                {!isBarber && (
                    <button
                        onClick={handleSaveGeneralSettings}
                        className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 shadow-glow-primary transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSaving || isLoadingTenant}
                    >
                        {isSaving ? (
                            <>
                                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                Salvando...
                            </>
                        ) : isSaved ? (
                            <>
                                <span className="material-symbols-outlined">check</span>
                                Salvo!
                            </>
                        ) : (
                            'Salvar Alterações Gerais'
                        )}
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                    <section className="bg-surface-dark rounded-xl p-6 border border-border-dark">
                        <h2 className="text-xl font-bold text-text-primary-dark mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">storefront</span>
                            Perfil da Barbearia
                        </h2>
                        <div className="flex flex-col gap-6">
                            <div className="grid gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Nome da Barbearia</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-12 rounded-lg bg-background-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                                        disabled={isSaving || isLoadingTenant || isBarber}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Logo da Barbearia</label>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-full bg-input-dark overflow-hidden border border-border-dark flex items-center justify-center">
                                            {logoUrl ? (
                                                <img src={logoUrl} alt="Logo Preview" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-text-secondary-dark">image</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="block w-full text-sm text-text-secondary-dark
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold
                                                    file:bg-primary file:text-background-dark
                                                    hover:file:bg-primary/90
                                                    cursor-pointer"
                                                disabled={isSaving || isLoadingTenant || isBarber || isUploading}
                                            />
                                            <p className="text-xs text-text-secondary-dark mt-1">
                                                {isUploading ? 'Enviando...' : 'Recomendado: PNG ou JPG quadrado.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <label className="text-xs font-medium text-text-secondary-dark mb-1 block">Ou cole a URL da imagem</label>
                                        <input
                                            type="url"
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                            placeholder="https://exemplo.com/logo.png"
                                            className="h-10 w-full rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                                            disabled={isSaving || isLoadingTenant || isBarber}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Endereço</label>
                                    <input
                                        type="text"
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Rua Exemplo, 123 - Centro"
                                        className="h-12 rounded-lg bg-background-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                                        disabled={isSaving || isLoadingTenant || isBarber}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-text-secondary-dark">Cor Primária do Tema</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="h-12 w-24 rounded-lg bg-background-dark border border-border-dark p-1 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                                            disabled={isSaving || isLoadingTenant || isBarber}
                                        />
                                        <span className="text-text-primary-dark font-mono">{primaryColor}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-secondary-dark">Janela de Agendamento</label>
                                <select
                                    value={bookingWindowDays}
                                    onChange={(e) => setBookingWindowDays(Number(e.target.value))}
                                    className="h-12 rounded-lg bg-background-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                                    disabled={isSaving || isLoadingTenant || isBarber}
                                >
                                    <option value={1}>Apenas Hoje</option>
                                    <option value={3}>Próximos 3 dias</option>
                                    <option value={7}>Próxima Semana (7 dias)</option>
                                    <option value={15}>Próximos 15 dias</option>
                                    <option value={30}>Próximo Mês (30 dias)</option>
                                </select>
                                <p className="text-xs text-text-secondary-dark">
                                    Define quantos dias no futuro os clientes podem ver e agendar.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-surface-dark rounded-xl p-6 border border-border-dark">
                        <h2 className="text-xl font-bold text-text-primary-dark mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">public</span>
                            Página Pública
                        </h2>
                        <div className="flex flex-col gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-secondary-dark">Link de Agendamento Público</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${window.location.origin}/booking?tenant=${tenant?.slug}`}
                                        className="flex-1 h-12 rounded-lg bg-background-dark border border-border-dark px-4 text-text-secondary-dark focus:outline-none"
                                    />
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(`${window.location.origin}/booking?tenant=${tenant?.slug}`);
                                            alert('Link copiado para a área de transferência!');
                                        }}
                                        className="h-12 px-4 rounded-lg bg-input-dark border border-border-dark text-text-primary-dark hover:text-primary hover:border-primary transition-colors flex items-center gap-2"
                                        title="Copiar Link"
                                    >
                                        <span className="material-symbols-outlined">content_copy</span>
                                        <span className="hidden sm:inline">Copiar</span>
                                    </button>
                                </div>
                                <p className="text-xs text-text-secondary-dark">
                                    Compartilhe este link com seus clientes para que eles possam agendar horários online.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-text-secondary-dark">Imagem de Fundo</label>
                                <div className="flex items-center gap-4">
                                    <div className="h-16 w-24 rounded-lg bg-input-dark overflow-hidden border border-border-dark flex items-center justify-center">
                                        {backgroundImageUrl ? (
                                            <img src={backgroundImageUrl} alt="Background Preview" className="h-full w-full object-cover" />
                                        ) : (
                                            <span className="material-symbols-outlined text-text-secondary-dark">wallpaper</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBackgroundImageUpload}
                                            className="block w-full text-sm text-text-secondary-dark
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-primary file:text-background-dark
                                                hover:file:bg-primary/90
                                                cursor-pointer"
                                            disabled={isSaving || isLoadingTenant || isBarber || isUploading}
                                        />
                                        <p className="text-xs text-text-secondary-dark mt-1">
                                            {isUploading ? 'Enviando...' : 'Recomendado: 1920x1080 ou alta resolução.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="text-xs font-medium text-text-secondary-dark mb-1 block">Ou cole a URL da imagem</label>
                                    <input
                                        type="url"
                                        value={backgroundImageUrl}
                                        onChange={(e) => setBackgroundImageUrl(e.target.value)}
                                        placeholder="https://exemplo.com/fundo.jpg"
                                        className="h-10 w-full rounded-lg bg-background-dark border border-border-dark px-3 text-sm text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all disabled:opacity-70"
                                        disabled={isSaving || isLoadingTenant || isBarber}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
                <BusinessHoursSettings />
            </div>
        </div>
    );
};

export default Settings;
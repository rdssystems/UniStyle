import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../integrations/supabase/client';
import BusinessHoursSettings from '../components/BusinessHoursSettings';

const Settings = () => {
    const { tenant, user, updateTenant, isLoading: isLoadingTenant } = useTenant();
    const { professionals, updateProfessional } = useData();
    const [name, setName] = useState('');
    const [primaryColor, setPrimaryColor] = useState('');
    const [sidebarColor, setSidebarColor] = useState('');
    const [backgroundColor, setBackgroundColor] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
    const [address, setAddress] = useState('');
    const [bookingWindowDays, setBookingWindowDays] = useState(30);
    const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState(120);
    const [allowBarberCheckout, setAllowBarberCheckout] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [myAvatarUrl, setMyAvatarUrl] = useState('');
    const [myName, setMyName] = useState('');
    const [isProfessional, setIsProfessional] = useState(false);

    const isBarber = user?.role === 'barber';

    useEffect(() => {
        if (tenant) {
            setName(tenant.name);
            setPrimaryColor(tenant.theme.primaryColor);
            setSidebarColor(tenant.theme.sidebarColor || '#1E1E1E');
            setBackgroundColor(tenant.theme.backgroundColor || '#121212');
            setLogoUrl(tenant.theme.logoUrl || '');
            setBackgroundImageUrl(tenant.theme.backgroundImageUrl || '');
            setAddress(tenant.address || '');
            setBookingWindowDays(tenant.businessHours.bookingWindowDays || 30);
            setCancellationWindowMinutes(tenant.cancellationWindowMinutes || 120);
            setAllowBarberCheckout(tenant.allowBarberCheckout ?? true);
        }
        if (user) {
            setMyAvatarUrl(user.avatarUrl || '');
            setMyName(user.name || '');
            // Verifica se o usuário atual já está na lista de profissionais
            const prof = professionals.find(p => p.userId === user.id);
            setIsProfessional(!!prof);
        }
    }, [tenant, user]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !tenant) return;
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${tenant.id}/${Math.random()}.${fileExt}`;
        setIsUploading(true);
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
        if (uploadError) {
            alert('Erro ao fazer upload do logo.');
            setIsUploading(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
        setLogoUrl(publicUrl);
        setIsUploading(false);
    };

    const handleBackgroundImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !tenant) return;
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `${tenant.id}/bg-${Math.random()}.${fileExt}`;
        setIsUploading(true);
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
        if (uploadError) {
            alert('Erro ao fazer upload da imagem de fundo.');
            setIsUploading(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
        setBackgroundImageUrl(publicUrl);
        setIsUploading(false);
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !user || !tenant) return;
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const filePath = `avatars/${user.id}-${Math.random()}.${fileExt}`;
        setIsUploadingAvatar(true);
        const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
        if (uploadError) {
            alert('Erro ao fazer upload da foto.');
            setIsUploadingAvatar(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(filePath);
        setMyAvatarUrl(publicUrl);
        setIsUploadingAvatar(false);
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ avatar_url: myAvatarUrl, first_name: myName })
                .eq('id', user.id);
            if (profileError) throw profileError;


            const prof = professionals.find(p => p.userId === user.id);

            if (isProfessional) {
                if (prof) {
                    await updateProfessional({ ...prof, avatarUrl: myAvatarUrl, name: myName });
                } else if (tenant) {
                    // Se marcou para ser profissional mas não existe registro, cria um
                    const { data: newProf, error: profError } = await supabase
                        .from('professionals')
                        .insert({
                            tenant_id: tenant.id,
                            user_id: user.id,
                            name: myName,
                            email: user.email,
                            avatar_url: myAvatarUrl,
                            status: 'Disponível',
                            color: '#7946ef',
                            commission_percentage: 0
                        })
                        .select()
                        .single();

                    if (profError) console.error('Error creating professional record for admin:', profError);
                }
            } else if (prof) {
                // Se desmarcou e o registro existe, remove da lista de profissionais
                const { error: deleteError } = await supabase
                    .from('professionals')
                    .delete()
                    .eq('id', prof.id);

                if (deleteError) console.error('Error removing professional record for admin:', deleteError);
            }

            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Erro ao salvar perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveGeneralSettings = async () => {
        if (tenant) {
            setIsSaving(true);
            const { error } = await updateTenant({
                name,
                theme: { ...tenant.theme, primaryColor, sidebarColor, backgroundColor, logoUrl, backgroundImageUrl },
                address,
                cancellationWindowMinutes,
                allowBarberCheckout,
                businessHours: { ...tenant.businessHours, bookingWindowDays }
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
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-text-primary-dark text-4xl font-black">Configurações</h1>
                    <p className="text-text-secondary-dark font-medium">
                        {isBarber ? "Visualizando dados da barbearia e preferências do sistema." : "Gerencie os dados da sua barbearia e preferências do sistema."}
                    </p>
                </div>
                {!isBarber && (
                    <button
                        onClick={handleSaveGeneralSettings}
                        disabled={isSaving}
                        className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 shadow-glow-primary transition-all flex items-center gap-2"
                    >
                        {isSaving ? 'Salvando...' : isSaved ? 'Salvo!' : 'Salvar Alterações Gerais'}
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                    {/* Perfil Pessoal */}
                    <section className="bg-surface-dark rounded-[32px] p-8 border border-border-dark shadow-xl">
                        <h2 className="text-xl font-bold text-text-primary-dark mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-xl">person</span>
                            Meu Perfil Profissional
                        </h2>

                        <div className="flex flex-col gap-8">
                            <div className="flex items-center gap-8">
                                <div className="h-28 w-28 rounded-full bg-input-dark overflow-hidden border-4 border-primary/20 flex items-center justify-center relative shadow-2xl">
                                    {myAvatarUrl ? (
                                        <img src={myAvatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="material-symbols-outlined text-5xl text-text-secondary-dark">person</span>
                                    )}
                                    {isUploadingAvatar && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <span className="material-symbols-outlined animate-spin text-white">progress_activity</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-4">
                                    <h4 className="font-extrabold text-xl text-text-primary-dark tracking-tight">{myName || user?.name}</h4>
                                    <label className="bg-surface-dark border border-border-dark text-primary px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-background-dark cursor-pointer transition-all flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                                        Alterar Foto
                                        <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={isUploadingAvatar} />
                                    </label>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Meu Nome de Exibição</label>
                                <input
                                    type="text"
                                    value={myName}
                                    onChange={(e) => setMyName(e.target.value)}
                                    placeholder="Seu nome profissional"
                                    className="h-14 rounded-2xl bg-background-dark border border-border-dark px-5 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-bold"
                                />
                            </div>

                            {!isBarber && (
                                <div className="flex items-center gap-4 p-5 bg-primary/5 rounded-2xl border border-primary/20 group hover:border-primary/40 transition-all cursor-pointer" onClick={() => setIsProfessional(!isProfessional)}>
                                    <div className={`w-12 h-6 rounded-full relative transition-all shadow-inner ${isProfessional ? 'bg-primary' : 'bg-input-dark'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${isProfessional ? 'left-7' : 'left-1'}`} />
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-primary-dark cursor-pointer">Aparecer na lista de barbeiros</label>
                                        <p className="text-[10px] text-text-secondary-dark font-bold opacity-60">Ative para que os clientes possam agendar horários com você.</p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="bg-primary text-background-dark px-10 py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:scale-[1.02] shadow-glow-primary transition-all flex items-center gap-3"
                                >
                                    {isSaving ? 'Salvando...' : isSaved ? 'Salvo com Sucesso!' : 'Salvar Perfil Profissional'}
                                </button>
                            </div>
                        </div>
                    </section>

                    {!isBarber && (
                        <>
                            <section className="bg-surface-dark rounded-[32px] p-8 border border-border-dark shadow-xl">
                                <h2 className="text-xl font-bold text-text-primary-dark mb-8 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-xl">storefront</span>
                                    Perfil da Barbearia
                                </h2>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Nome da Barbearia</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="h-14 rounded-2xl bg-background-dark border border-border-dark px-5 text-text-primary-dark focus:border-primary outline-none transition-all font-bold"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Logo da Barbearia</label>
                                        <div className="flex items-center gap-6 p-4 bg-background-dark/30 rounded-2xl border border-border-dark/50">
                                            <div className="h-20 w-20 rounded-2xl bg-input-dark overflow-hidden border border-border-dark flex items-center justify-center shadow-lg">
                                                {logoUrl ? <img src={logoUrl} className="h-full w-full object-cover" /> : <span className="material-symbols-outlined text-3xl opacity-20">image</span>}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-3">
                                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs text-text-secondary-dark file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-primary file:text-background-dark cursor-pointer" />
                                                <p className="text-[10px] text-text-secondary-dark font-medium opacity-50">PNG ou JPG sugerido (Proporção 1:1).</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Endereço</label>
                                        <input
                                            type="text"
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Ex: Rua das Tesouras, 123"
                                            className="h-14 rounded-2xl bg-background-dark border border-border-dark px-5 text-text-primary-dark focus:border-primary outline-none transition-all font-bold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary-dark text-center">Primária</label>
                                            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-12 w-full rounded-xl bg-background-dark border border-border-dark p-1 cursor-pointer" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary-dark text-center">Sidebar</label>
                                            <input type="color" value={sidebarColor} onChange={(e) => setSidebarColor(e.target.value)} className="h-12 w-full rounded-xl bg-background-dark border border-border-dark p-1 cursor-pointer" />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-text-secondary-dark text-center">Fundo</label>
                                            <input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="h-12 w-full rounded-xl bg-background-dark border border-border-dark p-1 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section className="bg-surface-dark rounded-[32px] p-8 border border-border-dark shadow-xl">
                                <h2 className="text-xl font-bold text-text-primary-dark mb-8 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-xl">calendar_month</span>
                                    Regras de Agendamento
                                </h2>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Janela de Agendamento</label>
                                        <select value={bookingWindowDays} onChange={(e) => setBookingWindowDays(Number(e.target.value))} className="h-14 rounded-2xl bg-background-dark border border-border-dark px-5 text-text-primary-dark focus:border-primary outline-none font-bold">
                                            <option value={7}>7 dias</option>
                                            <option value={15}>15 dias</option>
                                            <option value={30}>30 dias</option>
                                            <option value={60}>60 dias</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Antecedência p/ Cancelar (minutos)</label>
                                        <input type="number" value={cancellationWindowMinutes} onChange={(e) => setCancellationWindowMinutes(Number(e.target.value))} className="h-14 rounded-2xl bg-background-dark border border-border-dark px-5 text-text-primary-dark focus:border-primary outline-none font-bold" />
                                    </div>
                                </div>
                            </section>

                            <section className="bg-surface-dark rounded-[32px] p-8 border border-border-dark shadow-xl">
                                <h2 className="text-xl font-bold text-text-primary-dark mb-8 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-xl">shield</span>
                                    Permissões da Equipe
                                </h2>
                                <div className="flex flex-col gap-6">
                                    <label className="flex items-center gap-4 p-4 bg-background-dark/30 rounded-2xl border border-border-dark/50 cursor-pointer hover:border-primary/50 transition-all group">
                                        <div className="flex-1">
                                            <h4 className="text-sm font-black uppercase tracking-widest text-text-primary-dark mb-1">Barbeiros podem concluir atendimentos</h4>
                                            <p className="text-[10px] text-text-secondary-dark font-medium leading-relaxed">
                                                Habilite para permitir que os barbeiros finalizem o serviço e recebam pagamentos. Desabilite se você centraliza o caixa na recepção.
                                            </p>
                                        </div>
                                        <div className={`w-12 h-6 rounded-full relative transition-all ${allowBarberCheckout ? 'bg-primary' : 'bg-input-dark'}`}>
                                            <input
                                                type="checkbox"
                                                checked={allowBarberCheckout}
                                                onChange={(e) => setAllowBarberCheckout(e.target.checked)}
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            />
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${allowBarberCheckout ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </label>
                                </div>
                            </section>

                            <section className="bg-surface-dark rounded-[32px] p-8 border border-border-dark shadow-xl">
                                <h2 className="text-xl font-bold text-text-primary-dark mb-8 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary p-2 bg-primary/10 rounded-xl">public</span>
                                    Página Pública
                                </h2>
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Link de Agendamento</label>
                                        <div className="flex gap-3">
                                            <input
                                                type="text"
                                                readOnly
                                                value={`${window.location.origin}/booking?tenant=${tenant?.slug}`}
                                                className="flex-1 h-12 rounded-xl bg-background-dark border border-border-dark px-4 text-xs font-extrabold text-primary focus:outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/booking?tenant=${tenant?.slug}`);
                                                    alert('Link copiado!');
                                                }}
                                                className="h-12 px-4 rounded-xl bg-surface-dark border border-border-dark text-text-primary-dark hover:text-primary transition-all flex items-center justify-center group"
                                            >
                                                <span className="material-symbols-outlined text-xl group-active:scale-90 transition-transform">content_copy</span>
                                            </button>
                                        </div>
                                        <p className="text-[10px] text-text-secondary-dark font-bold leading-relaxed opacity-60">
                                            {isBarber ? "Divulgue seu link no Instagram para receber agendamentos diretos." : "Divulgue o link oficial da sua barbearia para seus clientes."}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-text-secondary-dark ml-1">Imagem de Fundo da Reserva</label>
                                        <div className="h-40 w-full rounded-2xl bg-input-dark overflow-hidden border border-border-dark relative flex items-center justify-center group">
                                            {backgroundImageUrl ? <img src={backgroundImageUrl} className="h-full w-full object-cover transition-transform group-hover:scale-105 duration-700" /> : <span className="material-symbols-outlined text-4xl opacity-20">wallpaper</span>}
                                            <input type="file" accept="image/*" onChange={handleBackgroundImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                                                <div className="bg-primary text-background-dark px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg">Alterar Fundo da Página</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <div className="flex flex-col gap-8">
                    <BusinessHoursSettings />
                </div>
            </div>
        </div>
    );
};

export default Settings;
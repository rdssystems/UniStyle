import React, { useState, useEffect } from 'react';
import { Professional } from '../types';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';
import { supabase } from '../integrations/supabase/client';

interface ProfessionalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (professional: Omit<Professional, 'id' | 'tenantId' | 'rating' | 'reviews'>) => void;
    professionalToEdit?: Professional;
}

const ProfessionalModal: React.FC<ProfessionalModalProps> = ({ isOpen, onClose, onSave, professionalToEdit }) => {
    const { tenant } = useTenant();
    const { services } = useData();
    const tenantServices = services.filter(s => s.tenantId === tenant?.id);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
    const [avatarUrl, setAvatarUrl] = useState('');
    const [commissionPercentage, setCommissionPercentage] = useState<string>('0'); // Novo estado para comissão
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (professionalToEdit) {
            setName(professionalToEdit.name);
            setEmail(professionalToEdit.email);
            setSelectedSpecialties(professionalToEdit.specialties || []);
            setAvatarUrl(professionalToEdit.avatarUrl || '');
            setPassword(''); // Senha não é preenchida na edição
            setCommissionPercentage(professionalToEdit.commissionPercentage.toString()); // Preencher comissão
        } else {
            setName('');
            setEmail('');
            setPassword('');
            setSelectedSpecialties([]);
            setAvatarUrl('');
            setCommissionPercentage('0'); // Padrão para novo profissional
        }
    }, [professionalToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSpecialtyChange = (serviceTitle: string) => {
        setSelectedSpecialties(prev =>
            prev.includes(serviceTitle)
                ? prev.filter(s => s !== serviceTitle)
                : [...prev, serviceTitle]
        );
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0 || !tenant) {
            return;
        }

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${tenant.id}/professionals/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setIsUploading(true);

        const { error: uploadError } = await supabase.storage
            .from('logos')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Error uploading avatar:', uploadError);
            alert('Erro ao fazer upload do avatar.');
            setIsUploading(false);
            return;
        }

        const { data: { publicUrl } } = supabase.storage
            .from('logos')
            .getPublicUrl(filePath);

        setAvatarUrl(publicUrl);
        setIsUploading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name,
            email,
            password: password || undefined, // Envia a senha apenas se for preenchida
            specialties: selectedSpecialties,
            avatarUrl,
            status: professionalToEdit?.status || 'Disponível',
            color: professionalToEdit?.color || 'gray',
            commissionPercentage: Number(commissionPercentage), // Enviar comissão
        });
        onClose();
    };

    const isEditing = !!professionalToEdit;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-xl bg-surface-dark p-6 border border-border-dark shadow-glow-primary">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-primary-dark">
                        {isEditing ? 'Editar Profissional' : 'Novo Profissional'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Nome Completo</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: Carlos Silva"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-text-secondary-dark">Email de Acesso</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="email@exemplo.com"
                                disabled={isEditing} // Não permite editar email por simplicidade
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-medium text-text-secondary-dark">
                                {isEditing ? 'Nova Senha (Opcional)' : 'Senha de Acesso'}
                            </label>
                            <input
                                type="password"
                                required={!isEditing} // Senha é obrigatória apenas na criação
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Comissão (%)</label> {/* Novo campo */}
                        <input
                            type="number"
                            required
                            min="0"
                            max="100"
                            step="1"
                            value={commissionPercentage}
                            onChange={(e) => setCommissionPercentage(e.target.value)}
                            className="h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: 50"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Especialidades (Serviços)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-input-dark rounded-lg border border-border-dark">
                            {tenantServices.length > 0 ? tenantServices.map(service => (
                                <label key={service.id} className="flex items-center gap-2 text-sm text-text-primary-dark cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-border-dark bg-background-dark text-primary focus:ring-primary"
                                        checked={selectedSpecialties.includes(service.title)}
                                        onChange={() => handleSpecialtyChange(service.title)}
                                    />
                                    {service.title}
                                </label>
                            )) : (
                                <p className="text-text-secondary-dark text-xs col-span-full text-center">Nenhum serviço cadastrado.</p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-secondary-dark">Avatar</label>
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-input-dark overflow-hidden border border-border-dark flex items-center justify-center flex-shrink-0">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar Preview" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined text-text-secondary-dark">person</span>
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="block w-full text-sm text-text-secondary-dark
                                        file:mr-4 file:py-2 file:px-4
                                        file:rounded-full file:border-0
                                        file:text-sm file:font-semibold
                                        file:bg-primary file:text-background-dark
                                        hover:file:bg-primary/90
                                        cursor-pointer"
                                    disabled={isUploading}
                                />
                                <p className="text-xs text-text-secondary-dark mt-1">
                                    {isUploading ? 'Enviando...' : 'Recomendado: JPG ou PNG quadrado.'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-2">
                            <label className="text-xs font-medium text-text-secondary-dark mb-1 block">Ou cole a URL da imagem</label>
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="h-10 w-full rounded-lg bg-input-dark border border-border-dark px-3 text-sm text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-border-dark bg-transparent py-3 font-bold text-text-primary-dark hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="flex-1 rounded-lg bg-primary py-3 font-bold text-background-dark hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfessionalModal;

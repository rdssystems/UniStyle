import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Professional } from '../types';
import ProfessionalModal from '../components/ProfessionalModal';
import ProfessionalHistory from '../components/ProfessionalHistory';

const Professionals = () => {
    const { tenant, user, isLoading: isLoadingTenant } = useTenant();
    const { professionals, addProfessional, updateProfessional, deleteProfessional, isLoadingData } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [professionalToEdit, setProfessionalToEdit] = useState<Professional | undefined>(undefined);
    const [professionalToView, setProfessionalToView] = useState<Professional | null>(null);

    if (isLoadingTenant || isLoadingData) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Profissionais...</div>;
    }

    const tenantProfessionals = professionals.filter(p => p.tenantId === tenant?.id);

    const handleSave = async (professionalData: Omit<Professional, 'id' | 'tenantId' | 'rating' | 'reviews'>) => {
        if (!tenant) return;

        if (professionalToEdit) {
            await updateProfessional({ ...professionalToEdit, ...professionalData });
        } else {
            const newProfessionalData: Omit<Professional, 'id' | 'tenantId'> = {
                ...professionalData,
                rating: 5.0,
                reviews: 0
            };
            await addProfessional(newProfessionalData);
        }
        setIsModalOpen(false);
        setProfessionalToEdit(undefined);
    };

    const handleDelete = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir este profissional?')) {
            await deleteProfessional(id);
        }
    };

    const openEditModal = (professional: Professional) => {
        setProfessionalToEdit(professional);
        setIsModalOpen(true);
    };

    const openNewModal = () => {
        setProfessionalToEdit(undefined);
        setIsModalOpen(true);
    };

    const openHistoryModal = (professional: Professional) => {
        setProfessionalToView(professional);
        setIsHistoryModalOpen(true);
    };

    return (
        <div className="flex flex-col gap-8">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-text-primary-dark text-4xl font-black">Profissionais</h1>
                {user?.role === 'admin' && (
                    <button
                        onClick={openNewModal}
                        className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
                    >
                        Adicionar Profissional
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {tenantProfessionals.map((professional) => (
                    <div key={professional.id} className="bg-card-dark rounded-xl p-6 border border-border-dark hover:border-primary hover:shadow-glow-primary/20 transition-all group relative">
                        <div className="flex flex-col items-center text-center mb-4">
                            <div className="relative">
                                <img src={professional.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(professional.name)}&background=random`} className="w-24 h-24 rounded-full object-cover border-4 border-surface-dark shadow-lg mb-3" alt={professional.name} />
                                <div className={`absolute bottom-3 right-0 w-5 h-5 rounded-full border-2 border-card-dark ${professional.status === 'Disponível' ? 'bg-green-500' : professional.status === 'Em atendimento' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                            </div>
                            <h3 className="font-bold text-lg text-text-primary-dark">{professional.name}</h3>
                            <p className="text-sm text-text-secondary-dark">{professional.status}</p>

                            {/* Actions Group */}
                            <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-card-dark p-1 rounded-lg border border-border-dark shadow-xl z-20">
                                {user?.role === 'admin' && (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditModal(professional); }}
                                            className="text-text-secondary-dark hover:text-primary p-2"
                                            title="Editar"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(professional.id); }}
                                            className="text-text-secondary-dark hover:text-red-500 p-2"
                                            title="Excluir"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </>
                                )}
                                {(user?.role === 'admin' || user?.id === professional.userId) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openHistoryModal(professional); }}
                                        className="text-text-secondary-dark hover:text-blue-400 p-2"
                                        title="Ver Histórico"
                                    >
                                        <span className="material-symbols-outlined text-sm">history</span>
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-center gap-1 text-yellow-500">
                                {[...Array(5)].map((_, i) => (
                                    <span key={i} className="material-symbols-outlined text-sm">
                                        {i < Math.floor(professional.rating) ? 'star' : 'star_border'}
                                    </span>
                                ))}
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {professional.specialties?.map((spec, index) => (
                                    <span key={index} className="px-2 py-1 bg-surface-dark rounded text-xs text-text-secondary-dark border border-border-dark">
                                        {spec}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <ProfessionalModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                    professionalToEdit={professionalToEdit}
                />
            )}

            {isHistoryModalOpen && professionalToView && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-surface-dark w-full max-w-4xl rounded-xl border border-border-dark shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-xl font-black text-text-primary-dark">Histórico: {professionalToView.name}</h2>
                                <p className="text-sm text-text-secondary-dark">Desempenho e Comissões</p>
                            </div>
                            <button onClick={() => setIsHistoryModalOpen(false)} className="text-text-secondary-dark hover:text-primary transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <ProfessionalHistory professionalId={professionalToView.id} />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Professionals;
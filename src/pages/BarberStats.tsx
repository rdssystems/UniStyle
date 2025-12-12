import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';
import ProfessionalHistory from '../components/ProfessionalHistory';

const BarberStats = () => {
    const { user } = useTenant();
    const { professionals } = useData();

    const currentProfessional = useMemo(() => {
        return professionals.find(p => p.userId === user?.id);
    }, [professionals, user]);

    if (!currentProfessional) {
        return <div className="text-white p-8">Perfil de profissional não encontrado para este usuário.</div>;
    }

    return (
        <div className="flex flex-col gap-6 h-[calc(100vh-140px)]">
            <header>
                <h1 className="text-text-primary-dark text-4xl font-black">Meu Desempenho</h1>
                <p className="text-text-secondary-dark">Acompanhe suas comissões e atendimentos</p>
            </header>

            <ProfessionalHistory professionalId={currentProfessional.id} />
        </div>
    );
};

export default BarberStats;

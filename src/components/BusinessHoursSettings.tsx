import React, { useState, useEffect } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { BusinessHours, DayOfWeek } from '../types';

const dayNames: Record<DayOfWeek, string> = {
    sunday: 'Domingo',
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
};

const orderedDays: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
];

const BusinessHoursSettings: React.FC = () => {
    const { tenant, user, updateTenant } = useTenant();
    const [hours, setHours] = useState<BusinessHours>(tenant?.businessHours || {
        sunday: { open: '00:00', close: '00:00', isClosed: true },
        monday: { open: '09:00', close: '18:00', isClosed: false },
        tuesday: { open: '09:00', close: '18:00', isClosed: false },
        wednesday: { open: '09:00', close: '18:00', isClosed: false },
        thursday: { open: '09:00', close: '18:00', isClosed: false },
        friday: { open: '09:00', close: '18:00', isClosed: false },
        saturday: { open: '09:00', close: '14:00', isClosed: false },
    });

    const isBarber = user?.role === 'barber';

    useEffect(() => {
        if (tenant?.businessHours) {
            setHours(tenant.businessHours);
        }
    }, [tenant?.businessHours]);

    const handleHourChange = (day: DayOfWeek, field: 'open' | 'close', value: string) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], [field]: value }
        }));
    };

    const handleToggleClosed = (day: DayOfWeek) => {
        setHours(prev => ({
            ...prev,
            [day]: { ...prev[day], isClosed: !prev[day].isClosed }
        }));
    };

    const handleSave = () => {
        if (tenant) {
            updateTenant({ businessHours: hours });
        }
    };

    return (
        <section className="bg-surface-dark rounded-xl p-6 border border-border-dark">
            <h2 className="text-xl font-bold text-text-primary-dark mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                Horário de Funcionamento
            </h2>

            <div className="flex flex-col gap-4">
                {orderedDays.map(day => (
                    <div key={day} className="grid grid-cols-1 sm:grid-cols-2 items-center gap-x-4 gap-y-2 p-3 bg-background-dark rounded-lg border border-border-dark">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id={`open-${day}`}
                                checked={!hours[day]?.isClosed}
                                onChange={() => handleToggleClosed(day)}
                                className="h-5 w-5 rounded border-border-dark bg-input-dark text-primary focus:ring-primary disabled:opacity-70"
                                disabled={isBarber}
                            />
                            <label htmlFor={`open-${day}`} className="text-sm font-medium text-text-primary-dark">
                                {dayNames[day]}
                            </label>
                            <span className={`text-xs font-bold ml-2 ${!hours[day]?.isClosed ? 'text-green-500' : 'text-red-500'}`}>
                                {!hours[day]?.isClosed ? 'ABERTO' : 'FECHADO'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-self-end">
                            <input
                                type="time"
                                value={hours[day]?.open || '00:00'}
                                onChange={(e) => handleHourChange(day, 'open', e.target.value)}
                                className="h-10 rounded-lg bg-input-dark border border-border-dark px-3 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all w-full disabled:opacity-70"
                                disabled={hours[day]?.isClosed || false || isBarber}
                            />
                            <span className="text-text-secondary-dark">-</span>
                            <input
                                type="time"
                                value={hours[day]?.close || '00:00'}
                                onChange={(e) => handleHourChange(day, 'close', e.target.value)}
                                className="h-10 rounded-lg bg-input-dark border border-border-dark px-3 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all w-full disabled:opacity-70"
                                disabled={hours[day]?.isClosed || false || isBarber}
                            />
                        </div>
                    </div>
                ))}
            </div>
            {!isBarber && (
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 shadow-glow-primary transition-all"
                    >
                        Salvar Horários
                    </button>
                </div>
            )}
        </section>
    );
};

export default BusinessHoursSettings;
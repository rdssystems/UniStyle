import React, { useState, useEffect } from 'react';
import { Appointment, Client, Professional, Service } from '../types';
import { useData } from '../contexts/DataContext';
import { useTenant } from '../contexts/TenantContext';

interface AppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Omit<Appointment, 'id' | 'tenantId'>) => Promise<boolean>; // Alterado para retornar Promise<boolean>
    onDelete?: (id: string) => Promise<boolean>;
    appointmentToEdit?: Appointment;
    selectedDate?: Date;
}

const AppointmentModal: React.FC<AppointmentModalProps> = ({ isOpen, onClose, onSave, onDelete, appointmentToEdit, selectedDate }) => {
    const { tenant, user } = useTenant(); // Adicionar user
    const { clients, professionals, services } = useData();

    const [clientId, setClientId] = useState('');
    const [professionalId, setProfessionalId] = useState('');
    const [serviceId, setServiceId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [status, setStatus] = useState<Appointment['status']>('Agendado');
    const [notes, setNotes] = useState('');

    const tenantClients = clients.filter(c => c.tenantId === tenant?.id);
    const tenantProfessionals = professionals.filter(p => p.tenantId === tenant?.id);
    const tenantServices = services.filter(s => s.tenantId === tenant?.id);

    useEffect(() => {
        const selfProfessional = professionals.find(p => p.userId === user?.id);

        if (appointmentToEdit) {
            setClientId(appointmentToEdit.clientId);
            setProfessionalId(appointmentToEdit.professionalId);
            setServiceId(appointmentToEdit.serviceId);
            const d = new Date(appointmentToEdit.date);
            setDate(d.toISOString().split('T')[0]);
            setTime(d.toTimeString().slice(0, 5));
            setStatus(appointmentToEdit.status);
            setNotes(appointmentToEdit.notes || '');
        } else {
            setClientId('');
            // REGRA: Se for barbeiro, pré-seleciona a si mesmo
            setProfessionalId(user?.role === 'barber' && selfProfessional ? selfProfessional.id : '');
            setServiceId('');
            // Sempre usar a data atual (hoje) para novos agendamentos, conforme solicitado
            setDate(new Date().toISOString().split('T')[0]);
            setTime('09:00');
            setStatus('Agendado');
            setNotes('');
        }
    }, [appointmentToEdit, selectedDate, isOpen, user, professionals]);

    const handleSubmit = async (e: React.FormEvent) => { // Tornar a função assíncrona
        e.preventDefault();
        const dateTime = new Date(`${date}T${time}`);

        const success = await onSave({ // Aguardar o resultado de onSave
            clientId,
            professionalId,
            serviceId,
            date: dateTime.toISOString(),
            status,
            notes
        });

        if (success) { // Só fechar se for bem-sucedido
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-surface-dark rounded-xl w-full max-w-md border border-border-dark shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center p-6 border-b border-border-dark">
                    <h2 className="text-xl font-black text-text-primary-dark">
                        {appointmentToEdit ? 'Editar Agendamento' : 'Novo Agendamento'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-secondary-dark mb-1">Cliente</label>
                        <select
                            required
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none"
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                        >
                            <option value="">Selecione um cliente</option>
                            {tenantClients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-secondary-dark mb-1">Profissional</label>
                        <select
                            required
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none disabled:opacity-50"
                            value={professionalId}
                            onChange={(e) => setProfessionalId(e.target.value)}
                            disabled={user?.role === 'barber'} // REGRA: Trava o campo para o barbeiro
                        >
                            <option value="">Selecione um profissional</option>
                            {tenantProfessionals.map(professional => (
                                <option key={professional.id} value={professional.id}>{professional.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-secondary-dark mb-1">Serviço</label>
                        <select
                            required
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none"
                            value={serviceId}
                            onChange={(e) => setServiceId(e.target.value)}
                        >
                            <option value="">Selecione um serviço</option>
                            {tenantServices.map(service => (
                                <option key={service.id} value={service.id}>
                                    {service.title} - R$ {service.price.toFixed(2)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-text-secondary-dark mb-1">Data</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-secondary-dark mb-1">Horário</label>
                            <input
                                type="time"
                                required
                                className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-secondary-dark mb-1">Status</label>
                        <select
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none"
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Appointment['status'])}
                        >
                            <option value="Agendado">Agendado</option>
                            <option value="Confirmado">Confirmado</option>
                            <option value="Concluído">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-secondary-dark mb-1">Observações</label>
                        <textarea
                            className="w-full bg-background-dark border border-border-dark rounded-lg p-3 text-text-primary-dark focus:border-primary focus:outline-none resize-none h-24"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Alguma observação especial?"
                        />
                    </div>

                    <div className="flex justify-between pt-4">
                        {appointmentToEdit && onDelete && (
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirm('Tem certeza que deseja excluir?')) {
                                        await onDelete(appointmentToEdit.id);
                                        onClose();
                                    }
                                }}
                                className="px-4 py-2 text-red-500 hover:text-red-400 font-bold transition-colors flex items-center gap-1"
                            >
                                <span className="material-symbols-outlined text-sm">delete</span>
                                Excluir
                            </button>
                        )}
                        <div className="flex gap-3 ml-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-text-secondary-dark hover:text-text-primary-dark font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="bg-primary text-background-dark px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AppointmentModal;
import React, { useState, useEffect } from 'react';
import { Service } from '../types';

interface ServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (service: Omit<Service, 'id' | 'tenantId'>) => void;
    serviceToEdit?: Service;
}

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSave, serviceToEdit }) => {
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (serviceToEdit) {
            setTitle(serviceToEdit.title);
            setPrice(serviceToEdit.price.toString());
            setDuration(serviceToEdit.durationMinutes.toString());
            setDescription(serviceToEdit.description || '');
        } else {
            setTitle('');
            setPrice('');
            setDuration('');
            setDescription('');
        }
    }, [serviceToEdit, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            title,
            price: Number(price),
            durationMinutes: Number(duration),
            description
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl bg-surface-dark p-6 border border-border-dark shadow-glow-primary">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-text-primary-dark">
                        {serviceToEdit ? 'Editar Serviço' : 'Novo Serviço'}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary-dark hover:text-primary">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary-dark mb-2">Nome do Serviço</label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            placeholder="Ex: Corte Degradê"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary-dark mb-2">Preço (R$)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary-dark mb-2">Duração (min)</label>
                            <input
                                type="number"
                                required
                                min="5"
                                step="5"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-full h-12 rounded-lg bg-input-dark border border-border-dark px-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                                placeholder="30"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary-dark mb-2">Descrição (Opcional)</label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full rounded-lg bg-input-dark border border-border-dark p-4 text-text-primary-dark focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                            placeholder="Detalhes do serviço..."
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-lg border border-border-dark bg-transparent py-3 font-bold text-text-primary-dark hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-primary py-3 font-bold text-background-dark hover:opacity-90 transition-opacity"
                        >
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ServiceModal;

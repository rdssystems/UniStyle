import React, { useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { useData } from '../contexts/DataContext';
import { Service } from '../types';
import ServiceModal from '../components/ServiceModal';

const Services = () => {
  const { tenant, user, isLoading: isLoadingTenant } = useTenant();
  const { services, addService, updateService, deleteService, isLoadingData } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | undefined>(undefined);

  if (isLoadingTenant || isLoadingData) {
    return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando Serviços...</div>;
  }

  const tenantServices = services.filter(s => s.tenantId === tenant?.id);

  const handleSave = async (serviceData: Omit<Service, 'id' | 'tenantId'>) => {
    if (!tenant) return;

    if (serviceToEdit) {
      await updateService({ ...serviceToEdit, ...serviceData });
    } else {
      await addService(serviceData);
    }
    setIsModalOpen(false);
    setServiceToEdit(undefined);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      await deleteService(id);
    }
  };

  const openEditModal = (service: Service) => {
    setServiceToEdit(service);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setServiceToEdit(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="text-text-primary-dark text-4xl font-extrabold">Catálogo de Serviços</h1>
        {user?.role === 'admin' && (
          <button
            onClick={openNewModal}
            className="bg-primary text-background-dark px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            Adicionar Novo Serviço
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {tenantServices.map((service) => (
          <div key={service.id} className="bg-card-dark rounded-xl p-6 border border-border-dark hover:border-primary hover:shadow-glow-primary/20 transition-all group relative">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg text-text-primary-dark">{service.title}</h3>
              {user?.role === 'admin' && (
                <div className="flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity absolute top-4 right-4 bg-card-dark p-1 rounded-lg border border-border-dark">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(service); }}
                    className="text-text-secondary-dark hover:text-primary p-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(service.id); }}
                    className="text-text-secondary-dark hover:text-red-500 p-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm text-text-secondary-dark">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">sell</span>
                R$ {service.price.toFixed(2)}
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">schedule</span>
                {service.durationMinutes} min
              </div>
              {service.description && (
                <p className="text-xs mt-2 line-clamp-2">{service.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <ServiceModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          serviceToEdit={serviceToEdit}
        />
      )}
    </div>
  );
};

export default Services;

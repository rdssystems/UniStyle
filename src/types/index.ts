export type ViewState = 'dashboard' | 'agenda' | 'clients' | 'professionals' | 'services' | 'products' | 'inventory' | 'sales-reports' | 'settings' | 'crm';

export type DayOfWeek = 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface DailyHours {
  open: string; // e.g., "09:00"
  close: string; // e.g., "18:00"
  isClosed: boolean;
}

export type BusinessHours = {
  [key in DayOfWeek]: DailyHours;
} & {
  bookingWindowDays?: number;
};

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  theme: {
    primaryColor: string;
    sidebarColor?: string | null;
    backgroundColor?: string | null;
    logoUrl?: string | null;
    backgroundImageUrl?: string | null;
  };
  businessHours: BusinessHours;
  bookingWindowDays?: number; // Novo campo, opcional pois pode não existir em tenants antigos sem migração
  cancellationWindowMinutes?: number; // Novo campo para janela de cancelamento
  address?: string; // Novo campo para endereço
  allowBarberCheckout?: boolean; // Se barbeiros podem concluir atendimentos
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'barber' | 'receptionist'; // O papel pode ser inferido ou armazenado no perfil
  tenantId: string;
  avatarUrl?: string | null; // Pode ser nulo no Supabase
}

export interface Client {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  cpf?: string; // NOVO CAMPO
  status: 'Ativo' | 'Novo' | 'Inadimplente';
  points: number;
  avatarUrl?: string | null;
  // Mensalista Fields
  isMensalista?: boolean;
  mensalistaValor?: number;
  mensalistaFormaPagamento?: 'cash' | 'card' | 'pix' | 'other';
  mensalistaInicio?: string; // ISO
  mensalistaExpiraEm?: string; // ISO
  // Credit/Debit System
  balance?: number; // saldo_cliente

  // CRM Fields
  isVip?: boolean;
  preferences?: {
    favoriteServices?: string[];
    preferredProfessionalId?: string;
    preferredTime?: string;
    notes?: string;
  };
  tags?: CRMTag[];
}

export interface CRMTag {
  id: string;
  tenantId: string;
  name: string;
  color: string;
}

export interface ClientCRMNote {
  id: string;
  tenantId: string;
  clientId: string;
  authorId: string;
  authorName?: string;
  content: string;
  createdAt: string;
}

export interface Professional {
  id: string;
  tenantId: string;
  name: string;
  email: string; // Novo campo
  userId?: string; // Novo campo para vincular ao auth.users
  password?: string; // Apenas para o formulário, não será armazenado aqui
  status: 'Disponível' | 'Em atendimento' | 'Offline';
  color: string;
  avatarUrl?: string | null; // Pode ser nulo no Supabase
  rating: number;
  reviews: number;
  specialties: string[];
  commissionPercentage: number; // NOVO CAMPO
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  stock: number;
  minStock: number;
  sellingPrice: number; // Renomeado de 'price'
  costPrice: number; // Novo campo
  category: string;
  sku?: string | null; // Pode ser nulo no Supabase
}

export interface Service {
  id: string;
  tenantId: string;
  title: string;
  price: number;
  durationMinutes: number;
  description?: string | null; // Pode ser nulo no Supabase
}

export interface SoldProduct {
  productId: string;
  name: string;
  quantity: number;
  sellingPrice: number;
}

export interface Appointment {
  id: string;
  tenantId: string;
  clientId: string;
  professionalId: string;
  serviceId: string;
  date: string; // ISO string
  status: 'Agendado' | 'Concluído' | 'Cancelado' | 'Confirmado' | 'Em Atendimento';
  notes?: string | null; // Pode ser nulo no Supabase
  totalAmount?: number; // NOVO CAMPO
  productsSold?: SoldProduct[]; // NOVO CAMPO
}

export interface StockMovement {
  id: string;
  tenantId: string;
  productId: string;
  type: 'entry' | 'exit';
  quantity: number;
  reason: string;
  date: string; // ISO string
  userId?: string | null;
  observations?: string | null;
}

export interface Transaction {
  id: string;
  tenantId: string;
  type: 'income' | 'expense' | 'reversal';
  category: 'service' | 'product' | 'salary' | 'commission' | 'operational' | 'other';
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'card' | 'pix' | 'other';
  date: string;
  responsibleId?: string;
  relatedEntityId?: string;
  relatedEntityType?: 'appointment' | 'manual';
}

export interface Commission {
  id: string;
  tenantId: string;
  professionalId: string;
  appointmentId?: string;
  amount: number;
  status: 'pending' | 'paid';
}

export interface PublicIdentificationResponse {
  status: 'success' | 'ambiguous' | 'error';
  message?: string;
  token?: string;
  client?: {
    id: string;
    name: string;
    phone: string;
    cpf?: string;
  };
}

export interface PublicTokenVerificationResponse {
  valid: boolean;
  client?: {
    id: string;
    name: string;
    phone: string;
    cpf?: string;
  };
}
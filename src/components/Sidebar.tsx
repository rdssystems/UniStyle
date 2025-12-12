import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
    const { tenant, user, logout } = useTenant();
    const location = useLocation();
    const currentPath = location.pathname;

    const NavItem = ({ to, icon, label }: { to: string, icon: string, label: string }) => {
        const isActive = currentPath === to || (to !== '/' && currentPath.startsWith(to));
        return (
            <Link
                to={to}
                onClick={onClose}
                className={`flex w-full items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-primary text-background-dark font-bold shadow-glow-primary' : 'text-text-primary-dark hover:bg-surface-dark'}`}
            >
                <span className={`material-symbols-outlined ${isActive ? 'fill' : ''}`}>{icon}</span>
                <p className="text-sm leading-normal">{label}</p>
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed md:sticky top-0 left-0 z-50 h-screen w-64 shrink-0 flex flex-col justify-between bg-surface-dark p-4 border-r border-border-dark overflow-y-auto transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="flex flex-col gap-8">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-input-dark text-primary overflow-hidden">
                                {tenant?.theme.logoUrl ? (
                                    <img src={tenant.theme.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="material-symbols-outlined">content_cut</span>
                                )}
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-text-primary-dark text-base font-bold uppercase tracking-wider">{tenant?.name || 'IronBarber'}</h1>
                                <p className="text-text-secondary-dark text-xs">{user?.role === 'admin' ? 'Painel Admin' : 'Painel do Barbeiro'}</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="md:hidden text-text-secondary-dark hover:text-primary">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <nav className="flex flex-col gap-2">
                        {user?.role === 'admin' && <NavItem to="/" icon="dashboard" label="Dashboard" />}
                        <NavItem to="/agenda" icon="calendar_month" label="Agenda" />
                        <NavItem to="/clients" icon="group" label="Clientes" />
                        {user?.role === 'barber' && <NavItem to="/stats" icon="monitoring" label="Meu Desempenho" />}
                        {user?.role === 'admin' && (
                            <>
                                <NavItem to="/financials" icon="attach_money" label="Caixa" />
                                <NavItem to="/products" icon="sell" label="Produtos" />
                                <NavItem to="/inventory" icon="inventory_2" label="Gestão Estoque" />
                                <NavItem to="/sales-reports" icon="bar_chart" label="Relatórios" />
                                <NavItem to="/professionals" icon="badge" label="Profissionais" />
                                <NavItem to="/services" icon="content_cut" label="Serviços" />
                                <NavItem to="/settings" icon="settings" label="Configurações" />
                            </>
                        )}
                    </nav>
                </div>
                <div>
                    <button onClick={logout} className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-text-primary-dark hover:bg-surface-dark hover:text-red-400 transition-all duration-200">
                        <span className="material-symbols-outlined">logout</span>
                        <p className="text-sm font-medium leading-normal">Sair</p>
                    </button>
                    <div className="mt-4 text-center px-2">
                        <p className="text-sm font-bold text-text-primary-dark truncate" title={user?.name}>{user?.name}</p>
                        <p className="text-xs text-text-secondary-dark truncate" title={user?.email}>{user?.email}</p>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
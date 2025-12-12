import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useTenant } from '../contexts/TenantContext';

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const { tenant } = useTenant();

    return (
        <div className="flex min-h-screen bg-background-dark">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* Mobile Header */}
                <header className="md:hidden bg-[#181410] border-b border-border-dark p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-input-dark text-primary overflow-hidden">
                            {tenant?.theme.logoUrl ? (
                                <img src={tenant.theme.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                            ) : (
                                <span className="material-symbols-outlined text-sm">content_cut</span>
                            )}
                        </div>
                        <span className="font-bold text-text-primary-dark uppercase tracking-wider">{tenant?.name || 'IronBarber'}</span>
                    </div>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="text-text-primary-dark hover:text-primary transition-colors"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </header>

                <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="mx-auto max-w-7xl pb-20 md:pb-0">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;

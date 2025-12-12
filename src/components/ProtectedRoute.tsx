import React from 'react';
import { Navigate } from 'react-router-dom';
import { useTenant } from '../contexts/TenantContext';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useTenant();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
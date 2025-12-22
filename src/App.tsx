import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider } from './contexts/TenantContext';
import { DataProvider } from './contexts/DataContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup'; // Importar a nova página de cadastro
import Dashboard from './pages/Dashboard';
import Agenda from './pages/Agenda';
import Clients from './pages/Clients';
import Professionals from './pages/Professionals';
import Services from './pages/Services';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import SalesReports from './pages/SalesReports';
import Settings from './pages/Settings';
import Financials from './pages/Financials';
import BarberStats from './pages/BarberStats';
import CRM from './pages/CRM';
import ProtectedRoute from './components/ProtectedRoute';
import PublicBooking from './pages/PublicBooking';

const App = () => {
    return (
        <Router>
            <TenantProvider>
                <DataProvider>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} /> {/* Nova rota de cadastro */}
                        <Route path="/booking" element={<PublicBooking />} />

                        <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="/dashboard" replace />} />
                            <Route path="dashboard" element={<Dashboard />} />
                            <Route path="agenda" element={<Agenda />} />
                            <Route path="clients" element={<Clients />} />
                            <Route path="professionals" element={<Professionals />} />
                            <Route path="services" element={<Services />} />
                            <Route path="financials" element={<Financials />} />
                            <Route path="products" element={<Products />} />
                            <Route path="inventory" element={<Inventory />} />
                            <Route path="sales-reports" element={<SalesReports />} />
                            <Route path="crm" element={<CRM />} />
                            <Route path="stats" element={<BarberStats />} />
                            <Route path="settings" element={<Settings />} />
                        </Route>

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </DataProvider>
            </TenantProvider>
        </Router>
    );
};

export default App;
import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client'; // Importar o cliente Supabase
import { useTenant } from '../contexts/TenantContext'; // Manter para o contexto do tenant

const Login = () => {
    const navigate = useNavigate();
    const { user, isLoading } = useTenant(); // Usar o user e isLoading do TenantContext
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isLoading && user) {
            navigate('/dashboard');
        }
    }, [user, isLoading, navigate]);

    const handleAuthError = (err: Error) => {
        setError(err.message);
        console.error('Erro de autenticação:', err);
    };

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-background-dark text-primary">Carregando...</div>;
    }

    return (
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background-dark bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: "url('/img_fundo_login.png')" }}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md"></div>
            <div className="relative z-10 flex w-full max-w-md flex-col items-center justify-center rounded-2xl bg-[#1a1614]/90 p-8 shadow-2xl border border-white/10 backdrop-blur-sm md:p-12">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-6 flex flex-col items-center">
                        <div className="relative group">
                            {/* Decorative Glow behind the logo */}
                            <div className="absolute -inset-4 bg-[#c16934]/20 rounded-full blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-500"></div>

                            {/* Glass Container for Logo */}
                            <div className="relative h-28 w-48 rounded-2xl bg-white/95 p-4 shadow-[0_0_30px_rgba(193,105,52,0.15)] flex items-center justify-center transition-transform duration-500 hover:scale-105 border border-white/20">
                                <img src="/logo-vizzu.png" alt="Vizzu Logo" className="h-full w-full object-contain" />
                            </div>
                        </div>
                        <div className="mt-4 text-center">
                            <p className="text-[13px] font-black uppercase tracking-[0.5em] text-[#c16934] drop-shadow-sm">Gestão & Estilo</p>
                        </div>
                    </div>
                </div>
                <div className="w-full">
                    <h2 className="pb-2 text-center text-2xl font-bold text-white">Bem-vindo de volta</h2>
                    <p className="pb-8 text-center text-sm text-white/50">Acesse sua conta para continuar</p>
                </div>
                {error && <p className="text-red-500 text-center mb-4">{error}</p>}
                <div className="w-full">
                    <Auth
                        supabaseClient={supabase}
                        providers={[]} // Removendo provedores de terceiros conforme as instruções
                        appearance={{
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#c16934', // Warm Rust
                                        brandAccent: '#a35520', // Darker Rust
                                        inputBackground: '#251c18', // Deep brown
                                        inputBorder: '#3d2e27', // Lighter brown border
                                        inputPlaceholder: '#6e5a51', // Muted brown
                                        inputText: '#f3f1f0', // Off-white
                                        messageBackground: '#251c18',
                                        messageText: '#f3f1f0',
                                    },
                                },
                            },
                        }}
                        theme="dark" // Usar tema escuro para combinar com o app
                        view="sign_in" // Definir a visualização inicial como login
                        localization={{
                            variables: {
                                sign_in: {
                                    email_label: 'Seu Email',
                                    password_label: 'Sua Senha',
                                    email_input_placeholder: 'exemplo@vizzu.com',
                                    password_input_placeholder: 'Sua senha',
                                    button_label: 'Entrar na Plataforma',
                                    social_provider_text: 'Ou entre com',
                                    link_text: 'Já tem uma conta? Faça login',
                                },
                            },
                        }}
                    />
                </div>
                <div className="mt-8 text-center">
                    <Link to="/signup" className="text-white/60 text-sm hover:text-[#c16934] transition-colors">Ainda não tem acesso? <span className="font-bold underline">Cadastre-se</span></Link>
                </div>
            </div>
        </div>
    );
};

export default Login;

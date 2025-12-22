import React, { useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client'; // Importar o cliente Supabase

const Signup = () => {
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    // Monitorar o estado de autenticação para redirecionar após o cadastro
    React.useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                navigate('/dashboard'); // Redirecionar para o dashboard após o cadastro bem-sucedido
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [navigate]);

    const handleAuthError = (err: Error) => {
        setError(err.message);
        console.error('Erro de autenticação:', err);
    };

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
                    <h2 className="pb-2 text-center text-2xl font-bold text-white">Crie sua conta</h2>
                    <p className="pb-8 text-center text-sm text-white/50">Cadastre-se para começar a gerenciar sua empresa</p>
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
                                        brand: '#c16934',
                                        brandAccent: '#a35520',
                                        inputBackground: '#251c18',
                                        inputBorder: '#3d2e27',
                                        inputPlaceholder: '#6e5a51',
                                        inputText: '#f3f1f0',
                                        messageBackground: '#251c18',
                                        messageText: '#f3f1f0',
                                    },
                                },
                            },
                        }}
                        theme="dark" // Usar tema escuro para combinar com o app
                        view="sign_up" // Definir a visualização inicial como cadastro
                        localization={{
                            variables: {
                                sign_up: {
                                    email_label: 'Seu Email Profissional',
                                    password_label: 'Crie uma Senha',
                                    email_input_placeholder: 'exemplo@vizzu.com',
                                    password_input_placeholder: 'Mínimo de 6 caracteres',
                                    button_label: 'Começar Agora',
                                    social_provider_text: 'Ou cadastre-se com',
                                    link_text: 'Não tem uma conta? Cadastre-se',
                                },
                            },
                        }}
                    />
                </div>
                <div className="mt-8 text-center">
                    <Link to="/login" className="text-white/60 text-sm hover:text-[#c16934] transition-colors">Já possui uma empresa? <span className="font-bold underline">Faça login</span></Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;

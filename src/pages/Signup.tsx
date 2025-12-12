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
        <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-background-dark bg-cover bg-center bg-no-repeat p-4" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCG_oTiQQfPMIcDpRhMvtR9Fgg25nGTX94ZkOYStzVYYXRtGRXvMCtPEfCwuq0Ww5IUpw1uysJhOo3BhC1Cy0RjeoOUDH37XxU-Qg6kX1RnlS9tL4CY5x52yAuCGfGz7q_GNjdUHpRBykgYbWCaf9Cbodw5IOEXWK5FrhZuVg_AOpg71W_ikOsMIpeg7kDZVCJubkJrKWN8kKXXH43vuHMqZ3-FAHX2kW6TaY-czTt0fbBEyV-r35-IaAdm5OCryTLmx7EMu7eLdKs')" }}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm"></div>
            <div className="relative z-10 flex w-full max-w-md flex-col items-center justify-center rounded-xl bg-card-dark/80 p-8 shadow-glow-primary backdrop-blur-md md:p-12">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-input-dark text-primary">
                        <span className="material-symbols-outlined !text-5xl">content_cut</span>
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-wider text-text-primary-dark">IronBarber</h1>
                </div>
                <div className="w-full">
                    <h2 className="pb-2 text-center text-3xl font-bold text-text-primary-dark">Crie sua conta</h2>
                    <p className="pb-8 text-center text-base text-text-secondary-dark">Cadastre-se para começar a gerenciar sua barbearia</p>
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
                                        brand: 'hsl(29 100% 50%)', // Cor primária do tema (primary)
                                        brandAccent: 'hsl(29 100% 40%)', // Um pouco mais escuro para hover/active
                                        inputBackground: 'hsl(240 4% 11%)', // input-dark
                                        inputBorder: 'hsl(240 3% 20%)', // border-dark
                                        inputPlaceholder: 'hsl(240 3% 53%)', // text-secondary-dark
                                        inputText: 'hsl(240 3% 92%)', // text-primary-dark
                                        messageBackground: 'hsl(240 4% 11%)', // card-dark
                                        messageText: 'hsl(240 3% 92%)', // text-primary-dark
                                        messageActionText: 'hsl(29 100% 50%)', // primary
                                    },
                                },
                            },
                        }}
                        theme="dark" // Usar tema escuro para combinar com o app
                        view="sign_up" // Definir a visualização inicial como cadastro
                        localization={{
                            variables: {
                                sign_up: {
                                    email_label: 'Seu Email',
                                    password_label: 'Crie uma Senha',
                                    email_input_placeholder: 'seuemail@exemplo.com',
                                    password_input_placeholder: 'Mínimo de 6 caracteres',
                                    button_label: 'Cadastrar',
                                    social_provider_text: 'Ou cadastre-se com',
                                    link_text: 'Não tem uma conta? Cadastre-se',
                                },
                                common: {
                                    button_label: 'Confirmar',
                                    email_label: 'Email',
                                    password_label: 'Senha',
                                    email_input_placeholder: 'Seu email',
                                    password_input_placeholder: 'Sua senha',
                                    forgotten_password_text: 'Esqueceu sua senha?',
                                    link_text: 'Já tem uma conta? Faça login',
                                    loading_button_text: 'Carregando...',
                                },
                            },
                        }}
                        onError={handleAuthError}
                    />
                </div>
                <div className="mt-6 text-center text-sm text-text-secondary-dark">
                    <Link to="/login" className="text-primary hover:underline">Já tem uma conta? Faça login</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
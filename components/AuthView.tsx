
import React, { useState } from 'react';
import { LayoutDashboard, Lock, Mail, Globe, Phone, Briefcase, User, CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff, Code } from 'lucide-react';
import Input from './ui/Input';
import Button from './ui/Button';
import { authService } from '../services/authService';
import { validateCNPJ, validateEmail } from '../utils/validation';
import { maskCNPJ, maskPhone } from '../utils/masks';

interface Props {
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const AuthView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    document: '',
    email: '',
    whatsapp: '',
    website: '',
    password: '',
    confirmPassword: '',
    remember: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    const name = e.target.name;
    if (name === 'document') value = maskCNPJ(value as string);
    if (name === 'whatsapp') value = maskPhone(value as string);
    setFormData({ ...formData, [name]: value });
    setError(null);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.loginWithGoogle();
      // O redirecionamento é feito pelo Supabase, não chegamos aqui se for sucesso
    } catch (err: any) {
      console.error("Erro Google Login:", err);
      // Exibe a mensagem real do erro (ex: "Provider google could not be found")
      setError(err.message || "Erro ao conectar com Google. Verifique se o provedor está ativo no Supabase.");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.login(formData.email, formData.password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        setError("As senhas não coincidem.");
        return;
    }
    setLoading(true);
    setError(null);

    try {
      await authService.register(formData);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col md:flex-row transition-colors duration-300 relative">
      
      {/* Left Panel - Branding */}
      <div className="md:w-1/2 bg-brand-600 dark:bg-gray-950 flex flex-col justify-center items-center text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand-600 dark:bg-black opacity-50 z-0"></div>
        <div className="relative z-10 text-center">
            <div className="bg-white/10 p-4 rounded-2xl inline-block mb-6 backdrop-blur-sm border border-white/20">
                <LayoutDashboard size={64} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">OrçaFácil</h1>
            <p className="text-lg md:text-xl text-brand-100 dark:text-gray-400 max-w-md mx-auto">
                Gestão profissional de orçamentos para empreendedores e autônomos.
            </p>
        </div>
      </div>

      {/* Right Panel - Forms */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md space-y-8">
            
            <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mode === 'login' && 'Bem-vindo de volta'}
                    {mode === 'register' && 'Crie sua conta'}
                    {mode === 'forgot' && 'Recuperar senha'}
                </h2>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Acesse sua conta para gerenciar seus orçamentos de forma profissional.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm font-medium border border-red-200 dark:border-red-800 animate-pulse">
                    <p className="font-bold mb-1">Erro de Autenticação:</p>
                    {error}
                </div>
            )}

            {/* SOCIAL LOGIN */}
            <div className="space-y-3">
                <button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm disabled:opacity-50"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                    {loading ? 'Conectando...' : 'Entrar com Google'}
                </button>
            </div>

            <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs font-bold uppercase tracking-widest">Ou com E-mail</span>
                <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            </div>

            {/* LOGIN FORM */}
            {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-5 animate-fadeIn">
                    <Input 
                        label="E-mail"
                        placeholder="seu@email.com"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        icon={<Mail size={18} />}
                    />
                    <div>
                        <Input 
                            label="Senha"
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="••••••••"
                            value={formData.password}
                            onChange={handleChange}
                            icon={showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            onIconClick={() => setShowPassword(!showPassword)}
                        />
                        <div className="flex justify-end mt-2">
                             <button 
                                type="button"
                                onClick={() => setMode('forgot')}
                                className="text-sm font-medium text-brand-600"
                             >
                                Esqueceu a senha?
                             </button>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" isLoading={loading}>
                        Entrar <ArrowRight size={18} className="ml-2" />
                    </Button>

                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Não tem uma conta?{' '}
                        <button type="button" onClick={() => setMode('register')} className="font-bold text-brand-600">
                            Cadastre-se grátis
                        </button>
                    </div>
                </form>
            )}

            {/* REGISTER FORM */}
            {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
                    <Input label="Nome da Empresa" name="name" value={formData.name} onChange={handleChange} icon={<User size={18} />} />
                    <Input label="Email Comercial" type="email" name="email" value={formData.email} onChange={handleChange} icon={<Mail size={18} />} />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Senha" type="password" name="password" value={formData.password} onChange={handleChange} />
                        <Input label="Confirmar" type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} />
                    </div>
                    <Button type="submit" className="w-full mt-2" isLoading={loading}>Criar Conta</Button>
                    <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Já possui conta? <button type="button" onClick={() => setMode('login')} className="font-bold text-brand-600">Fazer Login</button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthView;

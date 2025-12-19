
import React, { useState } from 'react';
import { LayoutDashboard, Mail, Hash, Phone, MapPin, Briefcase, User, CheckCircle, ArrowRight, ArrowLeft, Eye, EyeOff, Building2, ShieldCheck } from 'lucide-react';
import Input from './ui/Input';
import Button from './ui/Button';
import { authService } from '../services/authService';
import { companyService } from '../services/companyService';
import { maskCNPJ, maskCPF, maskPhone } from '../utils/masks';

interface Props {
  onLoginSuccess: () => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const AuthView: React.FC<Props> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [personType, setPersonType] = useState<'pessoa_fisica' | 'pessoa_juridica'>('pessoa_juridica');

  // Form States
  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let maskedValue = value;

    if (name === 'cnpj') {
      maskedValue = personType === 'pessoa_juridica' ? maskCNPJ(value) : maskCPF(value);
    }
    if (name === 'telefone') maskedValue = maskPhone(value);

    setFormData(prev => ({ ...prev, [name]: maskedValue }));
    if (error) setError(null);
  };

  const handleTypeChange = (type: 'pessoa_fisica' | 'pessoa_juridica') => {
    setPersonType(type);
    setFormData(prev => ({ ...prev, cnpj: '' }));
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await authService.loginWithGoogle();
    } catch (err: any) {
      setError(err.message || "Erro ao conectar com Google.");
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
      setError("Email ou senha inválidos.");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações Básicas
    if (!formData.razao_social || !formData.nome_fantasia || !formData.cnpj || !formData.email || !formData.telefone || !formData.password) {
      setError("Por favor, preencha todos os campos obrigatórios (*)");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
        setError("As senhas não coincidem.");
        return;
    }

    if (formData.password.length < 6) {
        setError("A senha deve ter no mínimo 6 caracteres.");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Criar Usuário no Supabase Auth
      // Passamos os dados básicos para o metadata do usuário
      const user = await authService.register({
        email: formData.email,
        password: formData.password,
        name: formData.nome_fantasia // Nome de exibição do usuário
      });

      // 2. Criar Perfil da Empresa na tabela 'companies'
      await companyService.createCompany(user.id, {
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia,
        cnpj: formData.cnpj,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco || undefined,
        tipo_empresa: personType,
        brand_color: '#2563eb'
      });

      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao realizar cadastro. Verifique os dados ou tente outro e-mail.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-300 relative">
      
      {/* Left Panel - Branding */}
      <div className="md:w-5/12 lg:w-4/12 bg-brand-600 dark:bg-gray-900 flex flex-col justify-center items-center text-white p-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800 dark:from-black dark:to-gray-900 opacity-90 z-0"></div>
        <div className="relative z-10 text-center animate-fadeIn">
            <div className="bg-white/10 p-6 rounded-[2.5rem] inline-block mb-8 backdrop-blur-xl border border-white/20 shadow-2xl">
                <LayoutDashboard size={64} className="text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tighter">OrçaFácil</h1>
            <p className="text-lg text-brand-100 dark:text-gray-400 max-w-xs mx-auto font-medium">
                Sua oficina profissional de orçamentos e gestão de clientes.
            </p>
            
            <div className="mt-12 flex flex-col gap-4 text-left max-w-xs mx-auto">
                <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white/20 p-1 rounded-full"><CheckCircle size={14}/></div>
                    <p className="text-sm font-medium">Exportação profissional em PDF</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white/20 p-1 rounded-full"><CheckCircle size={14}/></div>
                    <p className="text-sm font-medium">Gestão inteligente de estoque e serviços</p>
                </div>
                <div className="flex items-start gap-3">
                    <div className="mt-1 bg-white/20 p-1 rounded-full"><CheckCircle size={14}/></div>
                    <p className="text-sm font-medium">Histórico completo na nuvem</p>
                </div>
            </div>
        </div>
      </div>

      {/* Right Panel - Forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="w-full max-w-xl space-y-8 py-8 animate-slideUp">
            
            <div className="text-center md:text-left">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {mode === 'login' && 'Bem-vindo de volta'}
                    {mode === 'register' && 'Crie sua conta grátis'}
                    {mode === 'forgot' && 'Recuperar acesso'}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {mode === 'login' ? 'Acesse seu painel para gerenciar seus negócios.' : 'Cadastre sua empresa e comece a emitir hoje mesmo.'}
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-800 flex items-center gap-3 animate-bounce">
                    <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                    {error}
                </div>
            )}

            {/* Google Login Only for Main Login */}
            {mode === 'login' && (
                <>
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 rounded-2xl text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
                        {loading ? 'Conectando...' : 'Entrar com Google'}
                    </button>

                    <div className="relative flex items-center py-4">
                        <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                        <span className="flex-shrink mx-4 text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Ou com seu e-mail</span>
                        <div className="flex-grow border-t border-gray-100 dark:border-gray-800"></div>
                    </div>
                </>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-6">
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
                                className="text-xs font-bold text-brand-600 hover:underline"
                             >
                                Esqueceu sua senha?
                             </button>
                        </div>
                    </div>

                    <Button type="submit" className="w-full h-14 rounded-2xl shadow-xl shadow-brand-500/20" isLoading={loading}>
                        Entrar no Painel <ArrowRight size={20} className="ml-2" />
                    </Button>

                    <div className="text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                        Não tem uma conta?{' '}
                        <button type="button" onClick={() => setMode('register')} className="font-black text-brand-600 hover:underline">
                            Cadastre-se grátis
                        </button>
                    </div>
                </form>
            )}

            {/* REGISTER FORM (Expanded with Company Data) */}
            {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-8">
                    {/* Seletor PF/PJ */}
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Tipo de Cadastro *</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleTypeChange('pessoa_juridica')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                    personType === 'pessoa_juridica'
                                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold'
                                        : 'border-gray-50 dark:border-gray-800 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <Briefcase size={18} /> PJ
                            </button>
                            <button
                                type="button"
                                onClick={() => handleTypeChange('pessoa_fisica')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                                    personType === 'pessoa_fisica'
                                        ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold'
                                        : 'border-gray-50 dark:border-gray-800 text-gray-500 hover:bg-gray-50'
                                }`}
                            >
                                <User size={18} /> PF
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label={personType === 'pessoa_juridica' ? "Razão Social *" : "Nome Completo *"}
                            name="razao_social"
                            value={formData.razao_social}
                            onChange={handleChange}
                            placeholder="Ex: Silva Soluções"
                        />
                        <Input 
                            label="Nome Fantasia *"
                            name="nome_fantasia"
                            value={formData.nome_fantasia}
                            onChange={handleChange}
                            placeholder="Ex: Oficina Silva"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label={personType === 'pessoa_juridica' ? "CNPJ *" : "CPF *"}
                            name="cnpj"
                            value={formData.cnpj}
                            onChange={handleChange}
                            placeholder={personType === 'pessoa_juridica' ? "00.000.000/0000-00" : "000.000.000-00"}
                            icon={<Hash size={16}/>}
                        />
                        <Input 
                            label="WhatsApp / Tel *"
                            name="telefone"
                            value={formData.telefone}
                            onChange={handleChange}
                            placeholder="(00) 00000-0000"
                            icon={<Phone size={16}/>}
                        />
                    </div>

                    <div className="space-y-4">
                        <Input 
                            label="Email de Acesso *"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="seu@email.com"
                            icon={<Mail size={16} />}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input 
                                label="Sua Senha *"
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                            />
                            <Input 
                                label="Confirme a Senha *"
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                            />
                        </div>
                        <Input 
                            label="Endereço Comercial (Opcional)"
                            name="endereco"
                            value={formData.endereco}
                            onChange={handleChange}
                            placeholder="Cidade - UF"
                            icon={<MapPin size={16} />}
                        />
                    </div>

                    <div className="pt-2">
                        <Button type="submit" className="w-full h-16 rounded-2xl shadow-xl shadow-brand-500/20 text-lg" isLoading={loading}>
                            Criar Empresa e Começar
                        </Button>
                        <div className="text-center mt-6 text-sm font-medium text-gray-500">
                            Já tem uma conta? <button type="button" onClick={() => setMode('login')} className="font-black text-brand-600 hover:underline">Fazer Login</button>
                        </div>
                    </div>
                </form>
            )}

            {/* FORGOT PASSWORD */}
            {mode === 'forgot' && (
                <div className="animate-fadeIn space-y-6 text-center">
                    <div className="bg-brand-50 dark:bg-brand-900/20 p-6 rounded-3xl inline-block mb-4">
                        <Mail size={32} className="text-brand-600 mx-auto" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">Insira seu e-mail abaixo. Enviaremos um link para você redefinir sua senha.</p>
                    <Input label="E-mail" placeholder="seu@email.com" icon={<Mail size={18}/>} />
                    <Button className="w-full">Enviar Link de Recuperação</Button>
                    <button onClick={() => setMode('login')} className="flex items-center justify-center gap-2 w-full text-gray-500 font-bold hover:text-gray-800">
                        <ArrowLeft size={18}/> Voltar para o Login
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AuthView;

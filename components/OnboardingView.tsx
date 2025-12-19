
import React, { useState } from 'react';
import { LayoutDashboard, Mail, Hash, Phone, MapPin, Briefcase, User, CheckCircle, ArrowRight, ChevronLeft, AlertCircle, Loader2 } from 'lucide-react';
import Input from './ui/Input';
import Button from './ui/Button';
import { authService } from '../services/authService';
import { companyService } from '../services/companyService';
import { maskCNPJ, maskCPF, maskPhone } from '../utils/masks';
import { CompanyProfile } from '../types';

interface Props {
  userId: string;
  userEmail: string;
  onComplete: (company: CompanyProfile) => void;
}

const OnboardingView: React.FC<Props> = ({ userId, userEmail, onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personType, setPersonType] = useState<'pessoa_fisica' | 'pessoa_juridica'>('pessoa_juridica');

  const [formData, setFormData] = useState({
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    telefone: '',
    endereco: '',
    email: userEmail
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

  const handleLogout = async () => {
    if (confirm('Deseja sair e configurar sua empresa mais tarde?')) {
        await authService.logout();
        window.location.reload();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.razao_social || !formData.nome_fantasia || !formData.cnpj || !formData.email || !formData.telefone) {
      setError("Preencha todos os campos obrigatórios (*)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const companyData: CompanyProfile = {
        razao_social: formData.razao_social,
        nome_fantasia: formData.nome_fantasia,
        cnpj: formData.cnpj,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco || undefined,
        brand_color: '#2563eb',
        tipo_empresa: personType
      };

      // Tenta o cadastro real
      const savedCompany = await companyService.createCompany(userId, companyData);
      onComplete(savedCompany);
      
    } catch (err: any) {
      console.error("Onboarding Error:", err);
      // Se for erro de RLS, damos uma dica técnica mas amigável
      if (err.message.includes('RLS') || err.message.includes('security policy')) {
        setError("Erro de permissão no banco de dados. Verifique se as políticas de RLS estão configuradas para permitir inserção.");
      } else {
        setError(err.message || "Erro ao salvar sua empresa. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row transition-colors duration-300 relative">
      
      {/* Lado Esquerdo */}
      <div className="hidden md:flex md:w-5/12 lg:w-4/12 bg-brand-600 dark:bg-gray-900 flex-col justify-center items-center text-white p-10 relative overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800 dark:from-black dark:to-gray-900 opacity-90 z-0"></div>
        <div className="relative z-10 text-center animate-fadeIn">
            <div className="bg-white/10 p-6 rounded-[2.5rem] inline-block mb-8 backdrop-blur-xl border border-white/20 shadow-2xl">
                <LayoutDashboard size={64} className="text-white" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-black mb-4 tracking-tighter">OrçaFácil</h1>
            <p className="text-lg text-brand-100 dark:text-gray-400 max-w-xs mx-auto font-medium">
                Vamos configurar o perfil profissional da sua empresa.
            </p>
        </div>
      </div>

      {/* Lado Direito */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-12 bg-white dark:bg-gray-950 overflow-y-auto min-h-screen">
        <div className="w-full max-w-xl space-y-8 py-8 animate-slideUp relative">
            
            <div className="flex md:hidden flex-col items-center mb-8">
                <div className="bg-brand-600 p-3.5 rounded-[1.25rem] shadow-lg mb-3">
                    <LayoutDashboard size={32} className="text-white" />
                </div>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter">OrçaFácil</h1>
            </div>

            <button 
                onClick={handleLogout}
                disabled={loading}
                className="absolute -top-4 left-0 flex items-center gap-2 text-gray-400 hover:text-red-500 font-bold transition-colors group"
            >
                <div className="p-2 rounded-full bg-gray-50 dark:bg-gray-900 group-hover:bg-red-50 transition-colors">
                    <ChevronLeft size={20} />
                </div>
                <span className="text-sm">Sair da conta</span>
            </button>

            <div className="text-center md:text-left pt-2 md:pt-6">
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    Configuração Inicial
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Esses dados serão exibidos no topo dos seus orçamentos em PDF.
                </p>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm font-bold border border-red-100 dark:border-red-800 flex items-start gap-3 animate-bounce">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Cadastro *</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            type="button" 
                            onClick={() => handleTypeChange('pessoa_juridica')} 
                            disabled={loading}
                            className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${personType === 'pessoa_juridica' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold ring-4 ring-brand-500/10' : 'border-gray-50 dark:border-gray-800 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <Briefcase size={18} /> Pessoa Jurídica
                        </button>
                        <button 
                            type="button" 
                            onClick={() => handleTypeChange('pessoa_fisica')} 
                            disabled={loading}
                            className={`flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${personType === 'pessoa_fisica' ? 'border-brand-600 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold ring-4 ring-brand-500/10' : 'border-gray-50 dark:border-gray-800 text-gray-400 hover:bg-gray-50'}`}
                        >
                            <User size={18} /> Pessoa Física
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label={personType === 'pessoa_juridica' ? "Razão Social *" : "Nome Completo *"} 
                            name="razao_social" 
                            value={formData.razao_social} 
                            onChange={handleChange} 
                            placeholder="Ex: Silva & Silva Ltda" 
                            disabled={loading}
                        />
                        <Input 
                            label="Nome Fantasia *" 
                            name="nome_fantasia" 
                            value={formData.nome_fantasia} 
                            onChange={handleChange} 
                            placeholder="Ex: Oficina do Silva" 
                            disabled={loading}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input 
                            label={personType === 'pessoa_juridica' ? "CNPJ *" : "CPF *"} 
                            name="cnpj" 
                            value={formData.cnpj} 
                            onChange={handleChange} 
                            icon={<Hash size={16}/>} 
                            placeholder="00.000.000/0000-00" 
                            disabled={loading}
                        />
                        <Input 
                            label="WhatsApp / Telefone *" 
                            name="telefone" 
                            value={formData.telefone} 
                            onChange={handleChange} 
                            icon={<Phone size={16}/>} 
                            placeholder="(00) 00000-0000" 
                            disabled={loading}
                        />
                    </div>

                    <Input 
                        label="Email Comercial *" 
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        icon={<Mail size={16} />} 
                        placeholder="seu@email.com" 
                        disabled={loading}
                    />

                    <Input 
                        label="Endereço Comercial (Opcional)" 
                        name="endereco" 
                        value={formData.endereco} 
                        onChange={handleChange} 
                        icon={<MapPin size={16} />} 
                        placeholder="Cidade - UF" 
                        disabled={loading}
                    />
                </div>

                <div className="pt-4 pb-10">
                    <Button 
                        type="submit" 
                        className="w-full h-16 rounded-[1.5rem] text-lg font-black shadow-xl shadow-brand-500/20" 
                        isLoading={loading}
                    >
                        Concluir e Acessar Painel <ArrowRight size={20} className="ml-2" />
                    </Button>
                </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default OnboardingView;

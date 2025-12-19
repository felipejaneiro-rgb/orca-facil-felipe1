import React, { useState, useEffect, useRef } from 'react';
import { CompanyProfile } from '../types';
import { 
    X, Save, Building, Database, Upload, Download, Loader2, 
    Image as ImageIcon, Trash2, Palette, PenTool, Lock, 
    CreditCard, HelpCircle, Check, Globe, Flag, MessageCircle, AlertTriangle,
    ChevronRight, Sun, Moon
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { authService } from '../services/authService';
import { compressImage } from '../utils/imageUtils';
import Button from './ui/Button';
import Input from './ui/Input';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: CompanyProfile) => void;
  initialData: CompanyProfile;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

type SettingsTab = 'profile' | 'account' | 'appearance' | 'subscription' | 'data' | 'about';

const CompanySettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialData, isDarkMode, onToggleTheme }) => {
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [formData, setFormData] = useState<CompanyProfile>(initialData);
  
  // Account States
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // Data States
  const [importing, setImporting] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...initialData,
        brandColor: initialData.brandColor || '#2563eb',
        showSignature: initialData.showSignature !== undefined ? initialData.showSignature : true
      });
      // Reset generic states
      setPasswords({ new: '', confirm: '' });
      setPassMessage(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    alert(t.common.saved);
  };

  // Fixed handlePasswordChange to be async and await authService.getCurrentUser() to fix type error
  const handlePasswordChange = async (e: React.FormEvent) => {
      e.preventDefault();
      if (passwords.new !== passwords.confirm) {
          setPassMessage({ type: 'error', text: 'As senhas não coincidem.' });
          return;
      }
      if (passwords.new.length < 6) {
          setPassMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
          return;
      }

      try {
          // Awaiting the currentUser promise to correctly access user properties
          const user = await authService.getCurrentUser();
          if (user) {
              // Using updated updatePassword method that manages the session user automatically
              await authService.updatePassword(passwords.new);
              setPassMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
              setPasswords({ new: '', confirm: '' });
          }
      } catch (err) {
          setPassMessage({ type: 'error', text: 'Erro ao atualizar senha.' });
      }
  };

  // --- LOGO HANDLING (OPTIMIZED) ---
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Validation
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione um arquivo de imagem válido.');
            return;
        }
        
        setProcessingImage(true);
        try {
            // Compress image to save localStorage space
            const compressedBase64 = await compressImage(file);
            setFormData(prev => ({ ...prev, logoUrl: compressedBase64 }));
        } catch (error) {
            console.error("Error processing image", error);
            alert("Erro ao processar imagem. Tente uma imagem menor.");
        } finally {
            setProcessingImage(false);
        }
    }
  };

  // --- BACKUP HANDLING ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("Atenção: Importar um backup substituirá TODOS os dados atuais. Continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setImporting(true);
    try {
      await backupService.importData(file);
      alert("Backup restaurado! A página será recarregada.");
      window.location.reload();
    } catch (error) {
      alert("Erro ao importar o arquivo.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const menuItems = [
      { id: 'profile', label: t.settings.profile, icon: Building },
      { id: 'account', label: t.settings.account, icon: Lock },
      { id: 'appearance', label: t.settings.appearance, icon: Palette },
      { id: 'subscription', label: t.settings.subscription, icon: CreditCard },
      { id: 'data', label: t.settings.data, icon: Database },
      { id: 'about', label: t.settings.about, icon: HelpCircle },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center md:p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      
      {/* Container Adaptativo */}
      <div className="bg-white dark:bg-gray-800 w-full h-full md:h-[650px] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-slideUp md:animate-none transition-all">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
             <h2 className="font-bold text-lg text-gray-800 dark:text-white">{t.settings.title}</h2>
             <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                <X size={20} />
             </button>
        </div>

        {/* Sidebar Navigation */}
        <div className="w-full md:w-64 bg-white md:bg-gray-50 dark:bg-gray-800 md:dark:bg-gray-900 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
            
            {/* Desktop Header Title */}
            <div className="hidden md:block p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-bold text-lg text-gray-800 dark:text-white">{t.settings.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.settings.manageAccount}</p>
            </div>

            {/* Navigation List */}
            <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 md:p-4 space-x-2 md:space-y-1 no-scrollbar bg-gray-50 md:bg-transparent dark:bg-gray-900/50 md:dark:bg-transparent">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as SettingsTab)}
                            className={`
                                flex items-center justify-center md:justify-start px-4 py-2.5 md:px-4 md:py-3 text-sm font-medium rounded-full md:rounded-lg transition-all whitespace-nowrap shrink-0
                                ${isActive 
                                ? 'bg-brand-600 text-white shadow-md md:bg-white md:text-brand-600 md:shadow-sm md:ring-1 md:ring-gray-200 md:dark:bg-gray-800 md:dark:text-white md:dark:ring-gray-700' 
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-gray-800 bg-white md:bg-transparent dark:bg-gray-800 border border-gray-100 md:border-0 dark:border-gray-700'}
                            `}
                        >
                            <Icon size={18} className={`mr-2 ${isActive ? 'text-white md:text-brand-600 md:dark:text-brand-400' : 'text-gray-400'}`} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            {/* Desktop Footer Close Button */}
            <div className="hidden md:block p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
                <Button variant="secondary" onClick={onClose} className="w-full">{t.common.close}</Button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-800 relative">
            
            {/* Desktop Content Header */}
            <div className="hidden md:flex justify-between items-center px-8 py-5 border-b border-gray-100 dark:border-gray-700 shrink-0">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                    {menuItems.find(m => m.id === activeTab)?.label}
                </h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <X size={24} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
                
                {/* --- 1. PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleSaveProfile} className="space-y-6 max-w-lg mx-auto md:mx-0 animate-fadeIn">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => logoInputRef.current?.click()}>
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} className="w-full h-full object-contain" />
                                ) : (
                                    <ImageIcon className="text-gray-400" />
                                )}
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {processingImage ? <Loader2 size={16} className="text-white animate-spin" /> : <Upload size={16} className="text-white" />}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">Logo</h4>
                                <p className="text-xs text-gray-500 mb-2">Recomendado: Imagem Quadrada</p>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => logoInputRef.current?.click()} className="text-xs text-brand-600 hover:underline font-bold">{t.common.edit}</button>
                                    {formData.logoUrl && (
                                        <button type="button" onClick={() => setFormData(p => ({...p, logoUrl: undefined}))} className="text-xs text-red-500 hover:underline">{t.common.delete}</button>
                                    )}
                                </div>
                                <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input label="Nome da Empresa" name="name" value={formData.name} onChange={handleChange} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="CNPJ / CPF" name="document" value={formData.document} onChange={handleChange} />
                                <Input label="Telefone" name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <Input label="Email Público" name="email" value={formData.email} onChange={handleChange} />
                            <Input label="Endereço" name="address" value={formData.address} onChange={handleChange} />
                        </div>

                        <div className="pt-4 pb-8 md:pb-0">
                            <Button type="submit" className="w-full md:w-auto">{t.settings.saveChanges}</Button>
                        </div>
                    </form>
                )}

                {/* --- 2. ACCOUNT TAB --- */}
                {activeTab === 'account' && (
                    <div className="max-w-lg mx-auto md:mx-0 space-y-8 animate-fadeIn">
                        <div>
                            <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                                <Lock size={18} /> Alterar Senha
                            </h4>
                            <form onSubmit={handlePasswordChange} className="space-y-4 p-5 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                <Input 
                                    label="Nova Senha" 
                                    type="password" 
                                    value={passwords.new} 
                                    onChange={e => setPasswords({...passwords, new: e.target.value})} 
                                    placeholder="No mínimo 6 caracteres"
                                />
                                <Input 
                                    label="Confirmar Senha" 
                                    type="password" 
                                    value={passwords.confirm} 
                                    onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                                    placeholder="Repita a nova senha"
                                />
                                
                                {passMessage && (
                                    <div className={`text-sm p-3 rounded-lg font-medium ${passMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {passMessage.text}
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" size="sm" variant="secondary" className="w-full md:w-auto">{t.common.save}</Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- 3. APPEARANCE TAB --- */}
                {activeTab === 'appearance' && (
                    <div className="max-w-lg mx-auto md:mx-0 space-y-8 animate-fadeIn">
                        
                        {/* Theme Mode Toggle (Moved here from Sidebar) */}
                        <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema do Aplicativo</label>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => isDarkMode && onToggleTheme()}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${!isDarkMode 
                                        ? 'bg-brand-600 text-white border-brand-600 ring-2 ring-offset-2 ring-brand-200' 
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Sun size={20} />
                                    {t.sidebar.themeLight}
                                </button>
                                <button 
                                    onClick={() => !isDarkMode && onToggleTheme()}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${isDarkMode 
                                        ? 'bg-brand-600 text-white border-brand-600 ring-2 ring-offset-2 ring-brand-900' 
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    <Moon size={20} />
                                    {t.sidebar.themeDark}
                                </button>
                            </div>
                        </div>

                        {/* Theme Colors */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{t.settings.brandColor}</label>
                            <div className="flex flex-wrap gap-3">
                                {['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#000000'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => {
                                            setFormData({...formData, brandColor: color});
                                            onSave({...formData, brandColor: color}); // Auto-save style changes
                                        }}
                                        className={`w-10 h-10 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${formData.brandColor === color ? 'border-gray-400 ring-2 ring-offset-2 ring-brand-500' : 'border-transparent'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm border border-gray-200">
                                    <input 
                                        type="color" 
                                        value={formData.brandColor} 
                                        onChange={handleChange}
                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer" 
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Language */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.settings.language}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => setLanguage('pt')}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${language === 'pt' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    <img src="https://flagcdn.com/w40/br.png" width="20" className="rounded-sm" /> Português
                                </button>
                                <button 
                                    onClick={() => setLanguage('en')}
                                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${language === 'en' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}
                                >
                                    <img src="https://flagcdn.com/w40/us.png" width="20" className="rounded-sm" /> English
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- 4. SUBSCRIPTION TAB --- */}
                {activeTab === 'subscription' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard size={100} /></div>
                            <div className="relative z-10">
                                <span className="bg-white/20 text-xs font-bold px-2 py-1 rounded text-white mb-2 inline-block">{t.settings.currentPlan}</span>
                                <h3 className="text-2xl font-bold">{t.settings.freeBeta}</h3>
                                <p className="text-gray-300 text-sm mt-1">{t.settings.earlyAccess}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                            <h4 className="font-bold text-gray-800 dark:text-white mb-3">{t.settings.resourcesIncluded}</h4>
                            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                                <li className="flex items-center gap-2"><div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={12} /></div> {t.settings.unlimitedQuotes}</li>
                                <li className="flex items-center gap-2"><div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={12} /></div> {t.settings.unlimitedClients}</li>
                                <li className="flex items-center gap-2"><div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={12} /></div> PDF Export</li>
                                <li className="flex items-center gap-2"><div className="bg-green-100 text-green-600 p-1 rounded-full"><Check size={12} /></div> {t.settings.metricsDashboard}</li>
                            </ul>
                        </div>
                    </div>
                )}

                {/* --- 5. DATA TAB --- */}
                {activeTab === 'data' && (
                    <div className="max-w-lg mx-auto md:mx-0 space-y-6 animate-fadeIn">
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={18} />
                            <div>
                                <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">{t.settings.localStorageTitle}</h4>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 leading-relaxed">
                                    {t.settings.localStorageWarning}
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            <button 
                                onClick={() => backupService.exportData()}
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200 transition-colors"><Download size={20} /></div>
                                    <div className="text-left">
                                        <span className="block font-medium text-gray-900 dark:text-white">{t.settings.backup}</span>
                                        <span className="block text-xs text-gray-500">.json file</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-400" />
                            </button>

                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200 transition-colors">
                                        {importing ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
                                    </div>
                                    <div className="text-left">
                                        <span className="block font-medium text-gray-900 dark:text-white">{t.settings.restore}</span>
                                        <span className="block text-xs text-gray-500">.json file</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-gray-400" />
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                        </div>
                    </div>
                )}

                {/* --- 6. ABOUT TAB --- */}
                {activeTab === 'about' && (
                    <div className="text-center space-y-6 max-w-lg mx-auto py-8 animate-fadeIn">
                        <div className="inline-flex p-4 bg-gray-100 dark:bg-gray-700 rounded-2xl mb-2">
                            <Building size={40} className="text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">OrçaFácil</h3>
                            <p className="text-gray-500">Versão 1.2.0 (Beta)</p>
                        </div>
                        
                        <div className="space-y-3">
                            <a href="#" className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-300 transition-colors group">
                                <div className="flex items-center justify-center gap-2 text-brand-600 font-medium group-hover:underline">
                                    <MessageCircle size={18} /> Support
                                </div>
                            </a>
                            <a href="#" className="block p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-300 transition-colors group">
                                <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 font-medium group-hover:underline">
                                    <HelpCircle size={18} /> Help Center
                                </div>
                            </a>
                        </div>

                        <p className="text-xs text-gray-400 mt-8">
                            © 2024 OrçaFácil. All rights reserved.
                        </p>
                    </div>
                )}

            </div>
            
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
      </div>
    </div>
  );
};

export default CompanySettingsModal;
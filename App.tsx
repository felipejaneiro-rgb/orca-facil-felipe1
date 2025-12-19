
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { QuoteData, INITIAL_QUOTE, CompanyProfile, User, QuoteStatus } from './types';
import StepIndicator from './components/StepIndicator';
import Sidebar from './components/Sidebar'; 
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import { companyService } from './services/companyService';
import { useDebounce } from './hooks/useDebounce';
import { supabase } from './lib/supabase';
import { 
  ArrowRight, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Check, 
  Menu
} from 'lucide-react';

// Lazy Load components
const AuthView = lazy(() => import('./components/AuthView'));
const DashboardView = lazy(() => import('./components/DashboardView'));
const OnboardingView = lazy(() => import('./components/OnboardingView'));
const HistoryModal = lazy(() => import('./components/HistoryModal'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const CatalogView = lazy(() => import('./components/CatalogView'));
const ClientsView = lazy(() => import('./components/ClientsView'));

const CompanyForm = lazy(() => import('./components/CompanyForm'));
const ClientForm = lazy(() => import('./components/ClientForm'));
const ItemsForm = lazy(() => import('./components/ItemsForm'));
const QuotePreview = lazy(() => import('./components/QuotePreview'));
const PublicQuoteView = lazy(() => import('./components/PublicQuoteView'));

const CompanySettingsModal = lazy(() => import('./components/CompanySettingsModal'));
const ServiceManagerModal = lazy(() => import('./components/ServiceManagerModal'));

const STORAGE_KEY = 'orcaFacil_data'; 
const STORAGE_KEY_PROFILE = 'orcaFacil_profile';
const STORAGE_KEY_THEME = 'orcaFacil_theme';

type AppView = 'dashboard' | 'editor' | 'history' | 'reports' | 'catalog' | 'clients' | 'public-view' | 'onboarding';

const safePushState = (state: any, url: string) => {
  try {
    window.history.pushState(state, '', url);
  } catch (e) {
    console.warn('History pushState blocked', e);
  }
};

const safeReplaceState = (state: any, url: string) => {
  try {
    window.history.replaceState(state, '', url);
  } catch (e) {
    console.warn('History replaceState blocked', e);
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);

  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const debouncedQuoteData = useDebounce(quoteData, 1000);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showServiceManager, setShowServiceManager] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [defaultCompany, setDefaultCompany] = useState<CompanyProfile>(INITIAL_QUOTE.company);
  
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // LÓGICA DE CHECAGEM DE EMPRESA (O Passo a Passo)
  const checkCompanyRegistration = useCallback(async (userId: string) => {
    setIsCheckingCompany(true);
    try {
      // 1. Consulta o banco de dados companies
      const company = await companyService.getCompany(userId);
      
      // 2. Decide o destino baseado na existência do registro
      if (company) {
        setDefaultCompany(company);
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(company));
        setCurrentView('dashboard');
      } else {
        // Se não houver empresa, força o Onboarding
        setCurrentView('onboarding');
      }
    } catch (err) {
      console.error("Erro ao verificar empresa:", err);
      // Em caso de erro técnico, enviamos para onboarding para garantir integridade
      setCurrentView('onboarding');
    } finally {
      setIsCheckingCompany(false);
    }
  }, []);

  // SUPABASE AUTH LISTENER
  useEffect(() => {
    authService.getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user) checkCompanyRegistration(user.id);
      setIsAuthChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const user = authService.mapSupabaseUser(session.user);
        setCurrentUser(user);
        checkCompanyRegistration(user.id);
      } else {
        setCurrentUser(null);
        setCurrentView('dashboard'); // Volta para o login
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [checkCompanyRegistration]);

  useEffect(() => {
    // Bloqueia manipulação manual de URL para sair do onboarding
    if (currentUser && currentView === 'onboarding') {
       safeReplaceState({ view: 'onboarding' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
        // Bloqueio de navegação 'back' se estiver no onboarding
        if (currentView === 'onboarding') {
            safeReplaceState({ view: 'onboarding' }, '');
            return;
        }

        if (event.state?.view) {
            setCurrentView(event.state.view);
        } else {
            setCurrentView(currentUser ? 'dashboard' : 'dashboard');
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, currentView]);

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
    } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
    }

    const initData = async () => {
        if (currentUser) {
            const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
            if (savedProfile) {
                try {
                    const parsedProfile = JSON.parse(savedProfile);
                    setDefaultCompany(parsedProfile);
                } catch (e) { console.error(e); }
            }
            setIsLoaded(true);
        }
    };
    initData();
  }, [currentUser]);

  useEffect(() => {
    if (isLoaded && currentUser && currentView !== 'public-view' && currentView !== 'onboarding') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(debouncedQuoteData));
    }
  }, [debouncedQuoteData, isLoaded, currentUser, currentView]);

  const toggleTheme = useCallback(() => {
      const newMode = !isDarkMode;
      setIsDarkMode(newMode);
      localStorage.setItem(STORAGE_KEY_THEME, newMode ? 'dark' : 'light');
      if (newMode) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const handleLogout = useCallback(async () => {
      if (confirm('Deseja sair da sua conta?')) {
          await authService.logout();
          setCurrentUser(null);
          setCurrentView('dashboard');
          safePushState({ view: 'dashboard' }, '/');
      }
  }, []);

  const handleNavigate = useCallback((view: any) => {
      // TRAVA DE SEGURANÇA: Se estiver em onboarding, não navega.
      if (currentView === 'onboarding') return; 

      if (view === 'settings') setShowSettings(true);
      else {
          setCurrentView(view);
          safePushState({ view }, `#${view}`);
      }
      setIsSidebarOpen(false);
  }, [currentView]);

  const handleLoadQuote = useCallback((quote: QuoteData) => {
    setQuoteData(quote);
    setCurrentStep(3);
    setCurrentView('editor');
    safePushState({ view: 'editor' }, '#editor');
    setIsSidebarOpen(false);
  }, []);

  const handleNewQuote = useCallback(async () => {
    const nextNumber = await storageService.getNextQuoteNumber();
    setQuoteData({
        ...INITIAL_QUOTE,
        id: '', 
        number: nextNumber, 
        company: defaultCompany.razao_social ? defaultCompany : INITIAL_QUOTE.company
    });
    setCurrentStep(0);
    setCurrentView('editor');
    safePushState({ view: 'editor' }, '#new');
    setIsSidebarOpen(false);
  }, [defaultCompany]);

  const handleOnboardingComplete = (company: CompanyProfile) => {
      setDefaultCompany(company);
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(company));
      setCurrentView('dashboard');
  };

  // FULL SCREEN LOADING STATE (Evita flash de UI)
  if (isAuthChecking || isCheckingCompany) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center border border-gray-100 dark:border-gray-800">
                <Loader2 className="animate-spin text-brand-600 mb-6" size={48} />
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">OrçaFácil</h2>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-2">
                    {isCheckingCompany ? 'Verificando perfil da empresa...' : 'Carregando sessão...'}
                </p>
            </div>
        </div>
      );
  }

  // LOGIN VIEW
  if (!currentUser) {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950"><Loader2 className="animate-spin text-brand-600" /></div>}>
            <AuthView onLoginSuccess={() => {}} />
        </Suspense>
      );
  }

  // ONBOARDING VIEW (Bloqueia todo o resto do App)
  if (currentView === 'onboarding') {
      return (
        <Suspense fallback={<Loader2 className="animate-spin"/>}>
            <OnboardingView 
                userId={currentUser.id} 
                userEmail={currentUser.email} 
                onComplete={handleOnboardingComplete} 
            />
        </Suspense>
      );
  }

  const renderContent = () => {
      if (currentView === 'public-view') return <Suspense fallback={<Loader2 className="animate-spin"/>}><PublicQuoteView data={quoteData} onStatusChange={() => {}} onBack={() => handleNavigate('editor')}/></Suspense>;
      if (currentView === 'dashboard') return <Suspense fallback={<Loader2 className="animate-spin"/>}><DashboardView user={currentUser} onNavigate={handleNavigate} onLoadQuote={handleLoadQuote} onNewQuote={handleNewQuote}/></Suspense>;
      if (currentView === 'history') return <Suspense fallback={<Loader2 className="animate-spin"/>}><HistoryModal isOpen={true} onClose={() => {}} onLoadQuote={handleLoadQuote} /></Suspense>;
      if (currentView === 'reports') return <Suspense fallback={<Loader2 className="animate-spin"/>}><ReportsView /></Suspense>;
      if (currentView === 'catalog') return <Suspense fallback={<Loader2 className="animate-spin"/>}><CatalogView /></Suspense>;
      if (currentView === 'clients') return <Suspense fallback={<Loader2 className="animate-spin"/>}><ClientsView /></Suspense>;
      
      return (
        <div className="max-w-4xl mx-auto pb-10">
            <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
            <div className="mt-6">
                <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-brand-600"/></div>}>
                    {currentStep === 0 && <CompanyForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} defaultCompany={defaultCompany} />}
                    {currentStep === 1 && <ClientForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} />}
                    {currentStep === 2 && <ItemsForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} />}
                    {currentStep === 3 && (
                        <QuotePreview 
                            data={quoteData} 
                            onEdit={() => setCurrentStep(2)} 
                            onApprove={() => {}} 
                            onSimulateClientView={() => handleNavigate('public-view')}
                        />
                    )}
                </Suspense>
            </div>
            {currentStep < 3 && (
                <div className="mt-8 flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <button onClick={() => setCurrentStep(p => Math.max(0, p-1))} disabled={currentStep === 0} className="flex items-center px-6 py-3 rounded-lg font-medium text-gray-600 dark:text-gray-300 disabled:opacity-30">
                    <ArrowLeft size={20} className="mr-2" /> Voltar
                </button>
                <button onClick={() => setCurrentStep(p => Math.min(3, p+1))} className="flex items-center px-8 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold shadow-lg transition-all">
                    {currentStep === 2 ? 'Ver Resumo' : 'Próximo'} <ArrowRight size={20} className="ml-2" />
                </button>
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden transition-colors">
      <Suspense fallback={null}>
          <CompanySettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onSave={(p) => setDefaultCompany(p)} initialData={defaultCompany} isDarkMode={isDarkMode} onToggleTheme={toggleTheme}/>
      </Suspense>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView} onNavigate={handleNavigate} onNewQuote={handleNewQuote} onToggleTheme={toggleTheme} isDarkMode={isDarkMode} onLogout={handleLogout} currentUser={currentUser} hasActiveDraft={true} setShowSettings={setShowSettings}/>

      <div className="flex-1 flex flex-col h-full w-full relative">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0 shadow-sm">
           <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mr-4 text-gray-500 dark:text-gray-400 p-2 rounded-lg">
                <Menu size={24} />
              </button>
              <h1 className="text-lg font-bold text-gray-800 dark:text-white hidden sm:block">OrçaFácil</h1>
           </div>
           <div className="flex items-center gap-2">
              {currentView === 'editor' && (
                  <button onClick={async () => {
                      setIsSaving(true);
                      await storageService.save(quoteData);
                      setIsSaving(false);
                      setToastMessage("Salvo!");
                      setTimeout(() => setToastMessage(null), 2000);
                  }} className="flex items-center px-4 py-2 text-sm font-bold rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                    <Save size={18} className="mr-2 text-brand-600" /> {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
              )}
           </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 relative">
           {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;

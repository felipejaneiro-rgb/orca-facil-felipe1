
import React, { useState, useEffect, Suspense, lazy, useCallback, useRef, useMemo } from 'react';
import { QuoteData, INITIAL_QUOTE, CompanyProfile, User } from './types';
import StepIndicator from './components/StepIndicator';
import Sidebar from './components/Sidebar'; 
import { authService } from './services/authService';
import { companyService } from './services/companyService';
import { supabase } from './lib/supabase';
import { 
  Loader2, 
  Menu,
  AlertCircle,
  RefreshCw
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

type AppView = 'dashboard' | 'editor' | 'history' | 'reports' | 'catalog' | 'clients' | 'onboarding';

const App: React.FC = () => {
  // --- ESTADOS DE SESSÃO (CONFORME SUGESTÃO) ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  
  const isFirstLoadRef = useRef(true);

  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  const [defaultCompany, setDefaultCompany] = useState<CompanyProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const currentDateDisplay = useMemo(() => 
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  []);

  const initializeCompany = useCallback(async (userId: string) => {
    if (defaultCompany) {
      setLoading(false);
      return;
    }

    try {
      const company = await companyService.getCompany(userId);
      if (company) {
        setDefaultCompany(company);
        if (isFirstLoadRef.current) {
          setCurrentView('dashboard');
        }
      } else {
        setCurrentView('onboarding');
      }
    } catch (err: any) {
      console.warn("Erro ao buscar empresa (mantendo sessão):", err);
      if (isFirstLoadRef.current) setCurrentView('dashboard');
    } finally {
      isFirstLoadRef.current = false;
      setLoading(false);
    }
  }, [defaultCompany]);

  // --- PASSO 1 & 2: MONITORAMENTO DE SESSÃO ROBUSTO ---
  useEffect(() => {
    let mounted = true;

    // Tenta pegar a sessão inicial do disco
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setCurrentUser(authService.mapSupabaseUser(session.user));
      }
      setSessionReady(true);
    });

    // Escuta mudanças de estado (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setCurrentUser(authService.mapSupabaseUser(session.user));
      } else {
        // Se realmente não houver sessão, limpa estados mas sem expulsar agressivamente
        setCurrentUser(null);
        setDefaultCompany(null);
        if (event === 'SIGNED_OUT') {
           setCurrentView('dashboard');
           isFirstLoadRef.current = true;
        }
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  // --- PASSO 3: CARREGAMENTO DE DADOS APÓS SESSÃO PRONTA ---
  useEffect(() => {
    if (!sessionReady) return;

    if (currentUser) {
      initializeCompany(currentUser.id);
    } else {
      // Se não tem usuário, para de carregar para mostrar tela de Login
      setLoading(false);
    }
  }, [sessionReady, currentUser, initializeCompany]);

  const handleLogout = useCallback(async () => {
      if (confirm('Deseja sair da sua conta?')) {
        setLoading(true);
        await authService.logout();
      }
  }, []);

  const navigateToEditor = useCallback((data: QuoteData = INITIAL_QUOTE, step: number = 0) => {
    setQuoteData(data);
    setCurrentView('editor');
    setCurrentStep(step);
  }, []);

  const updateQuoteData = useCallback((d: Partial<QuoteData>) => {
    setQuoteData(p => ({...p, ...d}));
  }, []);

  const renderViewContent = useMemo(() => {
    // Não renderiza nada se estiver carregando a sessão inicial ou dados da empresa
    if (loading) return null;
    
    try {
      switch (currentView) {
        case 'dashboard':
          return <DashboardView user={currentUser} onNavigate={setCurrentView} onLoadQuote={(q) => navigateToEditor(q, 3)} onNewQuote={() => navigateToEditor(INITIAL_QUOTE, 0)} />;
        case 'history':
          return <HistoryModal isOpen={true} onClose={() => setCurrentView('dashboard')} onLoadQuote={(q) => navigateToEditor(q, 3)} />;
        case 'reports':
          return <ReportsView />;
        case 'catalog':
          return <CatalogView />;
        case 'clients':
          return <ClientsView />;
        case 'editor':
          return (
            <div className="max-w-4xl mx-auto pb-10">
                <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
                <div className="mt-6">
                    {currentStep === 0 && <CompanyForm data={quoteData} updateData={updateQuoteData} defaultCompany={defaultCompany || undefined} />}
                    {currentStep === 1 && <ClientForm data={quoteData} updateData={updateQuoteData} />}
                    {currentStep === 2 && <ItemsForm data={quoteData} updateData={updateQuoteData} />}
                    {currentStep === 3 && <QuotePreview data={quoteData} onEdit={() => setCurrentStep(2)} onApprove={() => {}} />}
                </div>
                {currentStep < 3 && (
                    <div className="mt-8 flex justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                        <button onClick={() => setCurrentStep(p => Math.max(0, p-1))} disabled={currentStep === 0} className="px-6 py-3 rounded-xl font-bold text-gray-400 disabled:opacity-30 hover:text-gray-600 transition-colors">Voltar</button>
                        <button onClick={() => setCurrentStep(p => Math.min(3, p+1))} className="bg-brand-600 hover:bg-brand-700 px-10 py-3 rounded-xl text-white font-black shadow-lg shadow-brand-500/20 transition-all active:scale-95">Próximo</button>
                    </div>
                )}
            </div>
          );
        default:
          return null;
      }
    } catch (e: any) {
      setAppError(e.message);
      return null;
    }
  }, [currentView, currentStep, quoteData, currentUser, defaultCompany, navigateToEditor, updateQuoteData, loading]);

  // Tela de Erro Fatal
  if (appError) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 text-center">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-md border border-red-100">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 dark:text-white">Algo deu errado</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{appError}</p>
                <button onClick={() => window.location.reload()} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                  <RefreshCw size={18} /> Tentar Novamente
                </button>
            </div>
        </div>
    );
  }

  // TELA DE CARREGAMENTO (ESTADO INICIAL)
  if (loading && !currentUser) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="relative flex items-center justify-center">
                <div className="absolute w-16 h-16 border-4 border-brand-100 dark:border-brand-900/30 rounded-full"></div>
                <Loader2 className="animate-spin text-brand-600" size={64} />
            </div>
            <div className="mt-8 text-center animate-pulse">
                <p className="text-gray-800 dark:text-white font-black tracking-widest uppercase text-xs">Validando Sessão</p>
                <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1 font-bold">AGUARDE UM INSTANTE...</p>
            </div>
        </div>
      );
  }

  // TELA DE LOGIN (MOSTRADA SOMENTE SE sessionReady FOR TRUE E NÃO HOUVER USUÁRIO)
  if (sessionReady && !currentUser) {
    return (
      <Suspense fallback={null}>
        <AuthView onLoginSuccess={() => {}} />
      </Suspense>
    );
  }

  // TELA DE ONBOARDING (DADOS DA EMPRESA FALTANDO)
  if (currentView === 'onboarding') {
    return (
      <Suspense fallback={null}>
        <OnboardingView 
          userId={currentUser!.id} 
          userEmail={currentUser!.email} 
          onComplete={(company) => {
            setDefaultCompany(company);
            setCurrentView('dashboard');
          }} 
        />
      </Suspense>
    );
  }

  // APLICAÇÃO PRINCIPAL (DASHBOARD/EDITOR)
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden antialiased">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onNewQuote={() => navigateToEditor(INITIAL_QUOTE, 0)} 
        onToggleTheme={() => setIsDarkMode(!isDarkMode)} 
        isDarkMode={isDarkMode} 
        onLogout={handleLogout} 
        currentUser={currentUser} 
        hasActiveDraft={false} 
        setShowSettings={setShowSettings} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 z-30 shrink-0 shadow-sm">
           <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"><Menu /></button>
           <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              <h1 className="font-black text-gray-800 dark:text-white tracking-tighter uppercase text-sm">OrçaFácil Admin</h1>
           </div>
           <div className="hidden md:flex items-center text-xs font-bold text-gray-400 select-none">
             {currentDateDisplay}
           </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-950 scroll-smooth">
           <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand-600" /></div>}>
            {renderViewContent}
           </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;

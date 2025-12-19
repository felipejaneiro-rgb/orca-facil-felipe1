
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
  // 1. Estados de Autenticação (A sugestão de ouro)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // 2. Estados de UI
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  const [defaultCompany, setDefaultCompany] = useState<CompanyProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const currentDateDisplay = useMemo(() => 
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
  []);

  // 3. Inicialização de Dados da Empresa
  const initializeCompany = useCallback(async (userId: string) => {
    try {
      const company = await companyService.getCompany(userId);
      if (company) {
        setDefaultCompany(company);
        setCurrentView('dashboard');
      } else {
        // Se realmente retornou null (sucesso mas sem dados), vai para o onboarding
        setCurrentView('onboarding');
      }
    } catch (err: any) {
      console.error("Erro ao carregar empresa:", err);
      // Em caso de erro de rede, não jogamos para o onboarding (cadastro), 
      // ficamos no dashboard e mostramos o erro se for persistente.
      setCurrentView('dashboard');
    } finally {
      setIsDataLoaded(true);
    }
  }, []);

  // 4. Efeito de Monitoramento de Sessão (Padrão Sugerido)
  useEffect(() => {
    let mounted = true;

    // Busca sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      if (session?.user) {
        setCurrentUser(authService.mapSupabaseUser(session.user));
      }
      setSessionReady(true); // O "Porteiro" libera a entrada
    });

    // Escuta mudanças (Login/Logout/Token Expired)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const mapped = authService.mapSupabaseUser(session.user);
        setCurrentUser(mapped);
      } else {
        // Só limpa se o evento for explicitamente de saída ou token inválido
        if (event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          setCurrentUser(null);
          setDefaultCompany(null);
          setIsDataLoaded(false);
          setCurrentView('dashboard');
        }
      }
      setSessionReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 5. Efeito de Carga de Perfil (Só roda quando a sessão está confirmada)
  useEffect(() => {
    if (sessionReady && currentUser && !isDataLoaded) {
      initializeCompany(currentUser.id);
    } else if (sessionReady && !currentUser) {
      // Se não há usuário, não há dados para carregar
      setIsDataLoaded(true);
    }
  }, [sessionReady, currentUser, isDataLoaded, initializeCompany]);

  const handleLogout = useCallback(async () => {
      if (confirm('Deseja sair da sua conta?')) {
        setSessionReady(false); // Bloqueia a UI para o logout
        await authService.logout();
        window.location.reload(); // Recarga limpa para garantir reset total
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

  // 6. Renderizador de Conteúdo (Memoizado para performance)
  const renderViewContent = useMemo(() => {
    if (!sessionReady || !isDataLoaded) return null;
    
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
  }, [currentView, currentStep, quoteData, currentUser, defaultCompany, navigateToEditor, updateQuoteData, sessionReady, isDataLoaded]);

  // --- RENDERS DE ESTADO ---

  // 1. Loader de Inicialização (Obrigatório enquanto sessionReady ou isDataLoaded forem falsos)
  if (!sessionReady || (currentUser && !isDataLoaded)) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 border-4 border-brand-100 dark:border-brand-900/20 rounded-full"></div>
                <Loader2 className="animate-spin text-brand-600" size={48} />
            </div>
            <div className="mt-8 text-center">
                <p className="text-gray-800 dark:text-white font-black tracking-widest uppercase text-xs">Sincronizando</p>
                <p className="text-gray-400 dark:text-gray-500 text-[10px] mt-1 font-bold">ESTABELECENDO CONEXÃO SEGURA...</p>
            </div>
        </div>
      );
  }

  // 2. Erro Crítico
  if (appError) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-md text-center">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Erro de Carregamento</h2>
                <p className="text-gray-600 mb-6 text-sm">{appError}</p>
                <button onClick={() => window.location.reload()} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold">Reiniciar App</button>
            </div>
        </div>
    );
  }

  // 3. Tela de Login (Só aparece se sessionReady for true e currentUser for null)
  if (!currentUser) {
    return (
      <Suspense fallback={null}>
        <AuthView onLoginSuccess={(user) => { setCurrentUser(user); setIsDataLoaded(false); }} />
      </Suspense>
    );
  }

  // 4. Tela de Cadastro de Empresa (Onboarding)
  if (currentView === 'onboarding') {
    return (
      <Suspense fallback={null}>
        <OnboardingView 
          userId={currentUser.id} 
          userEmail={currentUser.email} 
          onComplete={(company) => {
            setDefaultCompany(company);
            setCurrentView('dashboard');
          }} 
        />
      </Suspense>
    );
  }

  // 5. Aplicativo Principal
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
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-6 z-30 shrink-0">
           <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 text-gray-500"><Menu /></button>
           <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <h1 className="font-black text-gray-800 dark:text-white tracking-tighter uppercase text-sm">OrçaFácil Admin</h1>
           </div>
           <div className="hidden md:flex items-center text-xs font-bold text-gray-400">
             {currentDateDisplay}
           </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 md:p-8">
           <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand-600" /></div>}>
            {renderViewContent}
           </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;

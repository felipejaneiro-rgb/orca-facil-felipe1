
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
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

const STORAGE_KEY_PROFILE = 'orcaFacil_profile';

type AppView = 'dashboard' | 'editor' | 'history' | 'reports' | 'catalog' | 'clients' | 'onboarding';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(false);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  const [defaultCompany, setDefaultCompany] = useState<CompanyProfile | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadCompanyAndStart = useCallback(async (user: User) => {
    setIsCheckingCompany(true);
    setAppError(null);
    try {
      const company = await companyService.getCompany(user.id);
      if (company) {
        setDefaultCompany(company);
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(company));
        setCurrentView('dashboard');
      } else {
        setCurrentView('onboarding');
      }
    } catch (err: any) {
      console.error("Erro Crítico no Carregamento:", err);
      // Se não achar a empresa, manda pro onboarding em vez de dar tela branca
      setCurrentView('onboarding');
    } finally {
      setIsCheckingCompany(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = authService.mapSupabaseUser(session.user);
        setCurrentUser(user);
        loadCompanyAndStart(user);
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setDefaultCompany(null);
        setCurrentView('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [loadCompanyAndStart]);

  const handleLoginSuccess = (user?: User) => {
      if (user) {
          setCurrentUser(user);
          loadCompanyAndStart(user);
      }
  };

  const handleLogout = async () => {
      if (confirm('Deseja sair da sua conta?')) {
          await authService.logout();
          window.location.reload();
      }
  };

  // Escudo contra Tela Branca
  if (appError) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-md text-center border border-red-100 dark:border-red-900/20">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2 dark:text-white">Ops! Ocorreu um erro</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">{appError}</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-700 transition-colors"
                >
                  <RefreshCw size={18} /> Recarregar Aplicativo
                </button>
            </div>
        </div>
    );
  }

  if (isAuthChecking || isCheckingCompany) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Preparando seu ambiente...</p>
        </div>
      );
  }

  if (!currentUser) {
    return (
      <Suspense fallback={null}>
        <AuthView onLoginSuccess={handleLoginSuccess} />
      </Suspense>
    );
  }

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

  const renderContent = () => {
    try {
      switch (currentView) {
        case 'dashboard':
          return <DashboardView user={currentUser} onNavigate={setCurrentView} onLoadQuote={(q) => { setQuoteData(q); setCurrentView('editor'); setCurrentStep(3); }} onNewQuote={() => { setQuoteData(INITIAL_QUOTE); setCurrentView('editor'); setCurrentStep(0); }} />;
        case 'history':
          return <HistoryModal isOpen={true} onClose={() => setCurrentView('dashboard')} onLoadQuote={(q) => { setQuoteData(q); setCurrentView('editor'); setCurrentStep(3); }} />;
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
                    {currentStep === 0 && <CompanyForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} defaultCompany={defaultCompany || undefined} />}
                    {currentStep === 1 && <ClientForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} />}
                    {currentStep === 2 && <ItemsForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} />}
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
      setAppError("Falha na renderização do componente: " + e.message);
      return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        onNewQuote={() => { setQuoteData(INITIAL_QUOTE); setCurrentView('editor'); setCurrentStep(0); }} 
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
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <h1 className="font-black text-gray-800 dark:text-white tracking-tighter uppercase text-sm">OrçaFácil Admin</h1>
           </div>
           <div className="hidden md:flex items-center text-xs font-bold text-gray-400">
             {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
           </div>
        </header>
        
        <main className="flex-1 overflow-auto p-4 md:p-8 bg-gray-50 dark:bg-gray-950">
           <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand-600" /></div>}>
            {renderContent()}
           </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;

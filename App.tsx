
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { QuoteData, INITIAL_QUOTE, CompanyProfile, User } from './types';
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
  Menu,
  AlertCircle
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

const STORAGE_KEY = 'orcaFacil_data'; 
const STORAGE_KEY_PROFILE = 'orcaFacil_profile';
const STORAGE_KEY_THEME = 'orcaFacil_theme';

type AppView = 'dashboard' | 'editor' | 'history' | 'reports' | 'catalog' | 'clients' | 'public-view' | 'onboarding';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isCheckingCompany, setIsCheckingCompany] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<AppView>(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#public-view') || hash.startsWith('#v/')) return 'public-view';
    return 'dashboard';
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [quoteData, setQuoteData] = useState<QuoteData>(INITIAL_QUOTE);
  const [defaultCompany, setDefaultCompany] = useState<CompanyProfile>(INITIAL_QUOTE.company);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const checkCompanyRegistration = useCallback(async (userId: string) => {
    if (currentView === 'public-view') return;
    setIsCheckingCompany(true);
    try {
      const company = await companyService.getCompany(userId);
      if (company) {
        setDefaultCompany(company);
        localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(company));
        setCurrentView('dashboard');
      } else {
        setCurrentView('onboarding');
      }
    } catch (err) {
      console.error("Erro ao verificar empresa:", err);
      // Se der erro, não quebramos a tela, mandamos para onboarding por segurança
      setCurrentView('onboarding');
    } finally {
      setIsCheckingCompany(false);
    }
  }, [currentView]);

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
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, [checkCompanyRegistration]);

  const handleOnboardingComplete = (company: CompanyProfile) => {
      setDefaultCompany(company);
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(company));
      setCurrentView('dashboard');
  };

  const handleLogout = async () => {
      if (confirm('Deseja sair da sua conta?')) {
          await authService.logout();
          window.location.reload();
      }
  };

  // Se houver um erro crítico de renderização
  if (appError) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Algo deu errado</h2>
                <p className="text-gray-600 mb-6">{appError}</p>
                <button onClick={() => window.location.reload()} className="w-full bg-brand-600 text-white py-3 rounded-xl font-bold">Recarregar Aplicativo</button>
            </div>
        </div>
    );
  }

  if (isAuthChecking || isCheckingCompany) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
            <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
            <p className="text-gray-500 font-medium">Carregando OrçaFácil...</p>
        </div>
      );
  }

  if (!currentUser) return <Suspense fallback={null}><AuthView onLoginSuccess={() => {}} /></Suspense>;

  if (currentView === 'onboarding') return <Suspense fallback={null}><OnboardingView userId={currentUser.id} userEmail={currentUser.email} onComplete={handleOnboardingComplete} /></Suspense>;

  const renderContent = () => {
      try {
        if (currentView === 'dashboard') return <DashboardView user={currentUser} onNavigate={(v: any) => setCurrentView(v)} onLoadQuote={(q) => { setQuoteData(q); setCurrentView('editor'); setCurrentStep(3); }} onNewQuote={() => setCurrentView('editor')} />;
        if (currentView === 'history') return <HistoryModal isOpen={true} onClose={() => setCurrentView('dashboard')} onLoadQuote={(q) => { setQuoteData(q); setCurrentView('editor'); setCurrentStep(3); }} />;
        if (currentView === 'reports') return <ReportsView />;
        if (currentView === 'catalog') return <CatalogView />;
        if (currentView === 'clients') return <ClientsView />;
        
        return (
            <div className="max-w-4xl mx-auto pb-10">
                <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
                <div className="mt-6">
                    {currentStep === 0 && <CompanyForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} defaultCompany={defaultCompany} />}
                    {currentStep === 1 && <ClientForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} />}
                    {currentStep === 2 && <ItemsForm data={quoteData} updateData={(d) => setQuoteData(p => ({...p, ...d}))} />}
                    {currentStep === 3 && <QuotePreview data={quoteData} onEdit={() => setCurrentStep(2)} onApprove={() => {}} />}
                </div>
                {currentStep < 3 && (
                    <div className="mt-8 flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button onClick={() => setCurrentStep(p => Math.max(0, p-1))} disabled={currentStep === 0} className="px-6 py-3 rounded-lg font-medium text-gray-600 disabled:opacity-30">Voltar</button>
                        <button onClick={() => setCurrentStep(p => Math.min(3, p+1))} className="bg-brand-600 px-8 py-3 rounded-lg text-white font-bold shadow-lg">Próximo</button>
                    </div>
                )}
            </div>
        );
      } catch (e) {
          setAppError("Falha ao renderizar componente: " + (e as Error).message);
          return null;
      }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView} onNavigate={(v: any) => setCurrentView(v)} onNewQuote={() => {}} onToggleTheme={() => {}} isDarkMode={isDarkMode} onLogout={handleLogout} currentUser={currentUser} hasActiveDraft={false} setShowSettings={setShowSettings} />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-30 shrink-0">
           <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2"><Menu /></button>
           <h1 className="font-bold">OrçaFácil</h1>
           <div />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">
           <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-brand-600" /></div>}>
            {renderContent()}
           </Suspense>
        </main>
      </div>
    </div>
  );
};

export default App;

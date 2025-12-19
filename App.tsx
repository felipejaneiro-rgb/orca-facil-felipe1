
import React, { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { QuoteData, INITIAL_QUOTE, CompanyProfile, User, QuoteStatus } from './types';
import StepIndicator from './components/StepIndicator';
import Sidebar from './components/Sidebar'; 
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import { clientService } from './services/clientService';
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

type AppView = 'dashboard' | 'editor' | 'history' | 'reports' | 'catalog' | 'clients' | 'public-view';

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
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // SUPABASE AUTH LISTENER
  useEffect(() => {
    // Check initial session
    authService.getCurrentUser().then(user => {
      setCurrentUser(user);
      setIsAuthChecking(false);
    });

    // Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(authService.mapSupabaseUser(session.user));
      } else {
        setCurrentUser(null);
      }
      setIsAuthChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
       safeReplaceState({ view: 'dashboard' }, '');
    }

    const handlePopState = (event: PopStateEvent) => {
        if (event.state?.view) {
            setCurrentView(event.state.view);
        } else {
            setCurrentView('dashboard');
        }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
        const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
        if (!savedProfile) {
            const newProfile: CompanyProfile = {
                name: currentUser.name || '',
                document: currentUser.document || '',
                email: currentUser.email || '',
                phone: currentUser.whatsapp || '',
                website: currentUser.website || '',
                address: ''
            };
            setDefaultCompany(newProfile);
            localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(newProfile));
        }
    }
  }, [currentUser]);

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
            const savedData = localStorage.getItem(STORAGE_KEY);
            const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
            
            let profileToUse = INITIAL_QUOTE.company;

            if (savedProfile) {
                try {
                    const parsedProfile = JSON.parse(savedProfile);
                    setDefaultCompany(parsedProfile);
                    profileToUse = parsedProfile;
                } catch (e) { console.error(e); }
            }

            if (savedData) {
                try {
                    const parsed = JSON.parse(savedData);
                    setQuoteData({
                        ...INITIAL_QUOTE,
                        ...parsed,
                        items: Array.isArray(parsed.items) ? parsed.items : [],
                        company: { ...INITIAL_QUOTE.company, ...(parsed.company || {}) },
                        client: { ...INITIAL_QUOTE.client, ...(parsed.client || {}) }
                    });
                } catch (e) {
                    const nextNum = await storageService.getNextQuoteNumber();
                    setQuoteData({ ...INITIAL_QUOTE, number: nextNum, company: profileToUse });
                }
            } else {
                const nextNum = await storageService.getNextQuoteNumber();
                setQuoteData({ ...INITIAL_QUOTE, number: nextNum, company: profileToUse });
            }
            setIsLoaded(true);
        }
    };
    initData();
  }, [currentUser]);

  useEffect(() => {
    if (isLoaded && currentUser && currentView !== 'public-view') {
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
          // State is handled by onAuthStateChange
          setCurrentView('dashboard');
          safePushState({ view: 'dashboard' }, '/');
      }
  }, []);

  const handleNavigate = useCallback((view: any) => {
      if (view === 'settings') setShowSettings(true);
      else {
          setCurrentView(view);
          safePushState({ view }, `#${view}`);
      }
      setIsSidebarOpen(false);
  }, []);

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
        company: defaultCompany.name ? defaultCompany : INITIAL_QUOTE.company
    });
    setLastSavedId(null);
    setCurrentStep(0);
    setCurrentView('editor');
    safePushState({ view: 'editor' }, '#new');
    setIsSidebarOpen(false);
  }, [defaultCompany]);

  if (isAuthChecking) {
      return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="animate-spin text-brand-600" /></div>;
  }

  if (!currentUser) {
      return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><Loader2 className="animate-spin text-brand-600" /></div>}>
            <AuthView onLoginSuccess={() => {}} />
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
                            isSaving={isSaving} 
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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans overflow-hidden transition-colors">
      <Suspense fallback={null}>
          <CompanySettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} onSave={(p) => setDefaultCompany(p)} initialData={defaultCompany} isDarkMode={isDarkMode} onToggleTheme={toggleTheme}/>
          <ServiceManagerModal isOpen={showServiceManager} onClose={() => setShowServiceManager(false)} onUpdate={() => {}} />
      </Suspense>

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} currentView={currentView} onNavigate={handleNavigate} onNewQuote={handleNewQuote} onToggleTheme={toggleTheme} isDarkMode={isDarkMode} onLogout={handleLogout} currentUser={currentUser} hasActiveDraft={true} setShowSettings={setShowSettings}/>

      <div className="flex-1 flex flex-col h-full w-full relative">
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6 z-30 shrink-0 shadow-sm">
           <div className="flex items-center">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden mr-4 text-gray-500 dark:text-gray-400 p-2 rounded-lg">
                <Menu size={24} />
              </button>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-white hidden sm:block">OrçaFácil</h1>
           </div>
           <div className="flex items-center gap-2">
              {currentView === 'editor' && (
                  <button onClick={async () => {
                      setIsSaving(true);
                      await storageService.save(quoteData);
                      setIsSaving(false);
                      setToastMessage("Salvo com sucesso!");
                      setTimeout(() => setToastMessage(null), 3000);
                  }} className="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200">
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

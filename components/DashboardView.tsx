
import React, { useEffect, useState, useMemo } from 'react';
import { User, QuoteData } from '../types';
import { storageService } from '../services/storageService';
import { calculateQuoteTotals } from '../utils/calculations';
import { 
    PlusCircle, 
    FolderOpen, 
    Package, 
    Clock, 
    CheckCircle, 
    TrendingUp,
    Briefcase,
    Users,
    Loader2
} from 'lucide-react';

interface Props {
  user: User | null;
  onNavigate: (view: any) => void;
  onLoadQuote: (quote: QuoteData) => void;
  onNewQuote: () => void;
}

const DashboardView: React.FC<Props> = ({ user, onNavigate, onLoadQuote, onNewQuote }) => {
  const [allQuotes, setAllQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
        try {
            const data = await storageService.getAll();
            setAllQuotes(data || []);
        } catch (e) {
            console.error("Erro ao carregar dados do dashboard:", e);
        } finally {
            setLoading(false);
        }
    };
    loadDashboardData();
  }, []);

  const stats = useMemo(() => {
      try {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          let revenue = 0;
          let pending = 0;
          let approved = 0;

          allQuotes.forEach(q => {
              if (!q || !q.date) return;
              const qDate = new Date(q.date);
              if (isNaN(qDate.getTime())) return;

              const isThisMonth = qDate.getMonth() === currentMonth && qDate.getFullYear() === currentYear;
              
              if (q.status === 'pending') pending++;
              if (q.status === 'approved') {
                  if (isThisMonth) {
                      revenue += calculateQuoteTotals(q).total;
                  }
                  approved++;
              }
          });

          return { monthlyRevenue: revenue, pendingCount: pending, approvedCount: approved };
      } catch (err) {
          console.error("Erro no cálculo das estatísticas:", err);
          return { monthlyRevenue: 0, pendingCount: 0, approvedCount: 0 };
      }
  }, [allQuotes]);

  if (loading) {
      return (
          <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-brand-600" size={32} />
          </div>
      );
  }

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
        <div className="bg-brand-600 rounded-3xl p-8 md:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10 -rotate-12"><Briefcase size={160} /></div>
            <div className="relative z-10">
                <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4 inline-block">Workspace Ativo</span>
                <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tighter">Olá, {user.name?.split(' ')[0] || 'Usuário'}!</h1>
                <p className="text-brand-100 text-lg max-w-lg font-medium">Seu painel está pronto. O que vamos orçar hoje?</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center transition-all hover:shadow-md">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl mr-4"><TrendingUp size={28} /></div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Faturamento (Mês)</p>
                    <p className="text-2xl font-black text-gray-800 dark:text-white font-mono">{stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center transition-all hover:shadow-md">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-xl mr-4"><Clock size={28} /></div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Pendentes</p>
                    <p className="text-2xl font-black text-gray-800 dark:text-white font-mono">{stats.pendingCount}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center transition-all hover:shadow-md">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl mr-4"><CheckCircle size={28} /></div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Total Aprovados</p>
                    <p className="text-2xl font-black text-gray-800 dark:text-white font-mono">{stats.approvedCount}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <button onClick={onNewQuote} className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl hover:border-brand-500 hover:shadow-xl transition-all flex flex-col items-center text-center active:scale-95">
                <div className="w-14 h-14 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-brand-600 group-hover:text-white transition-all">
                    <PlusCircle size={32} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-200">Novo Orçamento</span>
             </button>
             <button onClick={() => onNavigate('clients')} className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl hover:border-green-500 hover:shadow-xl transition-all flex flex-col items-center text-center active:scale-95">
                <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-green-600 group-hover:text-white transition-all">
                    <Users size={32} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-200">Clientes</span>
             </button>
             <button onClick={() => onNavigate('history')} className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl hover:border-purple-500 hover:shadow-xl transition-all flex flex-col items-center text-center active:scale-95">
                <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <FolderOpen size={32} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-200">Histórico</span>
             </button>
             <button onClick={() => onNavigate('catalog')} className="group p-6 bg-white dark:bg-gray-800 border-2 border-gray-50 dark:border-gray-700 rounded-2xl hover:border-orange-500 hover:shadow-xl transition-all flex flex-col items-center text-center active:scale-95">
                <div className="w-14 h-14 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-full flex items-center justify-center mb-3 group-hover:bg-orange-600 group-hover:text-white transition-all">
                    <Package size={32} />
                </div>
                <span className="font-bold text-gray-700 dark:text-gray-200">Catálogo</span>
             </button>
        </div>
    </div>
  );
};

export default DashboardView;

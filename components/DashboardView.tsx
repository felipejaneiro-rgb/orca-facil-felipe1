
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
    MessageSquare,
    ChevronRight
} from 'lucide-react';
import Card from './ui/Card';

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
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      let revenue = 0;
      let pending = 0;
      let approved = 0;

      allQuotes.forEach(q => {
          if (!q) return;
          const qDate = new Date(q.date);
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
  }, [allQuotes]);

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fadeIn pb-10">
        <div className="bg-brand-600 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10"><Briefcase size={120} /></div>
            <div className="relative z-10">
                <h1 className="text-3xl font-bold mb-2">Olá, {user.name?.split(' ')[0] || 'Usuário'}!</h1>
                <p className="text-brand-100 max-w-lg">Bem-vindo ao seu painel administrativo.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
                <div className="p-3 bg-green-100 text-green-600 rounded-lg mr-4"><TrendingUp size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Faturamento (Mês)</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg mr-4"><Clock size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Pendentes</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.pendingCount}</p>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg mr-4"><CheckCircle size={24} /></div>
                <div>
                    <p className="text-sm text-gray-500 font-medium">Total Aprovados</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.approvedCount}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <button onClick={onNewQuote} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all flex flex-col items-center">
                <PlusCircle size={32} className="text-brand-600 mb-2" />
                <span className="font-bold text-sm">Novo Orçamento</span>
             </button>
             <button onClick={() => onNavigate('clients')} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all flex flex-col items-center">
                <Users size={32} className="text-green-600 mb-2" />
                <span className="font-bold text-sm">Clientes</span>
             </button>
             <button onClick={() => onNavigate('history')} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all flex flex-col items-center">
                <FolderOpen size={32} className="text-purple-600 mb-2" />
                <span className="font-bold text-sm">Histórico</span>
             </button>
             <button onClick={() => onNavigate('catalog')} className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all flex flex-col items-center">
                <Package size={32} className="text-orange-600 mb-2" />
                <span className="font-bold text-sm">Catálogo</span>
             </button>
        </div>
    </div>
  );
};

export default DashboardView;

import React, { useEffect, useState } from 'react';
import api from '../api';
import { Users, UserPlus, BookOpen, DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '../context/AuthContext';


interface Stats {
  total_students: number;
  total_active_leads: number;
  new_leads: number;
  total_classes: number;
  total_income: number;
  total_expenses: number;
  net_profit: number;
  students_in_debt: number;
}

interface DebtStudent { id: number; full_name: string; balance: number; }

const fmt = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

const StatCard: React.FC<{
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; onClick?: () => void;
}> = ({ label, value, sub, icon, color, onClick }) => (
  <div onClick={onClick} className={`bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 flex items-start gap-4 shadow-sm transition-all ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700' : ''}`}>
    <div className={`p-2.5 rounded-xl ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [debtStudents, setDebtStudents] = useState<DebtStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const perms = usePermissions();
  const navigate = useNavigate();


  useEffect(() => {
    Promise.all([
      api.get('dashboard/'),
      api.get('students/?is_active=true'),
    ]).then(([statsRes, studentsRes]) => {
      setStats(statsRes.data);
      const inDebt = studentsRes.data
        .filter((s: DebtStudent) => s.balance < 0)
        .sort((a: DebtStudent, b: DebtStudent) => a.balance - b.balance)
        .slice(0, 8);
      setDebtStudents(inDebt);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">Ma'lumotlar yuklanmoqda...</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bosh sahifa</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">O'quv markazingiz statistikasi.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Faol o'quvchilar" value={stats.total_students} icon={<Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />} color="bg-blue-50 dark:bg-blue-900/30" onClick={() => navigate('/students')} />
        <StatCard label="Yangi lidlar" value={stats.total_active_leads} sub={`${stats.new_leads} yangi`} icon={<UserPlus className="h-5 w-5 text-green-600 dark:text-green-400" />} color="bg-green-50 dark:bg-green-900/30" onClick={() => navigate('/leads')} />
        <StatCard label="Guruhlar" value={stats.total_classes} icon={<BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400" />} color="bg-purple-50 dark:bg-purple-900/30" onClick={() => navigate('/classes')} />
        <StatCard label="Qarzdorlar" value={stats.students_in_debt} sub="hisobida qarzi borlar" icon={<AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />} color="bg-red-50 dark:bg-red-900/30" onClick={() => navigate('/students')} />
      </div>

      {/* Finance KPIs */}
      {perms.canViewFinancialStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all" onClick={() => navigate('/finance')}>
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30"><TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">Umumiy tushum</p><p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">{fmt(stats.total_income)}</p></div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-5 flex items-center gap-4 shadow-sm cursor-pointer hover:shadow-md hover:border-red-300 dark:hover:border-red-700 transition-all" onClick={() => navigate('/finance')}>
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/30"><TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">Umumiy xarajat</p><p className="text-2xl font-bold text-red-700 dark:text-red-500">{fmt(stats.total_expenses)}</p></div>
          </div>
          <div className={`bg-white dark:bg-slate-900 rounded-xl border p-5 flex items-center gap-4 shadow-sm cursor-pointer hover:shadow-md transition-all ${stats.net_profit >= 0 ? 'border-green-200 dark:border-green-800/50 hover:border-green-400' : 'border-red-200 dark:border-red-800/50 hover:border-red-400'}`} onClick={() => navigate('/finance')}>
            <div className={`p-2.5 rounded-xl ${stats.net_profit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}><DollarSign className={`h-5 w-5 ${stats.net_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`} /></div>
            <div><p className="text-xs text-gray-500 dark:text-gray-400">Sof foyda</p><p className={`text-2xl font-bold ${stats.net_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{stats.net_profit >= 0 ? '+' : ''}{fmt(stats.net_profit)}</p></div>
          </div>
        </div>
      )}

      {/* Students in Debt */}
      {debtStudents.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden auto-cols-auto">
          <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-400">Qarzdor o'quvchilar</h2>
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Moliya bo'limidan to'lov qo'shing</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {debtStudents.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-700 dark:text-red-400 font-bold text-xs shrink-0">{s.full_name[0]?.toUpperCase()}</div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.full_name}</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-500">{fmt(s.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick nav */}
      <div>
        <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Tezkor amallar</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Davomat', path: '/attendance', color: 'bg-rose-50 dark:bg-slate-800/50 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-slate-700/50 hover:bg-rose-100 dark:hover:bg-slate-700', icon: '📋' },
            { label: 'Dars jadvali', path: '/schedule', color: 'bg-cyan-50 dark:bg-slate-800/50 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-slate-700/50 hover:bg-cyan-100 dark:hover:bg-slate-700', icon: '📅' },
            { label: 'Moliya', path: '/finance', color: 'bg-emerald-50 dark:bg-slate-800/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-slate-700/50 hover:bg-emerald-100 dark:hover:bg-slate-700', icon: '💰' },
            { label: 'Xodimlar', path: '/teachers', color: 'bg-teal-50 dark:bg-slate-800/50 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-slate-700/50 hover:bg-teal-100 dark:hover:bg-slate-700', icon: '👨‍🏫' },
          ].map(({ label, path, color, icon }) => (
            <button key={path} onClick={() => navigate(path)} className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${color}`}>
              <span className="text-base">{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

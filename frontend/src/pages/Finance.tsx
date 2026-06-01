import React, { useEffect, useState, useCallback, useMemo } from 'react';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, AlertCircle, X, Calendar, Wallet, GraduationCap, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Types
interface Payment { id: number; student_name: string; student: number; amount: string; date: string; method: string; notes: string; course_class?: number | null; course_class_name?: string; }
interface Expense { id: number; title: string; amount: string; date: string; category: string; }
interface Student { id: number; full_name: string; balance: number; class_details?: { id: number; name: string; monthly_fee: number; }[]; }
interface FinanceSummary {
  metrics: { income: number; expenses: number; profit: number; total_debt: number; };
  comparisons: { has_comparison: boolean; income_change: number | null; expenses_change: number | null; profit_change: number | null; };
  trends: { is_daily: boolean; income: { period: string; total: number }[]; expenses: { period: string; total: number }[]; };
  breakdowns: { expense_by_category: { label: string; total: number }[]; income_by_method: { label: string; total: number }[]; };
}
interface TeacherGroup { id: number; name: string; student_count: number; monthly_fee: number; month_payments_received: number; month_fees_charged: number; }
interface TeacherSalary { id: number; display_name: string; username: string; salary_share: number; groups: TeacherGroup[]; total_income_from_groups: number; calculated_salary: number; already_paid: number; }
interface SalaryData { month: string; teachers: TeacherSalary[]; }

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];
const METHOD_LABELS: Record<string, string> = { CASH: 'Naqd', CARD: 'Karta', TRANSFER: 'O\'tkazma', OTHER: 'Boshqa' };
const CATEGORIES = ['SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];
const CATEGORY_LABELS: Record<string, string> = { SALARY: 'Oylik', RENT: 'Ijara', UTILITIES: 'Kommunal', SUPPLIES: 'Jihozlar', MARKETING: 'Marketing', OTHER: 'Boshqa' };
const fmt = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

const getDates = (range: string) => {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;

  if (range === 'THIS_MONTH') return { start: fmt(new Date(y, m, 1)), end: fmt(new Date(y, m + 1, 0)) };
  if (range === 'LAST_MONTH') return { start: fmt(new Date(y, m - 1, 1)), end: fmt(new Date(y, m, 0)) };
  if (range === 'THIS_YEAR') return { start: fmt(new Date(y, 0, 1)), end: fmt(new Date(y, 11, 31)) };
  return { start: '', end: '' }; // ALL
};

const Finance: React.FC = () => {
  const perms = usePermissions();
  const [tab, setTab] = useState<'payments' | 'expenses' | 'debtors' | 'salaries'>(perms.canViewFinancialStats ? 'payments' : 'debtors');

  // Salary state
  const [salaryMonth, setSalaryMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherSalary | null>(null);
  const [payBase, setPayBase] = useState('');
  const [payBonus, setPayBonus] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paying, setPaying] = useState(false);
  const [expandedTeacher, setExpandedTeacher] = useState<number | null>(null);
  const [toast, setToast] = useState('');
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };
  const [dateRange, setDateRange] = useState('THIS_MONTH');
  
  // Batch charging state
  const [chargeStatus, setChargeStatus] = useState<{ already_charged: boolean; uncharged_classes_count: number; uncharged_classes_names: string[] } | null>(null);
  const [chargingAll, setChargingAll] = useState(false);
  
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Forms
  const todayStr = new Date().toISOString().slice(0, 10);
  const [payForm, setPayForm] = useState({ student: '', course_class: '', amount: '', date: todayStr, method: 'CASH', notes: '' });
  const [debtorQuickPay, setDebtorQuickPay] = useState<Student | null>(null);
  const [expForm, setExpForm] = useState({ title: '', amount: '', date: todayStr, category: 'OTHER', notes: '' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const dates = getDates(dateRange);
      const qs = dates.start ? `?start_date=${dates.start}&end_date=${dates.end}` : '';
      const qsFilter = dates.start ? `?date__gte=${dates.start}&date__lte=${dates.end}` : '';

      const reqs: Promise<any>[] = [api.get('students/')];
      
      if (perms.canViewFinancialStats) {
        reqs.push(
          api.get(`finance/payments/${qsFilter}`),
          api.get(`finance/expenses/${qsFilter}`),
          api.get(`finance/summary/${qs}`)
        );
        const [s, p, e, sum] = await Promise.all(reqs);
        setStudents(Array.isArray(s.data) ? s.data : s.data?.results || []);
        setPayments(Array.isArray(p.data) ? p.data : p.data?.results || []);
        setExpenses(Array.isArray(e.data) ? e.data : e.data?.results || []);
        setSummary(sum.data);
      } else {
        const [s] = await Promise.all(reqs);
        setStudents(Array.isArray(s.data) ? s.data : s.data?.results || []);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [perms.canViewFinancialStats, dateRange]);

  const fetchChargeStatus = useCallback(async () => {
    if (!perms.canViewFinancialStats) return;
    try {
      const r = await api.get('finance/charge-all-groups/');
      setChargeStatus(r.data);
    } catch(e) {
      console.error(e);
    }
  }, [perms.canViewFinancialStats]);

  const handleChargeAllGroups = async () => {
    if (!chargeStatus || chargeStatus.already_charged) return;
    const confirmMsg = `Diqqat! Ushbu oyda hali hisoblanmagan ${chargeStatus.uncharged_classes_count} ta guruh (${chargeStatus.uncharged_classes_names.join(', ')}) uchun oylik to'lov hisobdan chiqariladi. Davom etamizmi?`;
    if (!window.confirm(confirmMsg)) return;

    setChargingAll(true);
    try {
      const r = await api.post('finance/charge-all-groups/');
      showToast(`✅ ${r.data.classes_charged} ta guruh muvaffaqiyatli hisoblandi! Jami yozilgan summa: ${fmt(r.data.total_charged)} UZS`);
      await Promise.all([fetchAll(), fetchChargeStatus()]);
    } catch (e: any) {
      showToast(`❌ Xatolik yuz berdi: ${e.response?.data?.error || 'Ulanish xatosi'}`);
    } finally {
      setChargingAll(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchChargeStatus();
  }, [fetchAll, fetchChargeStatus]);

  const fetchSalaries = useCallback(async (month: string) => {
    setSalaryLoading(true);
    try { const r = await api.get(`finance/teacher-salaries/?month=${month}`); setSalaryData(r.data); }
    catch(e) { console.error(e); } finally { setSalaryLoading(false); }
  }, []);

  useEffect(() => { if (tab === 'salaries' && perms.canViewFinancialStats) fetchSalaries(salaryMonth); }, [tab, salaryMonth, fetchSalaries, perms.canViewFinancialStats]);

  const handlePaySalary = async () => {
    if (!selectedTeacher) return;
    setPaying(true);
    try {
      await api.post('finance/pay-salary/', { teacher_id: selectedTeacher.id, base_amount: parseFloat(payBase)||0, bonus_amount: parseFloat(payBonus)||0, notes: payNotes, month: salaryMonth });
      setShowSalaryModal(false);
      fetchSalaries(salaryMonth);
      fetchAll();
      showToast(`✅ ${selectedTeacher.display_name} oylik to'landi. Xarajat avtomatik kiritildi.`);
    } catch(e: any) { showToast(`❌ ${e.response?.data?.error || 'Xatolik yuz berdi.'}`); }
    finally { setPaying(false); }
  };

  // Debtors
  const debtors = useMemo(() => (Array.isArray(students) ? students : []).filter(s => s.balance < 0).sort((a, b) => a.balance - b.balance), [students]);

  const openQuickPay = (s: Student) => {
    setDebtorQuickPay(s);
    const defaultClass = s.class_details && s.class_details.length > 0 ? String(s.class_details[0].id) : '';
    setPayForm({ student: String(s.id), course_class: defaultClass, amount: String(Math.abs(s.balance)), date: todayStr, method: 'CASH', notes: '' });
    setTab('payments');
    setShowModal(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('finance/payments/', payForm);
      setShowModal(false); setDebtorQuickPay(null); setPayForm({ student: '', course_class: '', amount: '', date: todayStr, method: 'CASH', notes: '' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleExpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('finance/expenses/', expForm);
      setShowModal(false); setExpForm({ title: '', amount: '', date: todayStr, category: 'OTHER', notes: '' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  // Process data for composite chart
  const trendData = useMemo(() => {
    if (!summary) return [];
    const m = new Map<string, { period: string; income: number; expenses: number }>();
    summary.trends.income.forEach(d => m.set(d.period, { period: d.period, income: d.total, expenses: 0 }));
    summary.trends.expenses.forEach(d => {
      const e = m.get(d.period);
      if (e) e.expenses = d.total;
      else m.set(d.period, { period: d.period, income: 0, expenses: d.total });
    });
    return Array.from(m.values()).sort((a, b) => a.period.localeCompare(b.period));
  }, [summary]);

  const renderChange = (c: number | null) => {
    if (c === null) return null;
    const isPos = c > 0; const isZero = c === 0;
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-2 ${isPos ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : isZero ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
        {isPos ? '↑' : isZero ? '—' : '↓'} {Math.abs(c).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {toast && <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${toast.startsWith('❌') ? 'bg-red-600' : 'bg-gray-900 dark:bg-emerald-700'}`}>{toast}</div>}
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moliya</h1>
          {!perms.canViewFinancialStats && <p className="text-sm font-bold text-amber-600 dark:text-amber-500 mt-1">👁 Faqat qarzdorlarni ko'rish va to'lov qabul qilish mumkin.</p>}
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {perms.canViewFinancialStats && (
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="pl-9 pr-8 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-emerald-500 appearance-none cursor-pointer transition-colors">
                <option value="THIS_MONTH">Shu oy</option>
                <option value="LAST_MONTH">O'tgan oy</option>
                <option value="THIS_YEAR">Yil</option>
                <option value="ALL">Barcha vaqt</option>
              </select>
            </div>
          )}
          {perms.canViewFinancialStats && chargeStatus && (
            <button
              onClick={handleChargeAllGroups}
              disabled={chargingAll || chargeStatus.already_charged}
              title={chargeStatus.already_charged ? "Shu oy uchun barcha guruhlar to'liq hisoblangan" : "Barcha guruhlarga oylik to'lov yozish"}
              className={`inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl shadow-sm transition-all duration-300 flex-1 md:flex-none ${
                chargeStatus.already_charged
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-gray-600 border border-gray-200 dark:border-slate-700 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95'
              }`}
            >
              <Zap className={`h-4 w-4 mr-2 ${chargeStatus.already_charged ? 'text-gray-400 dark:text-gray-600' : 'text-yellow-400 fill-yellow-400'}`} />
              {chargingAll ? 'Yuklanmoqda...' : chargeStatus.already_charged ? 'Guruhlar hisoblangan' : `Hisobdan chiqarish (${chargeStatus.uncharged_classes_count})`}
            </button>
          )}
          <button onClick={() => setShowModal(true)} className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex-1 md:flex-none">
            <Plus className="h-4 w-4 mr-2" />{tab === 'expenses' ? 'Xarajat kiritish' : 'To\'lov qabul qilish'}
          </button>
        </div>
      </div>

      {/* KPI Cards — CEO only */}
      {perms.canViewFinancialStats && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-green-100 dark:bg-green-900/40 rounded-xl"><TrendingUp className="h-5 w-5 text-green-600 dark:text-green-500" /></div>
              {renderChange(summary.comparisons.income_change)}
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Kirim</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={String(summary.metrics.income)}>{fmt(summary.metrics.income)}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/40 rounded-xl"><TrendingDown className="h-5 w-5 text-red-600 dark:text-red-500" /></div>
              {renderChange(summary.comparisons.expenses_change)}
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-0.5">Chiqim</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white truncate" title={String(summary.metrics.expenses)}>{fmt(summary.metrics.expenses)}</p>
          </div>
          
          <div className={`rounded-2xl border p-5 shadow-sm transition-colors ${summary.metrics.profit >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30' : 'bg-rose-50/50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800/30'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className={`p-2.5 rounded-xl ${summary.metrics.profit >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                <DollarSign className={`h-5 w-5 ${summary.metrics.profit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`} />
              </div>
              {renderChange(summary.comparisons.profit_change)}
            </div>
            <p className={`text-[11px] font-black uppercase tracking-widest mb-0.5 ${summary.metrics.profit >= 0 ? 'text-emerald-700 dark:text-emerald-500' : 'text-rose-700 dark:text-rose-500'}`}>Sof foyda</p>
            <p className={`text-2xl font-black truncate ${summary.metrics.profit >= 0 ? 'text-emerald-800 dark:text-emerald-400' : 'text-rose-800 dark:text-rose-400'}`} title={String(summary.metrics.profit)}>{fmt(summary.metrics.profit)}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/30 p-5 shadow-sm transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/20 rounded-xl"><Wallet className="h-5 w-5 text-rose-600 dark:text-rose-400" /></div>
            </div>
            <p className="text-[11px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-600 mb-0.5">Olinmagan qarz</p>
            <p className="text-2xl font-black text-rose-700 dark:text-rose-400 truncate" title={String(summary.metrics.total_debt)}>{fmt(summary.metrics.total_debt)}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">Barcha yo'qotishlar summasi</p>
          </div>
        </div>
      )}

      {/* Charts — CEO only */}
      {perms.canViewFinancialStats && summary && (trendData.length > 0 || summary.breakdowns.expense_by_category.length > 0 || summary.breakdowns.income_by_method.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
          {/* Main Trend Chart */}
          {trendData.length > 0 && (
            <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6">Tranzaksiyalar ({summary.trends.is_daily ? 'Kunlik' : 'Oylik'})</h2>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'currentColor', fontWeight: 700 }} className="text-gray-400" tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'currentColor', fontWeight: 700 }} className="text-gray-400" tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: any) => fmt(v)} cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff', borderRadius: '1rem', fontWeight: 'bold' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold', paddingTop: '20px' }} iconType="circle" />
                    <Bar dataKey="income" name="Kirim" fill="#10b981" radius={[4, 4, 4, 4]} maxBarSize={40} />
                    <Bar dataKey="expenses" name="Chiqim" fill="#ef4444" radius={[4, 4, 4, 4]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Breakdowns */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {summary.breakdowns.expense_by_category.length > 0 && (
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm transition-colors flex flex-col justify-center">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 text-center">Xarajatlar Turi</h2>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summary.breakdowns.expense_by_category} dataKey="total" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2}>
                        {summary.breakdowns.expense_by_category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={() => ''} contentStyle={{ backgroundColor: '#1e293b', borderColor: 'transparent', color: '#fff', borderRadius: '0.75rem', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            {summary.breakdowns.income_by_method.length > 0 && (
              <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 shadow-sm transition-colors flex flex-col justify-center">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2 text-center">To'lov Usullari</h2>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summary.breakdowns.income_by_method} dataKey="total" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={2}>
                        {summary.breakdowns.income_by_method.map((_, i) => <Cell key={i} fill={PIE_COLORS[(i+2) % PIE_COLORS.length]} stroke="transparent" />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(v)} labelFormatter={() => ''} contentStyle={{ backgroundColor: '#1e293b', borderColor: 'transparent', color: '#fff', borderRadius: '0.75rem', fontSize: '12px', fontWeight: 'bold' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b-2 border-gray-100 dark:border-slate-800">
        <nav className="-mb-0.5 flex gap-8">
          {([
            ...(perms.canViewFinancialStats ? [['payments', '💰 To\'lovlar'], ['expenses', '📋 Xarajatlar'], ['salaries', '💼 Oyliklar']] : []),
            ['debtors', '⚠️ Qarzdorlar'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`py-3.5 text-sm font-bold border-b-2 transition-colors ${tab === t ? (t === 'debtors' ? 'border-red-500 text-red-700 dark:text-red-500' : t === 'salaries' ? 'border-violet-600 text-violet-700 dark:text-violet-400' : 'border-emerald-600 text-emerald-700 dark:text-emerald-500') : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {label}{t === 'debtors' && debtors.length > 0 && <span className="ml-2 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">{debtors.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-bold">Yuklanmoqda...</div> : (
        <>
          {/* Payments */}
          {tab === 'payments' && (
            <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
              {payments.length === 0 ? <div className="p-16 text-center text-gray-400 dark:text-gray-500 font-bold">To'lovlar hali kiritilmagan.</div> : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-50 dark:bg-slate-800/50"><tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">O'quvchi</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Miqdor</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Usul</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                    {[...payments].sort((a, b) => {
                      const dateA = new Date(a.date).getTime();
                      const dateB = new Date(b.date).getTime();
                      if (dateB !== dateA) return dateB - dateA;
                      return b.id - a.id;
                    }).map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">
                          <div>{p.student_name}</div>
                          {p.course_class_name && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/40 px-2 py-0.5 rounded-md mt-1 transition-colors">
                              📚 {p.course_class_name}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-black text-green-700 dark:text-green-500">+{fmt(parseFloat(p.amount))}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">{p.date}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 shadow-sm">{METHOD_LABELS[p.method] || p.method}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Expenses */}
          {tab === 'expenses' && (
            <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
              {expenses.length === 0 ? <div className="p-16 text-center text-gray-400 dark:text-gray-500 font-bold">Xarajatlar hali kiritilmagan.</div> : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                  <thead className="bg-gray-50 dark:bg-slate-800/50"><tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sarlavha</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Miqdor</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kategoriya</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                    {[...expenses].sort((a, b) => {
                      const dateA = new Date(a.date).getTime();
                      const dateB = new Date(b.date).getTime();
                      if (dateB !== dateA) return dateB - dateA;
                      return b.id - a.id;
                    }).map(ex => (
                      <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{ex.title}</td>
                        <td className="px-6 py-4 text-sm font-black text-red-700 dark:text-red-500">-{fmt(parseFloat(ex.amount))}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">{ex.date}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 shadow-sm">{CATEGORY_LABELS[ex.category] || ex.category}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Debtors */}
          {tab === 'debtors' && (
            <div className="space-y-4">
              {debtors.length === 0 ? (
                <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors">
                  <AlertCircle className="h-16 w-16 text-emerald-300 dark:text-emerald-800/50 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-bold text-lg">Qarzdor o'quvchilar yo'q 🎉</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400 px-1">{debtors.length} ta o'quvchida qarz bor. Qarzni yopish uchun to'lov qabul qiling.</p>
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/30 shadow-sm overflow-hidden transition-colors">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800/60">
                      <thead className="bg-red-50 dark:bg-red-900/10"><tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider">O'quvchi</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-red-800 dark:text-red-400 uppercase tracking-wider">Qarz miqdori</th>
                        <th className="px-6 py-4"></th>
                      </tr></thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                        {debtors.map(s => (
                          <tr key={s.id} className="hover:bg-red-50/50 dark:hover:bg-red-900/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 font-black text-sm shadow-sm">{s.full_name?.[0]?.toUpperCase() || '?'}</div>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{s.full_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm font-black text-red-700 dark:text-red-500">{fmt(s.balance)}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => openQuickPay(s)} className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors">
                                <Plus className="h-4 w-4" /> To'lov qabul qilish
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
          {/* Salaries */}
          {tab === 'salaries' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Oy:</label>
                <input type="month" value={salaryMonth} onChange={e => setSalaryMonth(e.target.value)}
                  className="px-3 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-colors" />
              </div>
              {salaryLoading ? <div className="p-12 text-center text-gray-400 font-bold">Yuklanmoqda...</div> :
              !salaryData || salaryData.teachers.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
                  <GraduationCap className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 font-bold">Faol o'qituvchilar topilmadi.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {salaryData.teachers.map(t => {
                    const isExpanded = expandedTeacher === t.id;
                    const total = (parseFloat(String(t.calculated_salary)) || 0);
                    return (
                      <div key={t.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                        <div className="flex items-center gap-4 p-5">
                          <div className="h-11 w-11 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-700 dark:text-violet-400 font-black text-lg shrink-0">{t.display_name?.[0]?.toUpperCase() || '?'}</div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white">{t.display_name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">{t.groups.length} ta guruh · {t.salary_share}% ulush</span>
                              {(() => {
                                const calculated = parseFloat(String(t.calculated_salary)) || 0;
                                const paid = parseFloat(String(t.already_paid)) || 0;
                                const remaining = calculated - paid;
                                if (calculated > 0) {
                                  if (paid === 0) {
                                    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">⏳ To'lanmagan</span>;
                                  } else if (remaining > 0) {
                                    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/40 animate-pulse">⚠️ Qisman to'langan (Yana {fmt(remaining)} UZS to'lanishi kerak)</span>;
                                  } else {
                                    return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">✅ To'liq to'langan</span>;
                                  }
                                }
                                return null;
                              })()}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">Yig'ilgan</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{fmt(t.total_income_from_groups)}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500 mb-0.5">Hisoblangan</p>
                            <p className="text-lg font-black text-violet-700 dark:text-violet-400">{fmt(t.calculated_salary)}</p>
                          </div>
                          <div className="text-right shrink-0 pr-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-0.5">To'langan</p>
                            <p className="text-lg font-black text-emerald-700 dark:text-emerald-400">{fmt(t.already_paid || 0)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => setExpandedTeacher(isExpanded ? null : t.id)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                            <button onClick={() => { setSelectedTeacher(t); setPayBase(total > 0 ? String(Math.round(total)) : ''); setPayBonus(''); setPayNotes(''); setShowSalaryModal(true); }}
                              className="px-4 py-2 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm transition-colors">
                              To'lash
                            </button>
                          </div>
                        </div>
                        {isExpanded && t.groups.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-slate-800 px-5 py-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Guruhlar (shu oyda)</p>
                            <div className="space-y-2">
                              {t.groups.map(g => (
                                <div key={g.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3.5 border-b border-gray-100 dark:border-slate-800/50 last:border-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-gray-900 dark:text-white truncate">{g.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                                      {g.student_count} ta faol o'quvchi · {fmt(g.monthly_fee)} UZS/oy
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-6 shrink-0">
                                    <div className="text-right">
                                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Jami Yozilgan (Billed)</p>
                                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">{fmt(g.month_fees_charged)} UZS</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider mb-0.5">Yig'ilgan To'lov (Collected)</p>
                                      <p className="text-sm font-black text-green-600 dark:text-green-400">{fmt(g.month_payments_received)} UZS</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Pay Salary Modal */}
      {showSalaryModal && selectedTeacher && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Oylik to'lash</h3>
              <button onClick={() => setShowSalaryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl transition-colors"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-5 p-4 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 rounded-xl">
              <p className="text-sm font-bold text-violet-800 dark:text-violet-300">{selectedTeacher.display_name}</p>
              <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">{salaryMonth} · Hisoblangan: {fmt(selectedTeacher.calculated_salary)} UZS</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Asosiy miqdor (UZS)</label>
                <input type="number" min="0" value={payBase} onChange={e => setPayBase(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Bonus (ixtiyoriy)</label>
                <input type="number" min="0" value={payBonus} onChange={e => setPayBonus(e.target.value)} placeholder="0" className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all" />
              </div>
              {(parseFloat(payBonus) > 0) && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl">
                  <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Jami: {fmt((parseFloat(payBase)||0)+(parseFloat(payBonus)||0))} UZS</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Izoh (ixtiyoriy)</label>
                <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-violet-500 transition-all" />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">⚡ Oylik to'langanda xarajat avtomatik kiritiladi (kategoriya: Oylik)</p>
            </div>
            <div className="flex justify-end gap-3 pt-5">
              <button type="button" onClick={() => setShowSalaryModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
              <button onClick={handlePaySalary} disabled={paying} className="px-5 py-2.5 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm transition-colors disabled:opacity-50">{paying ? 'Saqlanmoqda...' : 'To\'lash'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{tab === 'expenses' ? 'Xarajat kiritish' : debtorQuickPay ? `To'lov — ${debtorQuickPay.full_name}` : 'To\'lov qabul qilish'}</h3>
              <button onClick={() => { setShowModal(false); setDebtorQuickPay(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            {tab === 'payments' || debtorQuickPay ? (
              <form onSubmit={handlePaySubmit} className="space-y-4">
                {!debtorQuickPay && (
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">O'quvchi</label>
                    <select required value={payForm.student} onChange={e => {
                      const sid = e.target.value;
                      const sObj = students.find(s => String(s.id) === String(sid));
                      const defaultC = sObj?.class_details && sObj.class_details.length > 0 ? String(sObj.class_details[0].id) : '';
                      setPayForm({...payForm, student: sid, course_class: defaultC});
                    }} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                      <option value="">— Tanlang —</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                )}

                {(() => {
                  const sId = debtorQuickPay?.id || payForm.student;
                  const selectedStudentObj = students.find(s => String(s.id) === String(sId));
                  if (!selectedStudentObj) return null;
                  return (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Guruh (To'lov qilinayotgan guruh)</label>
                      <select value={payForm.course_class} onChange={e => setPayForm({...payForm, course_class: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                        <option value="">— Umumiy to'lov (Hech qaysi guruhga bog'lanmagan) —</option>
                        {selectedStudentObj.class_details?.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({fmt(c.monthly_fee)} UZS)</option>
                        ))}
                      </select>
                    </div>
                  );
                })()}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Miqdor</label><input type="number" min="0" required value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Usul</label>
                    <select value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                      {METHODS.map(m => <option key={m} value={m}>{METHOD_LABELS[m] || m}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Sana</label><input type="date" required value={payForm.date} onChange={e => setPayForm({...payForm, date: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" /></div>
                {debtorQuickPay && <p className="text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 p-3 rounded-xl"><strong>To'liq miqdor avtomatik kiritildi.</strong> Qisman to'lov bo'lsa o'zgartirishingiz mumkin.</p>}
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setShowModal(false); setDebtorQuickPay(null); }} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors">To'lovni saqlash</button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleExpSubmit} className="space-y-4">
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Sarlavha</label><input type="text" required value={expForm.title} onChange={e => setExpForm({...expForm, title: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Miqdor</label><input type="number" min="0" required value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Kategoriya</label>
                    <select value={expForm.category} onChange={e => setExpForm({...expForm, category: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
                    </select>
                  </div>
                </div>
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Sana</label><input type="date" required value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all" /></div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                  <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors">Xarajatni saqlash</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Finance;

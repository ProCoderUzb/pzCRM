import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { Plus, TrendingUp, TrendingDown, DollarSign, AlertCircle, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Types
interface Payment { id: number; student_name: string; student: number; amount: string; date: string; method: string; notes: string; }
interface Expense { id: number; title: string; amount: string; date: string; category: string; }
interface Student { id: number; full_name: string; balance: number; }
interface Summary { total_income: number; total_expenses: number; net_profit: number; income_trend: { month: string; total: number }[]; expense_trend: { month: string; total: number }[]; by_category: { category: string; total: number }[]; }

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];
const METHOD_LABELS: Record<string, string> = { CASH: 'Naqd', CARD: 'Karta', TRANSFER: 'O\'tkazma', OTHER: 'Boshqa' };
const CATEGORIES = ['SALARY', 'RENT', 'UTILITIES', 'SUPPLIES', 'MARKETING', 'OTHER'];
const CATEGORY_LABELS: Record<string, string> = { SALARY: 'Oylik', RENT: 'Ijara', UTILITIES: 'Kommunal', SUPPLIES: 'Jihozlar', MARKETING: 'Marketing', OTHER: 'Boshqa' };
const fmt = (n: number) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

const Finance: React.FC = () => {
  const perms = usePermissions();
  const [tab, setTab] = useState<'payments' | 'expenses' | 'debtors'>(
    perms.canViewFinancialStats ? 'payments' : 'debtors'
  );
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Payment form
  const [payForm, setPayForm] = useState({ student: '', amount: '', date: today(), method: 'CASH', notes: '' });
  // Pre-fill from debtors tab "Record Payment" button
  const [debtorQuickPay, setDebtorQuickPay] = useState<Student | null>(null);
  // Expense form
  const [expForm, setExpForm] = useState({ title: '', amount: '', date: today(), category: 'OTHER', notes: '' });

  const fetchAll = useCallback(async () => {
    try {
      const reqs: Promise<any>[] = [api.get('students/')];
      if (perms.canViewFinancialStats) {
        reqs.push(api.get('finance/payments/'), api.get('finance/expenses/'), api.get('finance/summary/'));
        const [s, p, e, sum] = await Promise.all(reqs);
        setStudents(s.data); setPayments(p.data); setExpenses(e.data); setSummary(sum.data);
      } else {
        const [s] = await Promise.all(reqs);
        setStudents(s.data);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [perms.canViewFinancialStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Debtors: students with negative balance, sorted worst first
  const debtors = students.filter(s => s.balance < 0).sort((a, b) => a.balance - b.balance);

  const openQuickPay = (s: Student) => {
    setDebtorQuickPay(s);
    setPayForm({ student: String(s.id), amount: String(Math.abs(s.balance)), date: today(), method: 'CASH', notes: '' });
    setTab('payments');
    setShowModal(true);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('finance/payments/', payForm);
      setShowModal(false);
      setDebtorQuickPay(null);
      setPayForm({ student: '', amount: '', date: today(), method: 'CASH', notes: '' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  const handleExpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('finance/expenses/', expForm);
      setShowModal(false);
      setExpForm({ title: '', amount: '', date: today(), category: 'OTHER', notes: '' });
      fetchAll();
    } catch (err) { console.error(err); }
  };

  // Bar chart data
  const barData = (() => {
    const m = new Map<string, { month: string; income: number; expenses: number }>();
    summary?.income_trend.forEach(d => m.set(d.month, { month: d.month, income: d.total, expenses: 0 }));
    summary?.expense_trend.forEach(d => {
      const e = m.get(d.month);
      if (e) e.expenses = d.total;
      else m.set(d.month, { month: d.month, income: 0, expenses: d.total });
    });
    return Array.from(m.values()).sort((a, b) => a.month.localeCompare(b.month));
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Moliya</h1>
          {!perms.canViewFinancialStats && <p className="text-sm font-bold text-amber-600 dark:text-amber-500 mt-1">👁 Faqat qarzdorlarni ko'rish va to'lov qabul qilish mumkin.</p>}
        </div>
        <button onClick={() => setShowModal(true)} className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors">
          <Plus className="h-4 w-4 mr-2" />{tab === 'expenses' ? 'Xarajat kiritish' : 'To\'lov qabul qilish'}
        </button>
      </div>

      {/* KPI Cards — CEO only */}
      {perms.canViewFinancialStats && summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 flex items-center gap-4 shadow-sm transition-colors">
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-xl shadow-sm"><TrendingUp className="h-6 w-6 text-green-600 dark:text-green-500" /></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Kirim</p><p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(summary.total_income)}</p></div>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 flex items-center gap-4 shadow-sm transition-colors">
            <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl shadow-sm"><TrendingDown className="h-6 w-6 text-red-600 dark:text-red-500" /></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-0.5">Chiqim</p><p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(summary.total_expenses)}</p></div>
          </div>
          <div className={`rounded-2xl border p-6 flex items-center gap-4 shadow-sm transition-colors ${summary.net_profit >= 0 ? 'bg-green-50 dark:bg-slate-800/50 border-green-200 dark:border-slate-700/50' : 'bg-red-50 dark:bg-slate-800/50 border-red-200 dark:border-slate-700/50'}`}>
            <div className={`p-3 rounded-xl shadow-sm ${summary.net_profit >= 0 ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'}`}><DollarSign className={`h-6 w-6 ${summary.net_profit >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`} /></div>
            <div><p className={`text-xs font-bold uppercase tracking-wider mb-0.5 ${summary.net_profit >= 0 ? 'text-green-700 dark:text-green-500' : 'text-red-700 dark:text-red-500'}`}>Sof foyda</p><p className={`text-2xl font-black ${summary.net_profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{fmt(summary.net_profit)}</p></div>
          </div>
        </div>
      )}

      {/* Charts — CEO only */}
      {perms.canViewFinancialStats && summary && (barData.length > 0 || summary.by_category.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          {barData.length > 0 && (
            <div className="xl:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">Kirim va Chiqim (Oylik)</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                  <YAxis tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-500 dark:text-gray-400" />
                  <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ backgroundColor: 'var(--tw-colors-slate-800)', borderColor: 'var(--tw-colors-slate-700)', color: '#fff', borderRadius: '0.75rem' }} />
                  <Legend wrapperStyle={{ paddingTop: '10px' }} />
                  <Bar dataKey="income" name="Kirim" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" name="Chiqim" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {summary.by_category.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-colors flex flex-col items-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6 w-full">Kategoriyalar bo'yicha chiqim</h2>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={summary.by_category} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}>
                    {summary.by_category.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmt(v)} contentStyle={{ backgroundColor: 'var(--tw-colors-slate-800)', borderColor: 'var(--tw-colors-slate-700)', color: '#fff', borderRadius: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b-2 border-gray-100 dark:border-slate-800">
        <nav className="-mb-0.5 flex gap-8">
          {([
            ...(perms.canViewFinancialStats ? [['payments', '💰 To\'lovlar'], ['expenses', '📋 Xarajatlar']] : []),
            ['debtors', '⚠️ Qarzdorlar'],
          ] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`py-3.5 text-sm font-bold border-b-2 transition-colors ${tab === t ? (t === 'debtors' ? 'border-red-500 text-red-700 dark:text-red-500' : 'border-emerald-600 text-emerald-700 dark:text-emerald-500') : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
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
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{p.student_name}</td>
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
                    {expenses.map(ex => (
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
                                <div className="h-10 w-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-700 dark:text-red-400 font-black text-sm shadow-sm">{s.full_name[0]?.toUpperCase()}</div>
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
        </>
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
                    <select required value={payForm.student} onChange={e => setPayForm({...payForm, student: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all">
                      <option value="">— Tanlang —</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                    </select>
                  </div>
                )}
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

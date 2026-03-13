import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';
import {
  BarChart2, Download, Upload, Clock, FileSpreadsheet,
  Search, Filter
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CourseClass { id: number; name: string; }
interface StudentStat { student: string; total: number; present: number; absent: number; late: number; excused: number; rate: number; }
interface ByStatus { status: string; count: number; }
interface AuditEntry { id: number; timestamp: string; user: string; action: string; model: string; object_repr: string; changes: Record<string, { old: string; new: string }>; }

const COLORS: Record<string, string> = {
  PRESENT: '#10b981', ABSENT: '#ef4444', LATE: '#f59e0b', EXCUSED: '#6366f1', HALF: '#f97316', LEAVE: '#06b6d4',
};
const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-800', UPDATE: 'bg-blue-100 text-blue-800', DELETE: 'bg-red-100 text-red-800',
};

const today = () => new Date().toISOString().slice(0, 10);
const monthAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 10); };

const Reports: React.FC = () => {
  const [tab, setTab] = useState<'attendance' | 'export' | 'import' | 'history'>('attendance');

  // ── Attendance Report ──────────────────────────────────────────────────────
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [attClass, setAttClass] = useState('');
  const [attFrom, setAttFrom] = useState(monthAgo());
  const [attTo, setAttTo] = useState(today());
  const [attStats, setAttStats] = useState<{ by_status: ByStatus[]; student_stats: StudentStat[]; total_records: number } | null>(null);
  const [attLoading, setAttLoading] = useState(false);

  useEffect(() => { api.get('classes/').then(r => setClasses(r.data)).catch(console.error); }, []);

  const loadAttStats = useCallback(async () => {
    setAttLoading(true);
    const params = new URLSearchParams({ from: attFrom, to: attTo });
    if (attClass) params.set('class', attClass);
    try { const r = await api.get(`reports/attendance-stats/?${params}`); setAttStats(r.data); }
    catch (e) { console.error(e); }
    finally { setAttLoading(false); }
  }, [attClass, attFrom, attTo]);

  useEffect(() => { if (tab === 'attendance') loadAttStats(); }, [tab, loadAttStats]);

  // ── Audit History ──────────────────────────────────────────────────────────
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [histSearch, setHistSearch] = useState('');
  const [histModel, setHistModel] = useState('');
  const [histAction, setHistAction] = useState('');
  const [histLoading, setHistLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    const params = new URLSearchParams();
    if (histSearch) params.set('search', histSearch);
    if (histModel) params.set('model', histModel);
    if (histAction) params.set('action', histAction);
    try { const r = await api.get(`reports/history/?${params}`); setHistory(r.data); }
    catch (e) { console.error(e); }
    finally { setHistLoading(false); }
  }, [histSearch, histModel, histAction]);

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

  // ── Import ─────────────────────────────────────────────────────────────────
  const [importModel, setImportModel] = useState<'students' | 'leads'>('students');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<{ created?: number; skipped?: number; errors?: string[]; error?: string } | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', importFile);
    try {
      const r = await api.post(`reports/import/${importModel}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(r.data);
    } catch (e: any) { setImportResult({ error: e.response?.data?.error || 'Import failed.' }); }
    finally { setImporting(false); }
  };

  // Download with auth header
  const downloadExport = async (endpoint: string, filename: string) => {
    try {
      const r = await api.get(`reports/export/${endpoint}/`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const EXPORTS = [
    { key: 'students',          label: 'O\'quvchilar',        file: 'students.xlsx',          icon: '👩‍🎓', color: 'bg-blue-50 dark:bg-slate-800/50 border-blue-200 dark:border-slate-700/50 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-slate-700' },
    { key: 'leads',             label: 'Mijozlar (Leads)',    file: 'leads.xlsx',             icon: '📋', color: 'bg-green-50 dark:bg-slate-800/50 border-green-200 dark:border-slate-700/50 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-slate-700' },
    { key: 'payments',          label: 'To\'lovlar',          file: 'payments.xlsx',          icon: '💰', color: 'bg-emerald-50 dark:bg-slate-800/50 border-emerald-200 dark:border-slate-700/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700' },
    { key: 'expenses',          label: 'Xarajatlar',          file: 'expenses.xlsx',          icon: '💸', color: 'bg-red-50 dark:bg-slate-800/50 border-red-200 dark:border-slate-700/50 text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-slate-700' },
    { key: 'attendance',        label: 'Davomat',             file: 'attendance.xlsx',        icon: '📅', color: 'bg-purple-50 dark:bg-slate-800/50 border-purple-200 dark:border-slate-700/50 text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-slate-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hisobotlar va Ma'lumotlar</h1>
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">Davomat tahlili, eksport/import va o'zgarishlar tarixi.</p>
      </div>

      {/* Tabs */}
      <div className="border-b-2 border-gray-100 dark:border-slate-800">
        <nav className="-mb-0.5 flex flex-wrap gap-8">
          {([
            ['attendance', BarChart2,       '📊 Davomat hisoboti'],
            ['export',     Download,        '⬇️ Eksport'],
            ['import',     Upload,          '⬆️ Import'],
            ['history',    Clock,           '🕐 O\'zgarishlar tarixi'],
          ] as const).map(([t, , label]) => (
            <button key={t} onClick={() => setTab(t as any)}
              className={`py-3.5 text-sm font-bold border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Attendance Report ──────────────────────────────────────────────── */}
      {tab === 'attendance' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 items-end shadow-sm transition-colors">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Guruh</label>
              <select value={attClass} onChange={e => setAttClass(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
                <option value="">Barcha guruhlar</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Dan</label>
              <input type="date" value={attFrom} onChange={e => setAttFrom(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Gacha</label>
              <input type="date" value={attTo} onChange={e => setAttTo(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
            </div>
            <button onClick={loadAttStats} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors">
              <Filter className="h-4 w-4" /> Qo'llash
            </button>
          </div>

          {attLoading ? <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-bold">Statistika yuklanmoqda...</div>
          : !attStats ? null
          : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 text-center shadow-sm transition-colors">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Jami yozuvlar</p>
                  <p className="text-3xl font-black text-gray-900 dark:text-white">{attStats.total_records}</p>
                </div>
                {attStats.by_status.map(s => (
                  <div key={s.status} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-5 text-center shadow-sm transition-colors">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">{s.status}</p>
                    <p className="text-3xl font-black" style={{ color: COLORS[s.status] || '#6b7280' }}>{s.count}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {attStats.by_status.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-colors text-center">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">Davomat taqsimoti</h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={attStats.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90}
                          label={({ status, percent }: any) => `${status} ${(percent * 100).toFixed(0)}%`} labelLine={false} style={{ fontSize: '12px', fontWeight: 'bold' }}>
                          {attStats.by_status.map((s, i) => <Cell key={i} fill={COLORS[s.status] || '#6b7280'} />)}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--tw-colors-slate-800)', borderColor: 'var(--tw-colors-slate-700)', color: '#fff', borderRadius: '0.75rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {attStats.student_stats.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm transition-colors">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">O'quvchilar bo'yicha davomat</h2>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={attStats.student_stats} layout="vertical">
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-400" unit="%" />
                        <YAxis type="category" dataKey="student" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-300" width={110} />
                        <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ backgroundColor: 'var(--tw-colors-slate-800)', borderColor: 'var(--tw-colors-slate-700)', color: '#fff', borderRadius: '0.75rem' }} />
                        <Bar dataKey="rate" name="Davomat %" fill="#6366f1" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Per-student table */}
              {attStats.student_stats.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                  <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800/60">
                    <thead className="bg-gray-50 dark:bg-slate-800/50"><tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">O'quvchi</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Jami</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-green-600 dark:text-green-500 uppercase tracking-wider">Bor</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-red-600 dark:text-red-500 uppercase tracking-wider">Yo'q</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-wider">Kechikgan</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Davomat</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                      {[...attStats.student_stats].sort((a, b) => b.rate - a.rate).map((s, i) => (
                        <tr key={i} className={`${s.rate < 70 ? 'bg-red-50/50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-slate-800/30'} transition-colors`}>
                          <td className="px-6 py-3.5 text-sm font-bold text-gray-900 dark:text-white">{s.student}</td>
                          <td className="px-6 py-3.5 text-sm font-bold text-center text-gray-500 dark:text-gray-400">{s.total}</td>
                          <td className="px-6 py-3.5 text-sm text-center font-black text-green-700 dark:text-green-500">{s.present}</td>
                          <td className="px-6 py-3.5 text-sm text-center font-black text-red-700 dark:text-red-500">{s.absent}</td>
                          <td className="px-6 py-3.5 text-sm text-center font-black text-yellow-700 dark:text-yellow-500">{s.late}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-md bg-white border dark:bg-transparent shadow-sm text-xs font-black tracking-wider ${s.rate >= 80 ? 'text-green-700 border-green-200 dark:border-green-800/40 dark:text-green-400' : s.rate >= 60 ? 'text-yellow-700 border-yellow-200 dark:border-yellow-800/40 dark:text-yellow-400' : 'text-red-700 border-red-200 dark:border-red-800/40 dark:text-red-400'}`}>{s.rate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Export ────────────────────────────────────────────────────────────── */}
      {tab === 'export' && (
        <div className="space-y-5">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Ma'lumotlarni Excel (.xlsx) formatida yuklab olish uchun bosing.</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {EXPORTS.map(exp => (
              <button key={exp.key} onClick={() => downloadExport(exp.key, exp.file)}
                className={`flex items-center gap-4 px-6 py-5 rounded-2xl border text-sm font-bold transition-all shadow-sm ${exp.color}`}>
                <span className="text-3xl">{exp.icon}</span>
                <div className="text-left flex-1">
                  <p className="text-base">{exp.label}</p>
                  <p className="text-xs font-medium opacity-70 flex items-center gap-1.5 mt-1"><FileSpreadsheet className="h-3.5 w-3.5" />{exp.file}</p>
                </div>
                <Download className="h-5 w-5 ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Import ────────────────────────────────────────────────────────────── */}
      {tab === 'import' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 rounded-2xl p-5 text-sm text-indigo-800 dark:text-indigo-300 shadow-sm leading-relaxed">
            <strong className="block mb-1.5 font-bold uppercase tracking-wider text-xs">📌 Format talablari:</strong> Fayl tuzilishi eksport qilingan faylga to'liq mos kelishi kerak. Eng yaxshisi joriy ma'lumotlarni qolip (shablon) sifatida yuklab olib ustida ishlang. Tizimda mavjud bo'lgan ma'lumotlar o'tkazib yuboriladi.
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 space-y-5 shadow-sm transition-colors">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">Ma'lumot turi</label>
              <div className="flex gap-3">
                {(['students', 'leads'] as const).map(m => (
                  <button key={m} onClick={() => setImportModel(m)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-colors ${importModel === m ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'}`}>
                    {m === 'students' ? '👩‍🎓 O\'quvchilar' : '📋 Mijozlar'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2.5">.xlsx Faylni tanlash</label>
              <div className="border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-2xl p-10 text-center hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer relative">
                <Upload className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                <input type="file" accept=".xlsx,.xls" onChange={e => setImportFile(e.target.files?.[0] || null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {!importFile ? <p className="text-sm font-bold text-gray-600 dark:text-gray-400">Faylni tanlash uchun bosing</p>
                : <p className="text-sm font-bold text-green-600 dark:text-green-500">✅ {importFile.name}</p>}
              </div>
            </div>
            <button onClick={handleImport} disabled={!importFile || importing}
              className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-3 shadow-sm">
              <Upload className="h-5 w-5" />{importing ? 'Import qilinmoqda...' : `Import: ${importModel === 'students' ? 'O\'quvchilar' : 'Mijozlar'}`}
            </button>

            {importResult && (
              <div className={`p-5 rounded-xl text-sm font-medium border shadow-sm ${importResult.error ? 'bg-red-50 dark:bg-red-900/10 text-red-800 dark:text-red-400 border-red-200 dark:border-red-900/30' : 'bg-green-50 dark:bg-green-900/10 text-green-800 dark:text-green-400 border-green-200 dark:border-green-900/30'}`}>
                {importResult.error ? (
                  <p className="font-bold">❌ {importResult.error}</p>
                ) : (
                  <>
                    <p className="mb-2">✅ <strong>{importResult.created}</strong> ta yozuv yaratildi. <strong>{importResult.skipped}</strong> tasi o'tkazib yuborildi.</p>
                    {importResult.errors && importResult.errors.length > 0 && (
                      <details className="mt-3"><summary className="cursor-pointer font-bold text-xs uppercase tracking-wider bg-red-100/50 dark:bg-red-900/40 inline-block px-3 py-1.5 rounded-lg">{importResult.errors.length} ta qatorda xatolik</summary>
                        <ul className="mt-2 space-y-1.5 p-3 bg-white/50 dark:bg-slate-900/50 rounded-lg">{importResult.errors.map((e, i) => <li key={i} className="text-xs font-mono text-red-600 dark:text-red-400">• {e}</li>)}</ul>
                      </details>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History ───────────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-wrap gap-4 shadow-sm transition-colors">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
              <input type="text" placeholder="Foydalanuvchi yoki obyekt ma'lumoti orqali izlash..." value={histSearch} onChange={e => setHistSearch(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono" />
            </div>
            <select value={histModel} onChange={e => setHistModel(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
              <option value="">Barcha modellar</option>
              {['Student', 'Lead', 'CourseClass', 'Payment', 'Expense', 'Attendance', 'User'].map(m => <option key={m}>{m}</option>)}
            </select>
            <select value={histAction} onChange={e => setHistAction(e.target.value)} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all">
              <option value="">Barcha amallar</option>
              <option value="CREATE">Yaratildi</option>
              <option value="UPDATE">Yangilandi</option>
              <option value="DELETE">O'chirildi</option>
            </select>
            <button onClick={loadHistory} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm flex items-center gap-2 transition-colors">
              <Filter className="h-4 w-4" /> Filtrlash
            </button>
          </div>

          {histLoading ? <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-bold">Tarix yuklanmoqda...</div>
          : history.length === 0 ? (
            <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors"><Clock className="h-12 w-12 text-gray-300 dark:text-slate-700 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400 font-bold">O'zgarishlar tarixi bo'sh.</p></div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800/60">
                <thead className="bg-gray-50 dark:bg-slate-800/50"><tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vaqt</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Foydalanuvchi</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amal</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Obyekt</th>
                  <th className="px-6 py-4"></th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {history.map(entry => (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>
                        <td className="px-6 py-4 text-xs font-mono font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{entry.timestamp}</td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white">{entry.user}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border shadow-sm ${ACTION_COLORS[entry.action] || 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-400'}`}>{entry.action}</span>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-slate-800 px-2 py-0.5 rounded mr-2 text-gray-500">{entry.model}</span>{entry.object_repr}
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-400">
                          {Object.keys(entry.changes).length > 0 && <span className="text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider mx-auto text-[10px] bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">▼ O'zgarishlar</span>}
                        </td>
                      </tr>
                      {expandedRow === entry.id && Object.keys(entry.changes).length > 0 && (
                        <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                          <td colSpan={5} className="px-10 py-5 border-t border-indigo-100 dark:border-indigo-900/30">
                            <div className="space-y-2">
                              {Object.entries(entry.changes).map(([field, { old: o, new: n }]) => (
                                <div key={field} className="flex items-center gap-3 text-sm font-mono">
                                  <span className="font-bold text-indigo-800 dark:text-indigo-300 w-32 shrink-0">{field}:</span>
                                  <span className="text-red-600 dark:text-red-400 line-through bg-red-100/50 dark:bg-red-900/20 px-1 rounded">{o || '—'}</span>
                                  <span className="text-indigo-300 dark:text-indigo-700 font-bold">→</span>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/50 dark:bg-emerald-900/20 px-1 rounded">{n || '—'}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Reports;

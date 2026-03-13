import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import {
  ArrowLeft, Users, BookOpen, Clock, DoorOpen, DollarSign,
  ClipboardCheck, Zap, UserMinus, UserPlus, X, Save
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ClassMeta {
  id: number; name: string; subject_name: string; teacher_name: string;
  room_name: string; days: string; start_time: string; end_time: string;
  capacity: number; student_count: number; monthly_fee: string;
}
interface EnrolledStudent { id: number; full_name: string; balance: number; is_active: boolean; }
interface AttSummaryRow {
  student_id: number; student: string;
  present: number; absent: number; total: number; rate: number;
  daily: Record<string, string>;
}
interface DailyStat { date: string; present: number; absent: number; }
interface DetailData {
  meta: ClassMeta;
  students: EnrolledStudent[];
  attendance_dates: string[];
  attendance_summary: AttSummaryRow[];
  daily_stats: DailyStat[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) => Number(n).toLocaleString();

const STATUS_CELL: Record<string, string> = {
  PRESENT: 'bg-green-500 text-white',
  ABSENT:  'bg-red-500   text-white',
  '':      'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600',
};
const STATUS_LABEL: Record<string, string> = { PRESENT: '✓', ABSENT: '✗', '': '–' };

const StatusPill: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => (
  <div className="flex gap-2">
    {(['PRESENT', 'ABSENT'] as const).map(v => (
      <button key={v} onClick={() => onChange(v)}
        className={`px-4 py-1.5 rounded-full text-sm font-bold border-2 transition-all ${
          value === v
            ? (v === 'PRESENT' ? 'bg-green-500 text-white border-transparent shadow' : 'bg-red-500 text-white border-transparent shadow')
            : 'border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
        }`}>
        {v === 'PRESENT' ? 'Present' : 'Absent'}
      </button>
    ))}
  </div>
);

// ── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'info',       Icon: BookOpen,       label: 'Ma\'lumot' },
  { key: 'students',   Icon: Users,          label: 'O\'quvchilar' },
  { key: 'attendance', Icon: ClipboardCheck, label: 'Davomat' },
] as const;

// ── Main Component ────────────────────────────────────────────────────────────
const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();

  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'info' | 'students' | 'attendance'>('info');

  // Enroll modal
  const [showEnroll, setShowEnroll] = useState(false);
  const [allStudents, setAllStudents] = useState<{ id: number; full_name: string }[]>([]);
  const [enrollSearch, setEnrollSearch] = useState('');

  // Charge modal
  const [showCharge, setShowCharge] = useState(false);
  const [discounts, setDiscounts] = useState<Record<number, string>>({});
  const [chargeResult, setChargeResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [charging, setCharging] = useState(false);

  // Attendance taking
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attRecs, setAttRecs] = useState<Record<number, any>>({});
  const [attSaving, setAttSaving] = useState(false);
  const [attSaved, setAttSaved] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`classes/${id}/detail/`);
      setData(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  // Load attendance records for the selected date
  useEffect(() => {
    if (!id || !data) return;
    api.get(`attendance/?course_class=${id}&date=${attDate}`).then(r => {
      const recs: Record<number, any> = {};
      data.students.forEach(s => {
        const ex = r.data.find((a: any) => a.student === s.id);
        recs[s.id] = ex ?? { student: s.id, course_class: +id, date: attDate, status: 'PRESENT' };
      });
      setAttRecs(recs);
    }).catch(console.error);
  }, [id, attDate, data?.students.length]);

  const handleSaveAttendance = async () => {
    setAttSaving(true);
    try {
      await Promise.all(Object.values(attRecs).map((r: any) =>
        r.id ? api.patch(`attendance/${r.id}/`, { status: r.status }) : api.post('attendance/', r)
      ));
      setAttSaved(true);
      setTimeout(() => setAttSaved(false), 2500);
      loadDetail(); // refresh history
    } catch (e) { console.error(e); } finally { setAttSaving(false); }
  };

  const handleEnroll = async (sid: number) => {
    await api.post(`classes/${id}/enroll/`, { student_id: sid });
    setShowEnroll(false);
    loadDetail();
  };
  const handleUnenroll = async (sid: number) => {
    await api.post(`classes/${id}/unenroll/`, { student_id: sid });
    loadDetail();
  };

  const openEnroll = async () => {
    setShowEnroll(true);
    const r = await api.get('students/?is_active=true');
    setAllStudents(r.data);
  };

  const handleCharge = async () => {
    if (!data) return;
    setCharging(true);
    const dp: Record<string, number> = {};
    Object.entries(discounts).forEach(([k, v]) => { const n = parseFloat(v); if (n > 0) dp[k] = n; });
    try {
      const res = await api.post(`classes/${id}/charge/`, { discounts: dp });
      setChargeResult({ ok: true, msg: `✅ Charged ${res.data.students_charged} students. Teacher payout: ${fmt(res.data.teacher_payout)}` });
      loadDetail();
    } catch (e: any) {
      setChargeResult({ ok: false, msg: `❌ ${e.response?.data?.error || 'Charge failed.'}` });
    } finally { setCharging(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!data) return <div className="text-center p-12 text-gray-400 dark:text-gray-500 font-medium">Guruh topilmadi.</div>;

  const { meta, students, attendance_summary, attendance_dates } = data;
  const enrolledIds = new Set(students.map(s => s.id));
  const filteredAdd = allStudents.filter(s =>
    !enrolledIds.has(s.id) && s.full_name.toLowerCase().includes(enrollSearch.toLowerCase())
  );

  // Present / Absent summary counts for today
  const presentCount = Object.values(attRecs).filter((r: any) => r.status === 'PRESENT').length;
  const absentCount  = Object.values(attRecs).filter((r: any) => r.status === 'ABSENT').length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/classes')}
          className="p-2 rounded-xl border border-gray-200 dark:border-slate-800 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-gray-400 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{meta.name}</h1>
          <p className="text-sm text-purple-600 dark:text-purple-400 font-bold">{meta.subject_name}</p>
        </div>
        {perms.canChargeStudents && parseFloat(meta.monthly_fee) > 0 && (
          <button onClick={() => { setShowCharge(true); setChargeResult(null); setDiscounts({}); }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold shadow-sm transition-colors">
            <Zap className="h-4 w-4" /> To'lov
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-slate-800">
        <nav className="-mb-px flex gap-2">
          {TABS.map(({ key, Icon, label }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${tab === key ? 'border-purple-600 dark:border-purple-500 text-purple-700 dark:text-purple-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-700'}`}>
              <Icon className="h-4 w-4" />
              {key === 'students' ? `${label} (${students.length})` : label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── INFO TAB ──────────────────────────────────────────────────────── */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-5 transition-colors">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Guruh tafsilotlari</h2>
            <div className="space-y-4">
              {meta.teacher_name && (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-900/30"><Users className="h-5 w-5 text-purple-600 dark:text-purple-400" /></div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">O'qituvchi</p><p className="text-sm font-bold text-gray-900 dark:text-white">{meta.teacher_name}</p></div>
                </div>
              )}
              {meta.room_name && (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30"><DoorOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Xona</p><p className="text-sm font-bold text-gray-900 dark:text-white">{meta.room_name}</p></div>
                </div>
              )}
              {meta.days && (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-900/30"><Clock className="h-5 w-5 text-teal-600 dark:text-teal-400" /></div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Jadval</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{meta.days} · {meta.start_time?.slice(0, 5)}–{meta.end_time?.slice(0, 5)}</p>
                  </div>
                </div>
              )}
              {parseFloat(meta.monthly_fee) > 0 && (
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30"><DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
                  <div><p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Oylik to'lov</p><p className="text-sm font-black text-emerald-700 dark:text-emerald-500">{fmt(parseFloat(meta.monthly_fee))}</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 content-start">
            <div className="bg-purple-50 dark:bg-slate-800/50 rounded-2xl border border-purple-100 dark:border-slate-700/50 p-5 text-center transition-colors">
              <p className="text-3xl font-black text-purple-700 dark:text-purple-400">{students.length}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-500 dark:text-purple-500 mt-1.5">O'quvchilar</p>
            </div>
            <div className="bg-blue-50 dark:bg-slate-800/50 rounded-2xl border border-blue-100 dark:border-slate-700/50 p-5 text-center transition-colors">
              <p className="text-3xl font-black text-blue-700 dark:text-blue-400">{meta.capacity}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-500 dark:text-blue-500 mt-1.5">Sig'im</p>
            </div>
            <div className="bg-red-50 dark:bg-slate-800/50 rounded-2xl border border-red-100 dark:border-slate-700/50 p-5 text-center transition-colors">
              <p className="text-3xl font-black text-red-600 dark:text-red-400">{students.filter(s => s.balance < 0).length}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-red-500 dark:text-red-500 mt-1.5">Qarzdorlar</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-700/50 p-5 text-center transition-colors">
              <p className="text-3xl font-black text-gray-600 dark:text-gray-300">{attendance_dates.length}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mt-1.5">Darslar (30 kun)</p>
            </div>
          </div>
        </div>
      )}

      {/* ── STUDENTS TAB ──────────────────────────────────────────────────── */}
      {tab === 'students' && (
        <div className="space-y-4">
          {perms.canEditClasses && (
            <div className="flex justify-end">
              <button onClick={openEnroll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold shadow-sm transition-colors">
                <UserPlus className="h-4 w-4" /> Qo'shish
              </button>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
            {students.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 font-medium">O'quvchilar yo'q.</div>
            ) : (
              <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">O'quvchi</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balans</th>
                    <th className="px-5 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holat</th>
                    {perms.canEditClasses && <th className="px-5 py-3"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {students.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold text-sm shrink-0">
                            {s.full_name[0]?.toUpperCase()}
                          </div>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{s.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`text-sm font-black ${s.balance < 0 ? 'text-red-600 dark:text-red-500' : 'text-green-600 dark:text-green-500'}`}>{fmt(s.balance)}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${s.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700'}`}>
                          {s.is_active ? 'Faol' : 'Nofaol'}
                        </span>
                      </td>
                      {perms.canEditClasses && (
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => handleUnenroll(s.id)} title="Chiqarish" className="text-red-400 hover:text-red-600 dark:hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── ATTENDANCE TAB — fused: take today + see history ──────────────── */}
      {tab === 'attendance' && (
        <div className="space-y-6">
          {/* Date picker + summary pills + Save */}
          <div className="flex flex-wrap items-center gap-4">
            <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors" />
            {Object.keys(attRecs).length > 0 && (
              <>
                <span className="px-3.5 py-1.5 rounded-xl text-sm font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">Bor: {presentCount}</span>
                <span className="px-3.5 py-1.5 rounded-xl text-sm font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50">Yo'q: {absentCount}</span>
              </>
            )}
            {students.length > 0 && (
              <button onClick={handleSaveAttendance} disabled={attSaving}
                className={`ml-auto inline-flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all ${attSaved ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500'}`}>
                <Save className="h-4 w-4" />{attSaved ? 'Saqlandi ✓' : 'Saqlash'}
              </button>
            )}
          </div>

          {/* Per-student: take attendance + history row ─────────────────── */}
          {students.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 text-gray-400 dark:text-gray-500 font-medium">O'quvchilar yo'q.</div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
              <div className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {students.map(s => {
                  const summary = attendance_summary.find(r => r.student_id === s.id);
                  return (
                    <div key={s.id} className={`px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50`}>
                      {/* Top row: avatar + name + status pills */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-700 dark:text-purple-400 font-black text-sm shrink-0 shadow-sm">
                            {s.full_name[0]?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-gray-900 dark:text-white truncate">{s.full_name}</p>
                            {summary && (
                              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 tracking-wide">
                                <span className="text-green-600 dark:text-green-500">{summary.present} Bor</span> / <span className="text-red-600 dark:text-red-500">{summary.absent} Yo'q</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* History + Today fused */}
                      <div className="mt-4 flex flex-wrap items-end gap-3 sm:pl-14">
                        {summary && attendance_dates.length > 0 && attendance_dates.map(d => {
                          const parts = d.split('-');
                          const displayDate = parts.length === 3 ? `${parts[1]}/${parts[2]}` : d;
                          return (
                            <div key={d} className="flex flex-col items-center gap-1.5 mb-1">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold leading-none tracking-tighter">
                                {displayDate}
                              </span>
                              <span
                                title={`${d}: ${summary.daily[d] || 'no record'}`}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-black shadow-sm ${STATUS_CELL[summary.daily[d] || '']} ring-1 ring-inset ${summary.daily[d] === 'PRESENT' ? 'ring-green-600 dark:ring-green-400' : summary.daily[d] === 'ABSENT' ? 'ring-red-600 dark:ring-red-400' : 'ring-gray-200 dark:ring-slate-700'}`}>
                                {STATUS_LABEL[summary.daily[d] || '']}
                              </span>
                            </div>
                          );
                        })}
                        
                        {/* Today's selector */}
                        <div className="flex flex-col items-center gap-1.5 mb-1 ml-2 pl-3 border-l-2 border-dashed border-gray-200 dark:border-slate-700">
                           <span className="text-[10px] text-purple-500 dark:text-purple-400 font-black uppercase tracking-wider leading-none">Bugun</span>
                           <StatusPill value={attRecs[s.id]?.status || 'PRESENT'}
                             onChange={v => setAttRecs(p => ({ ...p, [s.id]: { ...p[s.id], status: v } }))} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add Student Modal ─────────────────────────────────────────────── */}
      {showEnroll && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">O'quvchi qo'shish</h3>
              <button onClick={() => setShowEnroll(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <input type="text" placeholder="Qidirish..." value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium mb-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredAdd.slice(0, 20).map(s => (
                <button key={s.id} onClick={() => handleEnroll(s.id)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 group text-left transition-all">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{s.full_name}</span>
                  <UserPlus className="h-4 w-4 text-gray-400 group-hover:text-purple-600 dark:text-gray-500 dark:group-hover:text-purple-400" />
                </button>
              ))}
              {filteredAdd.length === 0 && <p className="text-center text-gray-400 dark:text-gray-500 py-6 text-sm font-medium">Barcha o'quvchilar guruhda yeki topilmadi.</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Charge Modal ──────────────────────────────────────────────────── */}
      {showCharge && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">To'lovni undirish</h3>
              <button onClick={() => setShowCharge(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">
              Asosiy summa: <span className="font-bold text-orange-600 dark:text-orange-500">{fmt(parseFloat(meta.monthly_fee))}</span> · {students.filter(s => s.is_active).length} ta faol o'quvchi
            </p>
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2 mb-5">
              {students.filter(s => s.is_active).map(s => {
                const disc = parseFloat(discounts[s.id] || '0') || 0;
                const final = Math.max(parseFloat(meta.monthly_fee) - disc, 0);
                return (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.full_name}</p>
                      <p className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${s.balance < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>Balans: {fmt(s.balance)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Chegirma</p>
                        <input type="number" min="0" value={discounts[s.id] || ''} placeholder="0"
                          onChange={e => setDiscounts(p => ({ ...p, [s.id]: e.target.value }))}
                          className="w-20 px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all" />
                      </div>
                      <div className="min-w-[52px] text-right">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Qolgan</p>
                        <p className="text-base font-black text-orange-600 dark:text-orange-500">{fmt(final)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {chargeResult && (
              <div className={`mb-5 p-4 rounded-xl text-sm font-bold shadow-sm ${chargeResult.ok ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>
                {chargeResult.msg}
              </div>
            )}
            {!chargeResult?.ok && (
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCharge(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button onClick={handleCharge} disabled={charging}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-60 flex items-center gap-2 shadow-sm transition-colors">
                  <Zap className="h-4 w-4" />{charging ? 'Yuklanmoqda...' : 'To\'lov yozish'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetail;

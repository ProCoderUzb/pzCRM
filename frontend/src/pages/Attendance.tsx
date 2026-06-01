import React, { useEffect, useState } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Save, Users, User } from 'lucide-react';

interface CourseClass { id: number; name: string; teacher: number | null; }
interface Stu { id: number; full_name: string; }
interface Staff { id: number; username: string; first_name: string; last_name: string; role: string; display_name: string; }

const STATUS_CELL: Record<string, string> = {
  PRESENT: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400',
  ABSENT:  'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400',
  '':      'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300',
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
        {v === 'PRESENT' ? 'Keldi' : 'Kelmadi'}
      </button>
    ))}
  </div>
);

const todayStr = () => new Date().toISOString().slice(0, 10);

const Attendance: React.FC = () => {
  const { currentUser } = useAuth();
  const isTeacher = currentUser?.role === 'TEACHER';

  const [date, setDate] = useState(todayStr());
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [selClass, setSelClass] = useState('');
  const [enrolled, setEnrolled] = useState<Stu[]>([]);
  const [stuRecs, setStuRecs] = useState<Record<number, any>>({});
  const [attSummary, setAttSummary] = useState<any[]>([]);
  const [attDates, setAttDates] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('classes/').then(r => {
      let cls: CourseClass[] = r.data;
      if (isTeacher && currentUser?.id) cls = cls.filter(c => c.teacher === currentUser.id);
      setClasses(cls);
      if (cls.length === 1) setSelClass(String(cls[0].id));
    }).catch(console.error);
  }, [isTeacher, currentUser]);

  useEffect(() => {
    if (!selClass) return;
    Promise.all([
      api.get(`classes/${selClass}/detail/`),
      api.get(`attendance/?course_class=${selClass}&date=${date}`),
    ]).then(([detRes, attRes]) => {
      const students: Stu[] = detRes.data.students;
      setEnrolled(students);
      setAttSummary(detRes.data.attendance_summary || []);
      setAttDates(detRes.data.attendance_dates || []);
      const recs: Record<number, any> = {};
      students.forEach(s => {
        const ex = attRes.data.find((a: any) => a.student === s.id);
        recs[s.id] = ex ?? { student: s.id, course_class: +selClass, date, status: 'PRESENT' };
      });
      setStuRecs(recs);
    }).catch(console.error);
  }, [selClass, date]);

  const handleSaveStudent = async () => {
    setSaving(true);
    try {
      await Promise.all(Object.values(stuRecs).map((r: any) =>
        r.id ? api.patch(`attendance/${r.id}/`, { status: r.status }) : api.post('attendance/', r)
      ));
      const attRes = await api.get(`attendance/?course_class=${selClass}&date=${date}`);
      const updated = { ...stuRecs };
      attRes.data.forEach((a: any) => { if (updated[a.student]) updated[a.student] = a; });
      setStuRecs(updated);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Davomat</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Tanlangan sana uchun davomatni belgilang</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl text-sm font-medium shadow-sm transition-colors" />
          {selClass && enrolled.length > 0 && (
            <button onClick={handleSaveStudent} disabled={saving}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all ${saved ? 'bg-green-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Save className="h-4 w-4" />{saved ? 'Saqlandi ✓' : 'Saqlash'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {classes.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 text-gray-400 transition-colors">Guruhlar mavjud emas.</div>
        ) : classes.length <= 6 ? (
          <div className="flex flex-wrap gap-2">
            {classes.map(c => (
              <button key={c.id} onClick={() => setSelClass(String(c.id))}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  selClass === String(c.id) 
                    ? 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 shadow' 
                    : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'
                }`}>
                {c.name}
              </button>
            ))}
          </div>
        ) : (
          <select value={selClass} onChange={e => setSelClass(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors">
            <option value="">— Guruhni tanlang —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {Object.keys(stuRecs).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50">
              Keldi: {Object.values(stuRecs).filter(r => r.status === 'PRESENT').length}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50">
              Kelmadi: {Object.values(stuRecs).filter(r => r.status === 'ABSENT').length}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
              Jami: {Object.keys(stuRecs).length}
            </span>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          {!selClass ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500 font-medium transition-colors">Davomatni olish uchun yuqoridan guruhni tanlang.</div>
          ) : enrolled.length === 0 ? (
            <div className="py-12 text-center text-gray-400 dark:text-gray-500 font-medium transition-colors">Ushbu guruhda o'quvchilar yo'q.</div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left border-collapse min-w-max">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-slate-800">
                    <th className="px-5 py-4 font-bold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-slate-900 z-10">O'quvchi</th>
                    {attDates.map(d => {
                      const parts = d.split('-');
                      const day = parts.length === 3 ? parts[2] : '';
                      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                      const month = parts.length === 3 ? monthNames[parseInt(parts[1], 10)] : d;
                      return (
                        <th key={d} className="px-2 py-4 text-center min-w-[3.5rem]">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-bold text-gray-900 dark:text-white">{day}</span>
                            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">{month}</span>
                          </div>
                        </th>
                      );
                    })}
                    <th className="px-5 py-4 text-center">
                       <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">Bugun</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                  {enrolled.map(s => {
                    const summary = attSummary.find(r => r.student_id === s.id);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-5 py-3 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/50 z-10 border-r border-gray-100 dark:border-slate-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs shrink-0 shadow-sm">
                              {s.full_name?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                              {summary && (
                                <p className="text-[10px] font-bold tracking-wide mt-0.5">
                                  <span className="text-green-600 dark:text-green-500">{summary.present} Bor</span> <span className="text-gray-300 dark:text-slate-600">/</span> <span className="text-red-600 dark:text-red-500">{summary.absent} Yo'q</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {attDates.map(d => (
                          <td key={d} className="px-2 py-3 text-center">
                            <span title={`${d}: ${summary?.daily[d] || 'no record'}`}
                              className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-[15px] font-black transition-colors ${STATUS_CELL[summary?.daily[d] || '']}`}>
                              {STATUS_LABEL[summary?.daily[d] || '']}
                            </span>
                          </td>
                        ))}
                        <td className="px-5 py-3 text-center">
                          <div className="flex justify-center flex-nowrap min-w-max">
                            <StatusPill value={stuRecs[s.id]?.status || 'PRESENT'} onChange={v => setStuRecs(p => ({ ...p, [s.id]: { ...p[s.id], status: v } }))} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;

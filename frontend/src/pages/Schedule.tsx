import React, { useEffect, useState } from 'react';
import api from '../api';
import { Clock } from 'lucide-react';

interface CourseClass {
  id: number; name: string; subject_name: string;
  teacher_name: string; room_name: string;
  days: string; start_time: string; end_time: string;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Dushanba', TUE: 'Seshanba', WED: 'Chorshanba', THU: 'Payshanba', FRI: 'Juma', SAT: 'Shanba', SUN: 'Yakshanba' };
const CLASS_COLORS = [
  'border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-400',
  'border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-400',
  'border-green-200 dark:border-green-900/50 text-green-900 dark:text-green-400',
  'border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-400',
  'border-pink-200 dark:border-pink-900/50 text-pink-900 dark:text-pink-400',
  'border-teal-200 dark:border-teal-900/50 text-teal-900 dark:text-teal-400',
  'border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-400',
  'border-orange-200 dark:border-orange-900/50 text-orange-900 dark:text-orange-400'
];

const Schedule: React.FC = () => {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('classes/').then(r => setClasses(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Build a color map so each class consistently gets the same color
  const colorMap = React.useMemo(() => {
    const m: Record<number, string> = {};
    classes.forEach((c, i) => { m[c.id] = CLASS_COLORS[i % CLASS_COLORS.length]; });
    return m;
  }, [classes]);

  const getClassesForDay = (day: string) =>
    classes.filter(c => c.days?.split(',').map(d => d.trim()).includes(day))
           .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));

  const listView = classes.filter(c => !c.days);

  if (loading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-bold">Yuklanmoqda...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dars jadvali</h1>
        <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">Barcha guruhlar va ularning haftalik jadvali.</p>
      </div>

      {classes.length === 0 ? (
        <div className="p-16 text-center text-gray-400 dark:text-gray-500 font-bold bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors shadow-sm">
          Hali guruhlar yaratilmagan. Guruhlar bo'limiga o'ting.
        </div>
      ) : (
        <>
          {/* Weekly grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4 lg:gap-3">
            {DAYS.map(day => {
              const dayClasses = getClassesForDay(day);
              return (
                <div key={day} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
                  <div className="bg-gray-50 dark:bg-slate-800/40 border-b border-gray-200 dark:border-slate-800 px-4 py-3 text-center transition-colors">
                    <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{DAY_LABELS[day].slice(0, 3)}</p>
                  </div>
                  <div className="p-3 space-y-3 min-h-[8rem] bg-white dark:bg-slate-900">
                    {dayClasses.length === 0 ? (
                      <p className="text-center text-gray-300 dark:text-slate-600 font-bold text-sm py-6">—</p>
                    ) : dayClasses.map(cls => (
                      <div key={cls.id} className={`rounded-xl border shadow-sm p-3 transition-colors bg-white dark:bg-slate-800/50 ${colorMap[cls.id]}`}>
                        <p className="text-sm font-bold leading-snug">{cls.name}</p>
                        {cls.start_time && (
                          <p className="text-xs font-bold mt-1.5 opacity-80 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {cls.start_time.slice(0,5)}–{cls.end_time?.slice(0,5)}
                          </p>
                        )}
                        {cls.room_name && <p className="text-xs font-bold opacity-75 mt-1 truncate pr-1">🚪 {cls.room_name}</p>}
                        {cls.teacher_name && <p className="text-xs font-bold opacity-75 truncate pr-1">👨‍🏫 {cls.teacher_name}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Classes with no schedule set */}
          {listView.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900/30 p-6 shadow-sm transition-colors">
              <h2 className="text-sm font-bold text-amber-700 dark:text-amber-500 mb-4 flex items-center gap-2">⚠️ Jadvalga kiritilmagan guruhlar</h2>
              <div className="flex flex-wrap gap-2.5">
                {listView.map(c => (
                  <span key={c.id} className="text-xs font-bold px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800/50 shadow-sm">{c.name}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Schedule;

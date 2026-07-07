import React, { useEffect, useState } from 'react';
import api from '../api';
import { Info } from 'lucide-react';

interface CourseClass {
  id: number; name: string; subject_name: string; teacher_name: string;
  room_name: string; room: number | null; days: string;
  start_time: string; end_time: string; is_archived: boolean;
}

const DAY_KEYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_LABELS: Record<string, string> = { MON: 'Dushanba', TUE: 'Seshanba', WED: 'Chorshanba', THU: 'Payshanba', FRI: 'Juma', SAT: 'Shanba', SUN: 'Yakshanba' };
const DAY_SHORT: Record<string, string> = { MON: 'Du', TUE: 'Se', WED: 'Ch', THU: 'Pa', FRI: 'Ju', SAT: 'Sh', SUN: 'Ya' };

const COLORS = [
  'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200',
  'bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200',
  'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200',
  'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200',
  'bg-rose-100 dark:bg-rose-900/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200',
  'bg-teal-100 dark:bg-teal-900/40 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200',
  'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200',
];

const Schedule: React.FC = () => {
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const now = new Date();
    const jsDay = now.getDay(); // 0=Sun,1=Mon,...,6=Sat
    const dayMap = [6, 0, 1, 2, 3, 4, 5]; // Sun→6(SUN), Mon→0(MON)...
    return DAY_KEYS[dayMap[jsDay]] ?? 'MON';
  });

  useEffect(() => {
    api.get('classes/').then(r => {
      setClasses((Array.isArray(r.data) ? r.data : r.data?.results || []).filter((c: CourseClass) => !c.is_archived));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const classesForDay = classes.filter(c => c.days?.split(',').map(d => d.trim()).includes(selectedDay));

  // Unique rooms that have classes today
  const rooms = Array.from(new Map(
    classesForDay.filter(c => c.room_name).map(c => [c.room, c.room_name])
  ).entries()).map(([id, name]) => ({ id, name }));

  // Add a "No Room" column if there are classes without room
  const noRoomClasses = classesForDay.filter(c => !c.room);
  if (noRoomClasses.length > 0) rooms.push({ id: null as any, name: 'Xona belgilanmagan' });

  // Unique sorted time slots
  const timeSlots = Array.from(new Set(classesForDay.map(c => c.start_time?.slice(0, 5)))).filter(Boolean).sort();

  // Color map per subject name
  const colorMap: Record<string, string> = {};
  let colorIdx = 0;
  classesForDay.forEach(c => {
    if (!colorMap[c.subject_name]) { colorMap[c.subject_name] = COLORS[colorIdx % COLORS.length]; colorIdx++; }
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Dars jadvali
          <button onClick={() => setShowInfo(!showInfo)} className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Ma'lumot">
            <Info className="h-5 w-5" />
          </button>
        </h1>
      </div>

      {/* Info Banner */}
      {showInfo && (
        <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800/80 rounded-2xl text-blue-700 dark:text-blue-300 transition-colors animate-fade-in">
          <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
          <div className="text-xs font-semibold leading-relaxed flex-1">
            <strong>Dars jadvali:</strong> Haftalik kunlar kesimida dars xonalarining bandligi jadval ko'rinishida ko'rsatiladi. Kerakli kunni tanlab, o'sha kundagi xonalarga joylashtirilgan dars soatlari, fanlar va o'qituvchilar bandligini ko'rishingiz mumkin.
          </div>
          <button onClick={() => setShowInfo(false)} className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-bold text-xs">Yopish</button>
        </div>
      )}

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {DAY_KEYS.map(day => (
          <button key={day} onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap border-2 transition-all ${selectedDay === day ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600'}`}>
            <span className="hidden sm:inline">{DAY_LABELS[day]}</span>
            <span className="sm:hidden">{DAY_SHORT[day]}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 font-bold">Yuklanmoqda...</div>
      ) : classesForDay.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
          <p className="text-gray-400 dark:text-gray-500 font-bold text-lg">📅 {DAY_LABELS[selectedDay]} kuni dars yo'q.</p>
        </div>
      ) : rooms.length === 0 ? (
        // Fallback: list view when no rooms assigned
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {classesForDay.map(cls => (
            <div key={cls.id} className={`rounded-2xl border p-4 shadow-sm ${colorMap[cls.subject_name]}`}>
              <p className="font-bold truncate">{cls.name}</p>
              <p className="text-xs font-bold mt-1 opacity-70">{cls.start_time?.slice(0, 5)} – {cls.end_time?.slice(0, 5)}</p>
              <p className="text-xs mt-1 opacity-70">{cls.teacher_name}</p>
            </div>
          ))}
        </div>
      ) : (
        /* Room × Time Grid */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-x-auto">
          <table className="w-full min-w-max border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-800">
                <th className="w-28 px-4 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 sticky left-0 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800">
                  ⏰ Vaqt
                </th>
                {rooms.map(room => (
                  <th key={room.id ?? 'noroom'} className="px-4 py-3 text-center text-sm font-black text-gray-700 dark:text-gray-300 border-l border-gray-100 dark:border-slate-800">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base">🚪</div>
                      <span>{room.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {timeSlots.map(time => (
                <tr key={time} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-900 border-r border-gray-100 dark:border-slate-800">
                    <span className="text-sm font-black text-gray-700 dark:text-gray-300">{time}</span>
                  </td>
                  {rooms.map(room => {
                    const cls = classesForDay.find(c =>
                      c.start_time?.slice(0, 5) === time &&
                      (room.id === null ? !c.room : c.room === room.id)
                    );
                    return (
                      <td key={room.id ?? 'noroom'} className="px-3 py-2 border-l border-gray-100 dark:border-slate-800 align-top min-w-[180px]">
                        {cls ? (
                          <div className={`rounded-xl border px-3 py-2.5 shadow-sm ${colorMap[cls.subject_name]}`}>
                            <p className="text-xs font-black truncate">{cls.name}</p>
                            <p className="text-[10px] font-bold opacity-70 mt-0.5">{cls.subject_name}</p>
                            {cls.teacher_name && <p className="text-[10px] opacity-60 mt-0.5">👨‍🏫 {cls.teacher_name}</p>}
                            <p className="text-[10px] font-bold opacity-60 mt-1">{cls.start_time?.slice(0,5)} – {cls.end_time?.slice(0,5)}</p>
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <span className="text-gray-200 dark:text-slate-700 text-lg">—</span>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      {Object.keys(colorMap).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(colorMap).map(([subject, color]) => (
            <span key={subject} className={`px-3 py-1 rounded-lg text-xs font-bold border ${color}`}>{subject}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default Schedule;

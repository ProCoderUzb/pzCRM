import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { Plus, BookOpen, Clock, X, Search, Filter, ArrowRight, Info } from 'lucide-react';

interface CourseClass {
  id: number; name: string; subject: number; subject_name: string;
  teacher: number | null; teacher_name: string; room: number | null; room_name: string;
  days: string; start_time: string; end_time: string;
  capacity: number; student_count: number; monthly_fee: string; is_archived: boolean;
}
interface User { id: number; username: string; first_name: string; last_name: string; role: string; display_name: string; salary_share: number; }
interface Room { id: number; name: string; }
interface Subject { id: number; name: string; }

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_MZ: Record<string, string> = { MON: 'Du', TUE: 'Se', WED: 'Ch', THU: 'Pa', FRI: 'Ju', SAT: 'Sh', SUN: 'Ya' };
const emptyForm = { name: '', subject: '', teacher: '', room: '', start_time: '', end_time: '', capacity: 15, monthly_fee: 0 };
const fmt = (n: number) => Number(n).toLocaleString();

const Classes: React.FC = () => {
  const perms = usePermissions();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  // Add modal
  const [showClassModal, setShowClassModal] = useState(false);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const qs = activeTab === 'archived' ? 'classes/?archived=true' : 'classes/';
      const reqs: Promise<any>[] = [api.get(qs), api.get('rooms/'), api.get('subjects/')];
      if (perms.canManageStaff) reqs.push(api.get('users/'));
      const [cls, rm, sub, usr] = await Promise.all(reqs);
      setClasses(Array.isArray(cls.data) ? cls.data : cls.data?.results || []);
      setRooms(Array.isArray(rm.data) ? rm.data : rm.data?.results || []);
      setSubjects(Array.isArray(sub.data) ? sub.data : sub.data?.results || []);
      if (perms.canManageStaff && usr) setTeachers((Array.isArray(usr.data) ? usr.data : usr.data?.results || []).filter((u: any) => u.role !== 'DEV'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [perms.canManageStaff, activeTab]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const toggleDay = (d: string) => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const payload = { ...formData, teacher: formData.teacher || null, room: formData.room || null, days: selectedDays.join(',') };
    try {
      await api.post('classes/', payload);
      setShowClassModal(false); fetchAll();
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  // Client-side filtering
  const filtered = classes.filter(cls => {
    if (search && !cls.name.toLowerCase().includes(search.toLowerCase()) &&
        !cls.subject_name.toLowerCase().includes(search.toLowerCase()) &&
        !cls.teacher_name.toLowerCase().includes(search.toLowerCase())) return false;
    if (subjectFilter && String(cls.subject) !== subjectFilter) return false;
    if (teacherFilter && String(cls.teacher) !== teacherFilter) return false;
    if (dayFilter && !cls.days?.split(',').map(d => d.trim()).includes(dayFilter)) return false;
    return true;
  });

  const hasFilters = search || subjectFilter || teacherFilter || dayFilter;

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            Guruhlar
            <button onClick={() => setShowInfo(!showInfo)} className="p-1 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors" title="Ma'lumot">
              <Info className="h-5 w-5" />
            </button>
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Jami {filtered.length} ta guruh</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
            <button onClick={() => setActiveTab('active')} className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Faol</button>
            <button onClick={() => setActiveTab('archived')} className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-bold rounded-lg transition-colors ${activeTab === 'archived' ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Arxivlangan</button>
          </div>
          {perms.canEditClasses && (
            <button onClick={() => { setFormData(emptyForm); setSelectedDays([]); setShowClassModal(true); }} className="inline-flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-colors flex-1 md:flex-none">
              <Plus className="h-4 w-4 mr-2" />Yangi guruh
            </button>
          )}
        </div>
      </div>

      {/* Info Banner */}
      {showInfo && (
        <div className="flex items-start gap-3 p-4 bg-blue-50/50 dark:bg-slate-800/40 border border-blue-100 dark:border-slate-800/80 rounded-2xl text-blue-700 dark:text-blue-300 transition-colors animate-fade-in">
          <Info className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
          <div className="text-xs font-semibold leading-relaxed flex-1">
            <strong>Guruhlar boshqaruvi:</strong> Markazdagi barcha dars guruhlari. Guruh sahifasiga kirib (Batafsil), o'quvchilarni a'zo qilish, dars kunlarini tahrirlash yoki oylik to'lov hisoblash (charge) amallarini bajarishingiz mumkin.
          </div>
          <button onClick={() => setShowInfo(false)} className="text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-400 font-bold text-xs">Yopish</button>
        </div>
      )}

      {/* Search + Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Guruh nomi, fan, o'qituvchi bo'yicha..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-colors" />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-gray-400 shrink-0" />
          <select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)} className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 transition-colors">
            <option value="">Barcha fanlar</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {perms.canManageStaff && (
            <select value={teacherFilter} onChange={e => setTeacherFilter(e.target.value)} className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 transition-colors">
              <option value="">Barcha o'qituvchilar</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
            </select>
          )}
          <select value={dayFilter} onChange={e => setDayFilter(e.target.value)} className="px-3 py-1.5 text-xs font-bold rounded-lg border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-purple-500 transition-colors">
            <option value="">Barcha kunlar</option>
            {DAYS.map(d => <option key={d} value={d}>{DAYS_MZ[d]}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setSearch(''); setSubjectFilter(''); setTeacherFilter(''); setDayFilter(''); }} className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 ml-auto">
              <X className="h-3 w-3" />Tozalash
            </button>
          )}
        </div>
      </div>

      {/* Grid — only Batafsil button on each card */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 h-44 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800">
            <BookOpen className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 font-medium">Guruhlar topilmadi.</p>
          </div>
        ) : filtered.map(cls => (
          <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{cls.name}</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">{cls.subject_name}</p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              {cls.teacher_name && <div className="flex items-center gap-2">👨‍🏫 <span>{cls.teacher_name}</span></div>}
              {cls.room_name && <div className="flex items-center gap-2">🚪 <span>{cls.room_name}</span></div>}
              {cls.days && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>{cls.days.split(',').map(d => DAYS_MZ[d.trim()] || d).join(', ')} · {cls.start_time?.slice(0,5)}–{cls.end_time?.slice(0,5)}</span>
                </div>
              )}
            </div>
            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${cls.student_count >= cls.capacity ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                  {cls.student_count}/{cls.capacity}
                </span>
                {parseFloat(cls.monthly_fee) > 0 && <span className="text-sm font-black text-gray-700 dark:text-gray-300">{fmt(parseFloat(cls.monthly_fee))} / oy</span>}
              </div>
              <button onClick={() => navigate(`/classes/${cls.id}`)} title="Batafsil"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors">
                Batafsil <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 my-4 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Yangi guruh yarating</h3>
              <button onClick={() => setShowClassModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Guruh nomi *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Fan *</label>
                  <select required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all">
                    <option value="">— Tanlang —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">O'qituvchi</label>
                  <select value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all">
                    <option value="">— Yo'q —</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Xona</label>
                  <select value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all">
                    <option value="">— Yo'q —</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Sig'im</label>
                  <input type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: +e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Oylik to'lov</label>
                <input type="number" min="0" value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: +e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Dars kunlari</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map(d => (
                    <button key={d} type="button" onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${selectedDays.includes(d) ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'}`}>{DAYS_MZ[d]}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Boshlanish</label>
                  <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Tugash</label>
                  <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowClassModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">Bekor qilish</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
                  {submitting && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Qo'shish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;

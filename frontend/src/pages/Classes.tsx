import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { Plus, BookOpen, Clock, X, Edit2, Users, UserMinus, UserPlus, Zap, ArrowRight, Trash2 } from 'lucide-react';


interface CourseClass {
  id: number; name: string; subject: number; subject_name: string;
  teacher: number | null; teacher_name: string; room: number | null; room_name: string;
  days: string; start_time: string; end_time: string;
  capacity: number; student_count: number; monthly_fee: string;
}
interface EnrolledStudent { id: number; full_name: string; balance: number; is_active: boolean; }
interface User { id: number; username: string; first_name: string; last_name: string; role: string; display_name: string; salary_share: number; }
interface Room { id: number; name: string; }
interface Subject { id: number; name: string; }
interface AllStudent { id: number; full_name: string; }

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAYS_MZ: Record<string, string> = { MON: 'Du', TUE: 'Se', WED: 'Ch', THU: 'Pa', FRI: 'Ju', SAT: 'Sh', SUN: 'Ya' };
const emptyForm = { name: '', subject: '', teacher: '', room: '', start_time: '', end_time: '', capacity: 15, monthly_fee: 0 };

const fmt = (n: number) => Number(n).toLocaleString();

const Classes: React.FC = () => {
  const perms = usePermissions();
  const navigate = useNavigate();

  const [classes, setClasses] = useState<CourseClass[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allStudents, setAllStudents] = useState<AllStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const [showClassModal, setShowClassModal] = useState(false);
  const [editClass, setEditClass] = useState<CourseClass | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [formData, setFormData] = useState(emptyForm);

  const [enrollModal, setEnrollModal] = useState<CourseClass | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [enrollSearch, setEnrollSearch] = useState('');

  const [chargeModal, setChargeModal] = useState<CourseClass | null>(null);
  const [discounts, setDiscounts] = useState<Record<number, string>>({});
  const [chargeStudents, setChargeStudents] = useState<EnrolledStudent[]>([]);
  const [chargeResult, setChargeResult] = useState<{ msg: string; ok: boolean } | null>(null);
  const [charging, setCharging] = useState(false);
  const [teacherPayout, setTeacherPayout] = useState<string>('0');

  const fetchAll = useCallback(async () => {
    try {
      const reqs: Promise<any>[] = [api.get('classes/'), api.get('rooms/'), api.get('subjects/')];
      if (perms.canManageStaff) reqs.push(api.get('users/?role=TEACHER'));
      if (perms.canEditStudents) reqs.push(api.get('students/?is_active=true'));
      const [cls, rm, sub, usr, stu] = await Promise.all(reqs);
      setClasses(cls.data);
      setRooms(rm.data);
      setSubjects(sub.data);
      if (perms.canManageStaff && usr) setTeachers(usr.data);
      if (perms.canEditStudents && stu) setAllStudents(stu.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [perms.canManageStaff, perms.canEditStudents]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openAdd = () => { setEditClass(null); setFormData(emptyForm); setSelectedDays([]); setShowClassModal(true); };
  const openEdit = (cls: CourseClass) => {
    setEditClass(cls);
    setFormData({ name: cls.name, subject: String(cls.subject), teacher: cls.teacher ? String(cls.teacher) : '', room: cls.room ? String(cls.room) : '', start_time: cls.start_time || '', end_time: cls.end_time || '', capacity: cls.capacity, monthly_fee: parseFloat(cls.monthly_fee) });
    setSelectedDays(cls.days ? cls.days.split(',').map(d => d.trim()) : []);
    setShowClassModal(true);
  };
  const toggleDay = (d: string) => setSelectedDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, teacher: formData.teacher || null, room: formData.room || null, days: selectedDays.join(',') };
    try {
      if (editClass) await api.patch(`classes/${editClass.id}/`, payload);
      else await api.post('classes/', payload);
      setShowClassModal(false); fetchAll();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Rostdan ham ushbu guruhni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`classes/${id}/`);
      fetchAll();
    } catch (e) {
      alert("O'chirishda xatolik yuz berdi. Ehtimol ushbu guruhda o'quvchilar yoki to'lovlar bordir.");
    }
  };

  const openEnroll = async (cls: CourseClass) => {
    setEnrollModal(cls); setEnrollSearch('');
    const r = await api.get(`classes/${cls.id}/students/`);
    setEnrolledStudents(r.data);
  };
  const handleEnroll = async (sid: number) => {
    if (!enrollModal) return;
    await api.post(`classes/${enrollModal.id}/enroll/`, { student_id: sid });
    const r = await api.get(`classes/${enrollModal.id}/students/`);
    setEnrolledStudents(r.data); fetchAll();
  };
  const handleUnenroll = async (sid: number) => {
    if (!enrollModal) return;
    await api.post(`classes/${enrollModal.id}/unenroll/`, { student_id: sid });
    const r = await api.get(`classes/${enrollModal.id}/students/`);
    setEnrolledStudents(r.data); fetchAll();
  };
  const enrolledIds = new Set(enrolledStudents.map(s => s.id));
  const filteredForEnroll = allStudents.filter(s => s.full_name.toLowerCase().includes(enrollSearch.toLowerCase()));

  const openCharge = async (cls: CourseClass) => {
    setChargeModal(cls); setChargeResult(null); setDiscounts({});
    const r = await api.get(`classes/${cls.id}/students/`);
    const actives = r.data.filter((s: EnrolledStudent) => s.is_active);
    setChargeStudents(actives);
    
    const teacher = teachers.find(t => t.id === cls.teacher);
    if (teacher) {
        const share = teacher.salary_share || 0;
        const fee = parseFloat(cls.monthly_fee) || 0;
        const defaultPayout = (fee * share / 100) * actives.length;
        setTeacherPayout(String(defaultPayout));
    } else {
        setTeacherPayout('0');
    }
  };
  const handleCharge = async () => {
    if (!chargeModal) return;
    setCharging(true);
    try {
      const discountPayload: Record<string, number> = {};
      Object.entries(discounts).forEach(([id, v]) => { const n = parseFloat(v); if (n > 0) discountPayload[id] = n; });
      const res = await api.post(`classes/${chargeModal.id}/charge/`, {
        discounts: discountPayload,
        teacher_payout_override: parseFloat(teacherPayout) || 0
      });
      setChargeResult({ ok: true, msg: `✅ Charged ${res.data.students_charged} students — Total: ${fmt(res.data.total_charged)}. Teacher payout: ${fmt(res.data.teacher_payout)}` });
      fetchAll();
    } catch (e: any) {
      const errMsg = e.response?.data?.error || e.response?.data?.detail || 'Unknown error. Check backend logs.';
      setChargeResult({ ok: false, msg: `❌ ${errMsg}` });
    } finally { setCharging(false); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guruhlar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Jami {classes.length} ta guruh</p>
        </div>
        {perms.canEditClasses && (
          <button onClick={openAdd} className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-colors">
            <Plus className="h-4 w-4 mr-2" />Yangi guruh
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 h-44 animate-pulse transition-colors" />
          ))
        ) : classes.length === 0 ? (
          <div className="col-span-3 p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors">
            <BookOpen className="h-10 w-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 dark:text-gray-500 font-medium">Hozircha guruhlar yo'q.</p>
          </div>
        ) : classes.map(cls => (
          <div key={cls.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{cls.name}</h3>
                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-0.5">{cls.subject_name}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {perms.canEditClasses && (
                  <>
                    <button onClick={() => openEnroll(cls)} title="O'quvchilarni boshqarish" className="p-1.5 rounded-xl text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors"><Users className="h-4 w-4" /></button>
                    <button onClick={() => openEdit(cls)} title="Tahrirlash" className="p-1.5 rounded-xl text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(cls.id)} title="O'chirish" className="p-1.5 rounded-xl text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
                <button onClick={() => navigate(`/classes/${cls.id}`)} title="Batafsil" className="p-1.5 rounded-xl text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
              {cls.teacher_name && <div className="flex items-center gap-2">👨‍🏫 <span>{cls.teacher_name}</span></div>}
              {cls.room_name   && <div className="flex items-center gap-2">🚪 <span>{cls.room_name}</span></div>}
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
                {parseFloat(cls.monthly_fee) > 0 && (
                  <span className="text-sm font-black text-gray-700 dark:text-gray-300">{fmt(parseFloat(cls.monthly_fee))} / oy</span>
                )}
              </div>
              {perms.canChargeStudents && parseFloat(cls.monthly_fee) > 0 && (
                <button onClick={() => openCharge(cls)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-orange-500 hover:bg-orange-600 shadow-sm transition-colors">
                  <Zap className="h-3.5 w-3.5" /> To'lov
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Create/Edit Modal ── */}
      {showClassModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 my-4 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editClass ? 'Guruhni tahrirlash' : 'Yangi guruh yarating'}</h3>
              <button onClick={() => setShowClassModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Guruh nomi *</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Fan *</label>
                  <select required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                    <option value="">— Tanlang —</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">O'qituvchi</label>
                  <select value={formData.teacher} onChange={e => setFormData({...formData, teacher: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                    <option value="">— Yo'q —</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Xona</label>
                  <select value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all">
                    <option value="">— Yo'q —</option>
                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Sig'im</label>
                  <input type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: +e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Oylik to'lov</label>
                <input type="number" min="0" value={formData.monthly_fee} onChange={e => setFormData({...formData, monthly_fee: +e.target.value})}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
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
                  <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Tugash</label>
                  <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowClassModal(false)}
                  className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors">{editClass ? 'Saqlash' : 'Qo\'shish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Enrollment Modal ── */}
      {enrollModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{enrollModal.name}</h3>
              <button onClick={() => setEnrollModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">{enrolledStudents.length} / {enrollModal.capacity} ta o'quvchi</p>

            {enrolledStudents.length > 0 && (
              <div className="mb-4 space-y-1.5 max-h-40 overflow-y-auto pr-2">
                {enrolledStudents.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-2.5 bg-purple-50 dark:bg-slate-800/50 border border-purple-100 dark:border-slate-700/50 rounded-xl hover:bg-purple-100 dark:hover:bg-slate-700 transition-colors">
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{s.full_name}</span>
                      <span className={`ml-2 text-xs font-bold ${s.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>{fmt(s.balance)}</span>
                    </div>
                    <button onClick={() => handleUnenroll(s.id)} title="Chiqarish" className="text-red-400 hover:text-red-600 dark:hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <UserMinus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-100 dark:border-slate-800 pt-5">
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">O'quvchi qo'shish</p>
              <input type="text" placeholder="Qidirish..." value={enrollSearch} onChange={e => setEnrollSearch(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium mb-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
              <div className="max-h-44 overflow-y-auto space-y-1">
                {filteredForEnroll.filter(s => !enrolledIds.has(s.id)).slice(0, 15).map(s => (
                  <button key={s.id} onClick={() => handleEnroll(s.id)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 group text-left transition-all">
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.full_name}</span>
                    <UserPlus className="h-4 w-4 text-gray-400 group-hover:text-purple-600 dark:text-gray-500 dark:group-hover:text-purple-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Charge Modal ── */}
      {chargeModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">To'lovni undirish</h3>
              <button onClick={() => setChargeModal(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-4 mb-4">
              <span className="font-bold text-gray-900 dark:text-white">{chargeModal.name}</span> · Asosiy summa: <span className="font-bold text-orange-600 dark:text-orange-500">{fmt(parseFloat(chargeModal.monthly_fee))}</span>
            </p>

            {chargeModal.teacher && (
              <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl">
                <div className="flex justify-between items-center mb-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">O'qituvchi haqi</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{chargeModal.teacher_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Hisoblandi</p>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400">{fmt(((parseFloat(chargeModal.monthly_fee) * (teachers.find(t => t.id === chargeModal.teacher)?.salary_share || 0)) / 100) * chargeStudents.length)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40">
                  <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex-1">To'lanadigan yakuniy summa:</label>
                  <div className="relative">
                    <input type="number" value={teacherPayout} onChange={e => setTeacherPayout(e.target.value)}
                      className="w-32 px-3 py-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 text-gray-900 dark:text-white rounded-xl text-sm font-black text-right focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                </div>
              </div>
            )}

            {chargeStudents.length === 0 ? (
              <p className="py-8 text-center text-gray-400 dark:text-gray-500 font-medium">Faol o'quvchilar yo'q.</p>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2 mb-5">
                {chargeStudents.map(s => {
                  const disc = parseFloat(discounts[s.id] || '0') || 0;
                  const final = Math.max(parseFloat(chargeModal.monthly_fee) - disc, 0);
                  return (
                    <div key={s.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{s.full_name}</p>
                        <p className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${s.balance < 0 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                          Balans: {fmt(s.balance)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Chegirma</p>
                          <input type="number" min="0" max={parseFloat(chargeModal.monthly_fee)}
                            value={discounts[s.id] || ''} placeholder="0"
                            onChange={e => setDiscounts(p => ({...p, [s.id]: e.target.value}))}
                            className="w-20 px-2.5 py-1.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg text-sm text-center font-bold focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all" />
                        </div>
                        <div className="text-right min-w-[64px]">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Qolgan</p>
                          <p className="text-base font-black text-orange-600 dark:text-orange-500">{fmt(final)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {chargeResult && (
              <div className={`mb-5 p-4 rounded-xl text-sm font-bold shadow-sm ${chargeResult.ok ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>
                {chargeResult.msg}
              </div>
            )}

            {chargeStudents.length > 0 && !chargeResult?.ok && (
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setChargeModal(null)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button onClick={handleCharge} disabled={charging}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-60 flex items-center gap-2 shadow-sm transition-colors">
                  <Zap className="h-4 w-4" />{charging ? 'Yuklanmoqda...' : `${chargeStudents.length} kishiga to'lov yozish`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;

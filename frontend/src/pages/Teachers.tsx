import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Search, Edit2, X, Trash2 } from 'lucide-react';
import { usePermissions } from '../context/AuthContext';

interface StaffMember { id: number; username: string; first_name: string; last_name: string; phone_number: string; role: string; status: string; balance: number; salary_share: number; display_name: string; }

const ROLES = [
  { value: 'CEO',          label: 'Direktor',         color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500' },
  { value: 'ADMIN',        label: 'Administrator',    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400' },
  { value: 'TEACHER',      label: 'O\'qituvchi',      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400' },
  { value: 'SUPPORT',      label: 'Yordamchi o\'qituvchi', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-400' },
  { value: 'RECEPTIONIST', label: 'Qabulxona xodimi', color: 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-400' },
];
const STATUSES = ['ACTIVE', 'ON_LEAVE', 'PROBATION', 'TERMINATED'];
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Faol', ON_LEAVE: 'Ta\'tilda', PROBATION: 'Sinov', TERMINATED: 'Bo\'shatilgan'
};
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
  ON_LEAVE: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500',
  PROBATION: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-500',
  TERMINATED: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-500',
};
const getRoleColor = (r: string) => ROLES.find(x => x.value === r)?.color || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-400';
const emptyForm = { username: '', first_name: '', last_name: '', phone_number: '', password: '', salary_share: 0, role: 'TEACHER', status: 'ACTIVE' };

const Teachers: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editMember, setEditMember] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const perms = usePermissions();

  const fetchStaff = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterRole) params.set('role', filterRole);
    try { const r = await api.get(`users/?${params}`); setStaff(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStaff(); }, [search, filterRole]);

  const openAdd = () => { setEditMember(null); setFormData(emptyForm); setError(''); setShowModal(true); };
  const openEdit = (m: StaffMember) => { setEditMember(m); setFormData({ username: m.username, first_name: m.first_name, last_name: m.last_name, phone_number: m.phone_number, password: '', salary_share: m.salary_share, role: m.role, status: m.status }); setError(''); setShowModal(true); };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Rostdan ham ushbu xodimni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`users/${id}/`);
      fetchStaff();
    } catch (e: any) {
      alert(e.response?.data?.detail || "O'chirishda xatolik yuz berdi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try {
      const payload: any = { ...formData };
      if (editMember && !payload.password) delete payload.password;
      if (editMember) await api.patch(`users/${editMember.id}/`, payload);
      else await api.post('users/', payload);
      setShowModal(false); fetchStaff();
    } catch (e: any) {
      const data = e.response?.data;
      setError(data?.username?.[0] || data?.role?.[0] || JSON.stringify(data) || 'Save failed.');
    }
  };

  const f = (n: number) => Number(n).toLocaleString();

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Xodimlar</h1>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-0.5">{staff.length} xodim</p>
        </div>
        <button onClick={openAdd} className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-colors"><Plus className="h-4 w-4 mr-2" />Qo'shish</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all">
          <option value="">Barcha rollar</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading ? <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 font-bold">Yuklanmoqda...</div>
        : staff.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors"><p className="text-gray-500 dark:text-gray-400 font-bold">Xodimlar topilmadi.</p></div>
        ) : staff.map(m => (
          <div key={m.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-all">
            <div className="flex items-start gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-400 font-black text-xl shrink-0 shadow-sm">
                {(m.first_name || m.username)[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 dark:text-white truncate">{m.display_name}</h3>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${getRoleColor(m.role)}`}>{ROLES.find(r => r.value === m.role)?.label || m.role}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${STATUS_COLORS[m.status] || 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400'}`}>{STATUS_LABELS[m.status] || m.status}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(m)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                {perms.isCEO && (
                  <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                )}
              </div>
            </div>
            {m.phone_number && <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-4 px-1">📞 {m.phone_number}</p>}
            {perms.isCEO && (m.role === 'TEACHER' || m.role === 'SUPPORT') && (
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 dark:border-slate-800/60">
                <div className="text-center bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl border border-gray-100 dark:border-slate-800"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Ulush</p><p className="font-black text-gray-800 dark:text-gray-200">{m.salary_share}%</p></div>
                <div className="text-center bg-gray-50 dark:bg-slate-800/50 p-2 rounded-xl border border-gray-100 dark:border-slate-800"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Balans</p><p className={`font-black ${m.balance >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{f(m.balance)}</p></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editMember ? 'Tahrirlash' : 'Xodim qo\'shish'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-4 p-3.5 text-sm font-bold shadow-sm text-red-800 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 rounded-xl">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Ism</label><input type="text" required value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" /></div>
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Familiya</label><input type="text" value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" /></div>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Foydalanuvchi nomi</label><input type="text" required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">{editMember ? 'Yangi parol (bo\'sh qolsa o\'zgarmaydi)' : 'Parol *'}</label><input type="password" required={!editMember} minLength={6} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Telefon</label><input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Rol</label>
                  <select disabled={!perms.canChangeStaffStatus} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Holat</label>
                  <select disabled={!perms.canChangeStaffStatus} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
                  </select>
                </div>
              </div>
              {(formData.role === 'TEACHER' || formData.role === 'SUPPORT') && (
                <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Oylik ulushi (%)</label><input type="number" min="0" max="100" step="0.5" value={formData.salary_share} onChange={e => setFormData({...formData, salary_share: parseFloat(e.target.value)})} className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all" /></div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-colors">{editMember ? 'Saqlash' : 'Yaratish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;

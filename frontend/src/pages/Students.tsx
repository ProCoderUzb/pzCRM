import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { Plus, Users, Phone, Search, Edit2, X, Archive, RotateCcw, Trash2, AlertTriangle } from 'lucide-react';
import { usePermissions } from '../context/AuthContext';

interface Student {
  id: number; full_name: string; phone_number: string;
  parent_name: string; parent_phone: string;
  is_active: boolean; notes: string; balance: number;
}
interface ConfirmDialog { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; }

const emptyForm = { full_name: '', phone_number: '', parent_name: '', parent_phone: '', is_active: true, notes: '', balance: 0 };

const Students: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);
  const { isCEO, isAdmin } = usePermissions();
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchStudents = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('is_active', activeTab === 'active' ? 'true' : 'false');
    try { const r = await api.get(`students/?${params}`); setStudents(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, [search, activeTab]);

  const openAdd = () => { setEditStudent(null); setFormData(emptyForm); setShowModal(true); };
  const openEdit = (s: Student) => {
    setEditStudent(s);
    setFormData({ full_name: s.full_name, phone_number: s.phone_number, parent_name: s.parent_name, parent_phone: s.parent_phone, is_active: s.is_active, notes: s.notes, balance: s.balance });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editStudent) await api.patch(`students/${editStudent.id}/`, formData);
      else await api.post('students/', formData);
      setShowModal(false); fetchStudents();
    } catch (e) { console.error(e); }
  };

  const doArchive = async (s: Student) => {
    setActionLoading(s.id);
    try {
      await api.post(`students/${s.id}/archive/`);
      showToast(`${s.full_name} arxivlandi`); fetchStudents();
    } catch (e: any) { showToast(e.response?.data?.error || 'Xatolik'); }
    finally { setActionLoading(null); setConfirm(null); }
  };

  const doRestore = async (s: Student) => {
    setActionLoading(s.id);
    try {
      await api.post(`students/${s.id}/restore/`);
      showToast(`${s.full_name} tiklandi`); fetchStudents();
    } catch (e: any) { showToast(e.response?.data?.error || 'Xatolik'); }
    finally { setActionLoading(null); setConfirm(null); }
  };

  const doDelete = async (s: Student) => {
    setActionLoading(s.id);
    try {
      await api.delete(`students/${s.id}/`);
      showToast(`${s.full_name} o'chirildi`); fetchStudents();
    } catch (e: any) { showToast(e.response?.data?.error || 'Xatolik'); }
    finally { setActionLoading(null); setConfirm(null); }
  };

  const askArchive = (s: Student) => setConfirm({ title: 'Arxivlash', message: `"${s.full_name}" ni arxivlamoqchimisiz? U barcha guruhlardan chiqariladi.`, confirmLabel: 'Arxivlash', onConfirm: () => doArchive(s) });
  const askRestore = (s: Student) => setConfirm({ title: 'Tiklash', message: `"${s.full_name}" ni faol holatga qaytarmoqchimisiz?`, confirmLabel: 'Tiklash', onConfirm: () => doRestore(s) });
  const askDelete  = (s: Student) => setConfirm({ title: "O'chirish", message: `"${s.full_name}" ni BUTUNLAY o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi!`, confirmLabel: "Ha, o'chirish", danger: true, onConfirm: () => doDelete(s) });

  const fmt = (n: number) => Number(n).toLocaleString();

  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-xl shadow-xl font-bold text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-gray-950/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${confirm.danger ? 'bg-red-100 dark:bg-red-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                <AlertTriangle className={`h-5 w-5 ${confirm.danger ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{confirm.title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirm.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
              <button onClick={confirm.onConfirm} className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors ${confirm.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}>{confirm.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">O'quvchilar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeTab === 'active' ? `${students.length} faol o'quvchi` : `${students.length} arxivdagi o'quvchi`}
          </p>
        </div>
        {activeTab === 'active' && (
          <button onClick={openAdd} className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors">
            <Plus className="h-4 w-4 mr-2" />Yangi qo'shish
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-slate-800">
        <button onClick={() => setActiveTab('active')} className={`px-5 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'active' ? 'border-blue-600 text-blue-700 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
          Faol o'quvchilar
        </button>
        <button onClick={() => setActiveTab('archive')} className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'archive' ? 'border-amber-500 text-amber-700 dark:text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
          <Archive className="h-4 w-4" />Arxiv
        </button>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Ism yoki telefon bo'yicha qidirish..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-colors" />
        </div>
      </div>

      {activeTab === 'archive' && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl">
          <Archive className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-800 dark:text-amber-400">Arxivdagi o'quvchilarni <strong>tiklash</strong> yoki <strong>butunlay o'chirish</strong> mumkin.</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">Yuklanmoqda...</div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">{activeTab === 'archive' ? 'Arxivda o\'quvchilar yo\'q.' : 'O\'quvchilar topilmadi.'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">O'quvchi</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefon</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ota-onasi</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balans</th>
                  <th className="px-5 py-3 w-28"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${activeTab === 'active' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-500'}`}>
                          {s.full_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <Link to={`/students/${s.id}`} className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">{s.full_name}</Link>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400"><Phone className="inline h-3 w-3 mr-1" />{s.phone_number || '—'}</td>
                    <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{s.parent_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-bold ${s.balance < 0 ? 'text-red-600 dark:text-red-400' : s.balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>{fmt(s.balance)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {activeTab === 'active' ? (
                          <>
                            <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Tahrirlash"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => askArchive(s)} disabled={actionLoading === s.id} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors disabled:opacity-50" title="Arxivlash"><Archive className="h-4 w-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => askRestore(s)} disabled={actionLoading === s.id} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50" title="Tiklash"><RotateCcw className="h-4 w-4" /></button>
                            <button onClick={() => askDelete(s)} disabled={actionLoading === s.id} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50" title="O'chirish"><Trash2 className="h-4 w-4" /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editStudent ? "Tahrirlash" : "Yangi o'quvchi"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">To'liq ism *</label>
                <input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Telefon raqam</label>
                <input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Ota-onasi</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Ism" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                  <input type="text" placeholder="Telefon" value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
                <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              {(isCEO || isAdmin) && editStudent && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Balans (Hamyon) *</label>
                  <input type="number" required value={formData.balance} onChange={e => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-colors">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors">{editStudent ? 'Saqlash' : "Qo'shish"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

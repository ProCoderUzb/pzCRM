import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { ArrowLeft, User, Phone, BookOpen, AlertTriangle, Archive, RotateCcw, X, Edit2 } from 'lucide-react';

interface ConfirmDialog { title: string; message: string; confirmLabel: string; danger?: boolean; onConfirm: () => void; }
interface StudentProfile {
  id: number; full_name: string; phone_number: string; parent_name: string; parent_phone: string;
  balance: number; is_active: boolean; notes: string;
  enrolled_classes: { id: number; name: string; teacher: string; monthly_fee: number }[];
  payments: { id: number; amount: string; date: string; method: string; notes: string }[];
  attendance_history: { id: number; date: string; status: string; class_name: string; notes: string }[];
  stats: { total_missed: number };
}

const STATUS_LABELS: Record<string, string> = { PRESENT: 'Kelgan', ABSENT: 'Kelmagan', EXCUSED: 'Sababli' };
const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800',
  ABSENT: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  EXCUSED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
};
const METHOD_LABELS: Record<string, string> = { CASH: 'Naqd', CARD: 'Karta', TRANSFER: "O'tkazma", OTHER: 'Boshqa' };

const emptyEditForm = { full_name: '', phone_number: '', parent_name: '', parent_phone: '', notes: '', balance: 0 };

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'INFO' | 'PAYMENTS' | 'ATTENDANCE'>('INFO');
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);
  const [toast, setToast] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const fetchProfile = async () => {
    try {
      const res = await api.get(`students/${id}/profile/`);
      setProfile(res.data);
    } catch (e) {
      console.error(e); alert("O'quvchi ma'lumotlarini yuklashda xatolik."); navigate('/students');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [id]);

  const openEdit = () => {
    if (!profile) return;
    setEditForm({ full_name: profile.full_name, phone_number: profile.phone_number, parent_name: profile.parent_name, parent_phone: profile.parent_phone, notes: profile.notes, balance: profile.balance });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await api.patch(`students/${id}/`, editForm);
      setShowEditModal(false); fetchProfile(); showToast('Ma\'lumotlar saqlandi ✓');
    } catch (e: any) { showToast(e.response?.data?.detail || 'Xatolik'); }
    finally { setSubmitting(false); }
  };

  const doArchive = async () => {
    setArchiveLoading(true);
    try { await api.post(`students/${id}/archive/`); navigate('/students'); }
    catch (e: any) { showToast(e.response?.data?.error || 'Arxivlashda xatolik.'); }
    finally { setArchiveLoading(false); setConfirm(null); }
  };
  const doRestore = async () => {
    setArchiveLoading(true);
    try { await api.post(`students/${id}/restore/`); fetchProfile(); showToast('Tiklandi!'); }
    catch (e: any) { showToast(e.response?.data?.error || 'Tiklashda xatolik.'); }
    finally { setArchiveLoading(false); setConfirm(null); }
  };

  const askArchive = () => profile && setConfirm({ title: 'Arxivlash', message: `"${profile.full_name}" ni arxivlamoqchimisiz?`, confirmLabel: 'Arxivlash', onConfirm: doArchive });
  const askRestore = () => profile && setConfirm({ title: 'Tiklash', message: `"${profile.full_name}" ni tiklaysizmi?`, confirmLabel: 'Tiklash', onConfirm: doRestore });

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold">Yuklanmoqda...</div>;
  if (!profile) return null;

  const f = (n: number | string) => Number(n).toLocaleString();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {toast && <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-xl font-bold text-sm">{toast}</div>}

      {/* Confirm Dialog */}
      {confirm && (
        <div className="fixed inset-0 bg-gray-950/70 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{confirm.title}</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirm.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="px-4 py-2 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">Bekor qilish</button>
              <button onClick={confirm.onConfirm} className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600">{confirm.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Tahrirlash</h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">To'liq ism *</label>
                <input type="text" required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Telefon</label>
                <input type="text" value={editForm.phone_number} onChange={e => setEditForm({...editForm, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Ota-onasi ismi</label>
                  <input type="text" value={editForm.parent_name} onChange={e => setEditForm({...editForm, parent_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Ota-onasi tel.</label>
                  <input type="text" value={editForm.parent_phone} onChange={e => setEditForm({...editForm, parent_phone: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Izoh</label>
                <textarea rows={2} value={editForm.notes} onChange={e => setEditForm({...editForm, notes: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
              </div>
              {(perms.isCEO || perms.isAdmin) && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Balans</label>
                  <input type="number" value={editForm.balance} onChange={e => setEditForm({...editForm, balance: parseFloat(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 transition-all" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300">Bekor qilish</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2">
                  {submitting && <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3 flex-wrap">
            {profile.full_name}
            {!profile.is_active && <span className="text-xs font-black uppercase tracking-widest bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/50">Arxivlangan</span>}
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">O'quvchi profili va tarixi</p>
        </div>
        <div className="flex items-center gap-2">
          {perms.canEditStudents && (
            <button onClick={openEdit} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 hover:bg-blue-100 transition-colors">
              <Edit2 className="h-4 w-4" />Tahrirlash
            </button>
          )}
          {perms.canEditStudents && (
            profile.is_active ? (
              <button onClick={askArchive} disabled={archiveLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 transition-colors disabled:opacity-50">
                <Archive className="h-4 w-4" />Arxivlash
              </button>
            ) : (
              <button onClick={askRestore} disabled={archiveLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 hover:bg-green-100 transition-colors disabled:opacity-50">
                <RotateCcw className="h-4 w-4" />Tiklash
              </button>
            )
          )}
        </div>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`p-5 rounded-2xl border flex flex-col justify-center ${profile.balance >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${profile.balance >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>Hozirgi Balans</p>
          <p className={`text-3xl font-black truncate ${profile.balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{f(profile.balance)} UZS</p>
          {profile.balance < 0 && <p className="text-xs font-medium text-red-500 dark:text-red-400 mt-1">Qarz: {f(Math.abs(profile.balance))} UZS</p>}
        </div>
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl"><AlertTriangle className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Qoldirilgan darslar</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.stats.total_missed} <span className="text-sm text-gray-400 font-bold">marta</span></p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-800">
          {(['INFO','PAYMENTS','ATTENDANCE'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === t ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t === 'INFO' ? 'Asosiy va Guruhlar' : t === 'PAYMENTS' ? "To'lovlar tarixi" : 'Davomat tarixi'}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'INFO' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-2">Aloqa ma'lumotlari</h3>
                <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3"><Phone className="h-5 w-5 text-gray-400" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">O'quvchi telefoni</p><p className="font-bold text-gray-900 dark:text-white">{profile.phone_number || 'Kiritilmagan'}</p></div></div>
                  {profile.parent_name && (
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-slate-700/50"><User className="h-5 w-5 text-indigo-400" /><div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Ota-onasi ({profile.parent_name})</p><p className="font-bold text-gray-900 dark:text-white">{profile.parent_phone || 'Kiritilmagan'}</p></div></div>
                  )}
                  {profile.notes && <div className="pt-3 border-t border-gray-200 dark:border-slate-700/50"><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Eslatma</p><p className="text-sm text-gray-700 dark:text-gray-300">{profile.notes}</p></div>}
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-2">{profile.is_active ? 'Faol' : 'Avvalgi'} Guruhlari ({profile.enrolled_classes.length})</h3>
                {profile.enrolled_classes.length === 0 ? <p className="text-sm text-gray-500 font-medium py-4">Guruhlarga biriktirilmagan.</p> : (
                  <div className="space-y-3">
                    {profile.enrolled_classes.map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><BookOpen className="h-5 w-5" /></div>
                          <div><p className="font-bold text-gray-900 dark:text-white">{c.name}</p><p className="text-xs font-bold text-gray-500">Ustoz: {c.teacher}</p></div>
                        </div>
                        <div className="text-right"><p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Oylik to'lov</p><p className="font-black text-gray-900 dark:text-white">{f(c.monthly_fee)}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'PAYMENTS' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr><th className="px-5 py-3">Sana</th><th className="px-5 py-3">Summa</th><th className="px-5 py-3">Usul</th><th className="px-5 py-3">Izoh</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {profile.payments.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500 font-bold">To'lovlar topilmadi.</td></tr>
                    : profile.payments.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-200">{p.date}</td>
                        <td className="px-5 py-4 font-black text-green-600 dark:text-green-500">+{f(p.amount)}</td>
                        <td className="px-5 py-4"><span className="px-2.5 py-1 text-xs font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-lg">{METHOD_LABELS[p.method] || p.method}</span></td>
                        <td className="px-5 py-4 font-medium text-gray-500 truncate max-w-[200px]">{p.notes || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'ATTENDANCE' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <tr><th className="px-5 py-3">Sana</th><th className="px-5 py-3">Holat</th><th className="px-5 py-3">Guruh</th><th className="px-5 py-3">Izoh</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {profile.attendance_history.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500 font-bold">Davomat rekordi topilmadi.</td></tr>
                    : profile.attendance_history.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-200">{a.date}</td>
                        <td className="px-5 py-4"><span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${STATUS_COLORS[a.status] || ''}`}>{STATUS_LABELS[a.status] || a.status}</span></td>
                        <td className="px-5 py-4 font-bold text-gray-700 dark:text-gray-300">{a.class_name}</td>
                        <td className="px-5 py-4 font-medium text-gray-500 truncate max-w-[200px]">{a.notes || '-'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDetail;

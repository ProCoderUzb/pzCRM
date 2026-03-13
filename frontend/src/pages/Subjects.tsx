import React, { useEffect, useState } from 'react';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { Plus, BookOpenCheck, Search, Edit2, X, Trash2 } from 'lucide-react';

interface Subject { id: number; name: string; description: string; }

const Subjects: React.FC = () => {
  const perms = usePermissions();
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const fetchSubjects = async () => {
    try { const r = await api.get('subjects/'); setSubjects(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openAdd = () => { setEditSubject(null); setFormData({ name: '', description: '' }); setShowModal(true); };
  const openEdit = (s: Subject) => { setEditSubject(s); setFormData({ name: s.name, description: s.description }); setShowModal(true); };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Rostdan ham ushbu fanni o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`subjects/${id}/`);
      fetchSubjects();
    } catch (e) {
      alert("O'chirishda xatolik yuz berdi. Ehtimol ushbu fan guruhlarga biriktirilgandir.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editSubject) await api.patch(`subjects/${editSubject.id}/`, formData);
      else await api.post('subjects/', formData);
      setShowModal(false); fetchSubjects();
    } catch (e) { console.error(e); }
  };

  const filtered = subjects.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fanlar / Kurslar</h1>
        {perms.canEditClasses && (
          <button onClick={openAdd} className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors">
            <Plus className="h-4 w-4 mr-2" />Qo'shish
          </button>
        )}
      </div>

      <div className="flex gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 font-bold">Yuklanmoqda...</div>
        : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors"><BookOpenCheck className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400 font-bold">Fanlar topilmadi.</p></div>
        ) : filtered.map(s => (
          <div key={s.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 hover:shadow-md transition-all group relative">
            <div className="flex items-start mb-4 justify-between">
              <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm"><BookOpenCheck className="h-6 w-6" /></div>
              {perms.canEditClasses && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
              )}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{s.name}</h3>
            {s.description && <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2">{s.description}</p>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editSubject ? 'Tahrirlash' : 'Fan qo\'shish'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Nomi</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Tavsif</label><textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all" /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors">{editSubject ? 'Saqlash' : 'Yaratish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;

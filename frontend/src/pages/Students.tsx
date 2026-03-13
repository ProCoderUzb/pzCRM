import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, Users, Phone, Search, Edit2, X } from 'lucide-react';

interface Student { id: number; full_name: string; phone_number: string; parent_name: string; parent_phone: string; is_active: boolean; notes: string; balance: number; }

const emptyForm = { full_name: '', phone_number: '', parent_name: '', parent_phone: '', is_active: true, notes: '' };

const Students: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchStudents = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterActive !== '') params.set('is_active', filterActive);
    try { const r = await api.get(`students/?${params}`); setStudents(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStudents(); }, [search, filterActive]);

  const openAdd = () => { setEditStudent(null); setFormData(emptyForm); setShowModal(true); };
  const openEdit = (s: Student) => { setEditStudent(s); setFormData({ full_name: s.full_name, phone_number: s.phone_number, parent_name: s.parent_name, parent_phone: s.parent_phone, is_active: s.is_active, notes: s.notes }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editStudent) await api.patch(`students/${editStudent.id}/`, formData);
      else await api.post('students/', formData);
      setShowModal(false); fetchStudents();
    } catch (e) { console.error(e); }
  };

  const active = students.filter(s => s.is_active).length;

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">O'quvchilar</h1><p className="text-sm text-gray-500 dark:text-gray-400">{active} faol · {students.length - active} nofaol</p></div>
        <button onClick={openAdd} className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"><Plus className="h-4 w-4 mr-2" />Yangi qo'shish</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
          <input type="text" placeholder="Ism yoki telefon bo'yicha qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <select value={filterActive} onChange={e => setFilterActive(e.target.value)} className="px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl text-sm font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option value="">Barcha o'quvchilar</option>
          <option value="true">Faqat faollar</option>
          <option value="false">Faqat nofaollar</option>
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">Yuklanmoqda...</div>
        : students.length === 0 ? (
          <div className="p-12 text-center"><Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" /><p className="text-gray-500 dark:text-gray-400 font-medium">O'quvchilar topilmadi.</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
              <thead className="bg-gray-50 dark:bg-slate-800/50"><tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">O'quvchi</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holati</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefon</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ota-onasi</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balans</th>
                <th className="px-5 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 transition-colors">
                {students.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs shrink-0">{s.full_name[0]?.toUpperCase()}</div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3"><span className={`px-2.5 py-1 text-xs font-bold rounded-full ${s.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800/50' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}>{s.is_active ? 'Faol' : 'Nofaol'}</span></td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400"><Phone className="inline h-3 w-3 mr-1" />{s.phone_number || '—'}</td>
                    <td className="px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400">{s.parent_name || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-sm font-bold ${s.balance < 0 ? 'text-red-600 dark:text-red-400' : s.balance > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {Number(s.balance).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right"><button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1"><Edit2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editStudent ? 'O\'quvchini tahrirlash' : 'Yangi o\'quvchi qo\'shish'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">To'liq ism</label><input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" /></div>
              <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Telefon raqam</label><input type="text" value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" /></div>
              <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Ota-onasi / Vasiy</p>
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" placeholder="Ism familiya" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  <input type="text" placeholder="Telefon raqami" value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} className="px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="h-5 w-5 text-blue-600 bg-gray-50 dark:bg-slate-800 border-gray-300 dark:border-slate-600 rounded focus:ring-blue-500" />
                <label htmlFor="is_active" className="text-sm font-bold text-gray-700 dark:text-gray-300">Faol o'quvchi</label>
              </div>
              <div><label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Qo'shimcha ma'lumot</label><textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" /></div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors">{editStudent ? 'Saqlash' : 'Qo\'shish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;

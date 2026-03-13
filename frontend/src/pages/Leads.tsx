import React, { useEffect, useState } from 'react';
import api from '../api';
import { Plus, UserPlus, Phone, Calendar, Search, Edit2, X } from 'lucide-react';

interface Lead { id: number; full_name: string; phone_number: string; status: string; notes: string; created_at: string; }

const STATUS_OPTIONS = [
  { value: 'NEW',              label: 'Yangi so\'rov',        color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 shadow-sm' },
  { value: 'CONTACTED',        label: 'Bog\'lanildi',         color: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50 shadow-sm' },
  { value: 'TRIAL_SCHEDULED',  label: 'Sinov darsiga yozildi',color: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 shadow-sm' },
  { value: 'TRIAL_DONE',       label: 'Sinov darsiga o\'tdi', color: 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 shadow-sm' },
  { value: 'ENROLLED',         label: 'Qabul qilindi',        color: 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-800/50 shadow-sm' },
  { value: 'REJECTED',         label: 'Rad etildi / Yo\'qotildi',color: 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-800/50 shadow-sm' },
];
const getStyle = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.color || 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700 shadow-sm';

const emptyForm = { full_name: '', phone_number: '', status: 'NEW', notes: '' };

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchLeads = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const r = await api.get(`leads/?${params}`);
      setLeads(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, [search, filterStatus]);

  const openAdd = () => { setEditLead(null); setFormData(emptyForm); setShowModal(true); };
  const openEdit = (lead: Lead) => { setEditLead(lead); setFormData({ full_name: lead.full_name, phone_number: lead.phone_number, status: lead.status, notes: lead.notes }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editLead) await api.patch(`leads/${editLead.id}/`, formData);
      else await api.post('leads/', formData);
      setShowModal(false); fetchLeads();
    } catch (e) { console.error(e); }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try { await api.patch(`leads/${id}/`, { status }); fetchLeads(); } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mijozlar (Leads)</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            {STATUS_OPTIONS.map(s => (
              <span key={s.value} className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 ${s.color} rounded-md`}>{leads.filter(l => l.status === s.value).length} {s.label}</span>
            ))}
          </div>
        </div>
        <button onClick={openAdd} className="inline-flex items-center px-5 py-2.5 text-sm font-bold rounded-xl text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors cursor-pointer">
          <Plus className="h-4 w-4 mr-2" /> Mijoz qo'shish
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Ism yoki telefon orqali izlash..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
          <option value="">Barcha holatlar</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white dark:bg-slate-900 shadow-sm rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? <div className="p-16 text-center text-gray-500 dark:text-gray-400 font-bold">Yuklanmoqda...</div>
        : leads.length === 0 ? (
          <div className="p-16 text-center"><UserPlus className="h-16 w-16 text-gray-300 dark:text-slate-700 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400 font-bold text-lg">Mijozlar topilmadi.</p></div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/50"><tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ism</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefon</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Holat</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sana</th>
              <th className="px-6 py-4"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {leads.map(lead => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/40 border border-green-200 dark:border-green-800/50 flex items-center justify-center text-green-700 dark:text-green-400 font-black text-sm shadow-sm">{lead.full_name[0]?.toUpperCase()}</div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{lead.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono font-bold text-gray-600 dark:text-gray-300"><Phone className="inline h-3.5 w-3.5 mr-2 text-gray-400 dark:text-gray-500" />{lead.phone_number}</td>
                  <td className="px-6 py-4">
                    <select value={lead.status} onChange={e => handleStatusChange(lead.id, e.target.value)} className={`text-[10px] uppercase tracking-wider font-black rounded-lg px-3 py-1.5 cursor-pointer appearance-none ${getStyle(lead.status)}`}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value} className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white font-bold">{o.label}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-500 dark:text-gray-400"><Calendar className="inline h-3.5 w-3.5 mr-2" />{new Date(lead.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => openEdit(lead)} className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg cursor-pointer"><Edit2 className="h-5 w-5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editLead ? 'Mijozni tahrirlash' : 'Mijoz qo\'shish'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1.5 bg-gray-100 dark:bg-slate-800 rounded-xl cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">F.I.SH</label><input type="text" required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Telefon</label><input type="text" required value={formData.phone_number} onChange={e => setFormData({...formData, phone_number: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-mono" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Holat</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all">
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Izohlar</label><textarea rows={3} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all resize-none" /></div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors cursor-pointer">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition-colors cursor-pointer">{editLead ? 'Yangilash' : 'Saqlash'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;

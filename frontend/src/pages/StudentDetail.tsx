import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { ArrowLeft, User, Phone, BookOpen, Clock, AlertTriangle, Wallet } from 'lucide-react';

interface StudentProfile {
  id: number;
  full_name: string;
  phone_number: string;
  parent_name: string;
  parent_phone: string;
  balance: number;
  is_active: boolean;
  enrolled_classes: { id: number; name: string; teacher: string; monthly_fee: number }[];
  payments: { id: number; amount: string; date: string; method: string; notes: string }[];
  charges: { id: number; amount: string; date: string; class_name: string }[];
  attendance_history: { id: number; date: string; status: string; class_name: string; notes: string }[];
  stats: { total_missed: number };
}

const STATUS_LABELS: Record<string, string> = { PRESENT: "Kelgan", ABSENT: "Kelmagan", EXCUSED: "Sababli" };
const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  ABSENT: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  EXCUSED: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
};

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const perms = usePermissions();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'INFO' | 'PAYMENTS' | 'CHARGES' | 'ATTENDANCE'>('INFO');

  const fetchProfile = async () => {
    try {
      const res = await api.get(`students/${id}/profile/`);
      setProfile(res.data);
    } catch (e) {
      console.error(e);
      alert("O'quvchi ma'lumotlarini yuklashda xatolik.");
      navigate('/students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  if (!perms.canEditStudents && !perms.isTeacher) {
    navigate('/dashboard');
    return null;
  }

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold">Yuklanmoqda...</div>;
  if (!profile) return null;

  const f = (n: number | string) => Number(n).toLocaleString();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header & Back Action */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            {profile.full_name}
            {!profile.is_active && <span className="text-xs font-black uppercase tracking-widest bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-md">Arxivlangan</span>}
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">O'quvchi profili va tarixi</p>
        </div>
      </div>

      {/* Top Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-5 rounded-2xl border flex flex-col justify-center ${profile.balance >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/50' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${profile.balance >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>Hozirgi Balans</p>
          <p className={`text-3xl font-black truncate ${profile.balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{f(profile.balance)} UZS</p>
        </div>
        
        <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl"><AlertTriangle className="h-6 w-6" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">Qoldirilgan darslar</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{profile.stats.total_missed} <span className="text-sm text-gray-400 font-bold">marta</span></p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden transition-colors">
        
        {/* Tabs */}
        <div className="flex overflow-x-auto border-b border-gray-200 dark:border-slate-800 scrollbar-hide">
          <button onClick={() => setActiveTab('INFO')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'INFO' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Asosiy va Guruhlar</button>
          <button onClick={() => setActiveTab('PAYMENTS')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'PAYMENTS' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>To'lovlar tarixi</button>
          <button onClick={() => setActiveTab('CHARGES')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'CHARGES' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Ayrilgan summalar</button>
          <button onClick={() => setActiveTab('ATTENDANCE')} className={`px-6 py-4 text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'ATTENDANCE' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>Davomat tarixi</button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'INFO' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-2">Aloqa ma'lumotlari</h3>
                <div className="bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">O'quvchi telefoni</p><p className="font-bold text-gray-900 dark:text-white">{profile.phone_number || 'Kiritilmagan'}</p></div>
                  </div>
                  {profile.parent_name && (
                    <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-slate-700/50">
                      <User className="h-5 w-5 text-indigo-400" />
                      <div><p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Ota-onasi ({profile.parent_name})</p><p className="font-bold text-gray-900 dark:text-white">{profile.parent_phone || 'Kiritilmagan'}</p></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Enrolled Classes */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-2">Faol Guruhlari ({profile.enrolled_classes.length})</h3>
                {profile.enrolled_classes.length === 0 ? (
                  <p className="text-sm text-gray-500 font-medium py-4">Guruhlarga biriktirilmagan.</p>
                ) : (
                  <div className="space-y-3">
                    {profile.enrolled_classes.map(c => (
                      <div key={c.id} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0"><BookOpen className="h-5 w-5" /></div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                            <p className="text-xs font-bold text-gray-500">Ustoz: {c.teacher}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Oylik to'lov</p>
                          <p className="font-black text-gray-900 dark:text-white">{f(c.monthly_fee)}</p>
                        </div>
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
                  <tr><th className="px-5 py-3 rounded-tl-xl">Sana</th><th className="px-5 py-3">Summa</th><th className="px-5 py-3">Usul</th><th className="px-5 py-3 rounded-tr-xl">Izoh</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {profile.payments.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500 font-bold">To'lovlar topilmadi.</td></tr> : profile.payments.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-200">{p.date}</td>
                      <td className="px-5 py-4 font-black text-green-600 dark:text-green-500">+{f(p.amount)}</td>
                      <td className="px-5 py-4"><span className="px-2.5 py-1 text-xs font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-lg">{p.method}</span></td>
                      <td className="px-5 py-4 font-medium text-gray-500 truncate max-w-[200px]">{p.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'CHARGES' && (
             <div className="overflow-x-auto">
             <table className="w-full text-left text-sm whitespace-nowrap">
               <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                 <tr><th className="px-5 py-3 rounded-tl-xl">Sana (Oylik kesish)</th><th className="px-5 py-3">Summa</th><th className="px-5 py-3 rounded-tr-xl">Guruh</th></tr>
               </thead>
               <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                 {profile.charges.length === 0 ? <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-500 font-bold">Ayrilgan summalar topilmadi.</td></tr> : profile.charges.map(c => (
                   <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                     <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-200">{c.date}</td>
                     <td className="px-5 py-4 font-black text-red-600 dark:text-red-400">-{f(c.amount)}</td>
                     <td className="px-5 py-4 font-bold text-gray-700 dark:text-gray-300"><span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-gray-400" /> {c.class_name}</span></td>
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
                  <tr><th className="px-5 py-3 rounded-tl-xl">Sana</th><th className="px-5 py-3">Holat</th><th className="px-5 py-3">Guruh</th><th className="px-5 py-3 rounded-tr-xl">Izoh</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {profile.attendance_history.length === 0 ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-500 font-bold">Davomat rekordi topilmadi.</td></tr> : profile.attendance_history.map(a => (
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

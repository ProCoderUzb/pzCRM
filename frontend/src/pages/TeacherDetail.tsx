import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, BookOpen, Users, DollarSign, Save, X, AlertTriangle } from 'lucide-react';

interface Teacher {
  id: number; username: string; first_name: string; last_name: string;
  phone_number: string; role: string; status: string; balance: number;
  salary_share: number; display_name: string;
}
interface Group {
  id: number; name: string; subject_name: string; monthly_fee: string;
  student_count: number; days: string; start_time: string; end_time: string;
}

const ROLE_LABELS: Record<string, string> = { TEACHER: "O'qituvchi", ADMIN: 'Administrator', CEO: 'Direktor', DEV: 'Developer' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Faol', ON_LEAVE: "Ta'tilda", PROBATION: 'Sinov', TERMINATED: "Bo'shatilgan" };
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  ON_LEAVE: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500',
  PROBATION: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-500',
  TERMINATED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-500',
};

const TeacherDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [salaryShare, setSalaryShare] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [toastError, setToastError] = useState(false);

  const showToast = (msg: string, err = false) => {
    setToast(msg); setToastError(err);
    setTimeout(() => setToast(''), 3500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, gRes] = await Promise.all([
        api.get(`users/${id}/`),
        api.get(`classes/?teacher=${id}`),
      ]);
      setTeacher(tRes.data);
      setSalaryShare(String(tRes.data.salary_share ?? 0));
      setGroups(gRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSaveShare = async () => {
    if (!teacher) return;
    setSaving(true);
    try {
      await api.patch(`users/${teacher.id}/`, { salary_share: parseFloat(salaryShare) || 0 });
      showToast('Oylik foiz saqlandi ✓');
      fetchData();
    } catch (e: any) {
      showToast(e.response?.data?.detail || 'Saqlashda xatolik', true);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-12 text-center text-gray-500 font-bold">Yuklanmoqda...</div>;
  if (!teacher) return <div className="p-12 text-center text-gray-500">Topilmadi.</div>;

  const fmt = (n: number | string) => Number(n).toLocaleString();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-xl font-bold text-sm text-white ${toastError ? 'bg-red-600' : 'bg-gray-900 dark:bg-emerald-700'}`}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/teachers')} className="p-2 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{teacher.display_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{ROLE_LABELS[teacher.role] || teacher.role}</span>
            <span className="text-gray-300 dark:text-slate-600">·</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${STATUS_COLORS[teacher.status] || ''}`}>{STATUS_LABELS[teacher.status] || teacher.status}</span>
          </div>
        </div>
      </div>

      {/* Info + Salary Share Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Aloqa</h2>
          {teacher.phone_number && (
            <div className="flex items-center gap-3">
              <span className="text-lg">📞</span>
              <span className="font-bold text-gray-900 dark:text-white">{teacher.phone_number}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-lg">👤</span>
            <span className="font-medium text-gray-600 dark:text-gray-400">@{teacher.username}</span>
          </div>
        </div>

        {/* Salary Share Editor */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-violet-200 dark:border-violet-800/40 p-6 shadow-sm">
          <h2 className="text-xs font-black uppercase tracking-widest text-violet-500 dark:text-violet-400 mb-4">Oylik foizi</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={salaryShare}
                  onChange={e => setSalaryShare(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-xl font-black focus:ring-2 focus:ring-violet-500 transition-all"
                />
                <span className="absolute right-4 top-3 text-xl font-black text-gray-400">%</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                Yig'ilgan to'lovlarning qancha foizi o'qituvchiga beriladi
              </p>
            </div>
            <button
              onClick={handleSaveShare}
              disabled={saving}
              className="shrink-0 flex items-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />{saving ? '...' : 'Saqlash'}
            </button>
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-purple-500" />Guruhlar ({groups.length})
          </h2>
        </div>
        {groups.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Guruhlar topilmadi.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-800/50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Guruh</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fan</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">O'quvchilar</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Oylik to'lov</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60">
              {groups.map(g => (
                <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/classes/${g.id}`)}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white">{g.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-600 dark:text-gray-400">{g.subject_name}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-700 dark:text-gray-300">
                      <Users className="h-3.5 w-3.5" />{g.student_count}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span className="font-black text-emerald-700 dark:text-emerald-400">{fmt(parseFloat(g.monthly_fee))}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TeacherDetail;

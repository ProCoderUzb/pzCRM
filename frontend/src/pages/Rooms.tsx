import React, { useEffect, useState } from 'react';
import api from '../api';
import { usePermissions } from '../context/AuthContext';
import { Plus, DoorOpen, Search, Edit2, X, Trash2 } from 'lucide-react';

interface Room { id: number; name: string; capacity: number; }

const Rooms: React.FC = () => {
  const perms = usePermissions();
  const [rooms, setRooms] = useState<Room[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({ name: '', capacity: 20 });

  const fetchRooms = async () => {
    try { const r = await api.get('rooms/'); setRooms(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const openAdd = () => { setEditRoom(null); setFormData({ name: '', capacity: 20 }); setShowModal(true); };
  const openEdit = (r: Room) => { setEditRoom(r); setFormData({ name: r.name, capacity: r.capacity }); setShowModal(true); };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Rostdan ham ushbu xonani o'chirmoqchimisiz?")) return;
    try {
      await api.delete(`rooms/${id}/`);
      fetchRooms();
    } catch (e) {
      alert("O'chirishda xatolik yuz berdi. Ehtimol ushbu xonada darslar bordir.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editRoom) await api.patch(`rooms/${editRoom.id}/`, formData);
      else await api.post('rooms/', formData);
      setShowModal(false); fetchRooms();
    } catch (e) { console.error(e); }
  };

  const filtered = rooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Xonalar</h1>
        {perms.canEditClasses && (
          <button onClick={openAdd} className="inline-flex items-center px-4 py-2 text-sm font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors">
            <Plus className="h-4 w-4 mr-2" />Qo'shish
          </button>
        )}
      </div>

      <div className="flex gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm transition-colors">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Qidirish..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 font-bold">Yuklanmoqda...</div>
        : filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 transition-colors"><DoorOpen className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-4" /><p className="text-gray-500 dark:text-gray-400 font-bold">Xonalar topilmadi.</p></div>
        ) : filtered.map(room => (
          <div key={room.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm p-5 text-center hover:shadow-md transition-all group relative">
            {perms.canEditClasses && (
              <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(room)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"><Edit2 className="h-4 w-4" /></button>
                <button onClick={() => handleDelete(room.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1.5 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
            <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto shadow-sm mb-4">
              <DoorOpen className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">{room.name}</h3>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mt-1">Sig'im: {room.capacity}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-gray-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-200 dark:border-slate-800 transition-colors">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editRoom ? 'Tahrirlash' : 'Xona qo\'shish'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors bg-gray-100 dark:bg-slate-800 p-1.5 rounded-xl"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Nomi</label><input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" /></div>
              <div><label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Sig'im</label><input type="number" min="1" value={formData.capacity} onChange={e => setFormData({...formData, capacity: +e.target.value})} className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" /></div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">Bekor qilish</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors">{editRoom ? 'Saqlash' : 'Yaratish'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;

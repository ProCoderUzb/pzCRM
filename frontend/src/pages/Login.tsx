import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import api from '../api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('token/', {
        username,
        password,
      });
      
      login(response.data.access, response.data.refresh);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-500">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-xl dark:shadow-2xl border border-gray-100 dark:border-slate-800 transition-all">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
            <LogIn className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            EduCRM
          </h2>
          <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">
            Tizimga kirish uchun malumotlaringizni kiriting
          </p>
        </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm font-bold p-4 rounded-xl border border-red-100 dark:border-red-800/50 text-center animate-shake">
              {error === 'Invalid username or password' ? 'Login yoki parol xato' : error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Login</label>
              <input
                id="username"
                type="text"
                required
                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-green-500 dark:focus:border-green-500 text-gray-900 dark:text-white rounded-2xl focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600 font-bold sm:text-sm shadow-sm"
                placeholder="Foydalanuvchi nomi"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 ml-1">Parol</label>
              <input
                id="password"
                type="password"
                required
                className="block w-full px-4 py-3.5 bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-green-500 dark:focus:border-green-500 text-gray-900 dark:text-white rounded-2xl focus:outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600 font-bold sm:text-sm shadow-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex justify-center py-4 px-4 text-sm font-black rounded-2xl text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/20 transition-all shadow-lg shadow-green-600/20 active:scale-95 transform"
            >
              Kirish
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

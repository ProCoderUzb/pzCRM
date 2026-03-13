import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth, usePermissions } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  BarChart3, Users, UserPlus, BookOpen, LogOut,
  DoorOpen, DollarSign, GraduationCap, BookOpenCheck,
  ClipboardCheck, CalendarDays, FileBarChart, Sun, Moon,
  ChevronLeft, ChevronRight
} from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  DEV:     'bg-red-100 text-red-700',
  CEO:     'bg-yellow-100 text-yellow-700',
  ADMIN:   'bg-blue-100 text-blue-700',
  TEACHER: 'bg-purple-100 text-purple-700',
};

const ALL_NAV = [
  { name: 'Bosh sahifa',  path: '/dashboard',  Icon: BarChart3,      color: 'text-blue-400',    perm: 'always' },
  { name: 'Lidlar',       path: '/leads',      Icon: UserPlus,       color: 'text-green-400',   perm: 'canViewLeads' },
  { name: 'O\'quvchilar', path: '/students',   Icon: Users,          color: 'text-sky-400',     perm: 'always' },
  { name: 'Guruhlar',     path: '/classes',    Icon: BookOpen,       color: 'text-purple-400',  perm: 'always' },
  { name: 'Davomat',      path: '/attendance', Icon: ClipboardCheck, color: 'text-rose-400',    perm: 'always' },
  { name: 'Jadval',       path: '/schedule',   Icon: CalendarDays,   color: 'text-cyan-400',    perm: 'canViewSchedule' },
  { name: 'Xodimlar',     path: '/teachers',   Icon: GraduationCap,  color: 'text-teal-400',    perm: 'canManageStaff' },
  { name: 'Fanlar',       path: '/subjects',   Icon: BookOpenCheck,  color: 'text-amber-400',   perm: 'canEditClasses' },
  { name: 'Xonalar',      path: '/rooms',      Icon: DoorOpen,       color: 'text-indigo-400',  perm: 'canEditClasses' },
  { name: 'Moliya',       path: '/finance',    Icon: DollarSign,     color: 'text-emerald-400', perm: 'canViewFinanceDebt' },
  { name: 'Hisobotlar',   path: '/reports',    Icon: FileBarChart,   color: 'text-violet-400',  perm: 'canViewReports' },
];

const Layout: React.FC = () => {
  const { logout, currentUser } = useAuth();
  const perms = usePermissions();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Filter nav items by permission
  const navItems = ALL_NAV.filter(item => {
    if (currentUser?.role === 'TEACHER') {
        // Teachers ONLY see Classes, Attendance, and Schedule
        return ['Guruhlar', 'Davomat', 'Jadval'].includes(item.name);
    }
    if (item.perm === 'always') return true;
    return (perms as any)[item.perm] === true;
  });

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden transition-colors duration-200">
      {/* ── Sidebar ── */}
      <div className={`flex flex-col bg-gray-950 h-screen fixed shrink-0 transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 shrink-0 h-16">
          <div className="flex items-center overflow-hidden">
            <BookOpen className="h-6 w-6 text-green-400 shrink-0" />
            {!isCollapsed && <span className="ml-3 text-lg font-bold text-white tracking-tight truncate">EduCRM</span>}
          </div>
        </div>

        {/* Toggle button */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="absolute -right-3.5 top-20 bg-gray-800 text-gray-400 hover:text-white border-2 border-slate-950 rounded-full p-1 z-30 transition-transform hover:scale-110">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map(({ name, path, Icon, color }) => (
            <NavLink key={name} to={path}
              title={isCollapsed ? name : undefined}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all ${
                  isActive ? 'bg-white/10 text-white shadow-sm' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                } ${isCollapsed ? 'justify-center' : ''}`
              }>
              <Icon className={`w-5 h-5 shrink-0 ${color}`} />
              {!isCollapsed && <span className="ml-3 truncate">{name}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User card summary (always shows if collapsed, full if not) */}
        {currentUser && (
          <div className={`mx-3 mb-3 p-3 rounded-xl bg-white/5 border border-white/10 shrink-0 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-inner">
                {currentUser.display_name[0]?.toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{currentUser.display_name}</p>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-bold ${ROLE_COLORS[currentUser.role] || 'bg-gray-100 text-gray-600'}`}>
                    {currentUser.role}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="p-3 border-t border-gray-800 shrink-0">
          <button onClick={() => { logout(); navigate('/'); }}
            className={`flex items-center px-3 py-2.5 text-sm text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors ${isCollapsed ? 'justify-center w-full' : 'w-full'}`}>
            <LogOut className="w-5 h-5 shrink-0" /> {!isCollapsed && <span className="ml-3 font-medium">Chiqish</span>}
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-6 py-3 shrink-0 transition-colors duration-200">
          <div className="ml-auto flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-slate-800">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            {currentUser && (
              <>
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white font-bold text-xs">
                  {currentUser.display_name[0]?.toUpperCase()}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{currentUser.display_name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{currentUser.role_display}</p>
                </div>
              </>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-slate-950 p-6 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

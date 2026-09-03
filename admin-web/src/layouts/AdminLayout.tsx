import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard, GraduationCap, Users, Briefcase, BookOpen, UsersRound,
  Send, Clock, Archive, BarChart3, Settings, Menu, X, Bell, LogOut, User, ChevronDown, Upload, BellRing, CheckSquare
} from 'lucide-react';
import { cn } from '@/utils/cn';
import ApiErrorBanner from '@/components/ui/ApiErrorBanner';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="h-5 w-5" /> },
  { to: '/eleves', label: 'Élèves', icon: <GraduationCap className="h-5 w-5" /> },
  { to: '/parents', label: 'Parents', icon: <Users className="h-5 w-5" /> },
  { to: '/personnel', label: 'Personnel', icon: <Briefcase className="h-5 w-5" /> },
  { to: '/classes', label: 'Classes', icon: <BookOpen className="h-5 w-5" /> },
  { to: '/groupes', label: 'Groupes', icon: <UsersRound className="h-5 w-5" /> },
  { to: '/messages', label: 'Messages', icon: <Send className="h-5 w-5" /> },
  { to: '/programmes', label: 'Programmés', icon: <Clock className="h-5 w-5" /> },
  { to: '/historique', label: 'Historique', icon: <Archive className="h-5 w-5" /> },
  { to: '/statistiques', label: 'Statistiques', icon: <BarChart3 className="h-5 w-5" /> },
  { to: '/import', label: 'Import Excel', icon: <Upload className="h-5 w-5" /> },
  { to: '/notifications', label: 'Notifications', icon: <BellRing className="h-5 w-5" /> },
  { to: '/accuses', label: 'Accusés', icon: <CheckSquare className="h-5 w-5" /> },
  { to: '/parametres', label: 'Paramètres', icon: <Settings className="h-5 w-5" /> },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/eleves': 'Gestion des élèves',
  '/parents': 'Gestion des parents',
  '/personnel': 'Gestion du personnel',
  '/classes': 'Gestion des classes',
  '/groupes': 'Gestion des groupes',
  '/messages': 'Nouveau message',
  '/programmes': 'Messages programmés',
  '/historique': 'Historique des messages',
  '/statistiques': 'Statistiques',
  '/import': 'Import Excel',
  '/notifications': 'Gestion des notifications',
  '/accuses': 'Suivi des accusés',
  '/parametres': 'Paramètres',
};

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPage = pageTitles[location.pathname] || 'EduConnect Admin';

  return (
    <div className="flex h-screen bg-[#F0F4FF]">
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#1E293B] transition-transform duration-300 lg:static lg:translate-x-0', sidebarOpen ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-3 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light"><GraduationCap className="h-5 w-5 text-white" /></div>
          <div><h1 className="text-base font-bold text-white">EduConnect</h1><p className="text-[10px] text-slate-400">Administration</p></div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 lg:hidden"><X className="h-5 w-5" /></button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto scrollbar-thin px-3">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} onClick={() => setSidebarOpen(false)} className={({ isActive }) => cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors mb-0.5', isActive ? 'bg-primary text-white' : 'text-slate-300 hover:bg-slate-700 hover:text-white')}>
              {item.icon}{item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
            <div className="flex-1 overflow-hidden"><p className="truncate text-sm font-medium text-white">{user?.firstName} {user?.lastName}</p><p className="truncate text-xs text-slate-400">Administrateur</p></div>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="text-gray-500 lg:hidden"><Menu className="h-6 w-6" /></button><h2 className="text-lg font-semibold text-gray-900">{currentPage}</h2></div>
          <div className="flex items-center gap-3">
            <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"><Bell className="h-5 w-5" /><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" /></button>
            <div className="relative">
              <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
                <span className="hidden text-sm font-medium text-gray-700 sm:block">{user?.firstName} {user?.lastName}</span><ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              {dropdownOpen && <><div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} /><div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-gray-100 bg-white py-1 shadow-lg"><button onClick={() => setDropdownOpen(false)} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"><User className="h-4 w-4" /> Profil</button><hr className="my-1 border-gray-100" /><button onClick={logout} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" /> Déconnexion</button></div></>}
            </div>
          </div>
        </header>

        <ApiErrorBanner />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 scrollbar-thin"><Outlet /></main>
      </div>
    </div>
  );
}

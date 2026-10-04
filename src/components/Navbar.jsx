import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  AlertTriangle, 
  UserCheck, 
  LogOut, 
  Maximize, 
  Minimize, 
  Users, 
  Shield, 
  User, 
  Briefcase,
  ChevronDown
} from 'lucide-react';
import { api } from '../utils/api';

export default function Navbar({ activeTab, setActiveTab }) {
  const { 
    user, 
    logout, 
    quickLogin, 
    activeCentral, 
    setActiveCentral, 
    alertCount 
  } = useAuth();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [quickUsersList, setQuickUsersList] = useState([]);

  useEffect(() => {
    api.getQuickUsers().then(setQuickUsersList).catch(() => {});
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  const centrais = [
    { id: 'Todas', label: 'Todas as Centrais', color: 'bg-slate-800 text-slate-200 border-slate-700' },
    { id: 'Central Piçarras', label: 'Central Piçarras', color: 'bg-blue-900/40 text-blue-300 border-blue-500/50' },
    { id: 'Central Penha', label: 'Central Penha', color: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/50' },
    { id: 'Central Armação', label: 'Central Armação', color: 'bg-purple-900/40 text-purple-300 border-purple-500/50' },
    { id: 'Rentter', label: 'Rentter', color: 'bg-amber-900/40 text-amber-300 border-amber-500/50' },
  ];

  const getRoleBadge = (perfil) => {
    switch (perfil) {
      case 'Administrador':
        return { label: 'Admin', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Shield };
      case 'Gerente':
        return { label: 'Gerente', bg: 'bg-sky-500/20 text-sky-300 border-sky-500/30', icon: Briefcase };
      default:
        return { label: 'Operador', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: User };
    }
  };

  const roleInfo = getRoleBadge(user?.perfil);
  const RoleIcon = roleInfo.icon;

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        <div className="flex items-center justify-between gap-3">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 shrink-0 cursor-pointer" onClick={() => setActiveTab('saida')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">ESTOQUE</span>
                <span className="font-light text-base sm:text-lg text-sky-400">VETTER</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                  4 Centrais
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden sm:block">
                Tablet Industrial • PWA Local
              </div>
            </div>
          </div>

          {/* Central Selector Pills (Responsive for tablet touch) */}
          <div className="hidden md:flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800">
            {centrais.map(c => {
              const isSelected = activeCentral === c.id || (activeCentral === 'Central 1' && c.id === 'Central Piçarras') || (activeCentral === 'Central 2' && c.id === 'Central Penha') || (activeCentral === 'Central 3' && c.id === 'Central Armação');
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCentral(c.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 border ${
                    isSelected
                      ? `${c.color} shadow-sm font-bold scale-[1.02]`
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      c.id === 'Central Piçarras'
                        ? 'bg-blue-500'
                        : c.id === 'Central Penha'
                        ? 'bg-emerald-500'
                        : c.id === 'Central Armação'
                        ? 'bg-purple-500'
                        : c.id === 'Rentter'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Action Icons & User Badge */}
          <div className="flex items-center gap-2">
            
            {/* Low Stock Alert Button Badge */}
            <button
              onClick={() => setActiveTab('alertas')}
              className={`relative p-2 sm:px-3 sm:py-2 rounded-2xl border flex items-center gap-2 transition active:scale-95 ${
                alertCount > 0
                  ? 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/50 animate-alert-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
              title="Itens em Alerta de Estoque"
            >
              <AlertTriangle className={`w-5 h-5 ${alertCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
              <span className="hidden sm:inline text-xs font-semibold">Alertas</span>
              {alertCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-xs flex items-center justify-center shadow-md">
                  {alertCount}
                </span>
              )}
            </button>

            {/* Fullscreen kiosk button for tablets */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition hidden sm:flex"
              title="Modo Tela Cheia"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>

            {/* User Profile & Demo Switcher Trigger */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 transition active:scale-95"
              >
                <div className={`p-1.5 rounded-xl border ${roleInfo.bg}`}>
                  <RoleIcon className="w-4 h-4" />
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-white truncate max-w-[120px]">{user?.nome?.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400">{user?.perfil} • {user?.central_padrao}</div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {/* User Switcher Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-3xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-800 mb-2">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Usuário Conectado
                    </div>
                    <div className="text-sm font-bold text-white mt-1">{user?.nome}</div>
                    <div className="text-xs text-sky-400 font-medium">{user?.email}</div>
                    <div className="mt-1.5 inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border border-sky-500/30 bg-sky-950/60 text-sky-300">
                      Perfil: {user?.perfil} | Central: {user?.central_padrao}
                    </div>
                  </div>

                  <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Troca Rápida de Perfil (Simulação):
                  </div>

                  <div className="space-y-1 my-1 max-h-52 overflow-y-auto pr-1">
                    {quickUsersList.map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          quickLogin(u.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition ${
                          user?.id === u.id
                            ? 'bg-sky-600/30 border border-sky-500/40 text-white font-semibold'
                            : 'hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="truncate">
                          <div className="font-medium truncate">{u.nome}</div>
                          <div className="text-[10px] text-slate-400">{u.perfil} • {u.central_padrao}</div>
                        </div>
                        {user?.id === u.id && <UserCheck className="w-4 h-4 text-sky-400 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-800 mt-2 pt-2">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Encerrar Sessão</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Mobile / Tablet Portrait Central Selector bar */}
        <div className="flex md:hidden items-center justify-between gap-1 mt-2 pt-2 border-t border-slate-800/80 overflow-x-auto">
          {centrais.map(c => {
            const isSelected = activeCentral === c.id || (activeCentral === 'Central 1' && c.id === 'Central Piçarras') || (activeCentral === 'Central 2' && c.id === 'Central Penha') || (activeCentral === 'Central 3' && c.id === 'Central Armação');
            return (
              <button
                key={c.id}
                onClick={() => setActiveCentral(c.id)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition shrink-0 border ${
                  isSelected
                    ? `${c.color} font-bold`
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}

import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Package, 
  AlertTriangle, 
  BarChart3, 
  History, 
  Users 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NavigationTabs({ activeTab, setActiveTab }) {
  const { alertCount, isAdmin } = useAuth();

  const tabs = [
    {
      id: 'saida',
      label: 'Despacho Rápido (Saída)',
      shortLabel: 'Saída',
      icon: ArrowUpRight,
      color: 'hover:text-rose-400 active:text-rose-300',
      activeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-rose-950/50'
    },
    {
      id: 'entrada',
      label: 'Entrada / Reposição',
      shortLabel: 'Entrada',
      icon: ArrowDownLeft,
      color: 'hover:text-emerald-400 active:text-emerald-300',
      activeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
    },
    {
      id: 'produtos',
      label: 'Produtos & Estoque',
      shortLabel: 'Produtos',
      icon: Package,
      color: 'hover:text-sky-400 active:text-sky-300',
      activeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-sky-950/50'
    },
    {
      id: 'alertas',
      label: 'Itens em Alerta',
      shortLabel: 'Alertas',
      icon: AlertTriangle,
      badge: alertCount,
      color: 'hover:text-amber-400 active:text-amber-300',
      activeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-amber-950/50'
    },
    {
      id: 'dashboard',
      label: 'Dashboard (3 Centrais)',
      shortLabel: 'Dashboard',
      icon: BarChart3,
      color: 'hover:text-indigo-400 active:text-indigo-300',
      activeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-indigo-950/50'
    },
    {
      id: 'historico',
      label: 'Histórico & Auditoria',
      shortLabel: 'Histórico',
      icon: History,
      color: 'hover:text-slate-300',
      activeColor: 'bg-slate-800 text-slate-100 border-slate-600 shadow-slate-950/50'
    }
  ];

  if (isAdmin) {
    tabs.push({
      id: 'usuarios',
      label: 'Gerenciar Usuários (RBAC)',
      shortLabel: 'Usuários',
      icon: Users,
      color: 'hover:text-purple-400',
      activeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-purple-950/50'
    });
  }

  return (
    <nav className="bg-slate-900/60 border-b border-slate-800 px-3 py-2 sticky top-[61px] md:top-[65px] z-30 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap border transition shadow-sm select-none ${
                isActive
                  ? `${tab.activeColor} scale-[1.02]`
                  : `border-transparent bg-slate-900/40 text-slate-400 hover:bg-slate-800/80 ${tab.color}`
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>

              {tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[11px] font-black bg-rose-600 text-white shrink-0 shadow animate-pulse">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

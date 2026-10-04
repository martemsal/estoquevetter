import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { 
  Building2, 
  Lock, 
  Mail, 
  LogIn, 
  ShieldCheck, 
  Briefcase, 
  User, 
  AlertCircle 
} from 'lucide-react';

export default function LoginPage() {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    api.getQuickUsers().then(setDemoUsers).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, senha);
    } catch (err) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (id) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(id);
    } catch (err) {
      setError(err.message || 'Falha no login rápido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-sky-500">
      <div className="w-full max-w-xl">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-sky-600 via-sky-500 to-indigo-500 flex items-center justify-center shadow-2xl shadow-sky-500/25 border border-sky-400/30">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            ESTOQUE <span className="text-sky-400">VETTER</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Sistema Tablet de Controle de Estoque • 4 Centrais de Vendas
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-sky-400" />
            <span>Acesso ao Sistema</span>
          </h2>

          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                E-mail Profissional
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@estoque.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/70 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-950/70 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base shadow-xl shadow-sky-600/30 flex items-center justify-center gap-2 active:scale-98 transition disabled:opacity-50 mt-2"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 text-center">
              Acesso Rápido para Avaliação (1-Toque):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoUsers.map((u) => {
                const isAdm = u.perfil === 'Administrador';
                const isGer = u.perfil === 'Gerente';
                const Icon = isAdm ? ShieldCheck : isGer ? Briefcase : User;
                const badgeColor = isAdm
                  ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                  : isGer
                  ? 'text-sky-400 border-sky-500/40 bg-sky-500/10'
                  : 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

                return (
                  <button
                    key={u.id}
                    onClick={() => handleQuickLogin(u.id)}
                    className="p-3 bg-slate-950/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition flex items-center gap-3 active:scale-95"
                  >
                    <div className={`p-2 rounded-xl border ${badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-100 truncate">{u.nome}</div>
                      <div className="text-[10px] text-slate-400">{u.perfil} • {u.central_padrao}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-500 mt-6">
          Desenvolvido com Node.js, React, Tailwind CSS e SQLite Local • Suporte PWA Tablet
        </div>

      </div>
    </div>
  );
}

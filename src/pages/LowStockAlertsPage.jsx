import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Package, 
  ArrowDownLeft, 
  RefreshCw, 
  Building2, 
  ShieldAlert,
  CheckCircle 
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function LowStockAlertsPage({ onReplenishProduct, showToast }) {
  const { activeCentral, refreshAlertCount } = useAuth();
  const [alertProducts, setAlertProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlertProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProdutos({
        central: activeCentral,
        alerta: 'true'
      });
      setAlertProducts(data);
      refreshAlertCount();
    } catch (err) {
      showToast({ type: 'error', message: 'Erro ao carregar itens em alerta' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertProducts();
  }, [activeCentral]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Emergency Header Banner */}
      <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/60 p-6 sm:p-8 rounded-3xl border border-rose-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0 animate-alert-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-600 text-white">
                Prioridade Crítica
              </span>
              <span className="text-xs text-rose-300/80 font-medium">
                Regra: Estoque Atual ≤ Estoque Mínimo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              Itens em Alerta de Estoque Baixo
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-xl">
              Produtos com saldo crítico que necessitam de reposição imediata para evitar desabastecimento nas centrais.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-center min-w-[130px]">
            <div className="text-[11px] font-bold uppercase text-slate-400">Total em Alerta</div>
            <div className="text-3xl font-black text-rose-400 mt-0.5">{alertProducts.length}</div>
          </div>
          <button
            onClick={fetchAlertProducts}
            className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
            title="Atualizar Lista"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Product List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16">
          <div className="w-10 h-10 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm">Verificando níveis de estoque...</p>
        </div>
      ) : alertProducts.length === 0 ? (
        <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-12 text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Tudo Seguro! Nenhum Produto em Alerta</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Todas as centrais selecionadas estão operando com estoque estritamente acima do limite mínimo de segurança.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {alertProducts.map(p => {
            const min = p.estoque_minimo || 5;

            return (
              <div
                key={p.id}
                className="bg-slate-900 border-2 border-rose-500/40 rounded-3xl p-5 shadow-xl hover:border-rose-500/70 transition flex flex-col justify-between relative overflow-hidden"
              >
                {/* Red warning ribbon effect */}
                <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden pointer-events-none">
                  <div className="bg-rose-600 text-white text-[9px] font-black uppercase text-center py-1 absolute -right-6 top-5 w-28 rotate-45 shadow">
                    REPOR!
                  </div>
                </div>

                <div>
                  {/* Category & Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {p.categoria}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Cód: {p.codigo_barras || 'S/N'}
                    </span>
                  </div>

                  {/* Photo & Name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.foto_path ? (
                        <img src={p.foto_path} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <h3 className="font-extrabold text-base text-white truncate" title={p.nome}>
                        {p.nome}
                      </h3>
                      <div className="text-xs text-rose-300 font-medium mt-1">
                        Estoque Mínimo: <b className="text-white">{min}</b> {p.unidade_medida}(s)
                      </div>
                      <div className="text-xs text-slate-400">
                        Total Atual: <b className="text-rose-400 font-bold">{p.estoque_total}</b> {p.unidade_medida}(s)
                      </div>
                    </div>
                  </div>

                  {/* Centrais Status Box */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-2xl border border-slate-800/80 mb-4 text-center">
                    <div className={`p-2 rounded-xl border ${
                      p.alerta_c1 ? 'bg-rose-950/50 border-rose-500/60' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-blue-400">Central 1</div>
                      <div className={`text-base font-black ${p.alerta_c1 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {p.estoque_c1}
                      </div>
                      {p.alerta_c1 && <span className="text-[9px] font-bold text-rose-400">ABAIXO</span>}
                    </div>

                    <div className={`p-2 rounded-xl border ${
                      p.alerta_c2 ? 'bg-rose-950/50 border-rose-500/60' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-emerald-400">Central 2</div>
                      <div className={`text-base font-black ${p.alerta_c2 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {p.estoque_c2}
                      </div>
                      {p.alerta_c2 && <span className="text-[9px] font-bold text-rose-400">ABAIXO</span>}
                    </div>

                    <div className={`p-2 rounded-xl border ${
                      p.alerta_c3 ? 'bg-rose-950/50 border-rose-500/60' : 'bg-slate-900 border-slate-800'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-purple-400">Central 3</div>
                      <div className={`text-base font-black ${p.alerta_c3 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {p.estoque_c3}
                      </div>
                      {p.alerta_c3 && <span className="text-[9px] font-bold text-rose-400">ABAIXO</span>}
                    </div>
                  </div>
                </div>

                {/* Direct Action Button */}
                <button
                  onClick={() => onReplenishProduct && onReplenishProduct(p)}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  <ArrowDownLeft className="w-5 h-5" />
                  <span>Repor Estoque Deste Item</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

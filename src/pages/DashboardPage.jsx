import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  Calendar, 
  Package, 
  Activity, 
  AlertTriangle, 
  ArrowUpRight, 
  Building2, 
  Trophy, 
  RefreshCw 
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage({ onNavigateToAlerts, showToast }) {
  const { activeCentral } = useAuth();
  const [periodo, setPeriodo] = useState('7dias'); // 'hoje' | '7dias' | 'mes'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTopCentral, setActiveTopCentral] = useState('Central 1');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard({
        periodo,
        central: activeCentral
      });
      setData(res);
    } catch (err) {
      showToast({ type: 'error', message: 'Erro ao carregar dados do dashboard' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [periodo, activeCentral]);

  const centraisColors = {
    'Central 1': '#3b82f6',
    'Central 2': '#22c55e',
    'Central 3': '#a855f7'
  };

  const periodos = [
    { id: 'hoje', label: 'Hoje' },
    { id: '7dias', label: 'Últimos 7 dias' },
    { id: 'mes', label: 'Mês Atual' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Dashboard de Consumo por Central
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Análise comparativa de saídas entre Central 1, Central 2 e Central 3
            </p>
          </div>
        </div>

        {/* Period Selector Pills & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {periodos.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  periodo === p.id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboard}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
            title="Recarregar Métricas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards (4 cards in responsive grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Produtos / Estoque */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-slate-400">Total em Estoque</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {data?.kpis?.total_unidades_estoque ?? '...'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {data?.kpis?.total_produtos ?? 0} produtos cadastrados
          </div>
        </div>

        {/* KPI 2: Movimentações no Dia */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-slate-400">Movimentações Hoje</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {data?.kpis?.total_movimentacoes_hoje ?? '...'}
          </div>
          <div className="text-xs text-indigo-400 mt-1 font-medium">
            Entradas e saídas registradas
          </div>
        </div>

        {/* KPI 3: Itens em Alerta */}
        <div 
          onClick={onNavigateToAlerts}
          className="bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 transition cursor-pointer rounded-3xl p-5 shadow-xl relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-rose-400">Itens em Alerta</span>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 group-hover:scale-110 transition">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400">
            {data?.kpis?.itens_em_alerta ?? '...'}
          </div>
          <div className="text-xs text-rose-300 mt-1 flex items-center gap-1 font-medium">
            <span>Abaixo do mínimo</span>
            <span className="text-[10px] underline">Ver todos →</span>
          </div>
        </div>

        {/* KPI 4: Total de Saídas no Período */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase text-slate-400">Saídas ({periodo})</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white">
            {data?.kpis?.total_saidas_periodo ?? '...'}
          </div>
          <div className="text-xs text-emerald-400 mt-1 font-medium">
            Unidades consumidas
          </div>
        </div>
      </div>

      {/* Gráfico de Consumo Comparativo (Central 1 vs Central 2 vs Central 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Rosca / Donut Chart & Progress Bars (5 cols on lg) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-400" />
                <span>Distribuição de Consumo (%)</span>
              </h2>
              <span className="text-xs text-slate-400 font-semibold">
                Total: {data?.total_geral_saidas || 0} un
              </span>
            </div>

            {/* Donut Chart */}
            <div className="h-56 relative flex items-center justify-center">
              {data?.consumo_comparativo && data.total_geral_saidas > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.consumo_comparativo}
                      dataKey="total_quantidade"
                      nameKey="central"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                    >
                      {data.consumo_comparativo.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.cor} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val, name, item) => [
                        `${val} un (${item.payload.percentual}%)`,
                        item.payload.central
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-slate-500 text-sm">
                  Nenhuma saída registrada no período selecionado.
                </div>
              )}
            </div>
          </div>

          {/* Breakdown List */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            {data?.consumo_comparativo?.map(c => (
              <div key={c.central} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-slate-200">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.cor }} />
                    {c.central}
                  </span>
                  <span className="text-white font-bold">
                    {c.total_quantidade} un ({c.percentual}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${c.percentual}%`,
                      backgroundColor: c.cor
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bar Chart (Barras Comparativas) (7 cols on lg) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-400" />
                <span>Volume Comparativo de Retiradas</span>
              </h2>
              <span className="text-xs text-slate-400">Central 1 vs Central 2 vs Central 3</span>
            </div>

            <div className="h-64 sm:h-72">
              {data?.consumo_comparativo && data.total_geral_saidas > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.consumo_comparativo} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="central" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <YAxis stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
                    <Tooltip
                      formatter={(val) => [`${val} unidades retiradas`, 'Quantidade']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                    />
                    <Bar dataKey="total_quantidade" radius={[12, 12, 0, 0]}>
                      {data.consumo_comparativo.map((entry, index) => (
                        <Cell key={`bar-${index}`} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Sem dados para exibição de gráfico no período.
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center">
            {data?.consumo_comparativo?.map(c => (
              <div key={c.central} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[11px] font-bold text-slate-400">{c.central}</div>
                <div className="text-lg font-black text-white mt-0.5">{c.total_quantidade} <span className="text-xs font-normal text-slate-400">un</span></div>
                <div className="text-[10px] text-slate-400">{c.total_registros} saídas</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Top 5 Itens Mais Consumidos por Central */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">
                Top 5 Itens Mais Consumidos por Central
              </h2>
              <p className="text-xs text-slate-400">
                Classificação dos materiais de maior giro no período selecionado
              </p>
            </div>
          </div>

          {/* Central Selector Tabs for Top 5 */}
          <div className="flex items-center bg-slate-950 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
            {['Central 1', 'Central 2', 'Central 3', 'Geral'].map(c => (
              <button
                key={c}
                onClick={() => setActiveTopCentral(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTopCentral === c
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Top 5 List */}
        {(() => {
          const list = data?.top5_por_central?.[activeTopCentral] || [];
          if (list.length === 0) {
            return (
              <div className="text-center py-10 text-slate-500 text-sm">
                Nenhuma retirada registrada para a {activeTopCentral} neste período.
              </div>
            );
          }

          const maxVal = Math.max(...list.map(i => i.total_consumido), 1);

          return (
            <div className="space-y-3">
              {list.map((item, index) => {
                const percent = Math.round((item.total_consumido / maxVal) * 100);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                          index === 0
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : index === 1
                            ? 'bg-slate-300 text-slate-950'
                            : index === 2
                            ? 'bg-amber-800 text-amber-200'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}º
                        </span>
                        <div>
                          <div className="text-sm font-bold text-white truncate max-w-sm sm:max-w-md">
                            {item.nome}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {item.categoria} • {item.unidade_medida}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-rose-400">
                          {item.total_consumido}
                        </span>
                        <span className="text-xs text-slate-400 font-medium ml-1">
                          {item.unidade_medida}(s)
                        </span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Filter, 
  Download, 
  Building2, 
  Calendar, 
  User, 
  Search,
  RefreshCw
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export default function HistoryPage({ showToast }) {
  const { activeCentral } = useAuth();
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tipoFilter, setTipoFilter] = useState('');
  const [centralFilter, setCentralFilter] = useState(activeCentral !== 'Todas' ? activeCentral : '');
  const [search, setSearch] = useState('');

  const fetchMovimentacoes = async () => {
    setLoading(true);
    try {
      const data = await api.getMovimentacoes({
        tipo: tipoFilter || undefined,
        central: centralFilter !== 'Todas' ? centralFilter : undefined,
        limit: 100
      });
      setMovimentacoes(data);
    } catch (err) {
      showToast({ type: 'error', message: 'Erro ao carregar histórico' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMovimentacoes();
  }, [tipoFilter, centralFilter, activeCentral]);

  const handleExportCSV = () => {
    if (movimentacoes.length === 0) {
      showToast({ type: 'warning', message: 'Nenhuma movimentação para exportar' });
      return;
    }

    const headers = ['ID', 'Data/Hora', 'Tipo', 'Produto', 'Categoria', 'Central', 'Quantidade', 'Unidade', 'Responsavel', 'Observacao'];
    const rows = movimentacoes.map(m => [
      m.id,
      m.data_movimentacao,
      m.tipo,
      `"${m.produto_nome}"`,
      m.categoria,
      m.central,
      m.quantidade,
      m.unidade_medida,
      `"${m.usuario_nome}"`,
      `"${m.observacao || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_estoque_vetter_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast({ type: 'success', message: 'Arquivo CSV gerado com sucesso!' });
  };

  const filtered = movimentacoes.filter(m => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      m.produto_nome.toLowerCase().includes(term) ||
      m.usuario_nome.toLowerCase().includes(term) ||
      (m.observacao && m.observacao.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-slate-800 text-slate-300 border border-slate-700">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Histórico de Auditoria & Movimentações
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Rastreabilidade completa de todas as entradas e saídas por usuário e central
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold flex items-center gap-2 active:scale-95 transition"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={fetchMovimentacoes}
            className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, responsável ou observação..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition text-sm"
          />
        </div>

        <select
          value={tipoFilter}
          onChange={(e) => setTipoFilter(e.target.value)}
          className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-sky-500 transition cursor-pointer"
        >
          <option value="">Todos os Tipos (Entradas & Saídas)</option>
          <option value="SAIDA">Apenas Saídas (Consumo)</option>
          <option value="ENTRADA">Apenas Entradas (Reposição)</option>
        </select>

        <select
          value={centralFilter}
          onChange={(e) => setCentralFilter(e.target.value)}
          className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-sky-500 transition cursor-pointer"
        >
          <option value="">Todas as Centrais</option>
          <option value="Central 1">Central 1</option>
          <option value="Central 2">Central 2</option>
          <option value="Central 3">Central 3</option>
        </select>
      </div>

      {/* Movement Records Table */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-4">Data / Hora</th>
                <th className="py-4 px-3">Tipo</th>
                <th className="py-4 px-4">Produto</th>
                <th className="py-4 px-3 text-center">Central</th>
                <th className="py-4 px-3 text-center">Qtd</th>
                <th className="py-4 px-4">Responsável</th>
                <th className="py-4 px-4">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Carregando movimentações...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    Nenhum registro encontrado para estes filtros.
                  </td>
                </tr>
              ) : (
                filtered.map(m => {
                  const isSaida = m.tipo === 'SAIDA';

                  return (
                    <tr key={m.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(m.data_movimentacao).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isSaida
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        }`}>
                          {isSaida ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          <span>{m.tipo}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white truncate max-w-xs">{m.produto_nome}</div>
                        <div className="text-[11px] text-slate-400">{m.categoria}</div>
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-bold border ${
                          m.central === 'Central 1'
                            ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                            : m.central === 'Central 2'
                            ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            : 'bg-purple-950/60 text-purple-300 border-purple-800'
                        }`}>
                          {m.central}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-center font-black text-base whitespace-nowrap">
                        <span className={isSaida ? 'text-rose-400' : 'text-emerald-400'}>
                          {isSaida ? '-' : '+'}{m.quantidade}
                        </span>
                        <span className="text-[11px] text-slate-500 font-normal ml-1">
                          {m.unidade_medida}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200 text-xs">{m.usuario_nome}</div>
                        <div className="text-[10px] text-slate-400">{m.usuario_perfil}</div>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-400 max-w-xs truncate" title={m.observacao}>
                        {m.observacao || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

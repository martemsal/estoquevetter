import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Edit3, 
  Trash2, 
  Layers, 
  Building2, 
  AlertTriangle,
  LayoutGrid,
  List
} from 'lucide-react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import LowStockBadge from '../components/LowStockBadge';
import ProductFormModal from '../components/ProductFormModal';

export default function ProductsPage({ onSelectProductForOutflow, onSelectProductForInflow, showToast }) {
  const { activeCentral, canEditProducts, isAdmin } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const fetchProdutos = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCentral && activeCentral !== 'Todas') {
        params.central = activeCentral;
      }
      if (categoryFilter && categoryFilter !== 'Todas') {
        params.categoria = categoryFilter;
      }
      if (search && search.trim()) {
        params.busca = search.trim();
      }

      const data = await api.getProdutos(params);
      setProdutos(data);
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao carregar produtos' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, [activeCentral, categoryFilter, search]);

  const handleEdit = (prod) => {
    setEditingProduct(prod);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${nome}"?\n\nEsta ação apagará o cadastro do produto e todo o seu histórico de estoque.`)) return;
    try {
      await api.deleteProduto(id);
      showToast({ type: 'success', message: `Produto "${nome}" excluído com sucesso!` });
      fetchProdutos();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao excluir produto' });
    }
  };

  const categorias = ['Todas', 'Ferramentas', 'Insumos', 'Embalagens', 'Eletrônicos', 'Outros'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Catálogo de Produtos & Estoque
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Visualização consolidada de estoque nas 4 Centrais: Piçarras, Penha, Armação e Rentter
            </p>
          </div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-2xl border border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'grid' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Grade (Cards)"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl text-xs font-semibold transition ${
                viewMode === 'table' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Visualização em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {canEditProducts ? (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="py-3 px-5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-xl shadow-sky-600/30 flex items-center gap-2 active:scale-95 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Novo Produto</span>
            </button>
          ) : (
            <div className="text-xs text-slate-400 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 hidden sm:block">
              Perfil Operador: Apenas Leitura & Movimentação
            </div>
          )}
        </div>
      </div>

      {/* Filters & Search Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, código de barras ou categoria..."
            className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition text-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <Layers className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:border-sky-500 transition appearance-none cursor-pointer"
          >
            {categorias.map(cat => (
              <option key={cat} value={cat} className="bg-slate-900">
                {cat === 'Todas' ? 'Todas as Categorias' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-slate-400 text-sm font-medium">Carregando catálogo do estoque...</p>
        </div>
      ) : produtos.length === 0 ? (
        <div className="text-center p-16 bg-slate-900/50 rounded-3xl border border-slate-800">
          <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">Nenhum produto encontrado</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto mb-4">
            Não encontramos nenhum produto com os filtros atuais. Altere a busca ou cadastre um novo item.
          </p>
          {canEditProducts && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setIsModalOpen(true);
              }}
              className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs active:scale-95 transition"
            >
              Cadastrar Produto Agora
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Tablet Optimized Large Cards) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtos.map(prod => {
            const hasAlert = prod.em_alerta;

            return (
              <div
                key={prod.id}
                className={`bg-slate-900 border rounded-3xl p-5 shadow-xl transition hover:border-slate-600 flex flex-col justify-between ${
                  hasAlert ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                <div>
                  {/* Top card bar: Category & Alert */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {prod.categoria}
                    </span>

                    {hasAlert && (
                      <LowStockBadge total={prod.estoque_total} min={prod.estoque_minimo} />
                    )}
                  </div>

                  {/* Photo & Name */}
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {prod.foto_path ? (
                        <img
                          src={prod.foto_path}
                          alt={prod.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-white truncate" title={prod.nome}>
                        {prod.nome}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">
                        Cód: {prod.codigo_barras || 'S/N'}
                      </div>
                      <div className="text-xs text-slate-400">
                        Unidade: <span className="text-slate-200 font-medium">{prod.unidade_medida}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Breakdown per Central */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-4 text-center">
                    {/* Central Piçarras */}
                    <div className={`p-2 rounded-xl border ${
                      prod.alerta_c1 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-blue-950/20 border-blue-900/40'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-blue-400 truncate" title="Central Piçarras">Piçarras</div>
                      <div className={`text-base font-black ${prod.alerta_c1 ? 'text-rose-400' : 'text-white'}`}>
                        {prod.estoque_c1}
                      </div>
                      {prod.alerta_c1 && <div className="text-[9px] text-rose-400 font-bold">BAIXO</div>}
                    </div>

                    {/* Central Penha */}
                    <div className={`p-2 rounded-xl border ${
                      prod.alerta_c2 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-emerald-950/20 border-emerald-900/40'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-emerald-400 truncate" title="Central Penha">Penha</div>
                      <div className={`text-base font-black ${prod.alerta_c2 ? 'text-rose-400' : 'text-white'}`}>
                        {prod.estoque_c2}
                      </div>
                      {prod.alerta_c2 && <div className="text-[9px] text-rose-400 font-bold">BAIXO</div>}
                    </div>

                    {/* Central Armação */}
                    <div className={`p-2 rounded-xl border ${
                      prod.alerta_c3 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-purple-950/20 border-purple-900/40'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-purple-400 truncate" title="Central Armação">Armação</div>
                      <div className={`text-base font-black ${prod.alerta_c3 ? 'text-rose-400' : 'text-white'}`}>
                        {prod.estoque_c3}
                      </div>
                      {prod.alerta_c3 && <div className="text-[9px] text-rose-400 font-bold">BAIXO</div>}
                    </div>

                    {/* Rentter */}
                    <div className={`p-2 rounded-xl border ${
                      prod.alerta_c4 ? 'bg-rose-950/30 border-rose-500/40' : 'bg-amber-950/20 border-amber-900/40'
                    }`}>
                      <div className="text-[10px] font-bold uppercase text-amber-400 truncate" title="Rentter">Rentter</div>
                      <div className={`text-base font-black ${prod.alerta_c4 ? 'text-rose-400' : 'text-white'}`}>
                        {prod.estoque_c4 || 0}
                      </div>
                      {prod.alerta_c4 && <div className="text-[9px] text-rose-400 font-bold">BAIXO</div>}
                    </div>
                  </div>

                  {/* Consolidated Total info */}
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-4 px-1">
                    <span>Estoque Mínimo: <b className="text-slate-200">{prod.estoque_minimo} {prod.unidade_medida}</b></span>
                    <span>Total Consolidado: <b className="text-sky-400 font-bold">{prod.estoque_total}</b></span>
                  </div>
                </div>

                {/* Card Action Buttons (Touch Friendly) */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1">
                    <button
                      onClick={() => onSelectProductForOutflow && onSelectProductForOutflow(prod)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                    >
                      <ArrowUpRight className="w-4 h-4 text-rose-400" />
                      <span>Saída</span>
                    </button>

                    <button
                      onClick={() => onSelectProductForInflow && onSelectProductForInflow(prod)}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition"
                    >
                      <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      <span>Repor</span>
                    </button>
                  </div>

                  {canEditProducts && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEdit(prod)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 active:scale-95 transition"
                        title="Editar Produto"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(prod.id, prod.nome)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 active:scale-95 transition"
                        title="Excluir Produto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (Density View for Tablet Landscape) */
        <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] font-bold tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4">Produto</th>
                  <th className="py-4 px-3">Código</th>
                  <th className="py-4 px-3">Categoria</th>
                  <th className="py-4 px-3 text-center" title="Central Piçarras">Piçarras</th>
                  <th className="py-4 px-3 text-center" title="Central Penha">Penha</th>
                  <th className="py-4 px-3 text-center" title="Central Armação">Armação</th>
                  <th className="py-4 px-3 text-center" title="Rentter">Rentter</th>
                  <th className="py-4 px-3 text-center">Total</th>
                  <th className="py-4 px-3 text-center">Mínimo</th>
                  <th className="py-4 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {produtos.map(prod => (
                  <tr key={prod.id} className="hover:bg-slate-850/50 transition">
                    <td className="py-3 px-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-700">
                        {prod.foto_path ? (
                          <img src={prod.foto_path} alt={prod.nome} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                      <div className="font-semibold text-white truncate max-w-[200px]">
                        {prod.nome}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-xs text-slate-400">
                      {prod.codigo_barras || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        {prod.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={prod.alerta_c1 ? 'text-rose-400 font-black' : 'text-blue-400'}>
                        {prod.estoque_c1}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={prod.alerta_c2 ? 'text-rose-400 font-black' : 'text-emerald-400'}>
                        {prod.estoque_c2}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={prod.alerta_c3 ? 'text-rose-400 font-black' : 'text-purple-400'}>
                        {prod.estoque_c3}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={prod.alerta_c4 ? 'text-rose-400 font-black' : 'text-amber-400'}>
                        {prod.estoque_c4 || 0}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-black text-white">
                      {prod.estoque_total}
                    </td>
                    <td className="py-3 px-3 text-center text-xs text-slate-400">
                      {prod.estoque_minimo} {prod.unidade_medida}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectProductForOutflow && onSelectProductForOutflow(prod)}
                          className="px-3 py-1.5 rounded-xl bg-rose-600/20 text-rose-300 hover:bg-rose-600/30 text-xs font-bold transition"
                        >
                          Saída
                        </button>
                        <button
                          onClick={() => onSelectProductForInflow && onSelectProductForInflow(prod)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold transition"
                        >
                          Repor
                        </button>
                        {canEditProducts && (
                          <>
                            <button
                              onClick={() => handleEdit(prod)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                              title="Editar Produto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(prod.id, prod.nome)}
                              className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 transition"
                              title="Excluir Produto"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => {
          fetchProdutos();
          showToast({
            type: 'success',
            message: editingProduct ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!'
          });
        }}
        onDelete={handleDelete}
        editingProduct={editingProduct}
      />

    </div>
  );
}

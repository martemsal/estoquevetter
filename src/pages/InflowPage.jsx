import React, { useState, useEffect } from 'react';
import { 
  ArrowDownLeft, 
  ScanBarcode, 
  Search, 
  Building2, 
  UserCheck, 
  CheckCircle2, 
  Package, 
  Plus, 
  Minus 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BarcodeScannerModal from '../components/BarcodeScannerModal';

export default function InflowPage({ preselectedProduct = null, onClearPreselected, showToast }) {
  const { user, activeCentral, refreshAlertCount } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const [targetCentral, setTargetCentral] = useState(
    ['Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter'].includes(activeCentral) ? activeCentral : 'Central Piçarras'
  );
  const [quantidade, setQuantidade] = useState(10);
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [inflowResult, setInflowResult] = useState(null);

  const loadProdutos = async () => {
    setLoadingProds(true);
    try {
      const data = await api.getProdutos();
      setProdutos(data);

      if (preselectedProduct) {
        const found = data.find(p => p.id === preselectedProduct.id);
        if (found) {
          setSelectedProduct(found);
        }
      }
    } catch (err) {
      showToast({ type: 'error', message: 'Erro ao carregar produtos: ' + err.message });
    } finally {
      setLoadingProds(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, [preselectedProduct]);

  useEffect(() => {
    const norm = activeCentral === 'Central 1' ? 'Central Piçarras' : activeCentral === 'Central 2' ? 'Central Penha' : activeCentral === 'Central 3' ? 'Central Armação' : activeCentral;
    if (['Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter'].includes(norm)) {
      setTargetCentral(norm);
    }
  }, [activeCentral]);

  const handleBarcodeScanned = (scannedCode) => {
    const cleanCode = scannedCode.trim().toLowerCase();
    const found = produtos.find(
      p => (p.codigo_barras && p.codigo_barras.toLowerCase() === cleanCode) ||
           p.nome.toLowerCase().includes(cleanCode)
    );

    if (found) {
      setSelectedProduct(found);
      showToast({ type: 'info', message: `Produto identificado: ${found.nome}` });
    } else {
      showToast({ type: 'warning', message: `Código não encontrado: ${scannedCode}` });
    }
  };

  const handleSubmitInflow = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast({ type: 'error', message: 'Selecione um produto.' });
      return;
    }

    if (quantidade <= 0) {
      showToast({ type: 'error', message: 'Quantidade deve ser maior que zero.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.registrarEntrada({
        produto_id: selectedProduct.id,
        central: targetCentral,
        quantidade,
        observacao: observacao || undefined
      });

      confetti({
        particleCount: 50,
        spread: 50,
        origin: { y: 0.7 }
      });

      setInflowResult(res);
      refreshAlertCount();
      showToast({ type: 'success', message: res.message });
      loadProdutos();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao registrar entrada' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setInflowResult(null);
    setSelectedProduct(null);
    setQuantidade(10);
    setObservacao('');
    if (onClearPreselected) onClearPreselected();
  };

  const filteredProducts = produtos.filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.nome.toLowerCase().includes(term) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Entrada / Reposição de Estoque
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Recebimento de mercadorias e reabastecimento nas 3 Centrais de Vendas
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsScannerOpen(true)}
          className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <ScanBarcode className="w-5 h-5" />
          <span>Escanear Código / QR</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Product selector list */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-emerald-400" />
              <span>1. Escolher Produto para Reposição</span>
            </h2>

            <div className="relative mb-3">
              <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar produto para entrada..."
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-sm"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {filteredProducts.map(p => {
                const isSelected = selectedProduct?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setInflowResult(null);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center gap-3 active:scale-98 ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-lg'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                      {p.foto_path ? (
                        <img src={p.foto_path} alt={p.nome} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate text-white">{p.nome}</div>
                      <div className="text-xs text-slate-400 font-mono">{p.codigo_barras || 'S/N'}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Saldo Atual: <span className="text-emerald-400 font-bold">{p.estoque_total}</span> {p.unidade_medida}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Inflow Action Form */}
        <div className="lg:col-span-7">
          {inflowResult ? (
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">Entrada Registrada!</h2>
              <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-5 max-w-md mx-auto text-left space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Produto:</span>
                  <span className="font-bold text-white">{inflowResult.produto_nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Central Reabastecida:</span>
                  <span className="font-bold text-sky-400">{inflowResult.central}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Novo Saldo na Central:</span>
                  <span className="font-black text-emerald-400 text-lg">{inflowResult.novo_saldo}</span>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="py-4 px-8 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base active:scale-95 transition"
              >
                Registrar Nova Entrada
              </button>
            </div>
          ) : !selectedProduct ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xl h-full flex flex-col items-center justify-center">
              <Package className="w-16 h-16 text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">Selecione um produto ao lado</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Escolha o item a reabastecer para definir a central de destino e a quantidade de entrada.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitInflow} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedProduct.foto_path ? (
                    <img src={selectedProduct.foto_path} alt={selectedProduct.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-extrabold text-white truncate">{selectedProduct.nome}</h3>
                  <div className="text-xs text-slate-400">
                    Categoria: {selectedProduct.categoria} • Cód: {selectedProduct.codigo_barras || 'S/N'}
                  </div>
                </div>
              </div>

              {/* Target Central */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  2. Central de Destino da Entrada
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {['Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter'].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setTargetCentral(c)}
                      className={`p-3.5 rounded-2xl border text-center font-bold text-sm transition active:scale-95 ${
                        targetCentral === c
                          ? 'bg-emerald-600/30 border-emerald-500 text-white shadow-lg'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  3. Quantidade a Adicionar ao Estoque
                </label>
                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 10))}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold active:scale-95 transition"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold active:scale-95 transition"
                  >
                    <Minus className="w-5 h-5 mx-auto" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantidade}
                    onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 py-3 text-center bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-2xl focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantidade(quantidade + 1)}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold active:scale-95 transition"
                  >
                    <Plus className="w-5 h-5 mx-auto" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantidade(quantidade + 10)}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold active:scale-95 transition"
                  >
                    +10
                  </button>
                </div>
              </div>

              {/* Observation */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Observação / Nota Fiscal / Origem
                </label>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: NF 19283 - Reposição de fornecedor"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-sm"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-5 px-6 rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-lg shadow-2xl shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-98 transition disabled:opacity-50"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowDownLeft className="w-6 h-6" />
                    <span>CONFIRMAR ENTRADA / REPOSIÇÃO</span>
                  </>
                )}
              </button>

            </form>
          )}
        </div>

      </div>

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

    </div>
  );
}

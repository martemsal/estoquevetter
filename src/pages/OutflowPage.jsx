import React, { useState, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ScanBarcode, 
  Search, 
  Building2, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Plus, 
  Minus, 
  Sparkles,
  RefreshCw,
  Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import { playBeep } from '../utils/sound';

export default function OutflowPage({ preselectedProduct = null, onClearPreselected, showToast }) {
  const { user, activeCentral, refreshAlertCount } = useAuth();

  const [produtos, setProdutos] = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Form states
  const [targetCentral, setTargetCentral] = useState(
    ['Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter'].includes(activeCentral) ? activeCentral : 'Central Piçarras'
  );
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Fetch product catalog for selection
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

  // Update default central if user changes activeCentral filter
  useEffect(() => {
    const norm = activeCentral === 'Central 1' ? 'Central Piçarras' : activeCentral === 'Central 2' ? 'Central Penha' : activeCentral === 'Central 3' ? 'Central Armação' : activeCentral;
    if (['Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter'].includes(norm)) {
      setTargetCentral(norm);
    }
  }, [activeCentral]);

  const handleBarcodeScanned = (scannedCode) => {
    if (!scannedCode) return;
    const cleanCode = String(scannedCode).trim().toLowerCase();
    const list = Array.isArray(produtos) ? produtos : [];
    const found = list.find(
      p => (p.codigo_barras && String(p.codigo_barras).trim().toLowerCase() === cleanCode) ||
           (p.nome && String(p.nome).toLowerCase().includes(cleanCode))
    );

    if (found) {
      playBeep('success');
      setSelectedProduct(found);
      setQuantidade(1);
      setSearchTerm('');
      showToast({ type: 'success', message: `Código lido com sucesso: ${found.nome}` });
    } else {
      playBeep('alert');
      showToast({ type: 'warning', message: `Código não cadastrado: ${scannedCode}` });
      setSearchTerm(String(scannedCode));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchTerm || !searchTerm.trim()) return;
    const term = String(searchTerm).trim().toLowerCase();
    const list = Array.isArray(produtos) ? produtos : [];
    const found = list.find(
      p => (p.codigo_barras && String(p.codigo_barras).trim().toLowerCase() === term) ||
           (p.nome && String(p.nome).trim().toLowerCase() === term) ||
           (p.nome && String(p.nome).toLowerCase().includes(term))
    );

    if (found) {
      playBeep('success');
      setSelectedProduct(found);
      setQuantidade(1);
      setSearchTerm('');
      showToast({ type: 'success', message: `Produto identificado: ${found.nome}` });
    } else {
      playBeep('alert');
      showToast({ type: 'warning', message: `Nenhum produto encontrado para: "${searchTerm}"` });
    }
  };

  // Get current stock for the selected central
  const getCurrentStock = () => {
    if (!selectedProduct) return 0;
    if (targetCentral === 'Central Piçarras' || targetCentral === 'Central 1') return selectedProduct.estoque_c1 || 0;
    if (targetCentral === 'Central Penha' || targetCentral === 'Central 2') return selectedProduct.estoque_c2 || 0;
    if (targetCentral === 'Central Armação' || targetCentral === 'Central 3') return selectedProduct.estoque_c3 || 0;
    if (targetCentral === 'Rentter') return selectedProduct.estoque_c4 || 0;
    return selectedProduct.estoque_total || 0;
  };

  const currentAvailable = getCurrentStock();
  const isStockInsufficient = quantidade > currentAvailable;
  const isZeroStock = currentAvailable <= 0;

  const handleSetMax = () => {
    if (currentAvailable > 0) {
      setQuantidade(currentAvailable);
    }
  };

  const handleQuickObs = (text) => {
    setObservacao(text);
  };

  const handleSubmitOutflow = async (e) => {
    e.preventDefault();
    if (!selectedProduct) {
      showToast({ type: 'error', message: 'Por favor, selecione um produto.' });
      return;
    }

    if (isZeroStock) {
      showToast({ type: 'error', message: `Estoque esgotado na ${targetCentral} para este produto.` });
      return;
    }

    if (isStockInsufficient) {
      showToast({
        type: 'error',
        message: `Quantidade solicitada (${quantidade}) é maior que o saldo disponível (${currentAvailable}).`
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.registrarSaida({
        produto_id: selectedProduct.id,
        central: targetCentral,
        quantidade,
        observacao: observacao || undefined
      });

      // Confetti burst for successful tablet dispatch
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      });

      setDispatchResult(res);
      refreshAlertCount();
      showToast({ type: 'success', message: res.message });

      // Refresh product data
      loadProdutos();
    } catch (err) {
      showToast({ type: 'error', message: err.message || 'Erro ao registrar saída' });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setDispatchResult(null);
    setSelectedProduct(null);
    setQuantidade(1);
    setObservacao('');
    setSearchTerm('');
    if (onClearPreselected) onClearPreselected();
  };

  // Filter products for the quick selection drawer
  const filteredProducts = (Array.isArray(produtos) ? produtos : []).filter(p => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.nome && String(p.nome).toLowerCase().includes(term)) ||
      (p.codigo_barras && String(p.codigo_barras).toLowerCase().includes(term)) ||
      (p.categoria && String(p.categoria).toLowerCase().includes(term))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-xl mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ArrowUpRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Despacho Rápido de Saída (Consumo por Central)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Operação de baixa de estoque com validação em tempo real e identificação automática
            </p>
          </div>
        </div>

        {/* Barcode scanner launcher button */}
        <button
          onClick={() => setIsScannerOpen(true)}
          className="py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-95 transition"
        >
          <ScanBarcode className="w-5 h-5" />
          <span>Escanear Código / QR</span>
        </button>
      </div>

      {/* Main Grid: Split screen for Tablet Landscape & Portrait */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Product Search & Quick List (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <Search className="w-4 h-4 text-sky-400" />
                <span>1. Selecionar Produto</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold">{filteredProducts.length} itens</span>
            </div>

            {/* Primary Tablet Camera Scanner Action Button */}
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-3 active:scale-95 transition mb-3 border border-emerald-400/40"
            >
              <ScanBarcode className="w-6 h-6 animate-pulse" />
              <div className="text-left">
                <div className="text-sm font-black leading-none">ESCANEAR CÓDIGO COM A CÂMERA</div>
                <div className="text-[10px] text-emerald-100 font-normal mt-0.5">Leitura rápida de Código de Barras / QR Code com Beep</div>
              </div>
            </button>

            {/* Search or Physical Scanner Input Form */}
            <form onSubmit={handleSearchSubmit} className="relative mb-2">
              <Search className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digitar código/nome ou usar leitor USB/Bluetooth (Enter)..."
                className="w-full pl-12 pr-12 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition text-sm"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Buscar
              </button>
            </form>

            {/* Quick Barcode Test Simulation Buttons */}
            <div className="mb-3 p-2 bg-slate-950/40 rounded-2xl border border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                Atalhos de Código (1-Toque para Teste):
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { label: 'Fita Adesiva', code: '78910001001' },
                  { label: 'Parafusadeira', code: '78910002002' },
                  { label: 'Caixa 40x40', code: '78910003003' }
                ].map(item => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleBarcodeScanned(item.code)}
                    className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-left truncate active:scale-95 transition"
                  >
                    <div className="text-[11px] font-bold text-slate-200 truncate">{item.label}</div>
                    <div className="text-[9px] text-emerald-400 font-mono truncate">{item.code}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product selection list (touch friendly scrolling) */}
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {loadingProds ? (
                <div className="text-center py-10 text-slate-500 text-sm">Carregando itens...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-sm">
                  Nenhum produto com esse nome.
                </div>
              ) : (
                filteredProducts.map(p => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        setQuantidade(1);
                        setDispatchResult(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl border transition flex items-center gap-3 active:scale-98 ${
                        isSelected
                          ? 'bg-rose-500/20 border-rose-500 text-white shadow-lg'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
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
                        <div className="text-xs text-slate-400 font-mono">{p.codigo_barras || 'Sem código'}</div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          <span className="text-blue-400 font-semibold" title="Central Piçarras">Piç: {p.estoque_c1}</span>
                          <span className="text-emerald-400 font-semibold" title="Central Penha">Pen: {p.estoque_c2}</span>
                          <span className="text-purple-400 font-semibold" title="Central Armação">Arm: {p.estoque_c3}</span>
                          <span className="text-amber-400 font-semibold" title="Rentter">Ren: {p.estoque_c4 || 0}</span>
                        </div>
                      </div>

                      {p.em_alerta && (
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0 animate-ping" title="Estoque baixo" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Outflow Dispatch Action Form (7 cols on lg) */}
        <div className="lg:col-span-7">
          {dispatchResult ? (
            /* Successful Dispatch Result Card */
            <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center animate-in fade-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-12 h-12" />
              </div>

              <h2 className="text-2xl font-black text-white mb-2">Saída Registrada com Sucesso!</h2>
              <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
                A baixa de estoque foi processada e gravada no histórico de auditoria.
              </p>

              <div className="bg-slate-950/70 rounded-2xl border border-slate-800 p-5 max-w-md mx-auto text-left space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Produto:</span>
                  <span className="font-bold text-white">{dispatchResult.produto_nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Central de Vendas:</span>
                  <span className="font-bold text-sky-400">{dispatchResult.central}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Quantidade Retirada:</span>
                  <span className="font-bold text-rose-400">-{dispatchResult.quantidade}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Saldo Atual Restante:</span>
                  <span className="font-black text-emerald-400 text-base">{dispatchResult.novo_saldo}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-800 pt-2">
                  <span className="text-slate-400">Responsável Logado:</span>
                  <span className="font-semibold text-slate-200">{dispatchResult.responsavel}</span>
                </div>

                {dispatchResult.is_alerta_estoque && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <span><b>Alerta:</b> Este item atingiu ou está abaixo do estoque mínimo ({dispatchResult.estoque_minimo} un).</span>
                  </div>
                )}
              </div>

              <button
                onClick={resetForm}
                className="py-4 px-8 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base shadow-xl shadow-sky-600/30 active:scale-95 transition"
              >
                Registrar Novo Despacho
              </button>
            </div>
          ) : !selectedProduct ? (
            /* Empty state when no product is picked yet */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center shadow-xl h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center mb-4 text-slate-600">
                <Package className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Nenhum produto selecionado</h3>
              <p className="text-slate-400 text-sm max-w-sm mb-6">
                Selecione um produto na lista ao lado ou escaneie o código de barras com a câmera do tablet.
              </p>
              <button
                onClick={() => setIsScannerOpen(true)}
                className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/20 flex items-center gap-2 active:scale-95 transition"
              >
                <ScanBarcode className="w-5 h-5" />
                <span>Abrir Câmera Scanner</span>
              </button>
            </div>
          ) : (
            /* Active Outflow Form */
            <form onSubmit={handleSubmitOutflow} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              
              {/* Product Header Card */}
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="w-20 h-20 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                  {selectedProduct.foto_path ? (
                    <img src={selectedProduct.foto_path} alt={selectedProduct.nome} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-8 h-8 text-slate-500" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {selectedProduct.categoria}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      Cód: {selectedProduct.codigo_barras || 'S/N'}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mt-1 leading-snug">
                    {selectedProduct.nome}
                  </h3>
                  <div className="text-xs text-slate-400 mt-1">
                    Unidade: <span className="font-semibold text-slate-200">{selectedProduct.unidade_medida}</span> • Estoque Mínimo: <span className="font-semibold text-slate-200">{selectedProduct.estoque_minimo}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="text-xs text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
                >
                  Trocar
                </button>
              </div>

              {/* 2. Seleção Obrigatória da Central de Vendas */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-sky-400" />
                    2. Selecione a Central de Retirada <span className="text-rose-400">*</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-normal">Obrigatório</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'Central Piçarras', label: 'Central Piçarras', stock: selectedProduct.estoque_c1, color: 'border-blue-500/50 bg-blue-950/30' },
                    { id: 'Central Penha', label: 'Central Penha', stock: selectedProduct.estoque_c2, color: 'border-emerald-500/50 bg-emerald-950/30' },
                    { id: 'Central Armação', label: 'Central Armação', stock: selectedProduct.estoque_c3, color: 'border-purple-500/50 bg-purple-950/30' },
                    { id: 'Rentter', label: 'Rentter', stock: selectedProduct.estoque_c4, color: 'border-amber-500/50 bg-amber-950/30' }
                  ].map(c => {
                    const isSelected = targetCentral === c.id;
                    const noStock = (c.stock || 0) <= 0;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setTargetCentral(c.id);
                          if (quantidade > (c.stock || 0) && (c.stock || 0) > 0) {
                            setQuantidade(c.stock);
                          }
                        }}
                        className={`p-4 rounded-2xl border text-center transition active:scale-95 relative ${
                          isSelected
                            ? `${c.color} border-2 ring-2 ring-sky-500/30 shadow-lg`
                            : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-850'
                        } ${noStock ? 'opacity-60' : ''}`}
                      >
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                          {c.id}
                        </div>
                        <div className={`text-2xl font-black ${
                          noStock ? 'text-rose-400' : isSelected ? 'text-white' : 'text-slate-200'
                        }`}>
                          {c.stock || 0}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {noStock ? 'Sem saldo' : 'disponíveis'}
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-400 shadow-sm" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Quantidade a Retirar (Tablet Finger Controls) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    3. Quantidade a Retirar
                  </label>
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="text-xs font-bold text-sky-400 hover:text-sky-300 bg-sky-950/60 px-2.5 py-1 rounded-xl border border-sky-800"
                  >
                    Usar Máximo ({currentAvailable})
                  </button>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 5))}
                      className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95 transition"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantidade(Math.max(1, quantidade - 1))}
                      className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95 transition"
                    >
                      <Minus className="w-5 h-5 mx-auto" />
                    </button>

                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min="1"
                        max={currentAvailable}
                        value={quantidade}
                        onChange={(e) => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
                        className={`w-full py-3 text-center rounded-xl font-black text-2xl bg-slate-900 border transition focus:outline-none ${
                          isStockInsufficient
                            ? 'border-rose-500 text-rose-400 focus:border-rose-400'
                            : 'border-slate-700 text-white focus:border-sky-500'
                        }`}
                      />
                      <div className="text-center text-[10px] text-slate-400 mt-1">
                        {selectedProduct.unidade_medida}(s)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuantidade(quantidade + 1)}
                      className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95 transition"
                    >
                      <Plus className="w-5 h-5 mx-auto" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuantidade(quantidade + 5)}
                      className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold active:scale-95 transition"
                    >
                      +5
                    </button>
                  </div>

                  {/* Stock validation warning */}
                  {isStockInsufficient && (
                    <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>
                        Saldo insuficiente na {targetCentral}! Disponível apenas {currentAvailable} {selectedProduct.unidade_medida}(s).
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Identificação do Responsável (Auto-gravado pelo login) */}
              <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">Responsável pelo Registro</div>
                    <div className="text-sm font-bold text-white">{user?.nome}</div>
                  </div>
                </div>
                <div className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                  {user?.perfil}
                </div>
              </div>

              {/* 5. Observação / Motivo da Saída (Opcional) */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Observação / Motivo da Saída (Opcional)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['Expedição de Venda', 'Separação de Pedido', 'Consumo Interno', 'Transferência Filial', 'Avaria / Descarte'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleQuickObs(preset)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-xl border transition ${
                        observacao === preset
                          ? 'bg-sky-600/30 border-sky-500 text-white'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Ex.: Pedido comercial #8849 - Rota Norte"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition text-sm"
                />
              </div>

              {/* Large Submit Button */}
              <button
                type="submit"
                disabled={submitting || isStockInsufficient || isZeroStock}
                className="w-full py-5 px-6 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black text-lg shadow-2xl shadow-rose-600/30 flex items-center justify-center gap-3 active:scale-98 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ArrowUpRight className="w-6 h-6" />
                    <span>CONFIRMAR SAÍDA DE ESTOQUE</span>
                  </>
                )}
              </button>

            </form>
          )}
        </div>

      </div>

      {/* Barcode scanner camera modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

    </div>
  );
}

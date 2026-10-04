import React, { useState, useEffect } from 'react';
import { 
  X, 
  Camera, 
  ScanBarcode, 
  Sparkles, 
  Upload, 
  Save, 
  Package, 
  Layers, 
  Scale, 
  AlertTriangle,
  Building,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import CameraModal from './CameraModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import { api } from '../utils/api';
import { compressImage } from '../utils/imageCompressor';

export default function ProductFormModal({ isOpen, onClose, onSave, onDelete, editingProduct = null }) {
  const [nome, setNome] = useState('');
  const [codigoBarras, setCodigoBarras] = useState('');
  const [categoria, setCategoria] = useState('Embalagens');
  const [unidadeMedida, setUnidadeMedida] = useState('Unidade');
  const [quantidadeInicial, setQuantidadeInicial] = useState(10);
  const [estoqueMinimo, setEstoqueMinimo] = useState(5);
  const [centralDestino, setCentralDestino] = useState('Central Piçarras');
  const [fotoBase64, setFotoBase64] = useState('');
  const [existingFotoPath, setExistingFotoPath] = useState('');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editingProduct) {
      setNome(editingProduct.nome || '');
      setCodigoBarras(editingProduct.codigo_barras || '');
      setCategoria(editingProduct.categoria || 'Embalagens');
      setUnidadeMedida(editingProduct.unidade_medida || 'Unidade');
      setEstoqueMinimo(editingProduct.estoque_minimo || 5);
      setExistingFotoPath(editingProduct.foto_path || '');
      setFotoBase64('');
    } else {
      setNome('');
      setCodigoBarras('');
      setCategoria('Embalagens');
      setUnidadeMedida('Unidade');
      setQuantidadeInicial(10);
      setEstoqueMinimo(5);
      setCentralDestino('Central Piçarras');
      setFotoBase64('');
      setExistingFotoPath('');
    }
    setError(null);
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const handleGenerateBarcode = () => {
    const timestamp = Date.now().toString().slice(-7);
    const random = Math.floor(Math.random() * 900 + 100);
    setCodigoBarras(`789${timestamp}${random}`);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 800, 800, 0.75);
      setFotoBase64(compressed);
      setExistingFotoPath('');
    } catch (err) {
      console.warn('Erro ao processar imagem:', err);
    }
  };

  const handleDeleteProduct = async () => {
    if (!editingProduct) return;
    if (!window.confirm(`Tem certeza que deseja excluir o produto "${editingProduct.nome}"?\n\nEsta ação apagará o cadastro do produto e todo o seu histórico de estoque.`)) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      if (onDelete) {
        await onDelete(editingProduct.id, editingProduct.nome);
      } else {
        await api.deleteProduto(editingProduct.id);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao excluir produto');
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) {
      setError('Por favor, informe o nome do produto.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let finalFoto = fotoBase64;
      if (finalFoto && finalFoto.startsWith('data:image')) {
        try {
          finalFoto = await compressImage(finalFoto, 800, 800, 0.75);
        } catch (_) {}
      }

      const payload = {
        nome: nome.trim(),
        codigo_barras: codigoBarras.trim() || undefined,
        categoria,
        unidade_medida: unidadeMedida,
        estoque_minimo: estoqueMinimo,
        quantidade_inicial: quantidadeInicial,
        central_destino: centralDestino,
        foto_base64: finalFoto || undefined
      };

      if (editingProduct) {
        await api.updateProduto(editingProduct.id, payload);
      } else {
        await api.createProduto(payload);
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao salvar o produto');
    } finally {
      setSaving(false);
    }
  };

  const categorias = ['Ferramentas', 'Insumos', 'Embalagens', 'Eletrônicos', 'Outros'];
  const unidades = ['Unidade', 'Caixa', 'Kg', 'Litro', 'Metro'];
  const centrais = ['Central Piçarras', 'Central Penha', 'Central Armação', 'Rentter'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[95vh] flex flex-col">
          
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg text-white">
                {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Photo Section */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Foto do Produto (Câmera do Tablet / Upload)
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="w-28 h-28 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden shrink-0 relative">
                  {fotoBase64 || existingFotoPath ? (
                    <img
                      src={fotoBase64 || existingFotoPath}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-600" />
                  )}
                </div>

                <div className="flex-1 flex flex-wrap gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 active:scale-95 transition"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Usar Câmera</span>
                  </button>

                  <label className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border border-slate-700 active:scale-95 transition text-center">
                    <Upload className="w-4 h-4" />
                    <span>Galeria/Arquivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {(fotoBase64 || existingFotoPath) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFotoBase64('');
                        setExistingFotoPath('');
                      }}
                      className="py-3 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold active:scale-95 transition"
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Nome do Produto <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Fita Adesiva 48mm x 50m"
                className="w-full px-4 py-3 bg-slate-950/70 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-sm"
              />
            </div>

            {/* Barcode & Scanner */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Código de Barras / QR Code
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateBarcode}
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Gerar Código
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  placeholder="Ex.: 78910001001"
                  className="flex-1 px-4 py-3 bg-slate-950/70 border border-slate-700 rounded-2xl text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition shrink-0"
                >
                  <ScanBarcode className="w-5 h-5" />
                  <span className="hidden sm:inline">Escanear</span>
                </button>
              </div>
            </div>

            {/* Category & Unit of Measure */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Categoria
                </label>
                <div className="relative">
                  <Layers className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-sky-500 transition text-sm appearance-none"
                  >
                    {categorias.map(cat => (
                      <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Unidade de Medida
                </label>
                <div className="relative">
                  <Scale className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <select
                    value={unidadeMedida}
                    onChange={(e) => setUnidadeMedida(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-950/70 border border-slate-700 rounded-2xl text-white focus:outline-none focus:border-sky-500 transition text-sm appearance-none"
                  >
                    {unidades.map(un => (
                      <option key={un} value={un} className="bg-slate-900">{un}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Steppers: Minimum stock and Initial stock */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Estoque Mínimo para Alerta */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Estoque Mínimo para Alerta
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEstoqueMinimo(Math.max(1, estoqueMinimo - 1))}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(Math.max(0, parseInt(e.target.value) || 0))}
                    className="flex-1 py-3 text-center bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-xl focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => setEstoqueMinimo(estoqueMinimo + 1)}
                    className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center font-bold active:scale-95 transition"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Central Destino Inicial e Quantidade Inicial (se criação) */}
              {!editingProduct && (
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <label className="block text-xs font-bold text-sky-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-sky-400" />
                    Central Destino Inicial
                  </label>
                  <select
                    value={centralDestino}
                    onChange={(e) => setCentralDestino(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500 transition text-sm mb-3"
                  >
                    {centrais.map(c => (
                      <option key={c} value={c} className="bg-slate-900">{c}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantidadeInicial(Math.max(0, quantidadeInicial - 5))}
                      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold active:scale-95 transition"
                    >
                      -5
                    </button>
                    <input
                      type="number"
                      min="0"
                      value={quantidadeInicial}
                      onChange={(e) => setQuantidadeInicial(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 py-2 text-center bg-slate-900 border border-slate-700 rounded-xl text-white font-black text-lg focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => setQuantidadeInicial(quantidadeInicial + 5)}
                      className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold active:scale-95 transition"
                    >
                      +5
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Bar */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              {editingProduct ? (
                <button
                  type="button"
                  onClick={handleDeleteProduct}
                  disabled={saving || deleting}
                  className="py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/30 font-bold text-sm flex items-center gap-2 active:scale-95 transition disabled:opacity-50"
                  title="Excluir este produto cadastrado"
                >
                  {deleting ? (
                    <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{deleting ? 'Excluindo...' : 'Excluir Produto'}</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm active:scale-95 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="py-3 px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-xl shadow-sky-600/30 flex items-center gap-2 active:scale-95 transition disabled:opacity-50"
                >
                  {saving ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Embedded Modals */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(base64) => setFotoBase64(base64)}
      />

      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={(code) => setCodigoBarras(code)}
      />
    </>
  );
}

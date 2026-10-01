import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { ScanBarcode, X, Zap, RefreshCw, Volume2 } from 'lucide-react';
import { playBeep } from '../utils/sound';

export default function BarcodeScannerModal({ isOpen, onClose, onScan }) {
  const [scannerError, setScannerError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isScanning, setIsScanning] = useState(false);
  const qrRegionId = 'tablet-barcode-reader';
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    let timer;
    if (isOpen) {
      // Small timeout to guarantee DOM node is rendered
      timer = setTimeout(() => {
        startScanner();
      }, 150);
    } else {
      stopScanner();
    }

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, facingMode]);

  const startScanner = async () => {
    stopScanner();
    setScannerError(null);

    const elem = document.getElementById(qrRegionId);
    if (!elem) return;

    try {
      const qrCode = new Html5Qrcode(qrRegionId);
      html5QrCodeRef.current = qrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0,
      };

      await qrCode.start(
        { facingMode: { ideal: facingMode } },
        config,
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // ignore frame errors
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.warn('Erro ao inicializar scanner:', err);
      setScannerError('Acesso à câmera indisponível ou permissão não concedida.');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    if (html5QrCodeRef.current) {
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      if (scanner.isScanning) {
        scanner.stop().catch(() => {}).finally(() => {
          try {
            scanner.clear();
          } catch (_) {}
        });
      } else {
        try {
          scanner.clear();
        } catch (_) {}
      }
    }
  };

  const handleSuccess = (code) => {
    playBeep('success');
    stopScanner();
    onScan(code);
    onClose();
  };

  const sampleCodes = [
    { label: 'Fita Adesiva', code: '78910001001' },
    { label: 'Parafusadeira', code: '78910002002' },
    { label: 'Caixa 40x40', code: '78910003003' },
    { label: 'Cabo Cat6', code: '78910004004' },
    { label: 'Álcool 1L', code: '78910005005' },
    { label: 'Luva Nitrílica', code: '78910006006' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg text-slate-100">Leitor de Código / QR</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-bold border border-emerald-800 flex items-center gap-1">
              <Volume2 className="w-3 h-3" /> Beep Ativo
            </span>
          </div>
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Camera Container */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[320px] overflow-hidden p-2">
          <div id={qrRegionId} className="w-full max-w-sm rounded-xl overflow-hidden" />
          
          {scannerError && (
            <div className="p-6 text-center text-slate-300">
              <p className="text-amber-400 mb-2 font-medium">{scannerError}</p>
              <p className="text-xs text-slate-400">
                Você pode utilizar os botões de simulação abaixo para teste imediato.
              </p>
            </div>
          )}
        </div>

        {/* Quick Test Barcodes for instant tablet simulation */}
        <div className="p-4 bg-slate-850 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Simular Leitura de Código (1-Toque):
            </span>
            <button
              onClick={() => setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')}
              className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Alternar Câmera
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {sampleCodes.map(sc => (
              <button
                key={sc.code}
                onClick={() => handleSuccess(sc.code)}
                className="py-2 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-xl border border-slate-700 font-medium text-left truncate active:scale-95 transition"
              >
                <div className="font-semibold truncate text-white">{sc.label}</div>
                <div className="text-[10px] text-slate-400 font-mono truncate">{sc.code}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

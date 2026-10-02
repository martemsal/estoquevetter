import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { 
  ScanBarcode, 
  X, 
  Zap, 
  RefreshCw, 
  Volume2, 
  Camera, 
  AlertCircle, 
  ShieldCheck, 
  FileSearch 
} from 'lucide-react';
import { playBeep } from '../utils/sound';

export default function BarcodeScannerModal({ isOpen, onClose, onScan }) {
  const [scannerError, setScannerError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const qrRegionId = 'tablet-barcode-reader';
  const html5QrCodeRef = useRef(null);

  const isSecureContext = typeof window !== 'undefined' && (
    window.isSecureContext ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  useEffect(() => {
    let timer;
    if (isOpen) {
      timer = setTimeout(() => {
        initScanner();
      }, 200);
    } else {
      stopScanner();
    }

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen, facingMode, selectedCameraId]);

  const initScanner = async () => {
    stopScanner();
    setScannerError(null);

    const elem = document.getElementById(qrRegionId);
    if (!elem) return;

    try {
      const qrCode = new Html5Qrcode(qrRegionId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        verbose: false
      });
      html5QrCodeRef.current = qrCode;

      // Check available cameras
      let cameraToUse = selectedCameraId;
      try {
        const devs = await Html5Qrcode.getCameras();
        if (devs && devs.length > 0) {
          setCameras(devs);
          if (!cameraToUse) {
            // Prefer back / environment camera on mobile/tablet
            const backCam = devs.find(d => 
              /back|traseira|rear|environment|extern/i.test(d.label)
            );
            cameraToUse = backCam ? backCam.id : (facingMode === 'user' ? devs[0].id : devs[devs.length - 1].id);
          }
        }
      } catch (camErr) {
        console.warn('Não foi possível listar câmeras explicitamente:', camErr);
      }

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.max(200, Math.floor(minEdge * 0.85)),
            height: Math.max(160, Math.floor(minEdge * 0.65))
          };
        },
        aspectRatio: 1.0,
      };

      // If we have a cameraId, use it directly, otherwise pass { facingMode: "environment" }
      const cameraArg = cameraToUse || { facingMode: facingMode };

      await qrCode.start(
        cameraArg,
        scanConfig,
        (decodedText) => {
          handleSuccess(decodedText);
        },
        () => {
          // ignore scan frame errors
        }
      );

      setIsScanning(true);
      setScannerError(null);
    } catch (err) {
      console.warn('Erro ao inicializar câmera do scanner:', err);
      setIsScanning(false);

      const errMsg = String(err?.message || err);
      if (errMsg.includes('NotAllowedError') || errMsg.includes('Permission denied')) {
        setScannerError('Permissão da câmera bloqueada. Toque no ícone de configurações ao lado da URL para permitir a câmera deste site.');
      } else if (!isSecureContext) {
        setScannerError('Navegadores móveis bloqueiam vídeo ao vivo via HTTP. Use o botão "Fotografar Código" abaixo ou acesse via link seguro HTTPS (Vercel).');
      } else {
        setScannerError('Câmera indisponível no momento. Você pode usar a captura fotográfica direta ou os atalhos abaixo.');
      }
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
    if (!code) return;
    playBeep('success');
    stopScanner();
    onScan(String(code).trim());
    onClose();
  };

  // Direct snapshot capture & barcode decode (Works on ALL phones/tablets even without HTTPS!)
  const handleCaptureFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setScannerError(null);

    try {
      let qrCode = html5QrCodeRef.current;
      if (!qrCode) {
        qrCode = new Html5Qrcode(qrRegionId, { verbose: false });
        html5QrCodeRef.current = qrCode;
      }

      if (qrCode.isScanning) {
        await qrCode.stop().catch(() => {});
      }

      const decodedText = await qrCode.scanFile(file, false);
      handleSuccess(decodedText);
    } catch (decodeErr) {
      console.warn('Erro ao ler código da foto:', decodeErr);
      playBeep('alert');
      setScannerError('Não foi possível identificar um código nítido nesta foto. Aproxime a câmera e certifique-se de boa iluminação.');
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleToggleCamera = () => {
    if (cameras.length > 1) {
      const currentIndex = cameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      setSelectedCameraId(cameras[nextIndex].id);
    } else {
      setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <ScanBarcode className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="font-extrabold text-base sm:text-lg text-slate-100">Leitor de Código / QR</h3>
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

        {/* Camera Video Viewfinder */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[280px] sm:min-h-[320px] overflow-hidden p-2">
          <div id={qrRegionId} className="w-full max-w-sm rounded-2xl overflow-hidden" />
          
          {/* Target box guide overlay */}
          {isScanning && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-40 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.3)] relative">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-rose-500/80 animate-pulse" />
              </div>
            </div>
          )}

          {/* Scanner Error / Guidance Display */}
          {scannerError && (
            <div className="p-5 text-center text-slate-200 max-w-sm">
              <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-amber-300 mb-3">{scannerError}</p>

              {/* Direct Hardware Camera Shutter Trigger (100% Works on Android and iOS!) */}
              <label className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 cursor-pointer active:scale-95 transition">
                <Camera className="w-5 h-5" />
                <span>{isProcessingFile ? 'Processando Foto...' : 'Fotografar Código com a Câmera'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleCaptureFile}
                  disabled={isProcessingFile}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Action Controls & Hardware Photo Fallback */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 space-y-3">
          
          {/* Hardware Camera Shutter Button (Always available as high-reliability option) */}
          <div className="flex items-center gap-2">
            <label className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>{isProcessingFile ? 'Decodificando...' : 'Fotografar Código'}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCaptureFile}
                disabled={isProcessingFile}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleToggleCamera}
              className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition"
              title="Trocar Câmera Traseira / Frontal"
            >
              <RefreshCw className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Virar Câmera</span>
            </button>
          </div>

          {/* Quick Simulation Barcodes */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Simular Leitura de Código (1-Toque para Teste):
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {sampleCodes.map(sc => (
                <button
                  key={sc.code}
                  type="button"
                  onClick={() => handleSuccess(sc.code)}
                  className="py-2 px-2 bg-slate-950 hover:bg-slate-800 text-slate-200 text-xs rounded-xl border border-slate-800 font-medium text-left truncate active:scale-95 transition"
                >
                  <div className="font-semibold truncate text-white">{sc.label}</div>
                  <div className="text-[10px] text-emerald-400 font-mono truncate">{sc.code}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

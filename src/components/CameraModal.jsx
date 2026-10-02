import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, X, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';

export default function CameraModal({ isOpen, onClose, onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // environment = back camera
  const [cameraError, setCameraError] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPreviewImage(null);
      setCameraError(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Câmera não suportada neste navegador.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.warn('Erro ao acessar câmera:', err);
      setCameraError('Não foi possível acessar a câmera. Verifique as permissões ou use o upload de imagem.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleTakePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Redimensionar para tamanho ideal de tablet/mobile (max 800px)
    let targetWidth = video.videoWidth || 640;
    let targetHeight = video.videoHeight || 480;
    const maxDim = 800;
    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    try {
      const rawDataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const compressed = await compressImage(rawDataUrl, 800, 800, 0.75);
      setPreviewImage(compressed);
    } catch (_) {
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.7));
    }
    stopCamera();

    setTimeout(() => {
      setIsCapturing(false);
    }, 200);
  };

  const handleConfirm = async () => {
    if (previewImage) {
      let finalImg = previewImage;
      try {
        finalImg = await compressImage(previewImage, 800, 800, 0.75);
      } catch (_) {}
      onCapture(finalImg);
      onClose();
    }
  };

  const handleRetake = () => {
    setPreviewImage(null);
    startCamera();
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file, 800, 800, 0.75);
      setPreviewImage(compressed);
      stopCamera();
    } catch (err) {
      console.warn('Erro ao processar arquivo de foto:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-400" />
            <h3 className="font-semibold text-lg text-slate-100">Câmera do Tablet</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] overflow-hidden">
          {previewImage ? (
            <img
              src={previewImage}
              alt="Preview"
              className="w-full h-full object-contain max-h-[420px]"
            />
          ) : cameraError ? (
            <div className="p-6 text-center max-w-sm">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-slate-300 text-sm mb-4">{cameraError}</p>
              <label className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 font-semibold text-white cursor-pointer shadow-lg active:scale-95 transition">
                <Camera className="w-5 h-5" />
                <span>Fotografar com a Câmera / Arquivo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover max-h-[420px] ${
                  isCapturing ? 'brightness-150' : ''
                }`}
              />
              <div className="absolute inset-4 border-2 border-sky-400/50 rounded-2xl pointer-events-none border-dashed" />
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          {previewImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Tirar Outra</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30 active:scale-95 transition"
              >
                <Check className="w-5 h-5" />
                <span>Confirmar Foto</span>
              </button>
            </>
          ) : (
            <>
              <label className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer active:scale-95 transition" title="Tirar foto ou escolher arquivo">
                <Camera className="w-6 h-6 text-sky-400" />
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleTakePhoto}
                disabled={!!cameraError}
                className="w-16 h-16 rounded-full border-4 border-white bg-sky-500 hover:bg-sky-400 flex items-center justify-center shadow-lg active:scale-90 transition disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-white/90" />
              </button>

              <button
                type="button"
                onClick={handleFlipCamera}
                disabled={!!cameraError}
                className="p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center active:scale-95 transition disabled:opacity-50"
                title="Virar Câmera"
              >
                <RefreshCw className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

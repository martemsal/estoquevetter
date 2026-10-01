import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />
  };

  const borderColors = {
    success: 'border-emerald-500/40 bg-slate-900/95 text-emerald-100',
    warning: 'border-amber-500/40 bg-slate-900/95 text-amber-100',
    error: 'border-rose-500/40 bg-slate-900/95 text-rose-100',
    info: 'border-sky-500/40 bg-slate-900/95 text-sky-100'
  };

  return (
    <div className="fixed top-5 right-5 left-5 md:left-auto md:w-96 z-50 animate-bounce-in">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md ${
          borderColors[toast.type] || borderColors.info
        }`}
      >
        {icons[toast.type] || icons.info}
        <div className="flex-1 text-sm font-medium">
          {toast.title && <div className="font-bold text-white mb-0.5">{toast.title}</div>}
          <div className="text-slate-200">{toast.message}</div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

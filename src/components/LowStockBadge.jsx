import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function LowStockBadge({ total, min, centrais = [] }) {
  const alertCentrais = centrais.filter(c => c.alerta);

  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-alert-pulse">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
      <span>Estoque Baixo</span>
      {min !== undefined && (
        <span className="text-rose-400/80 font-normal">
          ({total}/{min} min)
        </span>
      )}
    </div>
  );
}

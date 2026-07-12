import React from 'react';

export default function Logo({ className = '', compact = false }) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <img src="/logo.png" alt="nearbi logo" className="h-9 w-9 rounded-xl border border-white/10 bg-ink" />
      {!compact && (
        <span className="font-display text-xl tracking-tight text-coral">nearbi</span>
      )}
    </div>
  );
}

import React from 'react';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10 justify-center">
          <div className="w-9 h-9 rounded-lg bg-coral flex items-center justify-center font-display text-ink font-semibold text-lg">
            n
          </div>
          <span className="font-display text-2xl tracking-tight">nearbi</span>
        </div>
        <h1 className="font-display text-2xl mb-1 text-center">{title}</h1>
        {subtitle && <p className="text-slate-faint text-sm text-center mb-8">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

import React from 'react';

export default function FormInput({ label, error, ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-slate-faint mb-1.5">{label}</label>}
      <input
        {...props}
        className={`w-full bg-ink-soft border rounded-xl px-4 py-2.5 text-[15px] outline-none placeholder-slate-mute transition-colors ${
          error ? 'border-coral' : 'border-ink-line focus:border-teal-bright'
        }`}
      />
      {error && <p className="text-coral text-xs mt-1">{error}</p>}
    </div>
  );
}

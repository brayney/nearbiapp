import React from 'react';

export default function FormInput({ label, error, trailing, ...props }) {
  const inputClassName = `w-full bg-ink-soft border rounded-xl px-4 py-2.5 text-[15px] outline-none placeholder-slate-mute transition-colors ${
    error ? 'border-coral' : 'border-ink-line focus:border-teal-bright'
  } ${trailing ? 'pr-12' : ''}`;

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-slate-faint mb-1.5">{label}</label>}
      <div className="relative">
        <input {...props} className={`${inputClassName} ${props.className ?? ''}`} />
        {trailing && <div className="absolute inset-y-0 right-3 flex items-center">{trailing}</div>}
      </div>
      {error && <p className="text-coral text-xs mt-1">{error}</p>}
    </div>
  );
}

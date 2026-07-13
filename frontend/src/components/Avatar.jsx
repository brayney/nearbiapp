import React from 'react';

const SIZES = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export default function Avatar({ src, alt = '', size = 'md', online = false, ring = false, className = '' }) {
  const dim = SIZES[size] || SIZES.md;

  return (
    <div className={`relative shrink-0 ${dim} ${className}`}>
      <div
        className={`w-full h-full rounded-full overflow-hidden bg-ink-line flex items-center justify-center ${
          ring ? 'ring-2 ring-coral ring-offset-2 ring-offset-ink' : ''
        }`}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-slate-faint text-sm">{alt?.[0]?.toUpperCase() || '?'}</span>
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-teal-bright border-2 border-ink animate-presence" />
      )}
    </div>
  );
}

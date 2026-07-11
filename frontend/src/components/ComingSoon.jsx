import React from 'react';

export default function ComingSoon({ title, description }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-ink-soft border border-ink-line flex items-center justify-center">
          <span className="font-mono text-xs text-slate-mute">soon</span>
        </div>
        <h1 className="font-display text-2xl mb-2">{title}</h1>
        <p className="text-slate-faint text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

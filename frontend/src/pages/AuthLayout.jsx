import React from 'react';
import Logo from '../components/Logo';
import SiteFooter from '../components/SiteFooter';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-ink">
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center mb-10">
            <Logo size={144} />
          </div>
          <h1 className="font-display text-2xl mb-1 text-center">{title}</h1>
          {subtitle && <p className="text-slate-faint text-sm text-center mb-8">{subtitle}</p>}
          {children}
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

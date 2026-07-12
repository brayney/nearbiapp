import React from 'react';

export default function SiteFooter({ className = '' }) {
  return (
    <footer className={`border-t border-ink-line px-4 py-5 text-center text-xs text-slate-mute ${className}`}>
      <p>© {new Date().getFullYear()} nearbi</p>
      <p className="mt-1">Connect with the people around you.</p>
      <p className="mt-1">Developed by Bryne Borinaga</p>
    </footer>
  );
}

import React from 'react';

export default function Logo({ className = '' }) {
  return (
    <div className={className.trim()}>
      <img src="/logo.png" alt="nearbi logo" className="h-9 w-9" />
    </div>
  );
}

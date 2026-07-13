import React from 'react';

export default function Logo({ className = '', size = 160 }) {
  return (
    <div
      className={`relative w-[var(--logo-size)] aspect-[2.1/1] overflow-hidden ${className}`.trim()}
      style={{ '--logo-size': `${size}px` }}
    >
      <img
        src="/finallogo.png"
        alt="nearbi logo"
        className="block h-full w-full object-contain"
      />
    </div>
  );
}

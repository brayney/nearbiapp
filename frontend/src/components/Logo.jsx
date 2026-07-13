import React from 'react';

export default function Logo({ className = '', size = 160 }) {
  return (
    <div
      className={`relative w-[var(--logo-size)] aspect-[2.1/1] overflow-hidden ${className}`.trim()}
      style={{ '--logo-size': `${size}px` }}
    >
      <img
        src="/logo.png"
        alt="nearbi logo"
        /* The source artwork includes generous transparent margins. Crop those
           margins here so every use of the logo has a consistent visual size. */
        className="absolute -left-[9.5%] -top-[85%] h-[250%] max-w-none"
      />
    </div>
  );
}

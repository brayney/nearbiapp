import React from 'react';

export default function Logo({ className = '', size = 96 }) {
  return (
    <div className={className.trim()} style={{ width: size, height: size }}>
      <img
        src="/logo.png"
        alt="nearbi logo"
        className="block h-full w-full object-contain"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

import React from 'react';

export default function Logo({ className = '', size = 64 }) {
  return (
    <div className={className.trim()}>
      <img src="/logo.png" alt="nearbi logo" className="block" style={{ width: size, height: size }} />
    </div>
  );
}

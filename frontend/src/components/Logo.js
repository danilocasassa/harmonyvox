import React from 'react';
import logoImg from '../assets/logo.png';

/**
 * Logo oficial do HarmonyVox
 * size: 'sm' | 'md' | 'lg'
 */
export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { img: 28, text: '1.4rem', gap: 8 },
    md: { img: 44, text: '2.2rem', gap: 12 },
    lg: { img: 64, text: '3.2rem', gap: 16 },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: s.gap }}>
      <img
        src={logoImg}
        alt="HarmonyVox logo"
        style={{ height: s.img, width: s.img, objectFit: 'contain' }}
      />
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: s.text,
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          HARMONY
        </span>
        <span style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: s.text,
          fontWeight: 200,
          color: '#f8fafc',
          letterSpacing: '0.25em',
          lineHeight: 1,
          textTransform: 'uppercase',
        }}>
          VOX
        </span>
      </div>
    </div>
  );
}

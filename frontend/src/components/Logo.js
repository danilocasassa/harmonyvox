import React from 'react';
import logoImg from '../assets/logo.png';

/**
 * Logo oficial do HarmonyVox
 * size: 'sm' | 'md' | 'lg'
 */
export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { img: 28, harmony: '1.4rem', vox: '1.1rem', gap: 8 },
    md: { img: 44, harmony: '2.2rem', vox: '1.7rem', gap: 12 },
    lg: { img: 64, harmony: '3.2rem', vox: '2.5rem', gap: 16 },
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
          fontSize: s.harmony,
          fontWeight: 700,
          color: '#f8fafc',
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          HARMONY
        </span>
        <span style={{
          fontFamily: "'Raleway', sans-serif",
          fontSize: s.vox,
          fontWeight: 200,
          color: '#a60ef7',
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

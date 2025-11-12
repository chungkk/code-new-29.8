import React from 'react';

const SkeletonBox = ({ width = '100%', height = '20px', borderRadius = '4px', marginBottom = '0' }) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      marginBottom,
      background: 'linear-gradient(90deg, var(--bg-secondary) 0%, var(--bg-hover) 50%, var(--bg-secondary) 100%)',
      backgroundSize: '200% 100%',
      animation: 'loading 1.5s ease-in-out infinite',
    }}
  />
);

export const SkeletonCard = () => (
  <div
    style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--border-radius)',
      overflow: 'hidden',
      border: '1px solid var(--border-color)',
    }}
  >
    <SkeletonBox width="100%" height="180px" borderRadius="0" />
    <div style={{ padding: 'var(--spacing-md)' }}>
      <SkeletonBox width="80%" height="20px" marginBottom="var(--spacing-sm)" />
      <SkeletonBox width="60%" height="16px" marginBottom="var(--spacing-md)" />
      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        <SkeletonBox width="48%" height="32px" />
        <SkeletonBox width="48%" height="32px" />
      </div>
    </div>
  </div>
);

export const SkeletonGrid = ({ count = 6 }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
      gap: 'var(--spacing-lg)',
    }}
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonStats = () => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 'var(--spacing-lg)',
      marginBottom: 'var(--spacing-xl)',
    }}
  >
    {Array.from({ length: 4 }).map((_, i) => (
      <div
        key={i}
        style={{
          background: 'var(--bg-secondary)',
          padding: 'var(--spacing-lg)',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
        }}
      >
        <SkeletonBox width="60%" height="18px" marginBottom="var(--spacing-sm)" />
        <SkeletonBox width="40%" height="32px" />
      </div>
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
  <div
    style={{
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--border-radius)',
      border: '1px solid var(--border-color)',
      overflow: 'hidden',
    }}
  >
    <div style={{ padding: 'var(--spacing-md)', borderBottom: '1px solid var(--border-color)' }}>
      <SkeletonBox width="30%" height="20px" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        style={{
          padding: 'var(--spacing-md)',
          borderBottom: i < rows - 1 ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          gap: 'var(--spacing-lg)',
        }}
      >
        <SkeletonBox width="40%" height="18px" />
        <SkeletonBox width="20%" height="18px" />
        <SkeletonBox width="30%" height="18px" />
      </div>
    ))}
  </div>
);

// Add CSS animation to global styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

export default SkeletonBox;

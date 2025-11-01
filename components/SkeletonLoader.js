import React from 'react';
import styles from '../styles/SkeletonLoader.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonHeader}>
        <div className={styles.skeletonTitle}></div>
        <div className={styles.skeletonBadge}></div>
      </div>
      <div className={styles.skeletonText}></div>
      <div className={styles.skeletonText} style={{ width: '80%' }}></div>
      <div className={styles.skeletonProgress}>
        <div className={styles.skeletonProgressBar}></div>
      </div>
      <div className={styles.skeletonButtons}>
        <div className={styles.skeletonButton}></div>
        <div className={styles.skeletonButton}></div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className={styles.skeletonTable}>
      <div className={styles.skeletonTableHeader}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.skeletonTableHeaderCell}></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.skeletonTableRow}>
          {[1, 2, 3, 4].map((j) => (
            <div key={j} className={styles.skeletonTableCell}></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStats({ count = 4 }) {
  return (
    <div className={styles.skeletonStatsGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.skeletonStatCard}>
          <div className={styles.skeletonStatIcon}></div>
          <div className={styles.skeletonStatContent}>
            <div className={styles.skeletonStatValue}></div>
            <div className={styles.skeletonStatLabel}></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ width = '100%', height = '16px' }) {
  return <div className={styles.skeletonText} style={{ width, height }}></div>;
}

export function SkeletonCircle({ size = '40px' }) {
  return <div className={styles.skeletonCircle} style={{ width: size, height: size }}></div>;
}

export function SkeletonGrid({ count = 6, columns = 3 }) {
  return (
    <div
      className={styles.skeletonGrid}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default SkeletonCard;

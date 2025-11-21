import React, { useEffect, useState } from 'react';
import styles from '../styles/StreakNotification.module.css';

const StreakNotification = ({ show, onComplete, streakValue = 1 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      
      // Auto hide after 2.5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onComplete) {
          setTimeout(onComplete, 300); // Wait for fade out animation
        }
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show && !isVisible) return null;

  const isNegative = streakValue < 0;
  const displayValue = isNegative ? streakValue : `+${streakValue}`;

  return (
    <div className={`${styles.notification} ${isVisible ? styles.show : styles.hide} ${isNegative ? styles.negative : ''}`}>
      <div className={styles.content}>
        <div className={styles.streakIcon}>{isNegative ? '💔' : '🔥'}</div>
        <div className={styles.streakText}>{displayValue}</div>
      </div>
    </div>
  );
};

export default StreakNotification;

import React, { useState, useEffect, useRef } from 'react';
import styles from '../styles/StreakPopup.module.css';

const StreakPopup = ({ onClose }) => {
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    weeklyProgress: [false, false, false, false, false, false, false] // MO, TU, WE, TH, FR, SA, SU
  });
  const [loading, setLoading] = useState(true);
  const popupRef = useRef(null);

  const dayLabels = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

  useEffect(() => {
    loadStreakData();
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  const loadStreakData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/streak');
      const data = await response.json();
      
      if (data.success) {
        setStreakData({
          currentStreak: data.currentStreak || 0,
          weeklyProgress: data.weeklyProgress || [false, false, false, false, false, false, false]
        });
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.popup} ref={popupRef}>
      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
        </div>
      ) : (
        <>
          <div className={styles.streakDisplay}>
            <span className={styles.streakIcon}>🔥</span>
            <div className={styles.streakInfo}>
              <span className={styles.streakValue}>{streakData.currentStreak}</span>
              <span className={styles.streakLabel}>day streak</span>
            </div>
          </div>

          <div className={styles.weeklyCalendar}>
            {dayLabels.map((day, index) => (
              <div key={day} className={styles.dayContainer}>
                <span className={styles.dayLabel}>{day}</span>
                <div 
                  className={`${styles.dayCircle} ${
                    streakData.weeklyProgress[index] ? styles.active : ''
                  }`}
                >
                  {streakData.weeklyProgress[index] && (
                    <span className={styles.checkmark}>✓</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StreakPopup;

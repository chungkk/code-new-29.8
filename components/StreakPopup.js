import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles/StreakPopup.module.css';

const StreakPopup = ({ onClose }) => {
  const { t } = useTranslation();
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    weeklyProgress: [false, false, false, false, false, false, false]
  });
  const [loading, setLoading] = useState(true);
  const popupRef = useRef(null);

  const dayLabels = [
    t('streakPopup.days.mo'),
    t('streakPopup.days.tu'),
    t('streakPopup.days.we'),
    t('streakPopup.days.th'),
    t('streakPopup.days.fr'),
    t('streakPopup.days.sa'),
    t('streakPopup.days.su')
  ];

  const handleClickOutside = (event) => {
    if (popupRef.current && !popupRef.current.contains(event.target)) {
      onClose();
    }
  };

  const loadStreakData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/user/streak', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
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

  useEffect(() => {
    loadStreakData();
    document.addEventListener('mousedown', handleClickOutside);

    // Listen for streak updates
    const handleStreakUpdate = () => {
      console.log('StreakPopup: Received streakUpdated event, reloading data...');
      loadStreakData();
    };
    window.addEventListener('streakUpdated', handleStreakUpdate);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('streakUpdated', handleStreakUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              <span className={styles.streakLabel}>{t('streakPopup.label')}</span>
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

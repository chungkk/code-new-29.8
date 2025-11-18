import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserProfileSidebar.module.css';

export default function UserProfileSidebar({ stats, userPoints = 0, maxStreak = 0 }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dictation');

  return (
    <aside className={styles.profileSidebar}>
      {/* User Identity */}
      <div className={styles.userIdentity}>
        <div className={styles.userAvatar}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h2 className={styles.userName}>
          {user?.name || 'User'}
          <span className={styles.badge}>✓</span>
        </h2>
        <div className={styles.privacyToggle}>
          <span className={styles.privacyIcon}>🔒</span>
          <span className={styles.privacyLabel}>Profile Privacy</span>
          <span className={styles.privacyStatus}>Public</span>
        </div>
      </div>

      {/* Premium Status Card */}
      <div className={styles.premiumCard}>
        <h3 className={styles.premiumTitle}>
          <span className={styles.premiumIcon}>👑</span>
          Premium Status
        </h3>
        <div className={styles.premiumInfo}>
          <div className={styles.premiumRow}>
            <span className={styles.premiumLabel}>Premium Status</span>
            <span className={styles.badgeInactive}>Inactive</span>
          </div>
          <div className={styles.premiumRow}>
            <span className={styles.premiumLabel}>Total Premium months</span>
            <span className={styles.premiumValue}>0</span>
          </div>
        </div>
        <p className={styles.notPremium}>Not a Premium member</p>
        <button className={styles.unlockProBtn}>
          <span className={styles.btnIcon}>👑</span>
          Unlock PRO
        </button>
      </div>

      {/* User Stats */}
      <div className={styles.userStats}>
        <div className={styles.streakInfo}>
          <div className={styles.streakItem}>
            <span className={styles.streakIcon}>⭐</span>
            <span className={styles.streakValue}>{userPoints}</span>
          </div>
          <div className={styles.streakItem}>
            <span className={styles.streakIcon}>🔥</span>
            <span className={styles.streakLabel}>Max streak:</span>
            <span className={styles.streakValue}>{maxStreak}</span>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className={styles.activityTabs}>
          <button
            className={`${styles.activityTab} ${activeTab === 'dictation' ? styles.active : ''}`}
            onClick={() => setActiveTab('dictation')}
          >
            Dictation
          </button>
          <button
            className={`${styles.activityTab} ${activeTab === 'shadowing' ? styles.active : ''}`}
            onClick={() => setActiveTab('shadowing')}
          >
            Shadowing
          </button>
        </div>

        {/* Total Lessons */}
        <div className={styles.totalLessons}>
          <span className={styles.lessonsIcon}>🎓</span>
          <div className={styles.lessonsContent}>
            <span className={styles.lessonsLabel}>Total lessons</span>
            <span className={styles.lessonsValue}>{stats?.totalLessons || 0}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

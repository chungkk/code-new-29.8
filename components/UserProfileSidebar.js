import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserProfileSidebar.module.css';

export default function UserProfileSidebar({ stats, userPoints = 0 }) {
  const { t } = useTranslation();
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
          <span className={styles.privacyLabel}>{t('userProfile.privacyLabel')}</span>
          <span className={styles.privacyStatus}>{t('userProfile.privacyStatus')}</span>
        </div>
      </div>

      {/* Premium Status Card */}
      <div className={styles.premiumCard}>
        <h3 className={styles.premiumTitle}>
          <span className={styles.premiumIcon}>👑</span>
          {t('userProfile.premiumStatus')}
        </h3>
        <div className={styles.premiumInfo}>
          <div className={styles.premiumRow}>
            <span className={styles.premiumLabel}>{t('userProfile.premiumStatus')}</span>
            <span className={styles.badgeInactive}>{t('userProfile.premiumInactive')}</span>
          </div>
          <div className={styles.premiumRow}>
            <span className={styles.premiumLabel}>{t('userProfile.totalPremiumMonths')}</span>
            <span className={styles.premiumValue}>0</span>
          </div>
        </div>
        <p className={styles.notPremium}>{t('userProfile.notPremium')}</p>
        <button className={styles.unlockProBtn}>
          <span className={styles.btnIcon}>👑</span>
          {t('userProfile.unlockPro')}
        </button>
      </div>

      {/* User Stats */}
      <div className={styles.userStats}>
        <div className={styles.streakInfo}>
          <div className={styles.streakItem}>
            <span className={styles.streakIcon}>⭐</span>
            <span className={styles.streakValue}>{userPoints}</span>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className={styles.activityTabs}>
          <button
            className={`${styles.activityTab} ${activeTab === 'dictation' ? styles.active : ''}`}
            onClick={() => setActiveTab('dictation')}
          >
            {t('userProfile.dictation')}
          </button>
          <button
            className={`${styles.activityTab} ${activeTab === 'shadowing' ? styles.active : ''}`}
            onClick={() => setActiveTab('shadowing')}
          >
            {t('userProfile.shadowing')}
          </button>
        </div>

        {/* Total Lessons */}
        <div className={styles.totalLessons}>
          <span className={styles.lessonsIcon}>🎓</span>
          <div className={styles.lessonsContent}>
            <span className={styles.lessonsLabel}>{t('userProfile.totalLessons')}</span>
            <span className={styles.lessonsValue}>{stats?.totalLessons || 0}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

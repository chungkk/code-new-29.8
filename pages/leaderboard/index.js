import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import useSWR from 'swr';
import { fetchWithAuth } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/leaderboard.module.css';

// SWR fetcher function - works with or without authentication
const fetcher = async (url) => {
  try {
    const response = await fetchWithAuth(url);
    if (response && response.success) {
      return response.data;
    }
    // If fetchWithAuth fails, try without auth
    const publicResponse = await fetch(url);
    if (publicResponse.ok) {
      const data = await publicResponse.json();
      if (data && data.success) {
        return data.data;
      }
    }
    throw new Error('Failed to fetch leaderboard data');
  } catch (error) {
    // Fallback to public fetch if auth fails
    try {
      const publicResponse = await fetch(url);
      if (publicResponse.ok) {
        const data = await publicResponse.json();
        if (data && data.success) {
          return data.data;
        }
      }
    } catch (fallbackError) {
      console.error('Fetcher error:', fallbackError);
    }
    throw error;
  }
};

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  // Use SWR for caching and automatic revalidation
  // Allow viewing leaderboard without login (public access)
  const { data, error, isLoading } = useSWR(
    !authLoading ? `/api/leaderboard/alltime?limit=100` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch on window focus
      revalidateOnReconnect: true, // Refetch when reconnecting
      dedupingInterval: 60000, // Dedupe requests within 60 seconds
      refreshInterval: 5 * 60 * 1000, // Auto refresh every 5 minutes
    }
  );

  const leaderboardData = data?.leaderboard || [];
  const currentUserRank = data?.currentUserRank || null;







  // Get top 3 users
  const topThree = leaderboardData.slice(0, 3);
  const restOfUsers = leaderboardData.slice(3);

  if (authLoading) {
    return (
      <div className={styles.loading}>{t('leaderboard.loading')}</div>
    );
  }

  // Allow viewing leaderboard without login
  // if (!user) {
  //   router.push('/auth/login');
  //   return null;
  // }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>{t('leaderboard.title')}</h1>
        <p className={styles.subtitle}>{t('leaderboard.subtitle')}</p>
      </div>

        <div className={styles.mainCard}>





          {/* Ranking Section */}
          <div className={styles.rankingSection}>
            <h2 className={styles.rankingTitle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              {t('leaderboard.allTime')}
            </h2>

            {/* Current User Rank */}
            {currentUserRank && user && (
              <div className={styles.currentUserCard}>
                <div className={styles.rankBadgeSmall}>#{currentUserRank.rank}</div>
                <div className={styles.userAvatar}>
                  <div className={styles.avatarCircle}>{user.name.charAt(0).toUpperCase()}</div>
                </div>
                <div className={styles.userDetails}>
                  <h3 className={styles.userName}>{user.name}</h3>
                  <div className={styles.userLabel}>{t('leaderboard.yourRank')}</div>
                  <div className={styles.userPoints}>
                    <span className={styles.pointBadge}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                      </svg>
                      {currentUserRank.totalPoints || 0} {t('leaderboard.pts')}
                    </span>
                    <span className={styles.pointBadge}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
                      </svg>
                      {t('leaderboard.maxStreak')}: {currentUserRank.maxStreak || 0}
                    </span>
                  </div>
                </div>
                <div className={styles.rankBadgeSmall}>#{currentUserRank.rank}</div>
              </div>
            )}

            {/* Top 3 Users */}
            {isLoading ? (
              <div className={styles.loading}>{t('leaderboard.loadingBoard')}</div>
            ) : leaderboardData.length === 0 ? (
              <div className={styles.emptyState}>
                <p>{t('leaderboard.emptyState')}</p>
                <p style={{ fontSize: '0.875rem', color: '#7B9CD8', marginTop: '0.5rem' }}>
                  {t('leaderboard.startLearning')}
                </p>
              </div>
            ) : topThree.length > 0 ? (
              <>
                {topThree.map((userData, index) => (
                  <div
                    key={userData.id}
                    className={`${styles.userCard} ${styles[`rank${index + 1}`]} ${userData.isCurrentUser ? styles.currentUser : ''}`}
                  >
                    <div className={styles.trophyBadge}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 3V1h10v2H7zm0 18c-.55 0-1.02-.196-1.412-.587A1.926 1.926 0 015 19v-1h14v1c0 .55-.196 1.02-.588 1.413A1.926 1.926 0 0117 21H7zm5-14c1.384 0 2.542.458 3.475 1.375C16.408 9.292 17 10.45 17 12h3c0-1.1-.292-2.1-.875-3s-1.325-1.567-2.225-2c.1-.283.15-.575.15-.875 0-.817-.292-1.52-.875-2.113A2.893 2.893 0 0014 3.137V2h-4v1.137c-.7.13-1.292.43-1.775.9-.483.47-.725 1.03-.725 1.838 0 .3.05.592.15.875-.9.433-1.642 1.1-2.225 2S4 10.9 4 12h3c0-1.55.592-2.708 1.775-3.625C9.958 7.458 11.116 7 12.5 7h-.5z"/>
                      </svg>
                    </div>

                    <div className={styles.userAvatar}>
                      <div className={styles.avatarCircle} data-rank={index + 1}>
                        {userData.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className={styles.userDetails}>
                      <h3 className={styles.userName}>{userData.name}</h3>
                      <div className={styles.userPoints}>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                          </svg>
                          {userData.totalPoints || 0} {t('leaderboard.pts')}
                        </span>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
                          </svg>
                          {t('leaderboard.maxStreak')}: {userData.maxStreak || 0}
                        </span>
                      </div>
                    </div>

                    <div className={styles.rankBadgeLarge}>#{index + 1}</div>
                  </div>
                ))}

                {/* Rest of users */}
                {restOfUsers.map((userData) => (
                  <div
                    key={userData.id}
                    className={`${styles.userCard} ${userData.isCurrentUser ? styles.currentUser : ''}`}
                  >
                    <div className={styles.rankBadgeSmall}>#{userData.rank}</div>

                    <div className={styles.userAvatar}>
                      <div className={styles.avatarCircle}>
                        {userData.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className={styles.userDetails}>
                      <h3 className={styles.userName}>{userData.name}</h3>
                      <div className={styles.userPoints}>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                          </svg>
                          {userData.totalPoints || 0} {t('leaderboard.pts')}
                        </span>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
                          </svg>
                          {t('leaderboard.maxStreak')}: {userData.maxStreak || 0}
                        </span>
                      </div>
                    </div>

                    <div className={styles.rankBadgeSmall}>#{userData.rank}</div>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        </div>
      </div>
  );
}

// Helper function to format time
function formatTime(seconds) {
  if (!seconds) return '0h 0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

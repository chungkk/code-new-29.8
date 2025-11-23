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
            <span className={styles.titleIcon}>💎</span>
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
                    <span className={styles.pointIcon}>💎</span>
                    {currentUserRank.totalPoints || 0} {t('leaderboard.pts')}
                  </span>
                </div>
              </div>
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
                          <span className={styles.pointIcon}>💎</span>
                          {userData.totalPoints || 0} {t('leaderboard.pts')}
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
                          <span className={styles.pointIcon}>💎</span>
                          {userData.totalPoints || 0} {t('leaderboard.pts')}
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

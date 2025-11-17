import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../../components/DashboardLayout';
import { fetchWithAuth } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import styles from '../../styles/leaderboard.module.css';

export default function LeaderboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [leaderboardData, setLeaderboardData] = useState([]);
  const [currentUserRank, setCurrentUserRank] = useState(null);
  const [period, setPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch monthly leaderboard data
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(
        `/api/leaderboard/monthly?year=${period.year}&month=${period.month}&limit=100`
      );

      if (response && response.success) {
        setLeaderboardData(response.data.leaderboard || []);
        setCurrentUserRank(response.data.currentUserRank);
        setPeriod(response.data.period);
        if (response.data.countdown) {
          setCountdown(response.data.countdown);
        }
      } else {
        // Don't show error if it's just empty data
        setLeaderboardData([]);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      // Don't show error for empty data, just log it
      setLeaderboardData([]);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (!authLoading && user) {
      fetchLeaderboard();
    }
  }, [authLoading, user, period.year, period.month]);

  // Countdown timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev.totalSeconds <= 0) {
          clearInterval(timer);
          return prev;
        }

        let { days, hours, minutes, seconds } = prev;

        seconds--;
        if (seconds < 0) {
          seconds = 59;
          minutes--;
        }
        if (minutes < 0) {
          minutes = 59;
          hours--;
        }
        if (hours < 0) {
          hours = 23;
          days--;
        }

        return { days, hours, minutes, seconds, totalSeconds: prev.totalSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Navigate to previous month
  const handlePreviousMonth = () => {
    setPeriod(prev => {
      const newMonth = prev.month - 1;
      if (newMonth < 1) {
        return { year: prev.year - 1, month: 12 };
      }
      return { year: prev.year, month: newMonth };
    });
  };

  // Navigate to next month
  const handleNextMonth = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    setPeriod(prev => {
      const newMonth = prev.month + 1;
      if (newMonth > 12) {
        const nextYear = prev.year + 1;
        // Don't allow future months
        if (nextYear > currentYear) return prev;
        return { year: nextYear, month: 1 };
      }
      // Don't allow future months
      if (prev.year === currentYear && newMonth > currentMonth) return prev;
      return { year: prev.year, month: newMonth };
    });
  };

  // Check if it's current month
  const isCurrentMonth = () => {
    const now = new Date();
    return period.year === now.getFullYear() && period.month === now.getMonth() + 1;
  };

  // Get top 3 users
  const topThree = leaderboardData.slice(0, 3);
  const restOfUsers = leaderboardData.slice(3);

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className={styles.loading}>Đang tải...</div>
      </DashboardLayout>
    );
  }

  if (!user) {
    router.push('/auth/login');
    return null;
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Leaderboard</h1>
          <p className={styles.subtitle}>See the most active learners this month</p>
        </div>

        <div className={styles.mainCard}>
          {/* Countdown Section */}
          {isCurrentMonth() && (
            <div className={styles.countdownSection}>
              <div className={styles.countdownLabel}>
                <svg className={styles.clockIcon} width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Leaderboard closes in:</span>
              </div>
              <div className={styles.countdownTimer}>
                <div className={styles.timeBox}>
                  <div className={styles.timeValue}>{countdown.days}</div>
                  <div className={styles.timeLabel}>Days</div>
                </div>
                <div className={styles.timeSeparator}>:</div>
                <div className={styles.timeBox}>
                  <div className={styles.timeValue}>{countdown.hours}</div>
                  <div className={styles.timeLabel}>Hours</div>
                </div>
                <div className={styles.timeSeparator}>:</div>
                <div className={styles.timeBox}>
                  <div className={styles.timeValue}>{countdown.minutes}</div>
                  <div className={styles.timeLabel}>Minutes</div>
                </div>
                <div className={styles.timeSeparator}>:</div>
                <div className={styles.timeBox}>
                  <div className={styles.timeValue}>{countdown.seconds}</div>
                  <div className={styles.timeLabel}>Seconds</div>
                </div>
              </div>
            </div>
          )}

          {/* Month Navigation */}
          <div className={styles.navigation}>
            <button onClick={handlePreviousMonth} className={styles.navButton}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Previous Month
            </button>

            <h2 className={styles.monthTitle}>{period.monthName || `Tháng ${period.month} ${period.year}`}</h2>

            <button
              onClick={handleNextMonth}
              className={styles.navButton}
              disabled={isCurrentMonth()}
            >
              Next Month
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Monthly Rewards Section */}
          <div className={styles.rewardsSection}>
            <div className={styles.rewardsHeader}>
              <img src="/images/trophy-bird.png" alt="Trophy" className={styles.trophyBird} onError={(e) => e.target.style.display = 'none'} />
              <h3 className={styles.rewardsTitle}>
                <svg className={styles.trophyIcon} width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
                </svg>
                Monthly Rewards
              </h3>
            </div>

            <div className={styles.topRanks}>
              <div className={styles.rankCard}>
                <div className={styles.rankBadge}>
                  <svg className={styles.medalIcon} width="32" height="32" viewBox="0 0 24 24" fill="#FFD700">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  <span className={styles.rankNumber}>#1</span>
                </div>
                <div className={styles.avatarFrame}>
                  <div className={styles.frame} data-rank="1">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="var(--bg-secondary)" stroke="#FFD700" strokeWidth="3"/>
                    </svg>
                  </div>
                  <div className={styles.userIcon}>👤</div>
                </div>
              </div>

              <div className={styles.rankCard}>
                <div className={styles.rankBadge}>
                  <svg className={styles.medalIcon} width="32" height="32" viewBox="0 0 24 24" fill="#C0C0C0">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  <span className={styles.rankNumber}>#2</span>
                </div>
                <div className={styles.avatarFrame}>
                  <div className={styles.frame} data-rank="2">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="var(--bg-secondary)" stroke="#C0C0C0" strokeWidth="3"/>
                    </svg>
                  </div>
                  <div className={styles.userIcon}>👤</div>
                </div>
              </div>

              <div className={styles.rankCard}>
                <div className={styles.rankBadge}>
                  <svg className={styles.medalIcon} width="32" height="32" viewBox="0 0 24 24" fill="#CD7F32">
                    <circle cx="12" cy="12" r="8"/>
                  </svg>
                  <span className={styles.rankNumber}>#3</span>
                </div>
                <div className={styles.avatarFrame}>
                  <div className={styles.frame} data-rank="3">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="var(--bg-secondary)" stroke="#CD7F32" strokeWidth="3"/>
                    </svg>
                  </div>
                  <div className={styles.userIcon}>👤</div>
                </div>
              </div>

              <div className={styles.rankCard}>
                <div className={styles.rankBadge}>
                  <span className={styles.rankNumber}>#50</span>
                  <span className={styles.rankNumber}>#50</span>
                </div>
                <div className={styles.avatarFrame}>
                  <div className={styles.frame} data-rank="50">
                    <svg width="80" height="80" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" fill="var(--bg-secondary)" stroke="#E27B58" strokeWidth="3"/>
                    </svg>
                  </div>
                  <div className={styles.userIcon}>👤</div>
                </div>
              </div>
            </div>

            <p className={styles.rewardsNote}>
              ✨ Receive badges, avatar frames and diamonds at the end of the month ✨
            </p>
          </div>

          {/* Monthly Ranking Section */}
          <div className={styles.rankingSection}>
            <h2 className={styles.rankingTitle}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              Monthly Ranking
            </h2>

            {/* Current User Rank */}
            {currentUserRank && (
              <div className={styles.currentUserCard}>
                <div className={styles.rankBadgeSmall}>#{currentUserRank.rank}</div>
                <div className={styles.userAvatar}>
                  <div className={styles.avatarCircle}>{user.name.charAt(0).toUpperCase()}</div>
                </div>
                <div className={styles.userInfo}>
                  <div className={styles.userName}>{user.name}</div>
                  <div className={styles.userLabel}>Your Rank</div>
                </div>
                <div className={styles.rankBadgeSmall}>#{currentUserRank.rank}</div>
              </div>
            )}

            {/* Top 3 Users */}
            {loading ? (
              <div className={styles.loading}>Đang tải bảng xếp hạng...</div>
            ) : leaderboardData.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Chưa có dữ liệu xếp hạng cho tháng này.</p>
                <p style={{ fontSize: '0.875rem', color: '#7B9CD8', marginTop: '0.5rem' }}>
                  Hãy hoàn thành bài học để bắt đầu tích điểm!
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
                      <div className={styles.userStats}>
                        <span className={styles.stat}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          {formatTime(userData.timeSpent)}
                        </span>
                        <span className={styles.stat}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                          </svg>
                          {userData.sentencesCompleted} sentences
                        </span>
                      </div>
                      <div className={styles.userPoints}>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                          </svg>
                          {userData.monthlyPoints}
                        </span>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"/>
                          </svg>
                          {userData.lessonsCompleted || 0}
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
                      <div className={styles.userStats}>
                        <span className={styles.stat}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          {formatTime(userData.timeSpent)}
                        </span>
                        <span className={styles.stat}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                          </svg>
                          {userData.sentencesCompleted} sentences
                        </span>
                      </div>
                      <div className={styles.userPoints}>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2Z"/>
                          </svg>
                          {userData.monthlyPoints}
                        </span>
                        <span className={styles.pointBadge}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z"/>
                          </svg>
                          {userData.lessonsCompleted || 0}
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
    </DashboardLayout>
  );
}

// Helper function to format time
function formatTime(seconds) {
  if (!seconds) return '0h 0m';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
}

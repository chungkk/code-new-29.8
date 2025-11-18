import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import UserProfileSidebar from '../../components/UserProfileSidebar';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';
import { SkeletonGrid } from '../../components/SkeletonLoader';
import styles from '../../styles/dashboard.module.css';


function DashboardIndex() {
  const router = useRouter();
  const { user, userPoints } = useAuth();
  const [progress, setProgress] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProgressTab, setActiveProgressTab] = useState('inProgress');
  const [maxStreak, setMaxStreak] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      setProgress(Array.isArray(progressData) ? progressData : []);

      // Load streak data
      try {
        const userRes = await fetchWithAuth('/api/auth/me');
        if (userRes.ok) {
          const userData = await userRes.json();
          setMaxStreak(userData.user?.streak?.maxStreak || 0);
        }
      } catch (error) {
        console.error('Error loading streak:', error);
      }

      // Load ALL lessons (sorted by order)
      const lessonsRes = await fetch('/api/lessons');
      const lessonsData = await lessonsRes.json();

      // Handle both old array format and new object format
      const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);

      if (lessons && lessons.length > 0) {
        // Sort by newest first (createdAt descending)
        const sortedLessons = [...lessons].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // Newest first
        });
        setAllLessons(sortedLessons);
      } else {
        setAllLessons([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateProgress = (lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    if (lessonProgress.length === 0) return 0;

    // Get max completion percent across all modes (shadowing/dictation)
    const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));

    return Math.min(100, maxProgress);
  };

  // Filter lessons based on active progress tab
  const getFilteredLessons = () => {
    if (activeProgressTab === 'completed') {
      // Only show lessons with 100% progress
      return allLessons.filter(lesson => calculateProgress(lesson.id) === 100);
    } else {
      // Only show lessons with progress > 0 and < 100 (started but not completed)
      return allLessons.filter(lesson => {
        const p = calculateProgress(lesson.id);
        return p > 0 && p < 100;
      });
    }
  };

  const filteredLessons = getFilteredLessons();

  if (loading) {
    return (
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Dashboard</h1>
            <p className={styles.subtitle}>Lädt...</p>
          </div>
          <SkeletonGrid count={6} columns={3} />
        </div>
      </DashboardLayout>
    );
  }

  // Structured data for dashboard
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Dashboard', url: '/dashboard' }
  ]);

  return (
    <>
      <SEO
        title="Mein Dashboard | PapaGeil - Deutsch Lernen"
        description="Verfolgen Sie Ihren Deutsch-Lernfortschritt in Echtzeit. ✓ Personalisierte Statistiken ✓ Vokabeltrainer ✓ Lernhistorie ✓ Fortschrittsverfolgung für alle Niveaus A1-C2"
        keywords="PapaGeil Dashboard, Deutsch Lernfortschritt, Vokabeltrainer, Wortschatz verwalten, German learning progress, Deutsch Statistiken"
        canonicalUrl="/dashboard"
        locale="de_DE"
        structuredData={breadcrumbData}
        noindex={true}
      />

      <DashboardLayout>
        <div className={styles.dashboardGrid}>
          {/* LEFT COLUMN - User Profile Sidebar */}
          <UserProfileSidebar
            stats={{
              totalLessons: allLessons.length,
              completedLessons: allLessons.filter(l => calculateProgress(l.id) === 100).length,
              inProgressLessons: allLessons.filter(l => {
                const p = calculateProgress(l.id);
                return p > 0 && p < 100;
              }).length,
            }}
            userPoints={userPoints}
            maxStreak={maxStreak}
          />

          {/* RIGHT COLUMN - Main Content */}
          <div className={styles.mainContent}>
            {/* Content Tabs */}
            <div className={styles.contentTabs}>
              <button className={`${styles.contentTab} ${styles.active}`}>
                Dictation
              </button>
              <button className={styles.contentTab}>
                Shadowing
              </button>
            </div>

            {/* Ranking Section */}
            <div className={styles.rankingSection}>
              <div className={styles.rankingEmpty}>
                No ranking history available yet.
              </div>
            </div>

            {/* Lesson Progress Section */}
            <div className={styles.lessonProgressSection}>
              <h2 className={styles.lessonProgressTitle}>Lesson Progress</h2>

              {/* Progress Tabs */}
              <div className={styles.progressTabs}>
                <button
                  className={`${styles.progressTab} ${styles.completed} ${activeProgressTab === 'completed' ? styles.active : ''}`}
                  onClick={() => setActiveProgressTab('completed')}
                >
                  <span className={styles.tabIcon}>✓</span>
                  Completed
                </button>
                <button
                  className={`${styles.progressTab} ${styles.inProgress} ${activeProgressTab === 'inProgress' ? styles.active : ''}`}
                  onClick={() => setActiveProgressTab('inProgress')}
                >
                  <span className={styles.tabIcon}>⏱</span>
                  In Progress
                </button>
              </div>

              {/* Lessons List */}
              {filteredLessons.length === 0 ? (
                <div className={styles.emptyLessons}>
                  <p className={styles.emptyText}>
                    {activeProgressTab === 'completed'
                      ? 'No completed lessons yet'
                      : 'No lessons in progress'}
                  </p>
                </div>
              ) : (
                <div className={styles.lessonsGrid}>
                  {filteredLessons.map((lesson) => {
                    const progressPercent = calculateProgress(lesson.id);
                    return (
                      <div key={lesson.id} className={styles.lessonCard}>
                        {/* Status Badge */}
                        {progressPercent === 100 && (
                          <div className={`${styles.statusBadge} ${styles.completedBadge}`}>
                            ✅
                          </div>
                        )}
                        {progressPercent > 0 && progressPercent < 100 && (
                          <div className={`${styles.statusBadge} ${styles.inProgressBadge}`}>
                            📊
                          </div>
                        )}
                        {progressPercent === 0 && (
                          <div className={`${styles.statusBadge} ${styles.notStarted}`}>
                            🆕
                          </div>
                        )}

                        {/* Card Header */}
                        <div className={styles.cardHeader}>
                          <h3 className={styles.lessonTitle}>
                            {lesson.displayTitle || lesson.title}
                          </h3>
                          <p className={styles.lessonDescription}>
                            {lesson.description || 'Keine Beschreibung'}
                          </p>
                          <span className={styles.levelBadge}>
                            {lesson.level || 'A1'}
                          </span>
                        </div>

                        {/* Progress Section */}
                        <div className={styles.progressSection}>
                          <div className={styles.progressInfo}>
                            <span className={styles.progressLabel}>Fortschritt</span>
                            <span className={styles.progressPercent}>{progressPercent}%</span>
                          </div>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.cardActions}>
                          <button
                            onClick={() => router.push(`/shadowing/${lesson.id}`)}
                            className={`${styles.actionBtn} ${styles.shadowing}`}
                          >
                            🎤 Shadowing
                          </button>
                          <button
                            onClick={() => router.push(`/dictation/${lesson.id}`)}
                            className={`${styles.actionBtn} ${styles.dictation}`}
                          >
                            ✍️ Dictation
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

export default function Dashboard() {
  return (
    <ProtectedPage>
      <DashboardIndex />
    </ProtectedPage>
  );
}

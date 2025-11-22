import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import UserProfileSidebar from '../../components/UserProfileSidebar';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';
import { SkeletonGrid } from '../../components/SkeletonLoader';
import { navigateWithLocale } from '../../lib/navigation';
import styles from '../../styles/dashboard.module.css';


function DashboardIndex() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, userPoints } = useAuth();
  const [progress, setProgress] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProgressTab, setActiveProgressTab] = useState('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      const validProgress = Array.isArray(progressData) ? progressData : [];
      setProgress(validProgress);

      // Load ALL lessons (sorted by order)
      try {
        const lessonsRes = await fetchWithAuth('/api/lessons');
        const lessonsData = await lessonsRes.json();

        // Handle both old array format and new object format
        const lessons = Array.isArray(lessonsData) ? lessonsData : (lessonsData.lessons || []);

        if (lessons && lessons.length > 0) {
          // Sort by newest first (createdAt descending)
          const sortedLessons = [...lessons].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
          });
          setAllLessons(sortedLessons);
        } else {
          setAllLessons([]);
        }
      } catch (lessonError) {
        console.error('Error loading lessons:', lessonError);
        setAllLessons([]);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateProgress = useCallback((lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    if (lessonProgress.length === 0) return 0;

    // Get max completion percent across all modes (shadowing/dictation)
    const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));

    return Math.min(100, maxProgress);
  }, [progress]);

  // Get progress details for a lesson (both modes)
  const getProgressDetails = (lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);

    const shadowingProgress = lessonProgress.find(p => p.mode === 'shadowing');
    const dictationProgress = lessonProgress.find(p => p.mode === 'dictation');

    return {
      shadowing: Math.round(shadowingProgress?.completionPercent || 0),
      dictation: Math.round(dictationProgress?.completionPercent || 0),
      shadowingLastAccessed: shadowingProgress?.lastAccessed,
      dictationLastAccessed: dictationProgress?.lastAccessed,
      overall: calculateProgress(lessonId)
    };
  };

  // Filter lessons based on active progress tab (memoized for performance)
  const filteredLessons = useMemo(() => {
    if (allLessons.length === 0 || progress.length === 0) {
      return [];
    }

    return allLessons.filter(lesson => {
      const prog = calculateProgress(lesson.id);

      if (activeProgressTab === 'all') {
        return prog > 0;
      } else if (activeProgressTab === 'completed') {
        return prog === 100;
      } else {
        return prog > 0 && prog < 100;
      }
    });
  }, [allLessons, progress, activeProgressTab, calculateProgress]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>{t('dashboard.title')}</h1>
            <p className={styles.subtitle}>{t('dashboard.loading')}</p>
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
              totalLessons: allLessons.filter(l => calculateProgress(l.id) > 0).length,
              completedLessons: allLessons.filter(l => calculateProgress(l.id) === 100).length,
              inProgressLessons: allLessons.filter(l => {
                const p = calculateProgress(l.id);
                return p > 0 && p < 100;
              }).length,
            }}
            userPoints={userPoints}
          />

          {/* RIGHT COLUMN - Main Content */}
          <div className={styles.mainContent}>
            {/* Lesson Progress Section */}
            <div className={styles.lessonProgressSection}>
              <h2 className={styles.lessonProgressTitle}>{t('dashboard.progress.title')}</h2>

              {/* Progress Tabs */}
              <div className={styles.progressTabs}>
                <button
                  className={`${styles.progressTab} ${styles.all} ${activeProgressTab === 'all' ? styles.active : ''}`}
                  onClick={() => setActiveProgressTab('all')}
                >
                  <span className={styles.tabIcon}>📚</span>
                  {t('dashboard.progress.all')}
                </button>
                <button
                  className={`${styles.progressTab} ${styles.completed} ${activeProgressTab === 'completed' ? styles.active : ''}`}
                  onClick={() => setActiveProgressTab('completed')}
                >
                  <span className={styles.tabIcon}>✓</span>
                  {t('dashboard.progress.completed')}
                </button>
                <button
                  className={`${styles.progressTab} ${styles.inProgress} ${activeProgressTab === 'inProgress' ? styles.active : ''}`}
                  onClick={() => setActiveProgressTab('inProgress')}
                >
                  <span className={styles.tabIcon}>⏱</span>
                  {t('dashboard.progress.inProgress')}
                </button>
              </div>

              {/* Lessons List */}
              {filteredLessons.length === 0 ? (
                <div className={styles.emptyLessons}>
                  <div className={styles.emptyIcon}>
                    {activeProgressTab === 'all' ? '📚' : 
                     activeProgressTab === 'completed' ? '🎉' : '⏱️'}
                  </div>
                  <h3 className={styles.emptyTitle}>
                    {activeProgressTab === 'all'
                      ? 'No Lessons Started Yet'
                      : activeProgressTab === 'completed'
                      ? 'No Completed Lessons'
                      : 'No Lessons In Progress'}
                  </h3>
                  <p className={styles.emptyText}>
                    {activeProgressTab === 'all'
                      ? (t('dashboard.empty.noLessons') || 'Start a lesson from the home page to see your progress here!')
                      : activeProgressTab === 'completed'
                      ? (t('dashboard.empty.noCompleted') || 'Complete your first lesson to see it here!')
                      : (t('dashboard.empty.noInProgress') || 'Continue learning to track your progress!')}
                  </p>
                </div>
              ) : (
                <div className={styles.lessonsGrid}>
                  {filteredLessons.map((lesson) => {
                    const progressPercent = calculateProgress(lesson.id);
                    const progressDetails = getProgressDetails(lesson.id);
                    return (
                      <div key={lesson.id} className={styles.lessonCard}>
                        {/* Card Header */}
                        <div className={styles.cardHeader}>
                          <div className={styles.cardHeaderTop}>
                            <h3 className={styles.lessonTitle}>
                              {lesson.displayTitle || lesson.title}
                            </h3>
                            <span className={styles.levelBadge}>
                              {lesson.level || 'A1'}
                            </span>
                          </div>
                          <p className={styles.lessonDescription}>
                            {lesson.description || t('dashboard.progress.noDescription')}
                          </p>
                        </div>

                        {/* Progress Section - Detailed */}
                        <div className={styles.progressSection}>
                          <div className={styles.progressInfo}>
                            <span className={styles.progressLabel}>{t('dashboard.progress.overall')}</span>
                            <span className={styles.progressPercent}>{Math.round(progressPercent)}%</span>
                          </div>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>

                          {/* Mode-specific Progress */}
                          <div className={styles.modeProgress}>
                            <div className={styles.modeProgressItem}>
                              <div className={styles.modeProgressHeader}>
                                <span className={styles.modeLabel}>🎤 Shadowing</span>
                                <span className={styles.modePercent}>{progressDetails.shadowing}%</span>
                              </div>
                              <div className={styles.modeProgressBar}>
                                <div
                                  className={`${styles.modeProgressFill} ${styles.shadowingFill}`}
                                  style={{ width: `${progressDetails.shadowing}%` }}
                                />
                              </div>
                            </div>
                            <div className={styles.modeProgressItem}>
                              <div className={styles.modeProgressHeader}>
                                <span className={styles.modeLabel}>✍️ Dictation</span>
                                <span className={styles.modePercent}>{progressDetails.dictation}%</span>
                              </div>
                              <div className={styles.modeProgressBar}>
                                <div
                                  className={`${styles.modeProgressFill} ${styles.dictationFill}`}
                                  style={{ width: `${progressDetails.dictation}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={styles.cardActions}>
                          <button
                            onClick={() => navigateWithLocale(router, `/shadowing/${lesson.id}`)}
                            className={`${styles.actionBtn} ${styles.shadowing}`}
                          >
                            🎤 Shadowing
                          </button>
                          <button
                            onClick={() => navigateWithLocale(router, `/dictation/${lesson.id}`)}
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

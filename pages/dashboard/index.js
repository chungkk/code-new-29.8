import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateBreadcrumbStructuredData } from '../../components/SEO';
import ProtectedPage from '../../components/ProtectedPage';
import DashboardLayout from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../lib/api';
import { SkeletonGrid } from '../../components/SkeletonLoader';
import styles from '../../styles/dashboard.module.css';


function DashboardIndex() {
  const router = useRouter();
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      setProgress(Array.isArray(progressData) ? progressData : []);

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
        <div className={styles.container}>
          {/* Page Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>
                Willkommen zurück, {user?.name}! 👋
              </h1>
              <p className={styles.pageSubtitle}>
                Hier ist Ihr Lernfortschritt im Überblick
              </p>
            </div>
          </div>

          {/* Stats Overview Cards */}
          <div className={styles.statsOverview}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📚</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>{allLessons.length}</div>
                <div className={styles.statLabel}>Lektionen gesamt</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>✅</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {allLessons.filter(l => calculateProgress(l.id) === 100).length}
                </div>
                <div className={styles.statLabel}>Abgeschlossen</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📊</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {allLessons.filter(l => {
                    const p = calculateProgress(l.id);
                    return p > 0 && p < 100;
                  }).length}
                </div>
                <div className={styles.statLabel}>In Bearbeitung</div>
              </div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🆕</div>
              <div className={styles.statContent}>
                <div className={styles.statValue}>
                  {allLessons.filter(l => calculateProgress(l.id) === 0).length}
                </div>
                <div className={styles.statLabel}>Noch nicht begonnen</div>
              </div>
            </div>
          </div>

          {/* Lessons Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Ihre Lektionen</h2>
              <p className={styles.sectionDescription}>
                {allLessons.length} Lektionen verfügbar
              </p>
            </div>

            {allLessons.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Keine Lektionen vorhanden</h3>
                <p className={styles.emptyText}>
                  Noch keine Lektionen im System
                </p>
              </div>
            ) : (
              <div className={styles.lessonsGrid}>
                {allLessons.map((lesson) => {
                  const progressPercent = calculateProgress(lesson.id);
                  return (
                    <div key={lesson.id} className={styles.lessonCard}>
                      {/* Status Badge */}
                      {progressPercent === 100 && (
                        <div className={`${styles.statusBadge} ${styles.completed}`}>
                          ✅
                        </div>
                      )}
                      {progressPercent > 0 && progressPercent < 100 && (
                        <div className={`${styles.statusBadge} ${styles.inProgress}`}>
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

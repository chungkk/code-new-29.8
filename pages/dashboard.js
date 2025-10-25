import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedPage from '../components/ProtectedPage';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';
import styles from '../styles/dashboard.module.css';

function UserDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [activeTab, setActiveTab] = useState('progress');
  
  // Check URL for tab parameter
  useEffect(() => {
    if (router.query.tab) {
      setActiveTab(router.query.tab);
    }
  }, [router.query]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Hardcoded lessons (fallback if database empty)
      const hardcodedLessons = [
        {
          id: 'bai_1',
          title: 'Patient Erde: Zustand kritisch',
          audio: '/audio/bai_1.mp3',
          json: '/text/bai_1.json',
          displayTitle: 'Lektion 1: Patient Erde',
          description: 'Thema: Umwelt, Klimawandel (DW)'
        }
      ];
      
      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      console.log('Progress data:', progressData);
      setProgress(Array.isArray(progressData) ? progressData : []);

      // Load all lessons
      const lessonsRes = await fetch('/api/lessons');
      let allLessons = await lessonsRes.json();
      
      // Use hardcoded lessons if database is empty
      if (!allLessons || allLessons.length === 0) {
        allLessons = hardcodedLessons;
      }
      console.log('All lessons:', allLessons);
      
      // Filter to show only lessons that user has started (has progress)
      const lessonIdsWithProgress = Array.isArray(progressData) 
        ? [...new Set(progressData.map(p => p.lessonId))]
        : [];
      console.log('Lesson IDs with progress:', lessonIdsWithProgress);
      
      const lessonsWithProgress = allLessons.filter(lesson => 
        lessonIdsWithProgress.includes(lesson.id)
      );
      console.log('Filtered lessons:', lessonsWithProgress);
      setLessons(lessonsWithProgress);

      // Load vocabulary
      const vocabRes = await fetchWithAuth('/api/vocabulary');
      const vocabData = await vocabRes.json();
      setVocabulary(Array.isArray(vocabData) ? vocabData : []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    if (lessonProgress.length === 0) return 0;
    
    // Get max completion percent across all modes (shadowing/dictation)
    const maxProgress = Math.max(...lessonProgress.map(p => p.completionPercent || 0));
    
    return Math.min(100, maxProgress);
  };

  // Get the primary mode for a lesson (the one with most progress or most recent)
  const getPrimaryMode = (lessonId) => {
    const lessonProgress = progress.filter(p => p.lessonId === lessonId);
    if (lessonProgress.length === 0) return 'shadowing'; // default
    
    // Sort by completion percent (highest first), then by updatedAt (most recent first)
    const sortedProgress = lessonProgress.sort((a, b) => {
      if (b.completionPercent !== a.completionPercent) {
        return (b.completionPercent || 0) - (a.completionPercent || 0);
      }
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
    
    return sortedProgress[0].mode; // Return the mode with highest progress
  };

  const deleteVocabulary = async (id) => {
    if (!confirm('Xóa từ này?')) return;

    try {
      const res = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setVocabulary(vocabulary.filter(v => v._id !== id));
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.loading}>
        <div>⏳ Đang tải...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard - Deutsch Shadowing</title>
      </Head>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            Xin chào, {user?.name}! 👋
          </h1>
          <p className={styles.subtitle}>
            Theo dõi tiến độ học tập và quản lý từ vựng của bạn
          </p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('progress')}
            className={`${styles.tab} ${activeTab === 'progress' ? styles.active : ''}`}
          >
            📊 Tiến Độ Học
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`${styles.tab} ${activeTab === 'vocabulary' ? styles.active : ''}`}
          >
            📚 Từ Vựng ({vocabulary.length})
          </button>
        </div>

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Tiến Độ Các Bài Học</h2>
            
            {lessons.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Chưa có bài học nào</h3>
                <p className={styles.emptyText}>Hãy bắt đầu học bài đầu tiên</p>
              </div>
            ) : (
              <div className={styles.progressGrid}>
                {lessons.map((lesson) => {
                  const progressPercent = calculateProgress(lesson.id);
                  const primaryMode = getPrimaryMode(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className={styles.lessonCard}
                      onClick={() => router.push(`/${primaryMode}/${lesson.id}`)}
                    >
                      <h3 className={styles.lessonTitle}>
                        {lesson.displayTitle}
                      </h3>
                      
                      {/* Mode Badge */}
                      <div style={{ 
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '700',
                        marginBottom: '12px',
                        background: primaryMode === 'dictation' 
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {primaryMode === 'dictation' ? '✍️ Chính Tả' : '🎤 Shadowing'}
                      </div>
                      
                      <p className={styles.lessonDescription}>
                        {lesson.description}
                      </p>
                      
                      <div>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '13px', color: '#999', fontWeight: '600' }}>
                            Tiến độ
                          </span>
                          <span className={styles.progressPercent}>
                            {progressPercent}%
                          </span>
                        </div>
                        <div className={styles.progressBar}>
                          <div 
                            className={styles.progressFill}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {progressPercent === 100 && (
                        <div className={`${styles.statusBadge} ${styles.completed}`}>
                          <span>✅</span>
                          <span>Hoàn thành</span>
                        </div>
                      )}
                      {progressPercent === 0 && (
                        <div className={`${styles.statusBadge} ${styles.notStarted}`}>
                          <span>🆕</span>
                          <span>Chưa bắt đầu</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Vocabulary Tab */}
        {activeTab === 'vocabulary' && (
          <div>
            {vocabulary.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Chưa có từ vựng nào</h3>
                <p className={styles.emptyText}>
                  Lưu từ vựng khi học bài để ôn tập sau này
                </p>
              </div>
            ) : (
              <div className={styles.vocabTable}>
                <div className={styles.vocabHeader}>
                  <h2 className={styles.vocabHeaderTitle}>Danh Sách Từ Vựng</h2>
                  <div className={styles.vocabCount}>
                    Tổng: <strong>{vocabulary.length}</strong> từ
                  </div>
                </div>
                
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Từ vựng</th>
                        <th>Nghĩa</th>
                        <th>Ngữ cảnh</th>
                        <th>Bài học</th>
                        <th style={{ textAlign: 'center' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vocabulary.map((vocab) => (
                        <tr key={vocab._id}>
                          <td>
                            <div className={styles.wordCell}>
                              {vocab.word}
                            </div>
                          </td>
                          <td style={{ fontWeight: '500' }}>
                            {vocab.translation}
                          </td>
                          <td style={{ 
                            fontSize: '14px',
                            color: '#6c757d',
                            maxWidth: '250px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontStyle: 'italic'
                          }}>
                            {vocab.context || '-'}
                          </td>
                          <td style={{ 
                            fontSize: '14px',
                            color: '#667eea',
                            fontWeight: '600'
                          }}>
                            {vocab.lessonId || 'Không rõ'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => deleteVocabulary(vocab._id)}
                              className={styles.deleteBtn}
                            >
                              🗑️ Xóa
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Dashboard() {
  return (
    <ProtectedPage>
      <UserDashboard />
    </ProtectedPage>
  );
}

export default Dashboard;

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
  const [allLessons, setAllLessons] = useState([]);
  const [activeTab, setActiveTab] = useState('all-lessons');
  const [lessonFilter, setLessonFilter] = useState('all'); // 'all' or 'in-progress'
  
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
      
      // Load progress first
      const progressRes = await fetchWithAuth('/api/progress');
      const progressData = await progressRes.json();
      setProgress(Array.isArray(progressData) ? progressData : []);

      // Load ALL lessons (sorted by order)
      const lessonsRes = await fetch('/api/lessons');
      const lessonsData = await lessonsRes.json();
      
      if (lessonsData && lessonsData.length > 0) {
        // Sort by order ascending (bai_1, bai_2, bai_3...)
        const sortedLessons = [...lessonsData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setAllLessons(sortedLessons);
      } else {
        setAllLessons([]);
      }

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

  // Get filtered lessons based on current filter
  const getFilteredLessons = () => {
    if (lessonFilter === 'all') {
      return allLessons;
    } else if (lessonFilter === 'in-progress') {
      // Show only lessons with progress > 0 and < 100
      return allLessons.filter(lesson => {
        const prog = calculateProgress(lesson.id);
        return prog > 0 && prog < 100;
      });
    } else if (lessonFilter === 'completed') {
      // Show only completed lessons
      return allLessons.filter(lesson => calculateProgress(lesson.id) === 100);
    } else if (lessonFilter === 'not-started') {
      // Show only lessons not started
      return allLessons.filter(lesson => calculateProgress(lesson.id) === 0);
    }
    return allLessons;
  };

  const deleteVocabulary = async (id) => {
    if (!confirm('Dieses Wort löschen?')) return;

    try {
      const res = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setVocabulary(vocabulary.filter(v => v._id !== id));
      }
    } catch (error) {
      toast.error('Ein Fehler ist aufgetreten');
    }
  };



  if (status === 'loading' || loading) {
    return (
      <div className={styles.loading}>
        <div>⏳ Lädt...</div>
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
          <div>
            <h1 className={styles.title}>
              Hallo, {user?.name}! 👋
            </h1>
            <p className={styles.subtitle}>
              Verfolgen Sie Ihren Lernfortschritt und verwalten Sie Ihren Wortschatz
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <div className={styles.tabs}>
          <button
            onClick={() => setActiveTab('all-lessons')}
            className={`${styles.tab} ${activeTab === 'all-lessons' ? styles.active : ''}`}
          >
            📚 Alle Lektionen
          </button>
          <button
            onClick={() => setActiveTab('vocabulary')}
            className={`${styles.tab} ${activeTab === 'vocabulary' ? styles.active : ''}`}
          >
            📝 Wortschatz ({vocabulary.length})
          </button>
        </div>

        {/* All Lessons Tab */}
        {activeTab === 'all-lessons' && (
          <div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '15px'
            }}>
              <h2 style={{ margin: 0 }}>Lektionsliste</h2>
              
              {/* Filter Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '10px',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setLessonFilter('all')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: lessonFilter === 'all' ? '2px solid #667eea' : '2px solid #e0e0e0',
                    background: lessonFilter === 'all' ? '#667eea' : 'white',
                    color: lessonFilter === 'all' ? 'white' : '#666',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  🗂️ Alle ({allLessons.length})
                </button>
                <button
                  onClick={() => setLessonFilter('in-progress')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: lessonFilter === 'in-progress' ? '2px solid #f5576c' : '2px solid #e0e0e0',
                    background: lessonFilter === 'in-progress' ? '#f5576c' : 'white',
                    color: lessonFilter === 'in-progress' ? 'white' : '#666',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  📊 In Bearbeitung ({allLessons.filter(l => {
                    const p = calculateProgress(l.id);
                    return p > 0 && p < 100;
                  }).length})
                </button>
                <button
                  onClick={() => setLessonFilter('completed')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: lessonFilter === 'completed' ? '2px solid #4CAF50' : '2px solid #e0e0e0',
                    background: lessonFilter === 'completed' ? '#4CAF50' : 'white',
                    color: lessonFilter === 'completed' ? 'white' : '#666',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  ✅ Abgeschlossen ({allLessons.filter(l => calculateProgress(l.id) === 100).length})
                </button>
                <button
                  onClick={() => setLessonFilter('not-started')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: lessonFilter === 'not-started' ? '2px solid #FF9800' : '2px solid #e0e0e0',
                    background: lessonFilter === 'not-started' ? '#FF9800' : 'white',
                    color: lessonFilter === 'not-started' ? 'white' : '#666',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s'
                  }}
                >
                  🆕 Nicht begonnen ({allLessons.filter(l => calculateProgress(l.id) === 0).length})
                </button>
              </div>
            </div>
            
            {getFilteredLessons().length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📚</div>
                <h3 className={styles.emptyTitle}>Keine Lektionen vorhanden</h3>
                <p className={styles.emptyText}>
                  {lessonFilter === 'in-progress' && 'Sie haben noch keine Lektion begonnen'}
                  {lessonFilter === 'completed' && 'Sie haben noch keine Lektion abgeschlossen'}
                  {lessonFilter === 'not-started' && 'Alle Lektionen wurden bereits begonnen'}
                  {lessonFilter === 'all' && 'Noch keine Lektionen im System'}
                </p>
              </div>
            ) : (
              <div className={styles.progressGrid}>
                {getFilteredLessons().map((lesson) => {
                  const progressPercent = calculateProgress(lesson.id);
                  const primaryMode = getPrimaryMode(lesson.id);
                  return (
                    <div
                      key={lesson.id}
                      className={styles.lessonCard}
                    >
                      <div style={{ marginBottom: '12px' }}>
                        <h3 className={styles.lessonTitle}>
                          {lesson.displayTitle || lesson.title}
                        </h3>
                        <p className={styles.lessonDescription}>
                          {lesson.description || 'Keine Beschreibung'}
                        </p>
                      </div>
                      
                      {/* Progress */}
                      <div style={{ marginBottom: '15px' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '13px', color: '#999', fontWeight: '600' }}>
                            Fortschritt
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

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => router.push(`/shadowing/${lesson.id}`)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            boxShadow: '0 2px 8px rgba(245, 87, 108, 0.3)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          🎤 Shadowing
                        </button>
                        <button
                          onClick={() => router.push(`/dictation/${lesson.id}`)}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                            boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                          ✍️ Dictation
                        </button>
                      </div>

                      {/* Status Badge */}
                      {progressPercent === 100 && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#4CAF50',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          ✅ Abgeschlossen
                        </div>
                      )}
                      {progressPercent === 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: '#FF9800',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: '700'
                        }}>
                          🆕 Neu
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
                <h3 className={styles.emptyTitle}>Noch kein Wortschatz vorhanden</h3>
                <p className={styles.emptyText}>
                  Speichern Sie Wortschatz beim Lernen für spätere Wiederholung
                </p>
              </div>
            ) : (
              <div className={styles.vocabTable}>
                <div className={styles.vocabHeader}>
                  <h2 className={styles.vocabHeaderTitle}>Wortschatzliste</h2>
                  <div className={styles.vocabCount}>
                    Gesamt: <strong>{vocabulary.length}</strong> Wörter
                  </div>
                </div>
                
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Wortschatz</th>
                        <th>Bedeutung</th>
                        <th>Kontext</th>
                        <th>Lektion</th>
                        <th style={{ textAlign: 'center' }}>Aktionen</th>
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
                            {vocab.lessonId || 'Unbekannt'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => deleteVocabulary(vocab._id)}
                              className={styles.deleteBtn}
                            >
                              🗑️ Löschen
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

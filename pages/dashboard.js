import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import ProtectedPage from '../components/ProtectedPage';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../lib/api';
import { toast } from 'react-toastify';
import { speakText } from '../lib/textToSpeech';

import styles from '../styles/dashboard.module.css';

function UserDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLesson, setFilterLesson] = useState('all');
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

  // Filter vocabulary by search term and lesson
  const getFilteredVocabulary = () => {
    let filtered = vocabulary;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(vocab =>
        vocab.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vocab.translation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (vocab.context && vocab.context.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by lesson
    if (filterLesson !== 'all') {
      filtered = filtered.filter(vocab => vocab.lessonId === filterLesson);
    }

    return filtered;
  };

  // Get unique lessons from vocabulary
  const getUniqueLessons = () => {
    const lessons = [...new Set(vocabulary.map(v => v.lessonId))].filter(Boolean);
    return lessons.sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, ''));
      const numB = parseInt(b.replace(/\D/g, ''));
      return numA - numB;
    });
  };

  // Export vocabulary to CSV
  const exportToCSV = () => {
    const filtered = getFilteredVocabulary();
    const csvContent = [
      ['Wort', 'Übersetzung', 'Kontext', 'Lektion'].join(','),
      ...filtered.map(v => [
        v.word,
        v.translation,
        v.context || '',
        v.lessonId || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `wortschatz_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Speak word pronunciation
  const speakWord = (word) => {
    speakText(word, 'de-DE', 0.9, 1);
  };

  // Navigate to lesson
  const goToLesson = (lessonId) => {
    if (lessonId) {
      router.push(`/shadowing/${lessonId}`);
    }
  };

  const deleteVocabulary = async (id) => {
    if (!confirm('Dieses Wort löschen?')) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
        return;
      }

      const res = await fetch(`/api/vocabulary?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        setVocabulary(vocabulary.filter(v => v._id !== id));
        toast.success('Wort erfolgreich gelöscht!');
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || 'Fehler beim Löschen des Wortes');
      }
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('Ein Fehler ist aufgetreten beim Löschen');
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
           <button
             onClick={() => setActiveTab('settings')}
             className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
           >
             ⚙️ Einstellungen
           </button>
        </div>

        {/* All Lessons Tab */}
        {activeTab === 'all-lessons' && (
          <div>
            <div className={styles.lessonsContainer}>
              {/* Header with Stats */}
              <div className={styles.lessonsHeader}>
                <div className={styles.lessonsHeaderLeft}>
                  <h2 className={styles.lessonsHeaderTitle}>📚 Lektionsliste</h2>
                  <div className={styles.lessonsStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Gesamt:</span>
                      <span className={styles.statValue}>{allLessons.length}</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Abgeschlossen:</span>
                      <span className={styles.statValue}>
                        {allLessons.filter(l => calculateProgress(l.id) === 100).length}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>In Bearbeitung:</span>
                      <span className={styles.statValue}>
                        {allLessons.filter(l => {
                          const p = calculateProgress(l.id);
                          return p > 0 && p < 100;
                        }).length}
                      </span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statLabel}>Angezeigt:</span>
                      <span className={styles.statValue}>{getFilteredLessons().length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Buttons */}
              <div className={styles.lessonsControls}>
                <div className={styles.filterButtonGroup}>
                  <button
                    onClick={() => setLessonFilter('all')}
                    className={`${styles.filterBtn} ${styles.all} ${lessonFilter === 'all' ? styles.active : ''}`}
                  >
                    🗂️ Alle ({allLessons.length})
                  </button>
                  <button
                    onClick={() => setLessonFilter('in-progress')}
                    className={`${styles.filterBtn} ${styles.inProgress} ${lessonFilter === 'in-progress' ? styles.active : ''}`}
                  >
                    📊 In Bearbeitung ({allLessons.filter(l => {
                      const p = calculateProgress(l.id);
                      return p > 0 && p < 100;
                    }).length})
                  </button>
                  <button
                    onClick={() => setLessonFilter('completed')}
                    className={`${styles.filterBtn} ${styles.completed} ${lessonFilter === 'completed' ? styles.active : ''}`}
                  >
                    ✅ Abgeschlossen ({allLessons.filter(l => calculateProgress(l.id) === 100).length})
                  </button>
                  <button
                    onClick={() => setLessonFilter('not-started')}
                    className={`${styles.filterBtn} ${styles.notStarted} ${lessonFilter === 'not-started' ? styles.active : ''}`}
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
                       <div style={{ marginBottom: '12px', flex: 1 }}>
                         <h3 className={styles.lessonTitle}>
                           {lesson.displayTitle || lesson.title}
                         </h3>
                         <p className={styles.lessonDescription}>
                           {lesson.description || 'Keine Beschreibung'}
                         </p>
                       </div>
                      
                       {/* Bottom section - Progress and Action Buttons */}
                       <div style={{ marginTop: 'auto' }}>
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

                       {/* Status Badge */}
                       {progressPercent === 100 && (
                         <div className={`${styles.statusBadge} ${styles.completed}`}>
                           ✅ Abgeschlossen
                         </div>
                       )}
                       {progressPercent === 0 && (
                         <div className={`${styles.statusBadge} ${styles.notStarted}`}>
                           🆕 Neu
                         </div>
                       )}
                    </div>
                  );
                })}
              </div>
            )}
            </div>
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
               <>
                 <div className={styles.vocabTable}>
                   <div className={styles.vocabHeader}>
                     <div className={styles.vocabHeaderLeft}>
                       <h2 className={styles.vocabHeaderTitle}>📚 Wortschatzliste</h2>
                       <div className={styles.vocabStats}>
                         <div className={styles.statItem}>
                           <span className={styles.statLabel}>Gesamt:</span>
                           <span className={styles.statValue}>{vocabulary.length}</span>
                         </div>
                         <div className={styles.statItem}>
                           <span className={styles.statLabel}>Angezeigt:</span>
                           <span className={styles.statValue}>{getFilteredVocabulary().length}</span>
                         </div>
                         <div className={styles.statItem}>
                           <span className={styles.statLabel}>Lektionen:</span>
                           <span className={styles.statValue}>{getUniqueLessons().length}</span>
                         </div>
                       </div>
                     </div>
                     <button onClick={exportToCSV} className={styles.exportBtn}>
                       📥 Exportieren
                     </button>
                   </div>

                   {/* Search and Filter Bar */}
                   <div className={styles.vocabControls}>
                     <div className={styles.searchBox}>
                       <span className={styles.searchIcon}>🔍</span>
                       <input
                         type="text"
                         placeholder="Wort, Übersetzung oder Kontext suchen..."
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className={styles.searchInput}
                       />
                       {searchTerm && (
                         <button
                           onClick={() => setSearchTerm('')}
                           className={styles.clearBtn}
                         >
                           ✕
                         </button>
                       )}
                     </div>

                     <div className={styles.filterGroup}>
                       <label className={styles.filterLabel}>Lektion:</label>
                       <select
                         value={filterLesson}
                         onChange={(e) => setFilterLesson(e.target.value)}
                         className={styles.filterSelect}
                       >
                         <option value="all">Alle Lektionen</option>
                         {getUniqueLessons().map(lesson => (
                           <option key={lesson} value={lesson}>{lesson}</option>
                         ))}
                       </select>
                     </div>
                   </div>

                   <div className={styles.tableWrapper}>
                     {getFilteredVocabulary().length === 0 ? (
                       <div className={styles.noResults}>
                         <div className={styles.noResultsIcon}>🔍</div>
                         <h3>Keine Ergebnisse gefunden</h3>
                         <p>Versuchen Sie andere Suchbegriffe oder Filter</p>
                       </div>
                     ) : (
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
                           {getFilteredVocabulary().map((vocab) => (
                           <tr key={vocab._id}>
                             <td>
                               <div
                                 className={styles.wordCell}
                                 onClick={() => speakWord(vocab.word)}
                                 style={{ cursor: 'pointer' }}
                                 title="Klicken Sie, um die Aussprache zu hören"
                               >
                                 🔊 {vocab.word}
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
                             <td>
                               <button
                                 className={styles.lessonLink}
                                 onClick={() => goToLesson(vocab.lessonId)}
                                 title="Zur Lektion gehen"
                               >
                                 📖 {vocab.lessonId || 'Unbekannt'}
                               </button>
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
                     )}
                   </div>
                 </div>

                 {/* Mobile Card View */}
                 <div className={styles.vocabCards}>
                   {getFilteredVocabulary().length === 0 ? (
                     <div className={styles.noResults}>
                       <div className={styles.noResultsIcon}>🔍</div>
                       <h3>Keine Ergebnisse gefunden</h3>
                       <p>Versuchen Sie andere Suchbegriffe oder Filter</p>
                     </div>
                   ) : (
                     getFilteredVocabulary().map((vocab) => (
                     <div key={vocab._id} className={styles.vocabCard}>
                       <div
                         className={styles.vocabCardWord}
                         onClick={() => speakWord(vocab.word)}
                         style={{ cursor: 'pointer' }}
                         title="Klicken Sie, um die Aussprache zu hören"
                       >
                         🔊 {vocab.word}
                       </div>
                       <div className={styles.vocabCardTranslation}>
                         {vocab.translation}
                       </div>
                       {vocab.context && (
                         <div className={styles.vocabCardContext}>
                           &ldquo;{vocab.context}&rdquo;
                         </div>
                       )}
                       <button
                         className={styles.vocabCardLessonBtn}
                         onClick={() => goToLesson(vocab.lessonId)}
                         title="Zur Lektion gehen"
                       >
                         📖 Lektion: {vocab.lessonId || 'Unbekannt'}
                       </button>
                       <div className={styles.vocabCardActions}>
                         <button
                           onClick={() => deleteVocabulary(vocab._id)}
                           className={styles.deleteBtn}
                         >
                           🗑️ Löschen
                         </button>
                       </div>
                     </div>
                   ))
                   )}
                 </div>
                </>
              )}
           </div>
         )}

         {/* Settings Tab */}
         {activeTab === 'settings' && (
           <div>
             <div className={styles.lessonsContainer}>
               <div className={styles.lessonsHeader}>
                 <h2 className={styles.lessonsHeaderTitle}>⚙️ Einstellungen</h2>
               </div>

               <div style={{
                 background: 'white',
                 padding: '30px',
                 borderRadius: '12px',
                 boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                 marginTop: '20px'
               }}>
                 <h3 style={{ marginBottom: '20px', color: '#333' }}>Spracheinstellungen</h3>

                 <div style={{ marginBottom: '20px' }}>
                   <label style={{
                     display: 'block',
                     marginBottom: '8px',
                     fontWeight: 'bold',
                     color: '#333'
                   }}>
                     Muttersprache (für Übersetzungen):
                   </label>
                   <select
                     value={user?.nativeLanguage || 'vi'}
                     onChange={async (e) => {
                       try {
                         const response = await fetch('/api/auth/update-profile', {
                           method: 'PUT',
                           headers: {
                             'Content-Type': 'application/json',
                             'Authorization': `Bearer ${localStorage.getItem('token')}`
                           },
                           body: JSON.stringify({
                             nativeLanguage: e.target.value
                           })
                         });

                         if (response.ok) {
                           toast.success('Sprache aktualisiert! Änderungen werden beim nächsten Laden wirksam.');
                           // Refresh user data
                           window.location.reload();
                         } else {
                           toast.error('Fehler beim Aktualisieren der Sprache');
                         }
                       } catch (error) {
                         console.error('Update error:', error);
                         toast.error('Fehler beim Aktualisieren der Sprache');
                       }
                     }}
                     style={{
                       width: '100%',
                       maxWidth: '300px',
                       padding: '12px',
                       border: '1px solid #ddd',
                       borderRadius: '6px',
                       fontSize: '16px',
                       background: 'white'
                     }}
                   >
                     <option value="vi">Tiếng Việt</option>
                     <option value="en">English</option>
                     <option value="es">Español</option>
                     <option value="fr">Français</option>
                     <option value="de">Deutsch</option>
                     <option value="it">Italiano</option>
                     <option value="pt">Português</option>
                     <option value="ru">Русский</option>
                     <option value="ja">日本語</option>
                     <option value="ko">한국어</option>
                     <option value="zh">中文</option>
                   </select>
                   <p style={{
                     marginTop: '8px',
                     fontSize: '14px',
                     color: '#666',
                     maxWidth: '500px'
                   }}>
                     Wählen Sie Ihre Muttersprache aus. Übersetzungen von Wörtern und Vokabeln werden in diese Sprache angezeigt.
                   </p>
                 </div>
               </div>
             </div>
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

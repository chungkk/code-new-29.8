import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateBreadcrumbStructuredData, generateCourseStructuredData, generateFAQStructuredData } from '../components/SEO';
import LessonCard from '../components/LessonCard';
import ModeSelectionPopup from '../components/ModeSelectionPopup';
import { useAuth } from '../context/AuthContext';
import { useLessons, prefetchLessons } from '../lib/hooks/useLessons';

const HomePage = () => {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const itemsPerPage = 15;
  const router = useRouter();
  const { user } = useAuth();

  // Use SWR for data fetching with automatic caching
  const { lessons, totalPages, isLoading: loading } = useLessons({
    page: currentPage,
    limit: itemsPerPage,
    difficulty: difficultyFilter
  });

  // Self-create lesson states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    // Set initial filter based on user level or default to beginner for non-logged-in users
    if (user && user.level) {
      setDifficultyFilter(user.level);
    } else if (!user) {
      // First-time visitors see beginner lessons by default
      setDifficultyFilter('beginner');
    }
  }, [user]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [difficultyFilter]);

  // Prefetch next page for smoother pagination
  useEffect(() => {
    if (currentPage < totalPages) {
      prefetchLessons({
        page: currentPage + 1,
        limit: itemsPerPage,
        difficulty: difficultyFilter
      });
    }
  }, [currentPage, totalPages, difficultyFilter]);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleLessonClick = async (lesson) => {
    // Fetch study time for both modes
    const token = localStorage.getItem('token');
    let shadowingStudyTime = 0;
    let dictationStudyTime = 0;
    
    if (token && user) {
      try {
        const [shadowingRes, dictationRes] = await Promise.all([
          fetch(`/api/progress?lessonId=${lesson.id}&mode=shadowing`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/api/progress?lessonId=${lesson.id}&mode=dictation`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        if (shadowingRes.ok) {
          const shadowingData = await shadowingRes.json();
          shadowingStudyTime = shadowingData.studyTime || 0;
        }
        
        if (dictationRes.ok) {
          const dictationData = await dictationRes.json();
          dictationStudyTime = dictationData.studyTime || 0;
        }
      } catch (error) {
        console.error('Error fetching study time:', error);
      }
    }
    
    setSelectedLesson({
      ...lesson,
      shadowingStudyTime,
      dictationStudyTime
    });
    setShowPopup(true);
  };

  const handleModeSelect = (lesson, mode) => {
    // Increment view count
    fetch(`/api/lessons/${lesson.id}/view`, {
      method: 'POST'
    }).catch(err => console.error('Error incrementing view count:', err));
    
    // Navigate to the specific lesson and mode
    router.push(`/${mode}/${lesson.id}`);
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    setSelectedLesson(null);
  };

  const handleCreateLesson = async (e) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsCreating(true);
    setCreateError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setCreateError('Du musst angemeldet sein, um eine Lektion zu erstellen');
        return;
      }

      const res = await fetch('/api/create-self-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ youtubeUrl: youtubeUrl.trim() })
      });

      if (res.ok) {
        const data = await res.json();
        // Store lesson data in localStorage for temporary use
        localStorage.setItem(`self-lesson-${data.lesson.id}`, JSON.stringify(data.lesson));
        router.push(`/self-lesson/${data.lesson.id}`);
      } else {
        const error = await res.json();
        setCreateError(error.message || 'Lỗi tạo bài học');
      }
    } catch (error) {
      setCreateError('Verbindungsfehler');
    } finally {
      setIsCreating(false);
    }
  };

  // Structured data for homepage
  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' }
  ]);

  const difficultyOptions = [
    {
      value: 'beginner',
      title: 'For Beginners',
      description: 'Focus on basic pronunciation and listening to simple words and sentences'
    },
    {
      value: 'experienced',
      title: 'For Experienced Learners',
      description: 'Enhance skills with natural speaking speed and more complex topics'
    }
  ];

  // Generate structured data for the homepage
  const faqData = [
    {
      question: "Was ist die Shadowing-Methode?",
      answer: "Shadowing ist eine Sprach-Lerntechnik, bei der Sie gleichzeitig mit einem Muttersprachler sprechen, um Aussprache, Rhythmus und Intonation zu verbessern."
    },
    {
      question: "Für welche Sprachniveaus ist PapaGeil geeignet?",
      answer: "PapaGeil bietet Lektionen für alle Niveaus von A1 (Anfänger) bis C2 (Fortgeschrittene) nach dem Gemeinsamen Europäischen Referenzrahmen."
    },
    {
      question: "Kann ich meine eigenen YouTube-Videos verwenden?",
      answer: "Ja! Sie können jeden YouTube-Link einfügen und wir erstellen automatisch eine interaktive Lektion mit Untertiteln für Sie."
    },
    {
      question: "Wie funktioniert die Diktat-Methode?",
      answer: "Bei der Diktat-Methode hören Sie sich Audio an und schreiben das Gehörte auf. Dies verbessert Ihr Hörverstehen und Ihre Rechtschreibung."
    },
    {
      question: "Ist PapaGeil kostenlos?",
      answer: "PapaGeil bietet viele kostenlose Lektionen. Premium-Funktionen wie unbegrenzte selbsterstellte Lektionen sind für registrierte Nutzer verfügbar."
    }
  ];

  const combinedStructuredData = [
    breadcrumbData,
    generateCourseStructuredData(lessons, difficultyFilter),
    generateFAQStructuredData(faqData)
  ];

  return (
    <>
      <SEO
        title="PapaGeil - Lerne Deutsch mit YouTube Videos | Shadowing & Diktat"
        description="Verbessere dein Deutsch durch interaktive Shadowing und Diktat-Übungen mit authentischen YouTube-Videos. ✓ 100+ Lektionen ✓ Alle Niveaus A1-C2 ✓ Kostenlos starten"
        keywords="Deutsch lernen online, German learning, Shadowing Methode, Diktat Übungen, YouTube Deutsch lernen, Aussprache verbessern, Deutsch Kurs online, A1 A2 B1 B2 C1 C2, Hörverstehen Deutsch, deutsche Sprache, German pronunciation, learn German free"
        ogImage="/og-image.jpg"
        structuredData={combinedStructuredData}
      />

      <div className="main-container">

        {/* Difficulty toggle */}
        <div className="difficulty-toggle">
          {difficultyOptions.map((option) => {
            const isActive = difficultyFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`difficulty-toggle__option ${isActive ? 'active' : ''}`}
                onClick={() => setDifficultyFilter(isActive ? 'all' : option.value)}
              >
                <span className="difficulty-toggle__title">{option.title}</span>
                <span className="difficulty-toggle__description">{option.description}</span>
              </button>
            );
          })}
        </div>

        {/* Self-create lesson form */}
        <div style={{
          marginBottom: '20px',
          padding: '14px 16px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '10px',
          boxShadow: '0 3px 4px rgba(0,0,0,0.08)'
        }}>
            <form
              onSubmit={handleCreateLesson}
              style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}
            >
            <input
              type="url"
              placeholder="Füge hier den YouTube-Link ein..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '10px 12px',
                border: '1px solid #d3d9e0',
                borderRadius: '8px',
                fontSize: '15px',
                outline: 'none'
              }}
              disabled={isCreating}
            />
            <button
              type="submit"
              disabled={isCreating || !youtubeUrl.trim()}
              style={{
                padding: '10px 20px',
                background: isCreating ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isCreating ? 'Erstelle...' : 'Lektion erstellen'}
            </button>
          </form>
          {createError && (
            <p style={{ color: 'red', marginTop: '8px', fontSize: '13px' }}>
              {createError}
            </p>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', fontSize: '18px', color: '#666' }}>
            <div style={{ marginBottom: '10px' }}>⏳ Lade Lektionen...</div>
          </div>
        ) : (
          <div className="lesson-cards-container">
            {lessons.map(lesson => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onClick={() => handleLessonClick(lesson)}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button
              onClick={prevPage}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹ Zurück
            </button>
            <span className="pagination-info">
              Seite {currentPage} / {totalPages}
            </span>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Weiter ›
            </button>
          </div>
        )}

        {showPopup && selectedLesson && (
          <ModeSelectionPopup
            lesson={selectedLesson}
            onClose={handleClosePopup}
            onSelectMode={handleModeSelect}
          />
        )}
      </div>
    </>
  );
};

export default HomePage;

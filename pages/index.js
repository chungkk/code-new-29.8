import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LessonCard from '../components/LessonCard';
import ModeSelectionPopup from '../components/ModeSelectionPopup';

const HomePage = () => {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [lessons, setLessons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const router = useRouter();

  // Self-create lesson states
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    try {
      const res = await fetch('/api/lessons');
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          // Sort lessons by createdAt descending (newest first)
          const sortedData = data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setLessons(sortedData);
        }
      }
    } catch (error) {
      console.error('Error loading lessons:', error);
    }
  };

  const totalPages = Math.ceil(lessons.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentLessons = lessons.slice(startIndex, endIndex);

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

  const handleLessonClick = (lesson) => {
    setSelectedLesson(lesson);
    setShowPopup(true);
  };

  const handleModeSelect = (lesson, mode) => {
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

  return (
    <>
      <Head>
        <title>Lektionsliste - Deutsch Shadowing</title>
        <meta name="description" content="Wählen Sie eine Lektion zum Üben" />
      </Head>
      
      <div className="main-container">

        {/* Self-create lesson form */}
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ marginBottom: '15px', color: '#333' }}>Erstelle eine Lektion aus YouTube</h3>
          <form onSubmit={handleCreateLesson} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="url"
              placeholder="Füge hier den YouTube-Link ein..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              style={{
                flex: 1,
                padding: '12px',
                border: '2px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                outline: 'none'
              }}
              disabled={isCreating}
            />
            <button
              type="submit"
              disabled={isCreating || !youtubeUrl.trim()}
              style={{
                padding: '12px 24px',
                background: isCreating ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                fontWeight: 'bold'
              }}
            >
              {isCreating ? 'Erstelle...' : 'Lektion erstellen'}
            </button>
          </form>
          {createError && (
            <p style={{ color: 'red', marginTop: '10px', fontSize: '14px' }}>
              {createError}
            </p>
          )}
        </div>

        <div className="lesson-cards-container">
          {currentLessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onClick={() => handleLessonClick(lesson)}
            />
          ))}
        </div>

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

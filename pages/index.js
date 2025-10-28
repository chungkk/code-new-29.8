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

  return (
    <>
      <Head>
        <title>Lektionsliste - Deutsch Shadowing</title>
        <meta name="description" content="Wählen Sie eine Lektion zum Üben" />
      </Head>
      
      <div className="main-container">

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

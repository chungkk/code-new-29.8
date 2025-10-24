import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import LessonCard from '../components/LessonCard';
import ModeSelectionPopup from '../components/ModeSelectionPopup';

const HomePage = () => {
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const router = useRouter();

  const lessons = [
    {
      id: 'bai_1',
      title: 'Patient Erde: Zustand kritisch',
      audio: '/audio/bai_1.mp3',
      json: '/text/bai_1.json',
      displayTitle: 'Lektion 1: Patient Erde',
      description: 'Thema: Umwelt, Klimawandel (DW)'
    }
  ];

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
        <h1>Lektionsliste 📚</h1>
        <div className="lesson-cards-container">
          {lessons.map(lesson => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              onClick={() => handleLessonClick(lesson)}
            />
          ))}
        </div>

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

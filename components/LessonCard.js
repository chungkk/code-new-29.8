import React from 'react';

const LessonCard = ({ lesson, onClick, featured = false }) => {
  return (
    <div className={`lesson-card ${featured ? 'featured' : ''}`} onClick={onClick}>
      <div className="lesson-header">
        <h3 className="lesson-title">{lesson.displayTitle}</h3>
        <span className="level-badge">{lesson.level || 'A1'}</span>
      </div>
      <p className="lesson-description">{lesson.description}</p>
      <button className="lesson-button">
        <span className="button-icon">🚀</span>
        Los geht&apos;s!
      </button>
    </div>
  );
};

export default LessonCard;

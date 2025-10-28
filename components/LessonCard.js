import React from 'react';

const LessonCard = ({ lesson, onClick, featured = false }) => {
  return (
    <div className={`lesson-card ${featured ? 'featured' : ''}`} onClick={onClick}>
      <div className="lesson-header">
        <h3 className="lesson-title">{lesson.displayTitle}</h3>
      </div>
      <p className="lesson-description">{lesson.description}</p>
      <div className="lesson-footer">
        <button className="lesson-button">
          <span className="button-icon">🚀</span>
          Los geht&apos;s!
        </button>
        <span className={`level-badge level-${lesson.level || 'A1'}`}>{lesson.level || 'A1'}</span>
      </div>
    </div>
  );
};

export default LessonCard;

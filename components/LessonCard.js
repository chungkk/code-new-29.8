import React from 'react';

const LessonCard = ({ lesson, onClick }) => {
  return (
    <div className="lesson-card" onClick={onClick}>
      <div className="lesson-header">
        <h3>{lesson.displayTitle}</h3>
        <span className="level-badge">{lesson.level || 'A1'}</span>
      </div>
      <p>{lesson.description}</p>
      <button>Los geht&apos;s!</button>
    </div>
  );
};

export default LessonCard;

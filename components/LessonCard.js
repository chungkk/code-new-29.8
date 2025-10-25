import React from 'react';

const LessonCard = ({ lesson, onClick }) => {
  return (
    <div className="lesson-card" onClick={onClick}>
      <h3>{lesson.displayTitle}</h3>
      <p>{lesson.description}</p>
      <button>Los geht&apos;s!</button>
    </div>
  );
};

export default LessonCard;

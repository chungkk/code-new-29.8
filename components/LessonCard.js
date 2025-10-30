import React from 'react';
import VideoThumbnail from './VideoThumbnail';

const LessonCard = ({ lesson, onClick, featured = false }) => {
  return (
    <div className={`lesson-card-new ${featured ? 'featured' : ''}`} onClick={onClick}>
      {/* Thumbnail Section */}
      <VideoThumbnail lesson={lesson} className="lesson-card-thumbnail" />

      {/* Content Section */}
      <div className="lesson-card-content">
        {/* Title & Level Badge */}
        <div className="lesson-card-header">
          <h3 className="lesson-card-title">{lesson.displayTitle}</h3>
          <span className={`level-badge-new level-${lesson.level || 'A1'}`}>
            {lesson.level || 'A1'}
          </span>
        </div>

        {/* Description */}
        <p className="lesson-card-description">{lesson.description}</p>

        {/* Footer with mode badges */}
        <div className="lesson-card-footer">
          <div className="mode-badges">
            <span className="mode-badge dictation">
              <span className="mode-icon">✍️</span> Dictation
            </span>
            <span className="mode-badge shadowing">
              <span className="mode-icon">🗣️</span> Shadowing
            </span>
          </div>
          {lesson.youtubeUrl && (
            <span className="source-indicator">Youtube</span>
          )}
          <span className="lesson-duration">
            {lesson.duration || '02:30 minutes'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default LessonCard;

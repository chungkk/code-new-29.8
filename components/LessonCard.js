import React from 'react';
import VideoThumbnail from './VideoThumbnail';
import styles from '../styles/LessonCard.module.css';

const LessonCard = ({
  lesson,
  onClick,
  featured = false,
  progress = 0,
  showProgress = false
}) => {
  const getLevelColor = (level) => {
    const colors = {
      'A1': '#22c55e',
      'A2': '#4ade80',
      'B1': '#f59e0b',
      'B2': '#fb923c',
      'C1': '#ef4444',
      'C2': '#dc2626'
    };
    return colors[level] || colors['A1'];
  };

  const formatDuration = (duration) => {
    if (!duration) return '02:30 Min';
    // If duration is in seconds, convert to MM:SS
    if (typeof duration === 'number') {
      const minutes = Math.floor(duration / 60);
      const seconds = duration % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} Min`;
    }
    return duration;
  };

  return (
    <div
      className={`${styles.lessonCard} ${featured ? styles.featured : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
    >
      {/* Thumbnail Section */}
      <div className={styles.thumbnailWrapper}>
        <VideoThumbnail lesson={lesson} className={styles.thumbnail} />

        {/* Level Badge on Thumbnail */}
        <div
          className={styles.levelBadge}
          style={{ backgroundColor: getLevelColor(lesson.level || 'A1') }}
        >
          {lesson.level || 'A1'}
        </div>

        {/* Source Badge */}
        {lesson.youtubeUrl && (
          <div className={styles.sourceBadge}>
            <span className={styles.sourceIcon}>▶</span> YouTube
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={styles.content}>
        {/* Title */}
        <h3 className={styles.title}>{lesson.displayTitle || lesson.title}</h3>

        {/* Description */}
        <p className={styles.description}>
          {lesson.description || 'Keine Beschreibung verfügbar'}
        </p>

        {/* Progress Bar (if showProgress) */}
        {showProgress && (
          <div className={styles.progressSection}>
            <div className={styles.progressInfo}>
              <span className={styles.progressLabel}>Fortschritt</span>
              <span className={styles.progressPercent}>{Math.round(progress)}%</span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          {/* Mode Badges */}
          <div className={styles.modeBadges}>
            <span className={styles.modeBadge} title="Diktat Modus">
              <span className={styles.modeIcon}>✍️</span>
              <span className={styles.modeText}>Diktat</span>
            </span>
            <span className={styles.modeBadge} title="Shadowing Modus">
              <span className={styles.modeIcon}>🗣️</span>
              <span className={styles.modeText}>Shadowing</span>
            </span>
          </div>

          {/* Duration */}
          <div className={styles.duration}>
            <span className={styles.durationIcon}>⏱️</span>
            <span className={styles.durationText}>
              {formatDuration(lesson.duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LessonCard;

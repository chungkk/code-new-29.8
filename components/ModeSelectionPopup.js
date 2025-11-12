import React from 'react';
import styles from '../styles/ModeSelectionPopup.module.css';

const ModeSelectionPopup = ({ lesson, onClose, onSelectMode }) => {
  const modes = [
    {
      id: 'dictation',
      name: 'Dictation',
      icon: '✍️',
      description: 'Listen and type what you hear to improve your listening comprehension and spelling.',
    },
    {
      id: 'shadowing',
      name: 'Shadowing',
      icon: '🗣️',
      description: 'Listen and repeat after the speaker to improve your pronunciation and speaking fluency.',
    },
  ];

  const handleModeClick = (mode) => {
    onSelectMode(lesson, mode.id);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div className={styles.popup}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 className={styles.popupTitle}>Choose Learning Mode</h2>

        <div className={styles.lessonInfo}>
          <div className={styles.lessonTitle}>{lesson.title}</div>
          <div className={styles.lessonMeta}>
            <span>⏱ {Math.floor((lesson.duration || 0) / 60)} min</span>
            <span>📊 {lesson.difficulty || 'Beginner'}</span>
          </div>
        </div>

        <div className={styles.modesContainer}>
          {modes.map((mode) => (
            <div
              key={mode.id}
              className={styles.modeOption}
              onClick={() => handleModeClick(mode)}
            >
              <div className={styles.modeHeader}>
                <div className={styles.modeIcon}>{mode.icon}</div>
                <div className={styles.modeName}>{mode.name}</div>
              </div>
              <div className={styles.modeDescription}>{mode.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ModeSelectionPopup;

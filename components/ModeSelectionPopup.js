import React from 'react';

const ModeSelectionPopup = ({ lesson, onClose, onSelectMode }) => {
  const handleModeSelect = (mode) => {
    onSelectMode(lesson, mode);
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="mode-popup-overlay" onClick={handleBackdropClick}>
      <div className="mode-popup-container">
        <div className="mode-popup-header">
          <h2>🎓 Übungsmodus wählen</h2>
          <button className="mode-popup-close" onClick={onClose}>
            <span>×</span>
          </button>
        </div>
        
        <div className="mode-popup-lesson-info">
          <h3>{lesson.displayTitle}</h3>
          <p>{lesson.description}</p>
        </div>

        <div className="mode-popup-options">
          <div 
            className="mode-popup-option mode-option-dictation" 
            onClick={() => handleModeSelect('dictation')}
          >
            <div className="mode-popup-icon">✍️</div>
            <div className="mode-popup-text">
              <h4>Diktat</h4>
              <p>Hören und den Lektionsinhalt aufschreiben</p>
            </div>
          </div>
          
          <div 
            className="mode-popup-option mode-option-shadowing" 
            onClick={() => handleModeSelect('shadowing')}
          >
            <div className="mode-popup-icon">🎤</div>
            <div className="mode-popup-text">
              <h4>Shadowing</h4>
              <p>Dem Audio folgen, um die Aussprache zu verbessern</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModeSelectionPopup;

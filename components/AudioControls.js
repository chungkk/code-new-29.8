import React from 'react';

const AudioControls = ({ 
  lessonTitle, 
  currentTime, 
  duration, 
  isPlaying, 
  onSeek, 
  onPlayPause, 
  formatTime
}) => {
  return (
    <div className="fixed-audio-bar">
      <div className="audio-content-wrapper">
        <h1>{lessonTitle}</h1>
        
        <div className="mobile-seek-controls">
          <button className="seek-btn seek-left" onClick={() => onSeek('backward')}>
            <span className="icon">❮</span><span className="label">-3s</span>
          </button>
          <button className="seek-btn seek-right" onClick={() => onSeek('forward')}>
            <span className="label">+3s</span><span className="icon">❯</span>
          </button>
        </div>

        <div className="audio-section">
          <div className="time-display">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;

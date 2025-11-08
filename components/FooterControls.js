import React, { useEffect } from 'react';

const FooterControls = ({ onSeek, onPlayPause, isPlaying }) => {
  useEffect(() => {
    document.body.classList.add('has-footer-controls');

    return () => {
      document.body.classList.remove('has-footer-controls');
    };
  }, []);

  return (
    <div className="fixed-footer-controls">
      <button className="footer-btn" onClick={() => onSeek('backward')}>
        <span className="icon">❮❮</span>
        <span className="label">-3s</span>
      </button>
      
      <button className="footer-btn" onClick={onPlayPause}>
        <span className="icon">{isPlaying ? '❚❚' : '▶'}</span>
        <span className="label">{isPlaying ? 'PAUSE' : 'PLAY'}</span>
      </button>
      
      <button className="footer-btn" onClick={() => onSeek('forward')}>
        <span className="label">+3s</span>
        <span className="icon">❯❯</span>
      </button>
    </div>
  );
};

export default FooterControls;

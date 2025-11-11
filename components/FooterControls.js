import React, { useEffect } from 'react';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const FooterControls = ({ onSeek, onPlayPause, isPlaying, classNames = {} }) => {
  const {
    wrapper,
    button,
    icon,
    label
  } = classNames;

  useEffect(() => {
    document.body.classList.add('has-footer-controls');

    return () => {
      document.body.classList.remove('has-footer-controls');
    };
  }, []);

  return (
    <div className={joinClasses(wrapper)}>
      <button className={joinClasses(button)} onClick={() => onSeek('backward')}>
        <span className={joinClasses(icon)}>❮❮</span>
        <span className={joinClasses(label)}>-3s</span>
      </button>
      
      <button className={joinClasses(button)} onClick={onPlayPause}>
        <span className={joinClasses(icon)}>{isPlaying ? '❚❚' : '▶'}</span>
        <span className={joinClasses(label)}>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
      </button>
      
      <button className={joinClasses(button)} onClick={() => onSeek('forward')}>
        <span className={joinClasses(label)}>+3s</span>
        <span className={joinClasses(icon)}>❯❯</span>
      </button>
    </div>
  );
};

export default FooterControls;

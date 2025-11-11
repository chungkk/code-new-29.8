import React from 'react';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const AudioControls = ({ 
  lessonTitle, 
  currentTime, 
  duration, 
  isPlaying, 
  onSeek, 
  onPlayPause, 
  formatTime,
  classNames = {}
}) => {
  const {
    wrapper,
    contentWrapper,
    title,
    mobileControls,
    seekButton,
    seekButtonLeft,
    seekButtonRight,
    seekIcon,
    seekLabel,
    audioSection,
    timeDisplay
  } = classNames;

  return (
    <div className={joinClasses(wrapper)}>
      <div className={joinClasses(contentWrapper)}>
        <h1 className={joinClasses(title)}>{lessonTitle}</h1>
        
        <div className={joinClasses(mobileControls)}>
          <button className={joinClasses(seekButton, seekButtonLeft)} onClick={() => onSeek('backward')}>
            <span className={joinClasses(seekIcon)}>❮</span><span className={joinClasses(seekLabel)}>-3s</span>
          </button>
          <button className={joinClasses(seekButton, seekButtonRight)} onClick={() => onSeek('forward')}>
            <span className={joinClasses(seekLabel)}>+3s</span><span className={joinClasses(seekIcon)}>❯</span>
          </button>
        </div>

        <div className={joinClasses(audioSection)}>
          <div className={joinClasses(timeDisplay)}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioControls;

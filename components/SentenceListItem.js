import React from 'react';
import HoverableWord from './HoverableWord';

const SentenceListItem = ({
  segment,
  index,
  currentSentenceIndex,
  currentTime,
  isCompleted,
  lessonId,
  onSentenceClick,
  formatTime,
  maskText,
  isTextHidden
}) => {
  const renderSentenceText = () => {
    if (isTextHidden && !isCompleted) {
      return maskText(segment.text.trim());
    }

    const words = segment.text.trim().split(/(\s+)/);
    return words.map((word, wordIndex) => {
      if (/^\s+$/.test(word)) {
        return <span key={wordIndex}>{word}</span>;
      }
      // Không truyền onWordClick để disable popup trong danh sách câu
      return <HoverableWord key={wordIndex} word={word} />;
    });
  };

  return (
    <div
      className={`sentence-item ${
        currentSentenceIndex === index ? 'active' : ''
      } ${
        currentTime >= segment.start && currentTime < segment.end ? 'playing' : ''
      }`}
      onClick={() => onSentenceClick(segment.start, segment.end)}
    >
      <div className="sentence-number">
        {index + 1}
      </div>
       <div className="sentence-content">
         <div className="sentence-text" style={{ fontSize: '14px', lineHeight: '1.2', whiteSpace: 'normal' }}>
           {renderSentenceText()}
         </div>
         <div className="sentence-time" style={{ fontSize: '12px' }}>
           {formatTime(segment.start)} - {formatTime(segment.end)}
         </div>
       </div>
      <div className="sentence-actions">
        <button 
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            onSentenceClick(segment.start, segment.end);
          }}
           title="Diesen Satz abspielen oder pausieren"
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default SentenceListItem;

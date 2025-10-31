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
  isTextHidden,
  completedWords
}) => {
  const renderSentenceText = () => {
    if (isTextHidden && !isCompleted) {
      // If we have completed words for this sentence, show them
      if (completedWords && Object.keys(completedWords).length > 0) {
        const words = segment.text.trim().split(/\s+/);
        return words.map((word, wordIndex) => {
          const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
          const punctuation = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");

          // If this word is completed, show it normally
          if (completedWords[wordIndex]) {
            return (
              <span key={wordIndex}>
                <HoverableWord word={pureWord} />
                {punctuation}
                {wordIndex < words.length - 1 ? ' ' : ''}
              </span>
            );
          }

          // Otherwise show masked
          return (
            <span key={wordIndex}>
              {maskText(pureWord)}
              {punctuation}
              {wordIndex < words.length - 1 ? ' ' : ''}
            </span>
          );
        });
      }

      // No completed words, mask everything
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

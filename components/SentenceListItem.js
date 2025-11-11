import React from 'react';
import HoverableWord from './HoverableWord';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

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
  completedWords,
  classNames = {}
}) => {
  const {
    item,
    itemActive,
    itemPlaying,
    number,
    content,
    text,
    time,
    actions,
    actionButton
  } = classNames;

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
      className={joinClasses(
        item,
        currentSentenceIndex === index && itemActive,
        currentTime >= segment.start && currentTime < segment.end && itemPlaying
      )}
      onClick={() => onSentenceClick(segment.start, segment.end)}
    >
      <div className={joinClasses(number)}>
        {index + 1}
      </div>
       <div className={joinClasses(content)}>
         <div className={joinClasses(text)}>
           {renderSentenceText()}
         </div>
         <div className={joinClasses(time)}>
           {formatTime(segment.start)} - {formatTime(segment.end)}
         </div>
       </div>
      <div className={joinClasses(actions)}>
        <button 
          className={joinClasses(actionButton)}
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

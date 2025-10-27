import React, { useState } from 'react';
import HoverableWord from './HoverableWord';
import VocabularyPopup from './VocabularyPopup';

const DictationText = ({ 
  text, 
  isCompleted, 
  sentenceWordsCompleted, 
  currentSentenceIndex,
  lessonId,
  onCheckWord,
  onHandleInputClick,
  onShowHint,
  onHandleInputFocus,
  onHandleInputBlur
}) => {
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [preTranslation, setPreTranslation] = useState('');

  const handleWordClick = (word, position, translation = '') => {
    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;
    
    setSelectedWord(cleanedWord);
    setPopupPosition(position);
    setPreTranslation(translation);
    setShowVocabPopup(true);
  };

  const words = text.split(/\s+/);
  
  return (
    <>
      <div className="dictation-text">
        {words.map((word, wordIndex) => {
          const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
          const punctuation = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");
          
          if (pureWord.length < 1) {
            return <span key={wordIndex}> {word}</span>;
          }

          const isWordCompleted = sentenceWordsCompleted && sentenceWordsCompleted[wordIndex];

          // Show completed word as hoverable/clickable
          if (isCompleted || isWordCompleted) {
            return (
              <span key={wordIndex} className="word-container">
                <HoverableWord 
                  word={pureWord} 
                  onWordClick={handleWordClick}
                />
                {punctuation && <span className="word-punctuation">{punctuation}</span>}
                {wordIndex < words.length - 1 && ' '}
              </span>
            );
          }

          // Show input field for words not yet completed
          return (
            <span key={wordIndex} className="word-container">
              <button 
                className="hint-btn" 
                onClick={(e) => {
                  e.preventDefault();
                  const btn = e.currentTarget;
                  if (onShowHint) onShowHint(btn, pureWord, wordIndex);
                }}
                title="Hiển thị gợi ý"
                type="button"
              >
                👁️
              </button>
              <input 
                type="text" 
                className="word-input" 
                data-word-id={`word-${wordIndex}`}
                onInput={(e) => onCheckWord && onCheckWord(e.target, pureWord, wordIndex)}
                onClick={(e) => onHandleInputClick && onHandleInputClick(e.target, pureWord)}
                onKeyDown={(e) => {
                  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
                    e.preventDefault();
                  }
                }}
                onFocus={(e) => onHandleInputFocus && onHandleInputFocus(e.target, pureWord)}
                onBlur={(e) => onHandleInputBlur && onHandleInputBlur(e.target, pureWord)}
                maxLength={pureWord.length}
                placeholder={'*'.repeat(pureWord.length)}
              />
              {punctuation && <span className="word-punctuation">{punctuation}</span>}
              {wordIndex < words.length - 1 && ' '}
            </span>
          );
        })}
      </div>

      {showVocabPopup && (
        <VocabularyPopup
          word={selectedWord}
          context={text}
          lessonId={lessonId}
          onClose={() => setShowVocabPopup(false)}
          position={popupPosition}
          preTranslation={preTranslation}
        />
      )}
    </>
  );
};

export default DictationText;

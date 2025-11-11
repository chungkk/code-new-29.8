import React, { useState } from 'react';
import HoverableWord from './HoverableWord';
import VocabularyPopup from './VocabularyPopup';

const joinClasses = (...classes) => classes.filter(Boolean).join(' ');

const Transcript = ({ transcriptData, currentTime, isHidden, onSentenceClick, currentSentenceIndex = 0, onPreviousSentence, onNextSentence, isPlaying = false, lessonId, classNames = {} }) => {
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [preTranslation, setPreTranslation] = useState('');
  const {
    currentSentenceWrapper,
    sentenceCounterContainer,
    navButton,
    prevButton,
    nextButton,
    sentenceCounter,
    inputArea,
    currentSentence: currentSentenceClass,
    highlightedSentence,
    sentenceTimeContainer,
    sentenceTimeContainerPlaying,
    timeProgressBar,
    timeProgressFill,
    timeDisplay,
    timeIcon,
    timeCurrent,
    timeSeparator,
    timeTotal
  } = classNames;

  const handleWordClick = (word, position, translation = '') => {
    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;
    
    setSelectedWord(cleanedWord);
    setPopupPosition(position);
    setPreTranslation(translation);
    setShowVocabPopup(true);
  };

  const splitTextIntoWords = (text) => {
    const words = text.split(/(\s+)/);
    return words.map((word, index) => {
      if (/^\s+$/.test(word)) {
        return <span key={index}>{word}</span>;
      }
      return <HoverableWord key={index} word={word} onWordClick={handleWordClick} />;
    });
  };
  const renderCurrentSentence = () => {
    if (!transcriptData.length) {
      return <div>Text wird geladen...</div>;
    }

    const currentItem = transcriptData[currentSentenceIndex];
    const isHighlighted = currentTime >= currentItem.start && currentTime < currentItem.end;

    return (
      <div className={joinClasses(currentSentenceWrapper)}>
        <div className={joinClasses(sentenceCounterContainer)}>
          <button
            className={joinClasses(navButton, prevButton)}
            onClick={onPreviousSentence}
            disabled={currentSentenceIndex === 0}
            title="Vorheriger Satz"
          >
            ‹
          </button>

          <div className={joinClasses(sentenceCounter)}>
            Satz {currentSentenceIndex + 1} / {transcriptData.length}
          </div>

          <button
            className={joinClasses(navButton, nextButton)}
            onClick={onNextSentence}
            disabled={currentSentenceIndex === transcriptData.length - 1}
            title="Nächster Satz"
          >
            ›
          </button>
        </div>

        <div className={joinClasses(inputArea)}>
          <div
            className={joinClasses(currentSentenceClass, isHighlighted && highlightedSentence)}
          >
            {splitTextIntoWords(currentItem.text.trim())}
          </div>
        </div>

        <div
          className={joinClasses(sentenceTimeContainer, isPlaying && sentenceTimeContainerPlaying)}
          onClick={() => onSentenceClick(currentItem.start, currentItem.end)}
           title="Click để phát hoặc tạm dừng câu này"
        >
           <div className={joinClasses(timeProgressBar)}>
             <div
               className={joinClasses(timeProgressFill)}
               style={{
                 transform: `scaleX(${isPlaying && currentItem
                   ? (currentTime - currentItem.start) / (currentItem.end - currentItem.start)
                   : 0})`
               }}
             />
           </div>
          <div className={joinClasses(timeDisplay)}>
            <span className={joinClasses(timeIcon)}>{isPlaying ? '▶' : '⏸'}</span>
            <span className={joinClasses(timeCurrent)}>{formatTime(currentTime)}</span>
            <span className={joinClasses(timeSeparator)}>/</span>
            <span className={joinClasses(timeTotal)}>
              {formatTime(currentItem.start)} - {formatTime(currentItem.end)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const currentSentence = transcriptData[currentSentenceIndex];

  return (
    <>
      {renderCurrentSentence()}

      {showVocabPopup && (
        <VocabularyPopup
          word={selectedWord}
          context={currentSentence?.text || ''}
          lessonId={lessonId}
          onClose={() => setShowVocabPopup(false)}
          position={popupPosition}
          preTranslation={preTranslation}
        />
      )}
    </>
  );
};

export default Transcript;

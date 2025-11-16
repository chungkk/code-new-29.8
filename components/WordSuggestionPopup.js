import React, { useState, useEffect } from 'react';
import styles from '../styles/WordSuggestionPopup.module.css';

const WordSuggestionPopup = ({ 
  correctWord, 
  context, 
  wordIndex,
  position,
  onCorrectAnswer, 
  onWrongAnswer, 
  onClose 
}) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  useEffect(() => {
    loadSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [correctWord]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/generate-word-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correctWord,
          context
        })
      });

      const data = await response.json();
      
      if (data.success && data.options) {
        setOptions(data.options);
      } else {
        // Fallback: just show the correct word if API fails
        setOptions([correctWord]);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Fallback
      setOptions([correctWord]);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionClick = (option) => {
    if (showResult) return; // Prevent multiple clicks

    setSelectedOption(option);
    const correct = option.toLowerCase() === correctWord.toLowerCase();
    setIsCorrect(correct);
    setShowResult(true);

    // Show result for 1.5 seconds before calling callbacks
    setTimeout(() => {
      if (correct) {
        onCorrectAnswer(correctWord, wordIndex);
      } else {
        onWrongAnswer(correctWord, wordIndex, option);
      }
    }, 1500);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !showResult) {
      onClose();
    }
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick}>
      <div 
        className={styles.popup}
        style={{
          position: 'absolute',
          top: `${position?.top || 0}px`,
          left: `${position?.left || 0}px`,
        }}
      >
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className={styles.header}>
          <h3>Wähle das Wort</h3>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Generiere Vorschläge...</p>
          </div>
        ) : (
          <div className={styles.optionsContainer}>
            {options.map((option, index) => (
              <button
                key={index}
                className={`${styles.optionButton} ${
                  selectedOption === option
                    ? isCorrect
                      ? styles.correct
                      : styles.wrong
                    : ''
                } ${showResult && option.toLowerCase() === correctWord.toLowerCase() ? styles.showCorrect : ''}`}
                onClick={() => handleOptionClick(option)}
                disabled={showResult}
              >
                <span className={styles.optionText}>{option}</span>
                {showResult && selectedOption === option && (
                  <span className={styles.resultIcon}>
                    {isCorrect ? '✓' : '✗'}
                  </span>
                )}
                {showResult && !isCorrect && option.toLowerCase() === correctWord.toLowerCase() && (
                  <span className={styles.resultIcon}>✓</span>
                )}
              </button>
            ))}
          </div>
        )}

        {showResult && (
          <div className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}>
            {isCorrect ? (
              <>
                <span className={styles.feedbackIcon}>🎉</span>
                <p>Richtig! Gut gemacht!</p>
              </>
            ) : (
              <>
                <span className={styles.feedbackIcon}>💡</span>
                <p>Das richtige Wort ist: <strong>{correctWord}</strong></p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WordSuggestionPopup;

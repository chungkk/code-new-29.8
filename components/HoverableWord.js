import React, { useState } from 'react';
import { speakText } from '../lib/textToSpeech';

const HoverableWord = ({ word, onWordClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [translation, setTranslation] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const cleanWord = word.trim();
  
  if (!cleanWord) return null;
  
  const isPunctuation = /^[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]+$/.test(cleanWord);
  
  if (isPunctuation) {
    return <span className="word-punctuation">{cleanWord}</span>;
  }

  const pureWord = cleanWord.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
  
  if (!pureWord) {
    return <span>{cleanWord}</span>;
  }

  // Fetch translation on hover
  const handleMouseEnter = async () => {
     setShowTooltip(true);

     if (!translation && !loading) {
       setLoading(true);
       try {
         const response = await fetch('/api/translate', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             text: pureWord,
             sourceLang: 'de',
             targetLang: 'vi'
           })
         });

         if (response.ok) {
           const data = await response.json();
           if (data.success && data.translation) {
             setTranslation(data.translation);
           }
         }
       } catch (error) {
         console.error('Translation error:', error);
       } finally {
         setLoading(false);
       }
     }
   };

  const handleMouseLeave = () => {
     setShowTooltip(false);
   };

  const handleClick = (e) => {
    e.stopPropagation();
    
    // Pause main audio nếu đang phát để tránh chồng chéo
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }
    
    // Speak the word
    setIsSpeaking(true);
    speakText(pureWord, 'de-DE', 0.9, 1);
    
    // Reset speaking state after a delay
    setTimeout(() => setIsSpeaking(false), 1000);
    
    // Show full popup with smart positioning
    if (onWordClick) {
      const rect = e.target.getBoundingClientRect();
      
      // Smaller popup dimensions
      const popupWidth = 240;
      const popupHeight = 230;
      
      // Calculate position - prefer showing to the right side of word
      let top = rect.top;
      let left = rect.right + 15; // Show to right with gap
      
      // Check if popup would go off right edge - show on left instead
      if (left + popupWidth / 2 > window.innerWidth - 20) {
        left = rect.left - popupWidth / 2 - 15; // Show to left
        if (left - popupWidth / 2 < 20) {
          // If still doesn't fit, center horizontally
          left = rect.left + rect.width / 2;
        }
      }
      
      // Check vertical position - prefer showing beside, not covering word
      if (top + popupHeight > window.innerHeight - 20) {
        top = window.innerHeight - popupHeight - 20;
      }
      if (top < 20) {
        top = 20;
      }
      
      onWordClick(pureWord, {
        top: top,
        left: left
      }, translation || '');
    }
  };

  return (
    <span
      className={`hoverable-word ${isSpeaking ? 'speaking' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {cleanWord}
      {showTooltip && (
        <span
          className="word-tooltip"
          style={{
            bottom: '100%',
            top: 'auto',
            transform: 'translateX(-50%) translateY(-5px)'
          }}
        >
          {loading ? '⏳' : translation || '?'}
        </span>
      )}
    </span>
  );
};

export default HoverableWord;

import React, { useState } from 'react';
import { speakText, stopSpeech } from '../lib/textToSpeech';

const ClickableWord = ({ word, onWordClick }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const cleanWord = word.trim();
  
  if (!cleanWord) return null;
  
  const isPunctuation = /^[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]+$/.test(cleanWord);
  
  if (isPunctuation) {
    return <span className="word-punctuation">{cleanWord}</span>;
  }

  const handleClick = (e) => {
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    
    // Pause main audio nếu đang phát để tránh chồng chéo
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }
    
    // Speak the word
    const pureWord = cleanWord.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (pureWord) {
      setIsSpeaking(true);
      speakText(pureWord, 'de-DE', 0.9, 1);
      
      // Reset speaking state after a delay
      setTimeout(() => setIsSpeaking(false), 1000);
    }
    
    // Show vocabulary popup
    if (onWordClick) {
      onWordClick(cleanWord, {
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX + rect.width / 2 - 120 // Center popup on word
      });
    }
  };

  const handleRightClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Pause main audio nếu đang phát để tránh chồng chéo
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }
    
    // Right click → only speak, don't show popup
    const pureWord = cleanWord.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (pureWord) {
      setIsSpeaking(true);
      speakText(pureWord, 'de-DE', 0.9, 1);
      setTimeout(() => setIsSpeaking(false), 1000);
    }
  };

  return (
    <span 
      className={`clickable-word ${isSpeaking ? 'speaking' : ''}`}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      title="Click: lưu từ | Right-click: chỉ đọc"
    >
      {cleanWord}
      {isSpeaking && <span className="speaker-icon">🔊</span>}
    </span>
  );
};

export default ClickableWord;

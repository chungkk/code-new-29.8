import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import Transcript from '../../components/Transcript';

const DictationPage = () => {
  const router = useRouter();
  const { lessonId } = useRouter().query;
  
  // State management
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isTextHidden, setIsTextHidden] = useState(true);
  
  // Dictation specific states (from ckk)
  const [savedWords, setSavedWords] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedInput, setLastClickedInput] = useState(null);
  const [processedText, setProcessedText] = useState('');
  
  const audioRef = useRef(null);

  const lessonData = {
    bai_1: {
      id: 'bai_1',
      title: 'Patient Erde: Zustand kritisch',
      audio: '/audio/bai_1.mp3',
      json: '/text/bai_1.json',
      displayTitle: 'Lektion 1: Patient Erde'
    }
  };

  const lesson = lessonData[lessonId];

  // Load transcript
  useEffect(() => {
    if (lesson) {
      loadTranscript(lesson.json);
    } else {
      console.error('Lesson không tồn tại:', lessonId);
    }
  }, [lesson, lessonId]);

  // Audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (segmentPlayEndTime !== null && audio.currentTime >= segmentPlayEndTime - 0.02) {
        audio.pause();
        setSegmentPlayEndTime(null);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => {
      setIsPlaying(false);
      setSegmentPlayEndTime(null);
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [segmentPlayEndTime]);

  // Auto-update current sentence based on audio time
  useEffect(() => {
    if (!transcriptData.length) return;
    const currentIndex = transcriptData.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end
    );
    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);
      
      // Khi câu thay đổi và đang phát, update endTime của câu mới
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        const newSentence = transcriptData[currentIndex];
        setSegmentPlayEndTime(newSentence.end);
      }
    }
  }, [currentTime, transcriptData, currentSentenceIndex]);

  // Audio control functions
  const handleSeek = useCallback((direction) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration)) return;
    
    const seekTime = 3;
    const currentSegment = transcriptData[currentSentenceIndex];
    
    if (!currentSegment) return;
    
    // Calculate new position but constrain it within current segment
    let newTime = audio.currentTime;
    if (direction === 'backward') {
      newTime = audio.currentTime - seekTime;
    } else if (direction === 'forward') {
      newTime = audio.currentTime + seekTime;
    }
    
    // Constrain the new time to current segment boundaries
    newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
    audio.currentTime = newTime;
    
    // Update segment end time if playing
    if (!audio.paused) {
      setSegmentPlayEndTime(currentSegment.end);
    }
  }, [transcriptData, currentSentenceIndex]);

  const handlePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      // Kiểm tra nếu đang ở cuối câu (hoặc sau endTime), reset về đầu câu
      if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
        const currentSentence = transcriptData[currentSentenceIndex];
        
        // Nếu currentTime >= endTime của câu, reset về đầu câu
        if (audio.currentTime >= currentSentence.end - 0.05) {
          audio.currentTime = currentSentence.start;
        }
        
        audio.play();
        setSegmentPlayEndTime(currentSentence.end);
      } else {
        audio.play();
      }
    } else {
      audio.pause();
    }
  }, [transcriptData, currentSentenceIndex]);

  const goToPreviousSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      const newIndex = currentSentenceIndex - 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = item.start;
        if (audio.paused) {
          audio.play();
        }
        setSegmentPlayEndTime(item.end);
      }
    }
  }, [currentSentenceIndex, transcriptData]);

  const goToNextSentence = useCallback(() => {
    if (currentSentenceIndex < transcriptData.length - 1) {
      const newIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = item.start;
        if (audio.paused) {
          audio.play();
        }
        setSegmentPlayEndTime(item.end);
      }
    }
  }, [currentSentenceIndex, transcriptData]);

  // Global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((event) => {
    const audio = audioRef.current;
    const isAudioReady = audio && isFinite(audio.duration);
    
    // Check if focus is on an input field
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );

    switch (event.key) {
      case 'ArrowLeft':
        // Arrow left should always work for seek backward, even when input is focused
        if (isAudioReady) {
          event.preventDefault();
          handleSeek('backward');
        }
        break;
      case 'ArrowRight':
        // Arrow right should always work for seek forward, even when input is focused
        if (isAudioReady) {
          event.preventDefault();
          handleSeek('forward');
        }
        break;
      case ' ':
        // Space key should always work for play/pause, even when input is focused
        if (isAudioReady) {
          event.preventDefault();
          handlePlayPause();
        }
        break;
      case 'ArrowUp':
        if (!isInputFocused) {
          event.preventDefault();
          goToPreviousSentence();
        }
        break;
      case 'ArrowDown':
        if (!isInputFocused) {
          event.preventDefault();
          goToNextSentence();
        }
        break;
      default: break;
    }
  }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  // Load transcript from JSON
  const loadTranscript = async (jsonPath) => {
    try {
      const response = await fetch(jsonPath);
      if (!response.ok) throw new Error(`Không thể tải file JSON tại: ${jsonPath}`);
      const data = await response.json();
      setTranscriptData(data);
    } catch (error) {
      console.error('Lỗi tải transcript:', error);
    }
  };

  // Audio control functions
  const handleSentenceClick = (startTime, endTime) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = startTime;
    if (audio.paused) audio.play();
    setSegmentPlayEndTime(endTime);
  };



  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Character replacement for German umlauts
  const replaceCharacters = useCallback((input) => {
    const transformations = [
      { find: "ae", replace: "ä" },
      { find: "oe", replace: "ö" },
      { find: "ue", replace: "ü" },
      { find: "ss", replace: "ß" },
    ];

    for (const transformation of transformations) {
      if (input.value.endsWith(transformation.find)) {
        input.value = input.value.slice(0, -transformation.find.length) + transformation.replace;
        break;
      }
    }
  }, []);

  // Save word function
  const saveWord = useCallback((word) => {
    setSavedWords(prev => {
      if (!prev.includes(word)) {
        return [...prev, word];
      }
      return prev;
    });
  }, []);

  // Double-click hint functionality
  const handleInputClick = useCallback((input, correctWord) => {
    const currentTime = new Date().getTime();
    
    // Reset click count if different input or too much time passed
    if (lastClickedInput !== input || currentTime - lastClickTime > 1000) {
      setClickCount(0);
    }
    
    const newClickCount = clickCount + 1;
    setClickCount(newClickCount);
    setLastClickTime(currentTime);
    setLastClickedInput(input);
    
    // Only handle double-click, ignore single click
    if (newClickCount === 2) {
      // Only save word and show hint, don't auto-focus next input
      saveWord(correctWord);
      // Focus back to current input to keep user in place
      input.focus();
      setClickCount(0);
    }
    
    // For single click, just focus the input without any other action
    if (newClickCount === 1) {
      input.focus();
    }
  }, [clickCount, lastClickTime, lastClickedInput, saveWord]);

  const findNextInput = (currentInput) => {
    const allInputs = document.querySelectorAll(".word-input");
    const currentIndex = Array.from(allInputs).indexOf(currentInput);
    return allInputs[currentIndex + 1];
  };

  // Check word function
  const checkWord = useCallback((input, correctWord) => {
    const sanitizedCorrectWord = correctWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    
    replaceCharacters(input);
    
    if (input.value.toLowerCase() === sanitizedCorrectWord.toLowerCase()) {
      saveWord(correctWord);
      
      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function () {
        saveWord(correctWord);
      };
      
      input.parentNode.replaceWith(wordSpan);
      
      // Only auto-focus next input when word is actually completed by typing
      // Not when just clicking on input
      setTimeout(() => {
        const nextInput = findNextInput(input);
        if (nextInput) {
          nextInput.focus();
        }
      }, 100);
    } else {
      updateInputBackground(input, sanitizedCorrectWord);
    }
  }, [replaceCharacters, saveWord, updateInputBackground]);

  // Update input background
  const updateInputBackground = useCallback((input, correctWord) => {
    if (input.value.toLowerCase() === correctWord.substring(0, input.value.length).toLowerCase()) {
      input.style.backgroundColor = "lightgreen";
    } else {
      input.style.backgroundColor = "red";
    }
  }, []);

  // Mask text function - replace letters with asterisks
  const maskText = useCallback((text) => {
    return text.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
  }, []);

  // Handle input focus - hide placeholder
  const handleInputFocus = useCallback((input, correctWord) => {
    input.placeholder = '';
  }, []);

  // Handle input blur - show placeholder if empty
  const handleInputBlur = useCallback((input, correctWord) => {
    if (input.value === '') {
      input.placeholder = '*'.repeat(correctWord.length);
    }
  }, []);

  // Process text for dictation
  const processLevelUp = useCallback((sentence) => {
    const sentences = sentence.split(/\n+/);
    
    const processedSentences = sentences.map((sentence) => {
      const words = sentence.split(/\s+/);
      
      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          const nonAlphaNumeric = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");
          
          return `<span class="word-container">
            <input 
              type="text" 
              class="word-input" 
              oninput="window.checkWord(this, '${pureWord}')" 
              onclick="window.handleInputClick(this, '${pureWord}')" 
              onkeydown="window.disableArrowKeys(event)" 
              onfocus="window.handleInputFocus(this, '${pureWord}')"
              onblur="window.handleInputBlur(this, '${pureWord}')"
              maxlength="${pureWord.length}" 
              size="${pureWord.length}" 
              placeholder="${'*'.repeat(pureWord.length)}"
            />
            ${nonAlphaNumeric}
          </span>`;
        }
        return `<span>${word}</span>`;
      });
      
      return processedWords.join(" ");
    });
    
    return processedSentences.join(" ");
  }, []);

  // Initialize dictation for current sentence
  useEffect(() => {
    if (transcriptData.length > 0 && transcriptData[currentSentenceIndex]) {
      const text = transcriptData[currentSentenceIndex].text;
      const processed = processLevelUp(text);
      setProcessedText(processed);
      
      if (typeof window !== 'undefined') {
        window.checkWord = checkWord;
        window.handleInputClick = handleInputClick;
        window.handleInputFocus = handleInputFocus;
        window.handleInputBlur = handleInputBlur;
        window.disableArrowKeys = (e) => {
          // Prevent all arrow keys and space from being typed in input fields
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
          }
        };
      }
    }
  }, [currentSentenceIndex, transcriptData, processLevelUp, checkWord, handleInputClick, handleInputFocus, handleInputBlur]);

  const handleBackToHome = () => router.push('/');

  if (!lesson) {
    return (
      <div className="main-container">
        <h1>Lektion nicht gefunden</h1>
        <button onClick={handleBackToHome}>Zurück zur Startseite</button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{lesson.displayTitle} - Diktat</title>
        <meta name="description" content={`Diktat Übung: ${lesson.title}`} />
      </Head>
      
      <div className="shadowing-page">
        <audio ref={audioRef} controls style={{ display: 'none' }}>
          <source src={lesson.audio} type="audio/mp3" />
          Trình duyệt của bạn không hỗ trợ thẻ audio.
        </audio>

        <AudioControls
          lessonTitle={`${lesson.displayTitle} - Diktat`}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          onSeek={handleSeek}
          onPlayPause={handlePlayPause}
          formatTime={formatTime}
        />

        <div className="shadowing-app-container">
          <div className="shadowing-layout">
            {/* LEFT SIDE: Diktat */}
            <div className="current-sentence-section">
              <div className="sentence-list-container">
                <h3>Diktat</h3>
                
                {/* Current Sentence Dictation Input */}
                {transcriptData[currentSentenceIndex] && (
                  <div className="current-sentence-dictation">
                    <div className="sentence-counter-container">
                      <button 
                        className="nav-btn prev-btn"
                        onClick={goToPreviousSentence}
                        disabled={currentSentenceIndex === 0}
                        title="Vorheriger Satz"
                      >
                        ‹
                      </button>
                      
                      <div className="sentence-counter">
                        Satz {currentSentenceIndex + 1} / {transcriptData.length}
                      </div>
                      
                      <button 
                        className="nav-btn next-btn"
                        onClick={goToNextSentence}
                        disabled={currentSentenceIndex === transcriptData.length - 1}
                        title="Nächster Satz"
                      >
                        ›
                      </button>
                    </div>
                    
                    <div className="dictation-input-area">
                      <div 
                        className="dictation-text"
                        dangerouslySetInnerHTML={{ __html: processedText }}
                      />
                    </div>
                    
                    <div className="sentence-time">
                      {formatTime(transcriptData[currentSentenceIndex].start)} - {formatTime(transcriptData[currentSentenceIndex].end)}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* RIGHT SIDE: Satzliste */}
            <div className="sentence-list-section">
              <div className="sentence-list-container">
                <h3>Satzliste</h3>
                
                {/* Sentence List */}
                <div className="sentence-list">
                  {transcriptData.map((segment, index) => (
                    <div
                      key={index}
                      className={`sentence-item ${
                        currentSentenceIndex === index ? 'active' : ''
                      } ${
                        currentTime >= segment.start && currentTime < segment.end ? 'playing' : ''
                      }`}
                      onClick={() => handleSentenceClick(segment.start, segment.end)}
                    >
                      <div className="sentence-number">
                        {index + 1}
                      </div>
                      <div className="sentence-content">
                        <div className="sentence-text">
                          {maskText(segment.text.trim())}
                        </div>
                        <div className="sentence-time">
                          {formatTime(segment.start)} - {formatTime(segment.end)}
                        </div>
                      </div>
                      <div className="sentence-actions">
                        <button 
                          className="action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSentenceClick(segment.start, segment.end);
                          }}
                          title="Diesen Satz abspielen"
                        >
                          ▶
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <FooterControls
          onSeek={handleSeek}
          onPlayPause={handlePlayPause}
          isPlaying={isPlaying}
        />
      </div>
    </>
  );
};

export default DictationPage;

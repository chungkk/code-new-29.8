import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import Transcript from '../../components/Transcript';
import SentenceListItem from '../../components/SentenceListItem';
import VocabularyPopup from '../../components/VocabularyPopup';
import ModeSelectionPopup from '../../components/ModeSelectionPopup';
import { speakText } from '../../lib/textToSpeech';

const SelfLessonPageContent = () => {
  const router = useRouter();
  const { lessonId } = useRouter().query;
  
  // State management
  const [transcriptData, setTranscriptData] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [segmentEndTimeLocked, setSegmentEndTimeLocked] = useState(false);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [isManualNavigation, setIsManualNavigation] = useState(false);
    const [pausedPositions, setPausedPositions] = useState({}); // { sentenceIndex: pausedTime }
  const [isTextHidden, setIsTextHidden] = useState(true);

  const toggleTextVisibility = () => setIsTextHidden(!isTextHidden);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModePopup, setShowModePopup] = useState(false);
  
  // Dictation specific states (from ckk)
  const [savedWords, setSavedWords] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedInput, setLastClickedInput] = useState(null);
  const [processedText, setProcessedText] = useState('');
  
  // Track last 's' keystroke time for timeout logic
  const lastSKeystrokeTime = useRef({});
  
  // Progress tracking
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({}); // { sentenceIndex: { wordIndex: correctWord } }
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Vocabulary popup states
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);

  // Expose audioRef globally để components có thể pause khi phát từ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.mainAudioRef = audioRef;
      window.mainYoutubePlayerRef = youtubePlayerRef;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.mainAudioRef = null;
        window.mainYoutubePlayerRef = null;
      }
    };
  }, []);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Initialize YouTube player
  useEffect(() => {
    if (!lesson || !lesson.youtubeUrl) {
      setIsYouTube(false);
      return;
    }

    setIsYouTube(true);
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) {
      console.log('No valid video ID found');
      return;
    }

    console.log('Initializing YouTube player for video:', videoId);

    const initPlayer = () => {
      console.log('initPlayer called, checking YT API...', window.YT);

      if (!window.YT || !window.YT.Player) {
        console.log('YT API not ready yet');
        return;
      }

      // Check if element exists, retry if not
      const element = document.getElementById('youtube-player');
      if (!element) {
        console.log('youtube-player element not found, retrying in 100ms...');
        setTimeout(initPlayer, 100);
        return;
      }

      // Avoid duplicate initialization
      if (youtubePlayerRef.current) {
        console.log('Player already initialized');
        return;
      }

      console.log('Creating YouTube player...');
      try {
        youtubePlayerRef.current = new window.YT.Player('youtube-player', {
          height: '0',
          width: '0',
          videoId: videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
          },
          events: {
            onReady: (event) => {
              console.log('YouTube player ready!');
              setDuration(event.target.getDuration());
              const container = document.getElementById('youtube-player');
              if (container) {
                const rect = container.getBoundingClientRect();
                event.target.setSize(rect.width * 1.2, rect.height * 1.2);
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              }
            }
          }
        });
      } catch (error) {
        console.error('Error initializing YouTube player:', error);
      }
    };

    // Check if YouTube API is already loaded
    if (window.YT && window.YT.Player) {
      console.log('YT API already loaded, initializing player...');
      // Wait a bit for DOM to be ready
      setTimeout(initPlayer, 100);
    } else {
      console.log('Loading YouTube API...');
      // Load YouTube iframe API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      // Set callback for when API is ready
      window.onYouTubeIframeAPIReady = () => {
        console.log('YT API ready callback fired');
        setTimeout(initPlayer, 100);
      };
    }

    return () => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        console.log('Destroying YouTube player');
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [lesson]);

  // Fetch lesson data from localStorage for self-created lessons
  useEffect(() => {
    const loadLesson = async () => {
      if (!lessonId) return;

      try {
        setLoading(true);
        // First try localStorage for self-created lessons
        const storedLesson = localStorage.getItem(`self-lesson-${lessonId}`);
        if (storedLesson) {
          const data = JSON.parse(storedLesson);
          setLesson(data);
          console.log('Self-lesson loaded from localStorage:', data);

          if (data.json) {
            loadTranscript(data.json);
          }
        } else {
          // Fallback to API for regular lessons
          const res = await fetch(`/api/lessons/${lessonId}`);

          if (!res.ok) {
            throw new Error('Lesson not found');
          }

          const data = await res.json();
          setLesson(data);
          console.log('Lesson loaded from API:', data);

          if (data.json) {
            loadTranscript(data.json);
          }
        }
      } catch (error) {
        console.error('Error loading lesson:', error);
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };

    loadLesson();
  }, [lessonId]);

  // Load progress from database (only for regular lessons)
  useEffect(() => {
    const loadProgress = async () => {
      if (!lessonId) {
        setProgressLoaded(true);
        return;
      }

      // Skip loading progress for self-created lessons
      if (localStorage.getItem(`self-lesson-${lessonId}`)) {
        setProgressLoaded(true);
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setProgressLoaded(true);
          return;
        }

        const res = await fetch(`/api/progress?lessonId=${lessonId}&mode=dictation`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          console.log('Raw API response:', data);

          if (data && Object.keys(data).length > 0) {
            const loadedSentences = data.completedSentences || [];
            const loadedWords = data.completedWords || {};

            // Normalize keys to numbers
            const normalizedWords = {};
            Object.keys(loadedWords).forEach(sentenceIdx => {
              const numIdx = parseInt(sentenceIdx);
              normalizedWords[numIdx] = {};
              Object.keys(loadedWords[sentenceIdx]).forEach(wordIdx => {
                const numWordIdx = parseInt(wordIdx);
                normalizedWords[numIdx][numWordIdx] = loadedWords[sentenceIdx][wordIdx];
              });
            });

            setCompletedSentences(loadedSentences);
            setCompletedWords(normalizedWords);
            console.log('Loaded and normalized progress:', {
              completedSentences: loadedSentences,
              completedWords: normalizedWords
            });
          }
        }
      } catch (error) {
        console.error('Error loading progress:', error);
      } finally {
        setProgressLoaded(true);
      }
    };

    loadProgress();
  }, [lessonId]);



  // Smooth time update with requestAnimationFrame
  useEffect(() => {
    let animationFrameId = null;

    const updateTime = () => {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          const currentTime = player.getCurrentTime();
          setCurrentTime(currentTime);

          if (segmentPlayEndTime !== null && currentTime >= segmentPlayEndTime - 0.02) {
            player.pauseVideo();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);

          if (segmentPlayEndTime !== null && audio.currentTime >= segmentPlayEndTime - 0.02) {
            audio.pause();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      }

      if (isPlaying) {
        animationFrameId = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, segmentPlayEndTime, isYouTube]);

  // Audio event listeners
  useEffect(() => {
    if (isYouTube) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      setSegmentPlayEndTime(null);
      setSegmentEndTimeLocked(false);
    };

    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Initial time update
    setCurrentTime(audio.currentTime);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isYouTube]);

  // Auto-update current sentence based on audio time
  useEffect(() => {
    if (!transcriptData.length || isManualNavigation) return;
    const currentIndex = transcriptData.findIndex(
      (item) => currentTime >= item.start && currentTime < item.end
    );
    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);

      // Khi câu thay đổi và đang phát, update endTime của câu mới (chỉ khi không lock)
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING && !segmentEndTimeLocked) {
          const newSentence = transcriptData[currentIndex];
          setSegmentPlayEndTime(newSentence.end);
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused && !segmentEndTimeLocked) {
          const newSentence = transcriptData[currentIndex];
          setSegmentPlayEndTime(newSentence.end);
        }
      }
    }
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked, isYouTube, isManualNavigation]);

  // Audio control functions
  const handleSeek = useCallback((direction) => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player || !player.getCurrentTime) return;

      const seekTime = 3;
      const currentSegment = transcriptData[currentSentenceIndex];

      if (!currentSegment) return;

      let newTime = player.getCurrentTime();
      if (direction === 'backward') {
        newTime = player.getCurrentTime() - seekTime;
      } else if (direction === 'forward') {
        newTime = player.getCurrentTime() + seekTime;
      }

       // Constrain the new time to current segment boundaries
       newTime = Math.max(currentSegment.start, Math.min(currentSegment.end - 0.1, newTime));
       if (player.seekTo) player.seekTo(newTime);

      // Update segment end time if playing
      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        setSegmentPlayEndTime(currentSegment.end);
      }
    } else {
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
     }
   }, [transcriptData, currentSentenceIndex, isYouTube]);

  const handlePlayPause = useCallback(() => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        player.pauseVideo();
        setIsPlaying(false);
      } else {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];

           if (player.getCurrentTime && player.getCurrentTime() >= currentSentence.end - 0.05) {
             if (player.seekTo) player.seekTo(currentSentence.start);
           }

          player.playVideo();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục
        } else {
          player.playVideo();
          setIsPlaying(true);
          setSegmentEndTimeLocked(false);
        }
      }
    } else {
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
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục
        } else {
          audio.play();
          setIsPlaying(true);
          setSegmentEndTimeLocked(false);
        }
       } else {
         audio.pause();
         setIsPlaying(false);
       }
     }
   }, [transcriptData, currentSentenceIndex, isYouTube]);

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
        setSegmentEndTimeLocked(true);
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
        setSegmentEndTimeLocked(true);
      }
    }
  }, [currentSentenceIndex, transcriptData]);

  // Global keyboard shortcuts
  const handleGlobalKeyDown = useCallback((event) => {
    const isMediaReady = isYouTube ? (youtubePlayerRef.current && duration > 0) : (audioRef.current && isFinite(audioRef.current.duration));

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
        if (isMediaReady) {
          event.preventDefault();
          handleSeek('backward');
        }
        break;
      case 'ArrowRight':
        // Arrow right should always work for seek forward, even when input is focused
        if (isMediaReady) {
          event.preventDefault();
          handleSeek('forward');
        }
        break;
      case ' ':
        // Space key should always work for play/pause, even when input is focused
        if (isMediaReady) {
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
   }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence, isYouTube, duration]);

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
  const handleSentenceClick = useCallback((startTime, endTime) => {
    // Find the clicked sentence index
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex === -1) return;

    const isCurrentlyPlayingThisSentence = isPlaying && currentTime >= startTime && currentTime < endTime;

    if (isCurrentlyPlayingThisSentence) {
      // Pause the current sentence
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player) player.pauseVideo();
      } else {
        const audio = audioRef.current;
        if (audio) audio.pause();
      }
      setIsPlaying(false);
      // Save paused position
      setPausedPositions(prev => ({ ...prev, [clickedIndex]: currentTime }));
    } else {
      // Play or resume the sentence
      let seekTime = startTime;
      if (pausedPositions[clickedIndex] && pausedPositions[clickedIndex] >= startTime && pausedPositions[clickedIndex] < endTime) {
        seekTime = pausedPositions[clickedIndex];
      }

       if (isYouTube) {
         const player = youtubePlayerRef.current;
         if (!player) return;
         if (player.seekTo) player.seekTo(seekTime);
         player.playVideo();
      } else {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = seekTime;
        audio.play();
      }
      setIsPlaying(true);
      setSegmentPlayEndTime(endTime);
      setSegmentEndTimeLocked(true);
      // Clear paused position when starting play
      setPausedPositions(prev => {
        const newPositions = { ...prev };
        delete newPositions[clickedIndex];
        return newPositions;
      });
    }

    // Update currentSentenceIndex to match the clicked sentence
    setCurrentSentenceIndex(clickedIndex);
    setIsManualNavigation(true);
    // Reset flag after time update
    setTimeout(() => setIsManualNavigation(false), 200);
  }, [transcriptData, isYouTube, isPlaying, currentTime, pausedPositions]);

   // Handle progress bar click
   const handleProgressClick = useCallback((e) => {
     const rect = e.target.getBoundingClientRect();
     const clickX = e.clientX - rect.left;
     const percentage = clickX / rect.width;
     const newTime = percentage * duration;
     if (isYouTube) {
       const player = youtubePlayerRef.current;
       if (player && player.seekTo) {
         player.seekTo(newTime);
       }
     } else {
       if (audioRef.current) {
         audioRef.current.currentTime = newTime;
       }
     }
   }, [duration, isYouTube]);

   const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Character replacement for German umlauts
  const replaceCharacters = useCallback((input) => {
    const currentTime = Date.now();
    const inputId = input.getAttribute('data-word-id') || input;
    
    // Special handling for "ss" with timeout
    if (input.value.endsWith("ss")) {
      const lastSTime = lastSKeystrokeTime.current[inputId];
      const timeDiff = lastSTime ? currentTime - lastSTime : Infinity;
      
      // If less than 3 seconds, convert to ß
      if (timeDiff < 3000) {
        input.value = input.value.slice(0, -2) + "ß";
        delete lastSKeystrokeTime.current[inputId];
        return;
      }
      // If more than 3 seconds, keep "ss"
      else {
        delete lastSKeystrokeTime.current[inputId];
        return;
      }
    }
    
    // Track when user types 's'
    if (input.value.endsWith("s")) {
      lastSKeystrokeTime.current[inputId] = currentTime;
    }
    
    const transformations = [
      { find: "ae", replace: "ä" },
      { find: "oe", replace: "ö" },
      { find: "ue", replace: "ü" },
    ];

    for (const transformation of transformations) {
      if (input.value.endsWith(transformation.find)) {
        input.value = input.value.slice(0, -transformation.find.length) + transformation.replace;
        break;
      }
    }
  }, []);

  // Save progress to database (only for regular lessons)
  const saveProgress = useCallback(async (updatedCompletedSentences, updatedCompletedWords) => {
    if (!lessonId || !lesson) return;

    // Skip saving progress for self-created lessons
    if (localStorage.getItem(`self-lesson-${lessonId}`)) {
      console.log('Skipping progress save for self-created lesson');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('No token found, cannot save progress');
        return;
      }

      const totalWords = transcriptData.reduce((sum, sentence) => {
        const words = sentence.text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1);
        return sum + words.length;
      }, 0);

      // Count correct words from completedWords object
      let correctWordsCount = 0;
      Object.keys(updatedCompletedWords).forEach(sentenceIdx => {
        const sentenceWords = updatedCompletedWords[sentenceIdx];
        correctWordsCount += Object.keys(sentenceWords).length;
      });

      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lessonId,
          mode: 'dictation',
          progress: {
            completedSentences: updatedCompletedSentences,
            completedWords: updatedCompletedWords,
            currentSentenceIndex,
            totalSentences: transcriptData.length,
            correctWords: correctWordsCount,
            totalWords
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      const result = await response.json();

      console.log('✅ Progress saved:', {
        completedSentences: updatedCompletedSentences,
        completedWords: updatedCompletedWords,
        correctWordsCount,
        totalWords,
        completionPercent: result.completionPercent
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  }, [lessonId, lesson, transcriptData, currentSentenceIndex]);

  // Save word function
  const saveWord = useCallback((word) => {
    setSavedWords(prev => {
      if (!prev.includes(word)) {
        return [...prev, word];
      }
      return prev;
    });
  }, []);

  // Handle word click for popup (for completed words)
  const handleWordClickForPopup = useCallback((word, event) => {
    // Pause main audio nếu đang phát
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }

    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;

    // Speak the word
    speakText(cleanedWord);

    // Calculate popup position
    const rect = event.target.getBoundingClientRect();
    const popupWidth = 240;
    const popupHeight = 230;

    let top = rect.top;
    let left = rect.right + 15;

    // Check if popup would go off right edge
    if (left + popupWidth / 2 > window.innerWidth - 20) {
      left = rect.left - popupWidth / 2 - 15;
      if (left - popupWidth / 2 < 20) {
        left = rect.left + rect.width / 2;
      }
    }

    // Check vertical position
    if (top + popupHeight > window.innerHeight - 20) {
      top = window.innerHeight - popupHeight - 20;
    }
    if (top < 20) {
      top = 20;
    }

    setSelectedWord(cleanedWord);
    setPopupPosition({ top, left });
    setShowVocabPopup(true);
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

  // Save individual word completion
  const saveWordCompletion = useCallback((wordIndex, correctWord) => {
    setCompletedWords(prevWords => {
      const updatedWords = { ...prevWords };
      
      if (!updatedWords[currentSentenceIndex]) {
        updatedWords[currentSentenceIndex] = {};
      }
      
      updatedWords[currentSentenceIndex][wordIndex] = correctWord;
      
      console.log(`Word saved: sentence ${currentSentenceIndex}, word ${wordIndex}: ${correctWord}`, updatedWords);
      
      // Save to database with updated data
      saveProgress(completedSentences, updatedWords);
      
      return updatedWords;
    });
  }, [currentSentenceIndex, completedSentences, saveProgress]);

  // Check if current sentence is completed
  const checkSentenceCompletion = useCallback(() => {
    setTimeout(() => {
      const allInputs = document.querySelectorAll(".word-input");
      const remainingInputs = Array.from(allInputs);
      
      if (remainingInputs.length === 0 && !completedSentences.includes(currentSentenceIndex)) {
        // All words are correct, mark sentence as completed
        const updatedCompleted = [...completedSentences, currentSentenceIndex];
        setCompletedSentences(updatedCompleted);
        saveProgress(updatedCompleted, completedWords);
        console.log(`Sentence ${currentSentenceIndex} completed!`);
      }
    }, 200);
  }, [completedSentences, currentSentenceIndex, completedWords, saveProgress]);

  // Update input background
  const updateInputBackground = useCallback((input, correctWord) => {
    if (input.value.toLowerCase() === correctWord.substring(0, input.value.length).toLowerCase()) {
      input.style.backgroundColor = "lightgreen";
    } else {
      input.style.backgroundColor = "red";
    }
  }, []);

  // Check word function
  const checkWord = useCallback((input, correctWord, wordIndex) => {
    const sanitizedCorrectWord = correctWord.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
    
    replaceCharacters(input);
    
    if (input.value.toLowerCase() === sanitizedCorrectWord.toLowerCase()) {
      saveWord(correctWord);
      
      // Save this word completion to database
      saveWordCompletion(wordIndex, correctWord);
      
      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function () {
        saveWord(correctWord);
      };
      
      input.parentNode.replaceWith(wordSpan);
      
      // Check if sentence is now completed
      checkSentenceCompletion();
      
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
  }, [replaceCharacters, saveWord, updateInputBackground, checkSentenceCompletion, saveWordCompletion]);

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

  // Show hint for a word
  const showHint = useCallback((button, correctWord, wordIndex) => {
    const container = button.parentElement;
    const input = container.querySelector('.word-input');
    
    if (input) {
      // Save this word completion to database
      saveWordCompletion(wordIndex, correctWord);
      
      // Replace input with correct word
      const wordSpan = document.createElement("span");
      wordSpan.className = "correct-word hint-revealed";
      wordSpan.innerText = correctWord;
      wordSpan.onclick = function () {
        if (window.saveWord) window.saveWord(correctWord);
      };
      
      // Find the punctuation span
      const punctuation = container.querySelector('.word-punctuation');
      
      // Clear container and rebuild
      container.innerHTML = '';
      container.appendChild(wordSpan);
      if (punctuation) {
        container.appendChild(punctuation);
      }
      
      // Save the word
      saveWord(correctWord);
      
      // Check if sentence is completed
      checkSentenceCompletion();
    }
  }, [saveWord, checkSentenceCompletion, saveWordCompletion]);

  // Process text for dictation
  const processLevelUp = useCallback((sentence, isCompleted, sentenceWordsCompleted, isTextHidden) => {
    const sentences = sentence.split(/\n+/);
    
    const processedSentences = sentences.map((sentence) => {
      const words = sentence.split(/\s+/);
      
      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          const nonAlphaNumeric = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");
          
          // Check if this specific word is completed
          const isWordCompleted = sentenceWordsCompleted && sentenceWordsCompleted[wordIndex];
          
          if (isWordCompleted) {
            console.log(`Word ${wordIndex} (${pureWord}) is completed:`, sentenceWordsCompleted[wordIndex]);
          }
          
          // If entire sentence is completed, show all words
          if (isCompleted) {
            return `<span class="word-container completed">
              <span class="correct-word completed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', event)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }
          
          // If this specific word is completed, show it
          if (isWordCompleted) {
            return `<span class="word-container">
              <span class="correct-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', event)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }
          
           // Otherwise show input with hint button or full text if not hidden
           if (!isTextHidden) {
             return `<span class="word-container">
               <span class="correct-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', event)">${pureWord}</span>
               <span class="word-punctuation">${nonAlphaNumeric}</span>
             </span>`;
           }
           return `<span class="word-container">
             <button
               class="hint-btn"
               onclick="window.showHint(this, '${pureWord}', ${wordIndex})"
               title="Hinweise anzeigen"
               type="button"
             >
               👁️
             </button>
             <input
               type="text"
               class="word-input"
               data-word-id="word-${wordIndex}"
               oninput="window.checkWord(this, '${pureWord}', ${wordIndex})"
               onclick="window.handleInputClick(this, '${pureWord}')"
               onkeydown="window.disableArrowKeys(event)"
               onfocus="window.handleInputFocus(this, '${pureWord}')"
               onblur="window.handleInputBlur(this, '${pureWord}')"
               maxlength="${pureWord.length}"
               size="${pureWord.length}"
               placeholder="${'*'.repeat(pureWord.length)}"
             />
             <span class="word-punctuation">${nonAlphaNumeric}</span>
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
    if (transcriptData.length > 0 && transcriptData[currentSentenceIndex] && progressLoaded) {
      const text = transcriptData[currentSentenceIndex].text;
      const isCompleted = completedSentences.includes(currentSentenceIndex);
      const sentenceWordsCompleted = completedWords[currentSentenceIndex] || {};
      
      console.log('Rendering sentence', currentSentenceIndex, ':', {
        isCompleted,
        sentenceWordsCompleted,
        allCompletedWords: completedWords
      });
      
       const processed = processLevelUp(text, isCompleted, sentenceWordsCompleted, isTextHidden);
      setProcessedText(processed);
      
      if (typeof window !== 'undefined') {
        window.checkWord = checkWord;
        window.handleInputClick = handleInputClick;
        window.handleInputFocus = handleInputFocus;
        window.handleInputBlur = handleInputBlur;
        window.saveWord = saveWord;
        window.showHint = showHint;
        window.handleWordClickForPopup = handleWordClickForPopup;
        window.disableArrowKeys = (e) => {
          // Prevent all arrow keys and space from being typed in input fields
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
          }
        };
      }
    }
   }, [currentSentenceIndex, transcriptData, processLevelUp, checkWord, handleInputClick, handleInputFocus, handleInputBlur, saveWord, showHint, handleWordClickForPopup, completedSentences, completedWords, progressLoaded, isTextHidden]);

  const handleBackToHome = () => router.push('/');

  const handleModeSelect = (lesson, mode) => {
    router.push(`/${mode}/${lesson.id}`);
  };

  const handleShowModePopup = () => {
    setShowModePopup(true);
  };

  const handleCloseModePopup = () => {
    setShowModePopup(false);
  };

  if (loading) {
    return (
      <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>⏳ Lektion lädt...</h2>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="main-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <h1>❌ Lektion nicht gefunden</h1>
           <p style={{ marginTop: '20px' }}>Lektion mit ID <strong>{lessonId}</strong> existiert nicht.</p>
          <button 
            onClick={handleBackToHome}
            style={{ 
              marginTop: '30px', 
              padding: '12px 24px', 
              fontSize: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            ← Zur Startseite
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{lesson.displayTitle} - Self-created Lesson</title>
        <meta name="description" content={`Selbst erstellte Lektion: ${lesson.title}`} />
      </Head>
      
      <div className="shadowing-page">
        {!isYouTube && (
          <audio ref={audioRef} controls style={{ display: 'none' }}>
            <source src={lesson.audio} type="audio/mp3" />
            Trình duyệt của bạn không hỗ trợ thẻ audio.
          </audio>
        )}
        




           <div className="shadowing-app-container" style={{ marginTop: '100px' }}>
           <div className="shadowing-layout">
             {/* LEFT SIDE: Medien */}
             <div className="medien-section">
               <div className="medien-container">
                 <div className="media-player">
                      <div className="media-artwork">
                        <div className="artwork-inner" style={{ position: 'relative', overflow: 'hidden' }}>
                          {isYouTube ? (
                            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                              <div id="youtube-player" style={{ width: '100%', height: '100%', pointerEvents: 'none' }}></div>
                              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'pointer' }} onClick={() => transcriptData[currentSentenceIndex] && handleSentenceClick(transcriptData[currentSentenceIndex].start, transcriptData[currentSentenceIndex].end)}></div>
                            </div>
                          ) : (
                           <svg viewBox="0 0 24 24" fill="currentColor">
                             <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                           </svg>
                         )}
                       </div>
                     </div>
                    
                    <div className="media-info">
                      <div className="media-title">Lektion {lessonId}</div>
                      <div className="media-artist">Deutschunterricht</div>
                    </div>

                    <div className="media-progress-container">
                      <div className="media-progress" onClick={handleProgressClick}>
                        <div className="media-progress-fill" style={{ transform: `scaleX(${duration > 0 ? currentTime / duration : 0})` }} />
                      </div>
                     <div className="media-time">
                       <span>{formatTime(currentTime)}</span>
                       <span>{formatTime(duration)}</span>
                     </div>
                   </div>

                    <div className="media-controls">
                      <button className="media-btn media-btn-small" onClick={goToPreviousSentence} title="Vorheriger Satz">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                        </svg>
                      </button>
                      <button className="media-btn media-btn-large" onClick={handlePlayPause} title={isPlaying ? 'Pause' : 'Abspielen'}>
                        {isPlaying ? (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z"/>
                          </svg>
                        )}
                      </button>
                      <button className="media-btn media-btn-small" onClick={goToNextSentence} title="Nächster Satz">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                        </svg>
                      </button>
                    </div>
                 </div>
               </div>
             </div>

              {/* MIDDLE: Aktueller Satz */}
              <div className="current-sentence-section" style={{ flex: '1.5' }}>
               <div className="current-sentence-container">
                 <h3>Aktueller Satz</h3>
                
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
                       style={{ lineHeight: '1.6', wordWrap: 'break-word' }}
                       dangerouslySetInnerHTML={{ __html: processedText }}
                     />
                    </div>
                    
                    <div 
                      className={`sentence-time-container ${isPlaying ? 'playing' : ''}`}
                      onClick={() => handleSentenceClick(
                        transcriptData[currentSentenceIndex].start, 
                        transcriptData[currentSentenceIndex].end
                      )}
                       title="Klicken, um diesen Satz abzuspielen oder zu pausieren"
                    >
                       <div className="time-progress-bar">
                         <div
                           className="time-progress-fill"
                           style={{
                             transform: `scaleX(${isPlaying && transcriptData[currentSentenceIndex]
                               ? (currentTime - transcriptData[currentSentenceIndex].start) /
                                 (transcriptData[currentSentenceIndex].end - transcriptData[currentSentenceIndex].start)
                               : 0})`
                           }}
                         />
                       </div>
                      <div className="time-display">
                        <span className="time-icon">{isPlaying ? '▶' : '⏸'}</span>
                        <span className="time-current">{formatTime(currentTime)}</span>
                        <span className="time-separator">/</span>
                        <span className="time-total">
                          {formatTime(transcriptData[currentSentenceIndex].start)} - {formatTime(transcriptData[currentSentenceIndex].end)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
              {/* RIGHT SIDE: Satzliste */}
               <div className="sentence-list-section" style={{ flex: '1.2' }}>
                <div className="sentence-list-container">
                  <h3>Satzliste</h3>
                
                 {/* Sentence List */}
                 <div className="sentence-list" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                   {transcriptData.map((segment, index) => (
                     <SentenceListItem
                       key={index}
                       segment={segment}
                       index={index}
                       currentSentenceIndex={currentSentenceIndex}
                       currentTime={currentTime}
                       isCompleted={completedSentences.includes(index)}
                       lessonId={lessonId}
                       onSentenceClick={handleSentenceClick}
                       formatTime={formatTime}
                       maskText={maskText}
                       isTextHidden={isTextHidden}
                     />
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

        {showVocabPopup && (
          <VocabularyPopup
            word={selectedWord}
            context={transcriptData[currentSentenceIndex]?.text || ''}
            lessonId={lessonId}
            onClose={() => setShowVocabPopup(false)}
            position={popupPosition}
            preTranslation=""
          />
        )}

         {showModePopup && lesson && (
           <ModeSelectionPopup
             lesson={lesson}
             onClose={handleCloseModePopup}
             onSelectMode={handleModeSelect}
           />
         )}

         {/* Fixed Modus Toggle Button */}
         <button
           onClick={toggleTextVisibility}
           style={{
             position: 'fixed',
             top: '120px',
             right: '20px',
             padding: '12px 20px',
             background: isTextHidden
               ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
               : 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
             color: 'white',
             border: 'none',
             borderRadius: '25px',
             cursor: 'pointer',
             fontSize: '14px',
             fontWeight: 'bold',
             boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
             zIndex: 1000,
             transition: 'all 0.3s ease',
             display: 'flex',
             alignItems: 'center',
             gap: '8px'
           }}
           onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
           onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
           title={isTextHidden ? 'Text anzeigen' : 'Text verbergen'}
         >
           <span>👁️</span>
           <span>{isTextHidden ? 'Versteckt' : 'Sichtbar'}</span>
         </button>
       </>
     );
  };

const SelfLessonPage = () => {
  return <SelfLessonPageContent />;
};

export default SelfLessonPage;

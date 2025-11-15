import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../../components/SEO';
import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import SentenceListItem from '../../components/SentenceListItem';
import VocabularyPopup from '../../components/VocabularyPopup';
import { speakText } from '../../lib/textToSpeech';
import { toast } from 'react-toastify';
import styles from '../../styles/dictationPage.module.css';


const DictationPageContent = () => {
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
  const [pausedPositions, setPausedPositions] = useState({}); // { sentenceIndex: pausedTime }
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekTimeout, setUserSeekTimeout] = useState(null);
  const [isTextHidden, setIsTextHidden] = useState(true);
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dictation specific states (from ckk)
  const [savedWords, setSavedWords] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedInput, setLastClickedInput] = useState(null);
  const [processedText, setProcessedText] = useState('');
  
  // Track last 's' keystroke time for timeout logic
  const lastSKeystrokeTime = useRef({});

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);

  // Progress tracking
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({}); // { sentenceIndex: { wordIndex: correctWord } }
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Vocabulary popup states
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);

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

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    // Check on mount
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Load YouTube iframe API script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setIsYouTubeAPIReady(true);
      return;
    }

    // Check if script is already being loaded
    if (window.YT) {
      // API is loading, wait for it
      const checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          setIsYouTubeAPIReady(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }

    // Load the YouTube iframe API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Set up the callback for when API is ready
    window.onYouTubeIframeAPIReady = () => {
      setIsYouTubeAPIReady(true);
    };
  }, []);

  // Initialize YouTube player when API is ready and lesson is loaded
  useEffect(() => {
    if (!lesson || !lesson.youtubeUrl) {
      setIsYouTube(false);
      return;
    }

    setIsYouTube(true);

    if (!isYouTubeAPIReady) {
      return; // Wait for API to be ready
    }

    const playerOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    // Destroy existing player if any
    if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
      youtubePlayerRef.current.destroy();
      youtubePlayerRef.current = null;
    }

    // Create the player
    youtubePlayerRef.current = new window.YT.Player('youtube-player', {
      height: '0',
      width: '0',
      videoId: videoId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        origin: playerOrigin,
        cc_load_policy: 0,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        playsinline: 1,
        enablejsapi: 1,
        widget_referrer: playerOrigin,
        autohide: 1,
      },
      events: {
        onReady: (event) => {
          setDuration(event.target.getDuration());
          const container = document.getElementById('youtube-player');
          if (container) {
            const rect = container.getBoundingClientRect();
            // Adjust size based on screen width for mobile
            const isMobile = window.innerWidth <= 768;
            const scaleFactor = isMobile ? 1.0 : 1.2;
            event.target.setSize(rect.width * scaleFactor, rect.height * scaleFactor);
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

    return () => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [lesson, isYouTubeAPIReady]);

  // Fetch lesson data from API
  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) return;
      
      try {
        setLoading(true);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const res = await fetch(`/api/lessons/${lessonId}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          throw new Error('Lesson not found');
        }
        
        const data = await res.json();
        setLesson(data);
        console.log('Lesson loaded:', data);
        
        if (data.json) {
          loadTranscript(data.json);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('Request timeout loading lesson');
        } else {
          console.error('Error loading lesson:', error);
        }
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLesson();
  }, [lessonId]);

  // Load progress from database
  useEffect(() => {
    const loadProgress = async () => {
      if (!lessonId) {
        setProgressLoaded(true);
        return;
      }
      
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setProgressLoaded(true);
          return;
        }
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const res = await fetch(`/api/progress?lessonId=${lessonId}&mode=dictation`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
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
        if (error.name === 'AbortError') {
          console.warn('Timeout loading progress, continuing without saved progress');
        } else {
          console.error('Error loading progress:', error);
        }
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
    if (isUserSeeking) return; // Skip auto-update during user seek

    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item, index) => currentTime >= item.start && currentTime < item.end
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
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked, isYouTube, isUserSeeking]);

  // Cleanup user seek timeout
  useEffect(() => {
    return () => {
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
    };
  }, [userSeekTimeout]);

  // Audio control functions
  const handleSeek = useCallback((direction, customSeekTime = null) => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player || !player.getCurrentTime) return;

      const seekTime = customSeekTime || 2;
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

      const seekTime = customSeekTime || 2;
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

  // Replay current sentence from the beginning
  const handleReplayFromStart = useCallback(() => {
    if (transcriptData.length === 0 || currentSentenceIndex >= transcriptData.length) return;
    
    const currentSentence = transcriptData[currentSentenceIndex];
    
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player || !player.seekTo) return;
      
      player.seekTo(currentSentence.start);
      player.playVideo();
      setIsPlaying(true);
      setSegmentPlayEndTime(currentSentence.end);
      setSegmentEndTimeLocked(true);
    } else {
      const audio = audioRef.current;
      if (!audio) return;
      
      audio.currentTime = currentSentence.start;
      audio.play();
      setIsPlaying(true);
      setSegmentPlayEndTime(currentSentence.end);
      setSegmentEndTimeLocked(true);
    }
  }, [transcriptData, currentSentenceIndex, isYouTube]);

  // Audio control functions
  const handleSentenceClick = useCallback((startTime, endTime) => {
    // Find the clicked sentence index
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex === -1) return;

    const isCurrentlyPlayingThisSentence = isPlaying && currentSentenceIndex === clickedIndex;

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
      // Play or resume the sentence (either a different sentence or the same paused sentence)
      let seekTime = startTime;
      if (pausedPositions[clickedIndex] && pausedPositions[clickedIndex] >= startTime && pausedPositions[clickedIndex] < endTime) {
        seekTime = pausedPositions[clickedIndex];
      }

      // Set seeking flag to prevent auto-update conflicts
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
      setIsUserSeeking(true);

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

      // Reset seeking flag after seek completes
      const timeout = setTimeout(() => {
        setIsUserSeeking(false);
      }, 1500);
      setUserSeekTimeout(timeout);
    }

    // Update currentSentenceIndex to match the clicked sentence
    setCurrentSentenceIndex(clickedIndex);
  }, [transcriptData, isYouTube, isPlaying, currentTime, pausedPositions, currentSentenceIndex, userSeekTimeout]);

  const goToPreviousSentence = useCallback(() => {
    if (currentSentenceIndex > 0) {
      const newIndex = currentSentenceIndex - 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick]);

  const goToNextSentence = useCallback(() => {
    if (currentSentenceIndex < transcriptData.length - 1) {
      const newIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick]);

  // Touch swipe handlers
  const handleTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 40; // Reduced threshold for better sensitivity
    const isRightSwipe = distance < -40;

    if (isLeftSwipe) {
      e.preventDefault();
      setSwipeDirection('left');
      goToNextSentence();
      setTimeout(() => setSwipeDirection(null), 300);
    } else if (isRightSwipe) {
      e.preventDefault();
      setSwipeDirection('right');
      goToPreviousSentence();
      setTimeout(() => setSwipeDirection(null), 300);
    }

    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNextSentence, goToPreviousSentence]);

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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(jsonPath, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`Không thể tải file JSON tại: ${jsonPath}`);
      const data = await response.json();
      setTranscriptData(data);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Timeout loading transcript:', jsonPath);
      } else {
        console.error('Lỗi tải transcript:', error);
      }
    }
  };



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

  // Save progress to database
  const saveProgress = useCallback(async (updatedCompletedSentences, updatedCompletedWords) => {
    if (!lessonId) return;
    
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
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
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
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
  }, [lessonId, transcriptData, currentSentenceIndex]);

  // Save word function
  const saveWord = useCallback((word) => {
    setSavedWords(prev => {
      if (!prev.includes(word)) {
        return [...prev, word];
      }
      return prev;
    });
  }, []);

  // Save vocabulary to database
  const saveVocabulary = useCallback(async ({ word, translation, notes }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        toast.error('Bitte melden Sie sich an, um Vokabeln zu speichern');
        return;
      }

      const context = transcriptData[currentSentenceIndex]?.text || '';

      const response = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          word,
          translation: translation || notes || '',
          context,
          lessonId
        })
      });

      if (response.ok) {
        toast.success('Vokabel erfolgreich gespeichert!');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Fehler beim Speichern');
      }
    } catch (error) {
      console.error('Save vocabulary error:', error);
      toast.error('Ein Fehler ist aufgetreten');
    }
  }, [lessonId, transcriptData, currentSentenceIndex]);

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
      input.style.setProperty('background', '#10b981', 'important');
      input.style.setProperty('border-color', '#10b981', 'important');
    } else {
      input.style.setProperty('background', '#ef4444', 'important');
      input.style.setProperty('border-color', '#ef4444', 'important');
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

  // Handle input focus - keep placeholder visible
  const handleInputFocus = useCallback((input, correctWord) => {
    // Keep placeholder showing the masked word length
    if (input.value === '') {
      input.placeholder = '*'.repeat(correctWord.length);
      // Reset background color when empty
      input.style.removeProperty('background');
      input.style.removeProperty('border-color');
    }
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
  const processLevelUp = useCallback((sentence, isCompleted, sentenceWordsCompleted) => {
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
          
          // Otherwise show input with hint button
          // Calculate dynamic size based on word length for better mobile UX
          const dynamicSize = Math.max(Math.min(pureWord.length, 20), 3);
          
          return `<span class="word-container">
            <button
              class="hint-btn"
              onclick="window.showHint(this, '${pureWord}', ${wordIndex})"
              title="Hinweise anzeigen"
              type="button"
            >
            </button>
             <input
               type="text"
               class="word-input"
               id="word-${wordIndex}"
               name="word-${wordIndex}"
               data-word-id="word-${wordIndex}"
               data-word-length="${pureWord.length}"
               oninput="window.checkWord(this, '${pureWord}', ${wordIndex})"
               onclick="window.handleInputClick(this, '${pureWord}')"
               onkeydown="window.disableArrowKeys(event)"
               onfocus="window.handleInputFocus(this, '${pureWord}')"
               onblur="window.handleInputBlur(this, '${pureWord}')"
               maxlength="${pureWord.length}"
               size="${dynamicSize}"
               placeholder="${'*'.repeat(pureWord.length)}"
               autocomplete="off"
               style="width: ${dynamicSize}ch;"
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
      
      const processed = processLevelUp(text, isCompleted, sentenceWordsCompleted);
      setProcessedText(processed);
      
      // Detect sentence length and add appropriate class + set word-length CSS variables
      setTimeout(() => {
        const dictationArea = document.querySelector('.dictationInputArea');
        if (dictationArea) {
          const wordCount = text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1).length;
          
          // Remove old classes
          dictationArea.classList.remove('short-sentence', 'medium-sentence', 'long-sentence', 'very-long-sentence');
          
          // Add new class based on word count
          if (wordCount <= 8) {
            dictationArea.classList.add('short-sentence');
          } else if (wordCount <= 15) {
            dictationArea.classList.add('medium-sentence');
          } else if (wordCount <= 25) {
            dictationArea.classList.add('long-sentence');
          } else {
            dictationArea.classList.add('very-long-sentence');
          }
          
          console.log(`Sentence has ${wordCount} words, applied class`);
          
          // Set word-length CSS variable for each input based on actual word length
          const inputs = dictationArea.querySelectorAll('.word-input');
          inputs.forEach(input => {
            const wordLength = input.getAttribute('data-word-length');
            if (wordLength) {
              input.style.setProperty('--word-length', wordLength);
            }
          });
        }
      }, 100);
      
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
  }, [currentSentenceIndex, transcriptData, processLevelUp, checkWord, handleInputClick, handleInputFocus, handleInputBlur, saveWord, showHint, handleWordClickForPopup, completedSentences, completedWords, progressLoaded]);

  const handleBackToHome = () => router.push('/');

  if (loading) {
    return (
      <div className={styles.centeredState}>
        <div style={{ textAlign: 'center' }}>
          <h2>⏳ Lektion lädt...</h2>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className={styles.centeredState}>
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

  // Generate structured data for this lesson
  const videoData = lesson.youtubeUrl ? generateVideoStructuredData({
    ...lesson,
    title: lesson.displayTitle || lesson.title,
    description: `Diktat Übung: ${lesson.title}. Verbessere dein Hörverstehen und Schreiben durch Diktat-Übungen.`,
    thumbnail: lesson.thumbnail,
    videoUrl: lesson.youtubeUrl,
    duration: duration ? `PT${Math.floor(duration)}S` : undefined,
  }) : null;

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Diktat', url: '/dictation' },
    { name: lesson.displayTitle || lesson.title, url: `/dictation/${lessonId}` }
  ]);

  const structuredDataArray = videoData
    ? [videoData, breadcrumbData]
    : [breadcrumbData];

  const sentenceListClassNames = {
    item: styles.sentenceItem,
    itemActive: styles.sentenceItemActive,
    itemPlaying: styles.sentenceItemPlaying,
    number: styles.sentenceNumber,
    content: styles.sentenceContent,
    text: styles.sentenceText,
    time: styles.sentenceTime,
    actions: styles.sentenceActions,
    actionButton: styles.sentenceActionButton
  };

  const footerClassNames = {
    wrapper: styles.footerControls,
    button: styles.footerButton,
    icon: styles.footerIcon,
    label: styles.footerLabel
  };

  return (
    <div className={styles.page}>
      <SEO 
        title={`Diktat: ${lesson.displayTitle || lesson.title}`}
        description={`Diktat Übung: ${lesson.title}. Verbessere dein Hörverstehen und Schreiben durch Diktat-Übungen.`}
        keywords={`Diktat, ${lesson.title}, Deutschlernen, Hörverstehen, Schreiben`}
        ogType="video.other"
        ogImage={lesson.thumbnail}
        structuredData={structuredDataArray}
      />

      {/* Hide footer and header on mobile */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .header,
          footer {
            display: none !important;
          }
        }
      `}</style>

      <div className={styles.pageContainer}>
        {/* Main 3-Column Layout */}
        <div className={styles.mainContent}>
          {/* Left Column - Video */}
          <div className={styles.leftSection}>
            <div className={styles.videoWrapper}>
              {/* Video Container - Always visible */}
              <div className={styles.videoContainer}>
                {isYouTube ? (
                  <div className={styles.videoPlayerWrapper}>
                    <div id="youtube-player"></div>
                    <div className={styles.videoOverlay}>
                      <div className={styles.videoTimer}>
                        ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                    </div>
                  </div>
                ) : lesson.audioUrl ? (
                  <div className={styles.videoPlaceholder}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                    <div className={styles.videoTimer}>
                      ⏱️ {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  </div>
                ) : null}
                <audio ref={audioRef} src={lesson.audioUrl} preload="metadata"></audio>
              </div>

              {/* Video Title - Always visible */}
              <div className={styles.videoTitleBox}>
                <h3>{lesson.displayTitle || lesson.title}</h3>
              </div>

              {/* Desktop Controls - Hidden on mobile */}
              {!isMobile && (
                <div className={styles.controlsWrapper}>
                  <div className={styles.controlBar}>
                    <div className={styles.playControls}>
                      <button className={styles.playButton} onClick={() => handleSeek('backward')} title="Zurück (←)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                        </svg>
                      </button>
                      
                      <button className={styles.playButton} onClick={handlePlayPause} title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
                        {isPlaying ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        )}
                      </button>
                      
                      <button className={styles.playButton} onClick={() => handleSeek('forward')} title="Vorwärts (→)">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Dictation Area */}
          <div className={styles.middleSection}>
            <div className={styles.dictationContainer}>
              {/* Dictation Header */}
              <div className={styles.dictationHeader}>
                <div className={styles.dictationHeaderTitle}>
                  {isMobile ? `#${currentSentenceIndex + 1}` : 'Dictation'}
                </div>
                {!isMobile && (
                  <div className={styles.sentenceCounter}>
                    #{currentSentenceIndex + 1} / {transcriptData.length}
                  </div>
                )}
              </div>
              
                <div
                  className={`${styles.dictationInputArea} ${swipeDirection ? styles[`swipe-${swipeDirection}`] : ''}`}
                  dangerouslySetInnerHTML={{ __html: processedText }}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />

              <div className={styles.dictationActions}>
                {/* Desktop: Show both buttons side by side */}
                <button 
                  className={styles.showAllWordsButton}
                  onClick={() => {
                    // Reveal all words
                    const allInputs = document.querySelectorAll('.word-input');
                    allInputs.forEach((input, idx) => {
                      const correctWord = input.getAttribute('oninput').match(/'([^']+)'/)[1];
                      showHint(input.previousElementSibling, correctWord, idx);
                    });
                  }}
                >
                  Show all words
                </button>
                
                <button 
                  className={styles.nextButton}
                  onClick={goToNextSentence}
                  disabled={currentSentenceIndex >= transcriptData.length - 1}
                >
                  Next
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Transcript List */}
          <div className={styles.rightSection}>
            <div className={styles.transcriptHeader}>
              <div className={styles.transcriptTabs}>
                <div className={`${styles.transcriptTab} ${styles.active}`}>
                  Transcript
                </div>
              </div>
              <div className={styles.transcriptProgress}>
                {Math.round((completedSentences.length / transcriptData.length) * 100) || 0}%
              </div>
            </div>
            
            <div className={styles.transcriptSection}>
              <div className={styles.transcriptList}>
                {transcriptData.map((segment, index) => {
                  const isCompleted = completedSentences.includes(index);
                  const sentenceWordsCompleted = completedWords[index] || {};
                  
                  return (
                    <div 
                      key={index}
                      className={`${styles.transcriptItem} ${index === currentSentenceIndex ? styles.active : ''}`}
                      onClick={() => handleSentenceClick(segment.start, segment.end)}
                    >
                      <div className={styles.transcriptItemNumber}>#{index + 1}</div>
                      <div className={styles.transcriptItemText}>
                        {isCompleted ? segment.text : maskText(segment.text)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Controls - Fixed position */}
      {isMobile && (
        <div className={styles.mobileBottomControls}>
          <button 
            className={styles.mobileControlBtn}
            onClick={handlePlayPause}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          
          <button 
            className={styles.mobileControlBtn}
            onClick={handleReplayFromStart}
            title="Replay"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          
          <button 
            className={styles.mobileControlBtn}
            onClick={goToPreviousSentence}
            disabled={currentSentenceIndex === 0}
            title="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            className={styles.mobileControlBtn}
            onClick={goToNextSentence}
            disabled={currentSentenceIndex >= transcriptData.length - 1}
            title="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Vocabulary Popup */}
      {showVocabPopup && (
        <VocabularyPopup
          word={selectedWord}
          position={popupPosition}
          onClose={() => setShowVocabPopup(false)}
          onSave={saveVocabulary}
        />
      )}
    </div>
  );
};

const DictationPage = () => {
  return <DictationPageContent />;
};

export default DictationPage;
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../../components/SEO';
import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import SentenceListItem from '../../components/SentenceListItem';
import DictionaryPopup from '../../components/DictionaryPopup';
import WordTooltip from '../../components/WordTooltip';
import WordSuggestionPopup from '../../components/WordSuggestionPopup';
import PointsAnimation from '../../components/PointsAnimation';
import StreakNotification from '../../components/StreakNotification';
import ProgressIndicator from '../../components/ProgressIndicator';
import { useLessonData } from '../../lib/hooks/useLessonData';
import { youtubeAPI } from '../../lib/youtubeApi';
import { useAuth } from '../../context/AuthContext';
import { speakText } from '../../lib/textToSpeech';
import { toast } from 'react-toastify';
import { translationCache } from '../../lib/translationCache';
import { hapticEvents } from '../../lib/haptics';
import styles from '../../styles/dictationPage.module.css';

// Map difficulty level to hidePercentage (outside component to avoid re-creation)
// A1=10%, A2/B1=30%, B2=60%, C1/C2=100%
const DIFFICULTY_TO_PERCENTAGE = {
  'a1': 10,
  'a2': 30,
  'b1': 30,
  'b2': 60,
  'c1': 100,
  'c2': 100
};

const PERCENTAGE_TO_DIFFICULTY = {
  10: 'a1',
  30: 'b1',  // Default to B1 for 30%
  60: 'b2',
  100: 'c1'  // Default to C1 for 100%
};

const MAX_STUDY_TIME = 24 * 60 * 60; // 24 hours in seconds
const DEBUG_TIMER = false; // Set to true to enable timer logs

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
  const [hidePercentage, setHidePercentage] = useState(30); // Will be loaded from user profile
  const [difficultyLevel, setDifficultyLevel] = useState('b1'); // a1, a2, b1, b2, c1, c2
  
  // Auto-jump to incomplete sentence setting
  const [autoJumpToIncomplete, setAutoJumpToIncomplete] = useState(() => {
    // Load from localStorage, default to true
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('autoJumpToIncomplete');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Auto-stop video at end of sentence (similar to shadowing mode)
  const [autoStop, setAutoStop] = useState(true);

  // Save autoJumpToIncomplete to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoJumpToIncomplete', String(autoJumpToIncomplete));
    }
  }, [autoJumpToIncomplete]);

  // Use SWR hook for combined lesson + progress data
  const { lesson, progress: loadedProgress, studyTime: loadedStudyTime, isLoading: loading } = useLessonData(lessonId, 'dictation');

  // Get user and auth functions early to avoid TDZ errors
  const { user, updateDifficultyLevel } = useAuth();

  // Load user's preferred difficulty level
  useEffect(() => {
    if (user && user.preferredDifficultyLevel) {
      const level = user.preferredDifficultyLevel;
      setDifficultyLevel(level);
      setHidePercentage(DIFFICULTY_TO_PERCENTAGE[level] || 30);
      console.log('✅ Loaded difficulty level from user:', level, '→', DIFFICULTY_TO_PERCENTAGE[level] + '%');
    }
  }, [user]);

  // Handle difficulty level change
  const handleDifficultyChange = useCallback(async (newLevel) => {
    const newPercentage = DIFFICULTY_TO_PERCENTAGE[newLevel] || 30;
    
    setHidePercentage(newPercentage);
    setDifficultyLevel(newLevel);
    
    // Save to database
    if (user) {
      const result = await updateDifficultyLevel(newLevel);
      if (result.success) {
        console.log('✅ Difficulty level saved:', newLevel, '→', newPercentage + '%');
      } else {
        console.error('❌ Failed to save difficulty level:', result.error);
      }
    }
  }, [user, updateDifficultyLevel]);
  
  // Dictation specific states (from ckk)
  const [savedWords, setSavedWords] = useState([]);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [lastClickedInput, setLastClickedInput] = useState(null);
  const [processedText, setProcessedText] = useState('');

  // Track if we've already jumped to first incomplete sentence
  const hasJumpedToIncomplete = useRef(false);

  // Touch swipe handling
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [swipeDirection, setSwipeDirection] = useState(null);

  // Progress tracking
  const [completedSentences, setCompletedSentences] = useState([]);
  const [completedWords, setCompletedWords] = useState({}); // { sentenceIndex: { wordIndex: correctWord } }
  const [progressLoaded, setProgressLoaded] = useState(false);
  
  // Points tracking - track which words have been scored
  const [wordPointsProcessed, setWordPointsProcessed] = useState({}); // { sentenceIndex: { wordIndex: 'correct' | 'incorrect' } }
  
  // Points animation states
  const [pointsAnimations, setPointsAnimations] = useState([]); // Array of { id, points, position }
  
  // Vocabulary popup states
  const [showVocabPopup, setShowVocabPopup] = useState(false);
  const [selectedWord, setSelectedWord] = useState('');
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [popupArrowPosition, setPopupArrowPosition] = useState('right');
  const [clickedWordElement, setClickedWordElement] = useState(null);
  
  // Loading indicator states
  const [showWordLoading, setShowWordLoading] = useState(false);
  const [loadingPosition, setLoadingPosition] = useState({ top: 0, left: 0 });
  
  // Mobile tooltip states
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipWord, setTooltipWord] = useState('');
  const [tooltipTranslation, setTooltipTranslation] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(false);
  
  // Word suggestion popup states
  const [showSuggestionPopup, setShowSuggestionPopup] = useState(false);
  const [suggestionWord, setSuggestionWord] = useState('');
  const [suggestionWordIndex, setSuggestionWordIndex] = useState(null);
  const [suggestionContext, setSuggestionContext] = useState('');
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
  
  // Streak notification state
  const [showStreakNotification, setShowStreakNotification] = useState(false);
  const [streakUpdatedToday, setStreakUpdatedToday] = useState(() => {
    // Check localStorage if streak was already updated today
    if (typeof window === 'undefined') return false;
    const lastUpdate = localStorage.getItem('streakLastUpdate');
    if (!lastUpdate) return false;
    
    const today = new Date().toDateString();
    return lastUpdate === today;
  });
  
  // Consecutive sentence completion counter for streak
  const [consecutiveSentences, setConsecutiveSentences] = useState(0);
  const [streakIncrements, setStreakIncrements] = useState(0); // Track how many times we've +1 today

  // Study time tracking
  const [studyTime, setStudyTime] = useState(0); // Total study time in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [lastPauseTime, setLastPauseTime] = useState(null); // Track when video was paused
  const timerIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const hasStartedTimerRef = useRef(false); // Track if timer has been started

  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  
  // Ref for transcript items to enable auto-scroll
  const transcriptItemRefs = useRef({});
  const transcriptSectionRef = useRef(null);
  
  // Ref for mobile dictation slides to enable auto-scroll
  const dictationSlidesRef = useRef(null);

  // Leaderboard tracking
  const sessionStartTimeRef = useRef(Date.now());
  const completedSentencesForLeaderboardRef = useRef(new Set());
  const lastStatsUpdateRef = useRef(Date.now());

  // Update monthly leaderboard stats
  const updateMonthlyStats = useCallback(async (forceUpdate = false) => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLastUpdate = (now - lastStatsUpdateRef.current) / 1000; // in seconds

    // Only update if at least 60 seconds have passed or force update
    if (!forceUpdate && timeSinceLastUpdate < 60) return;

    const totalTimeSpent = Math.floor((now - sessionStartTimeRef.current) / 1000);
    const newSentencesCompleted = completedSentencesForLeaderboardRef.current.size;

    // Only update if there's meaningful progress
    if (totalTimeSpent < 10 && newSentencesCompleted === 0 && !forceUpdate) return;

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      await fetch('/api/leaderboard/update-monthly-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeSpent: totalTimeSpent,
          sentencesCompleted: newSentencesCompleted,
          lessonsCompleted: 0 // We'll track full lesson completion separately
        })
      });

      // Reset tracking after successful update
      sessionStartTimeRef.current = now;
      completedSentencesForLeaderboardRef.current.clear();
      lastStatsUpdateRef.current = now;
    } catch (error) {
      console.error('Error updating monthly stats:', error);
    }
  }, [user]);

  // Track sentence completion for leaderboard
  useEffect(() => {
    if (currentSentenceIndex >= 0 && transcriptData[currentSentenceIndex]) {
      completedSentencesForLeaderboardRef.current.add(currentSentenceIndex);
    }
  }, [currentSentenceIndex, transcriptData]);

  // Periodic stats update (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      updateMonthlyStats(false);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [updateMonthlyStats]);

  // Save stats on unmount and page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      updateMonthlyStats(true);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save final stats when component unmounts
      updateMonthlyStats(true);
    };
  }, [updateMonthlyStats]);

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

  // Study timer - starts when user plays video for the first time
  // Stops on inactivity (3 min), pause > 30s, or page unload
  useEffect(() => {
    // Helper function to save study time immediately
    const saveStudyTimeNow = async () => {
      if (!user || !lessonId || !progressLoaded) return;
      const validatedStudyTime = Math.min(studyTime, MAX_STUDY_TIME);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lessonId,
            mode: 'dictation',
            studyTime: validatedStudyTime
          })
        });
        if (DEBUG_TIMER) console.log('Study time saved (timer stop):', validatedStudyTime);
      } catch (error) {
        console.error('Error saving study time:', error);
      }
    };

    // Start timer when user plays video for the first time
    if (isPlaying && !hasStartedTimerRef.current) {
      if (DEBUG_TIMER) console.log('Starting timer (first play)...');
      hasStartedTimerRef.current = true;
      setIsTimerRunning(true);
      setLastActivityTime(Date.now());
      setLastPauseTime(null);

      // Start timer interval (update every second)
      timerIntervalRef.current = setInterval(() => {
        setStudyTime(prev => {
          // Enforce maximum study time
          if (prev >= MAX_STUDY_TIME) {
            if (DEBUG_TIMER) console.log('Maximum study time reached');
            return MAX_STUDY_TIME;
          }
          if (DEBUG_TIMER) console.log('Timer tick:', prev + 1);
          return prev + 1;
        });
      }, 1000);
    }

    // Handle pause: track pause time and set timeout to stop timer after 30s
    if (!isPlaying && hasStartedTimerRef.current && isTimerRunning) {
      const pauseTime = Date.now();
      setLastPauseTime(pauseTime);

      // Clear existing pause timeout
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
      }

      // Stop timer after 30 seconds of pause
      pauseTimeoutRef.current = setTimeout(() => {
        if (DEBUG_TIMER) console.log('Video paused for 30s, stopping timer');
        setIsTimerRunning(false);
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
        }
        // Save immediately when timer stops due to pause
        saveStudyTimeNow();
      }, 30000); // 30 seconds
    }

    // Handle resume: clear pause timeout and restart timer if needed
    if (isPlaying && lastPauseTime && !isTimerRunning && hasStartedTimerRef.current) {
      if (DEBUG_TIMER) console.log('Resuming timer after pause');
      
      // Clear pause timeout
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }

      setLastPauseTime(null);
      setIsTimerRunning(true);
      setLastActivityTime(Date.now());

      // Restart timer interval
      timerIntervalRef.current = setInterval(() => {
        setStudyTime(prev => {
          if (prev >= MAX_STUDY_TIME) {
            if (DEBUG_TIMER) console.log('Maximum study time reached');
            return MAX_STUDY_TIME;
          }
          if (DEBUG_TIMER) console.log('Timer tick:', prev + 1);
          return prev + 1;
        });
      }, 1000);
    }
  }, [isPlaying, user, lessonId, studyTime]);

  // Cleanup timer only on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        if (DEBUG_TIMER) console.log('Cleaning up timer on unmount');
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      if (pauseTimeoutRef.current) {
        clearTimeout(pauseTimeoutRef.current);
        pauseTimeoutRef.current = null;
      }
    };
  }, []);

  // Inactivity detection - stop timer after 3 minutes of no activity
  useEffect(() => {
    if (!isTimerRunning) return;

    // Helper function to save study time immediately
    const saveStudyTimeNow = async () => {
      if (!user || !lessonId || !progressLoaded) return;
      const validatedStudyTime = Math.min(studyTime, MAX_STUDY_TIME);
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lessonId,
            mode: 'dictation',
            studyTime: validatedStudyTime
          })
        });
        if (DEBUG_TIMER) console.log('Study time saved (inactivity stop):', validatedStudyTime);
      } catch (error) {
        console.error('Error saving study time:', error);
      }
    };

    // Clear existing timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    // Set new timeout for 3 minutes (180000ms)
    inactivityTimeoutRef.current = setTimeout(() => {
      if (DEBUG_TIMER) console.log('User inactive for 3 minutes, stopping timer');
      setIsTimerRunning(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Save immediately when timer stops due to inactivity
      saveStudyTimeNow();
    }, 3 * 60 * 1000);

    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [lastActivityTime, isTimerRunning, user, lessonId, studyTime]);

  // Track user activity to reset inactivity timer
  useEffect(() => {
    const handleActivity = () => {
      setLastActivityTime(Date.now());
    };

    // Listen to various user activities
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, []);

  // Save study time periodically (every 3 seconds) and on unmount
  useEffect(() => {
    const saveStudyTime = async () => {
      // Only save if progress has been loaded to avoid overwriting with initial 0 value
      if (!user || !lessonId || !progressLoaded) return;

      // Validate before saving
      const validatedStudyTime = Math.min(studyTime, MAX_STUDY_TIME);

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lessonId,
            mode: 'dictation',
            studyTime: validatedStudyTime
          })
        });
        if (DEBUG_TIMER) console.log('Study time saved:', validatedStudyTime);
      } catch (error) {
        console.error('Error saving study time:', error);
      }
    };

    // Save every 3 seconds
    const interval = setInterval(saveStudyTime, 3000);

    // Save on beforeunload
    const handleBeforeUnload = () => {
      saveStudyTime();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Save final time when component unmounts
      saveStudyTime();
    };
  }, [user, lessonId, studyTime, progressLoaded]);

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

  // Auto-scroll transcript to current sentence (only scroll within container)
  useEffect(() => {
    if (!isMobile && transcriptItemRefs.current[currentSentenceIndex] && transcriptSectionRef.current) {
      const container = transcriptSectionRef.current;
      const element = transcriptItemRefs.current[currentSentenceIndex];
      
      // Calculate positions
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Calculate how much to scroll to center the element in the container
      const elementOffsetTop = element.offsetTop;
      const elementHeight = element.offsetHeight;
      const containerHeight = container.clientHeight;
      
      // Center the element: scroll to (element position - half container height + half element height)
      const scrollPosition = elementOffsetTop - (containerHeight / 2) + (elementHeight / 2);
      
      // Smooth scroll within container only
      container.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [currentSentenceIndex, isMobile]);

  // Update popup position on scroll
  useEffect(() => {
    if (!showVocabPopup || !clickedWordElement) return;

    let rafId = null;
    let isUpdating = false;

    const updatePopupPosition = () => {
      if (!isUpdating) {
        isUpdating = true;
        rafId = requestAnimationFrame(() => {
          const rect = clickedWordElement.getBoundingClientRect();
          const popupWidth = 350;
          const popupHeight = 280;
          const gapFromWord = 30;

          const spaceAbove = rect.top;
          const spaceBelow = window.innerHeight - rect.bottom;

          let top, left, arrowPos;

          if (spaceAbove >= popupHeight + gapFromWord + 20) {
            top = rect.top - popupHeight - gapFromWord;
            arrowPos = 'bottom';
          } else {
            top = rect.bottom + gapFromWord;
            arrowPos = 'top';
          }

          left = rect.left + rect.width / 2 - popupWidth / 2;

          if (left < 20) {
            left = 20;
          }
          if (left + popupWidth > window.innerWidth - 20) {
            left = window.innerWidth - popupWidth - 20;
          }

          if (top < 20) {
            top = 20;
          }
          if (top + popupHeight > window.innerHeight - 20) {
            top = window.innerHeight - popupHeight - 20;
          }

          setPopupPosition({ top, left });
          setPopupArrowPosition(arrowPos);
          isUpdating = false;
        });
      }
    };

    window.addEventListener('scroll', updatePopupPosition, true);
    window.addEventListener('resize', updatePopupPosition);

    return () => {
      window.removeEventListener('scroll', updatePopupPosition, true);
      window.removeEventListener('resize', updatePopupPosition);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [showVocabPopup, clickedWordElement]);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Use centralized YouTube API manager
  useEffect(() => {
    if (typeof window === 'undefined') return;

    youtubeAPI.waitForAPI()
      .then(() => setIsYouTubeAPIReady(true))
      .catch(err => console.error('YouTube API error:', err));
  }, []);

  // Set isYouTube flag
  useEffect(() => {
    if (!lesson || !lesson.youtubeUrl) {
      setIsYouTube(false);
    } else {
      setIsYouTube(true);
    }
  }, [lesson]);

  // Initialize YouTube player when API is ready and element is rendered
  useEffect(() => {
    if (!isYouTube || !isYouTubeAPIReady || !lesson) {
      return;
    }

    const playerOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    // Function to initialize player - with retry logic
    const initializePlayer = () => {
      const playerElement = document.getElementById('youtube-player');

      // If element doesn't exist yet, wait for next frame
      if (!playerElement) {
        console.log('YouTube player element not ready, retrying...');
        requestAnimationFrame(initializePlayer);
        return;
      }

      // Destroy existing player if any
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }

      console.log('Initializing YouTube player...');

      // Create the player
      youtubePlayerRef.current = new window.YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
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
            
            // Only set size on desktop - mobile uses CSS aspect-ratio or height
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
              const playerElement = document.getElementById('youtube-player');
              if (playerElement && playerElement.parentElement) {
                // Get parent container (videoPlayerWrapper) dimensions
                const wrapper = playerElement.parentElement;
                const rect = wrapper.getBoundingClientRect();

                // Set player size to fill the container
                if (rect.width > 0 && rect.height > 0) {
                  event.target.setSize(rect.width, rect.height);
                }
              }
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
    };

    // Start initialization
    initializePlayer();

    // Add resize listener to adjust player size when window resizes (desktop only)
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile && youtubePlayerRef.current && youtubePlayerRef.current.setSize) {
        const playerElement = document.getElementById('youtube-player');
        if (playerElement && playerElement.parentElement) {
          const wrapper = playerElement.parentElement;
          const rect = wrapper.getBoundingClientRect();

          if (rect.width > 0 && rect.height > 0) {
            youtubePlayerRef.current.setSize(rect.width, rect.height);
          }
        }
      }
    };

    window.addEventListener('resize', handleResize);
    // Also handle orientation change on mobile
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);

      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
        youtubePlayerRef.current = null;
      }
    };
  }, [isYouTube, isYouTubeAPIReady, lesson]);

  // Load transcript when lesson is ready (from SWR)
  useEffect(() => {
    if (lesson && lesson.json) {
      loadTranscript(lesson.json);
    }
  }, [lesson]);

  // Load progress from SWR hook
  useEffect(() => {
    // Wait until loadedProgress is actually loaded (not undefined)
    // It can be null or empty object for new users, that's ok
    if (loadedProgress !== undefined) {
      const loadedSentences = loadedProgress.completedSentences || [];
      const loadedWords = loadedProgress.completedWords || {};

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

      if (DEBUG_TIMER) {
        console.log('Loaded and normalized progress from SWR:', {
          completedSentences: loadedSentences,
          completedWords: normalizedWords
        });
      }
      
      // Only set progressLoaded to true after we've processed the data
      setProgressLoaded(true);
    }

    if (loadedStudyTime !== undefined) {
      const validatedLoadedTime = Math.min(loadedStudyTime, MAX_STUDY_TIME);
      setStudyTime(validatedLoadedTime);
      if (DEBUG_TIMER) console.log('Loaded study time from SWR:', validatedLoadedTime);
    }
  }, [loadedProgress, loadedStudyTime]);



  // Smooth time update with requestAnimationFrame
  useEffect(() => {
    let animationFrameId = null;

    const updateTime = () => {
      if (isYouTube) {
        const player = youtubePlayerRef.current;
        if (player && player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
          const currentTime = player.getCurrentTime();
          setCurrentTime(currentTime);

          // Auto-stop when segment ends (only if autoStop is enabled)
          if (autoStop && segmentPlayEndTime !== null && currentTime >= segmentPlayEndTime - 0.02) {
            if (player.pauseVideo) player.pauseVideo();
            setIsPlaying(false);
            setSegmentPlayEndTime(null);
          }
        }
      } else {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          setCurrentTime(audio.currentTime);

          // Auto-stop when segment ends (only if autoStop is enabled)
          if (autoStop && segmentPlayEndTime !== null && audio.currentTime >= segmentPlayEndTime - 0.02) {
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
  }, [isPlaying, segmentPlayEndTime, isYouTube, autoStop]);

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
    // Haptic feedback for play/pause
    hapticEvents.audioPlay();
    
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        if (player.pauseVideo) player.pauseVideo();
        setIsPlaying(false);
      } else {
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];

           if (player.getCurrentTime && player.getCurrentTime() >= currentSentence.end - 0.05) {
             if (player.seekTo) player.seekTo(currentSentence.start);
           }

          if (player.playVideo) player.playVideo();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục
        } else {
          if (player.playVideo) player.playVideo();
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
      if (player.playVideo) player.playVideo();
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
        if (player && player.pauseVideo) player.pauseVideo();
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
        if (player.playVideo) player.playVideo();
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

  // Sort transcript indices to prioritize incomplete sentences (only when auto-jump is ON)
  const sortedTranscriptIndices = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return [];

    // If auto-jump is OFF, return normal order (1, 2, 3...)
    if (!autoJumpToIncomplete) {
      const normalOrder = [...Array(transcriptData.length).keys()];
      console.log('🔢 Normal transcript order (auto-jump OFF):', {
        total: normalOrder.length,
        order: normalOrder.slice(0, 10)
      });
      return normalOrder;
    }

    // If auto-jump is ON, prioritize incomplete sentences
    const sorted = [...Array(transcriptData.length).keys()].sort((a, b) => {
      const aCompleted = completedSentences.includes(a);
      const bCompleted = completedSentences.includes(b);

      // Incomplete sentences come first
      if (!aCompleted && bCompleted) return -1;
      if (aCompleted && !bCompleted) return 1;

      // If both have same completion status, maintain original order
      return a - b;
    });
    
    console.log('🔢 Sorted transcript indices (auto-jump ON):', {
      total: sorted.length,
      completed: completedSentences.length,
      firstFew: sorted.slice(0, 10),
      completedList: completedSentences
    });
    
    return sorted;
  }, [transcriptData, completedSentences, autoJumpToIncomplete]);

  // Filter indices for mobile dictation slides (only show incomplete when auto-jump is ON)
  const mobileVisibleIndices = useMemo(() => {
    if (!autoJumpToIncomplete) {
      // Show all sentences in normal order
      return sortedTranscriptIndices;
    }
    
    // Show only incomplete sentences
    const incompleteOnly = sortedTranscriptIndices.filter(
      (index) => !completedSentences.includes(index)
    );
    
    console.log('📱 Mobile visible indices (auto-jump ON - incomplete only):', {
      total: incompleteOnly.length,
      completed: completedSentences.length,
      indices: incompleteOnly.slice(0, 10)
    });
    
    // If all completed, show all sentences (fallback to avoid empty slides)
    if (incompleteOnly.length === 0) {
      console.log('🎉 All sentences completed! Showing all sentences.');
      return sortedTranscriptIndices;
    }
    
    return incompleteOnly;
  }, [sortedTranscriptIndices, completedSentences, autoJumpToIncomplete]);

  // LAZY LOADING: Calculate visible slide range (only render 3 slides: prev, current, next)
  const lazySlideRange = useMemo(() => {
    if (!isMobile || mobileVisibleIndices.length === 0) {
      return { start: 0, end: mobileVisibleIndices.length };
    }

    const currentSlideIndex = mobileVisibleIndices.indexOf(currentSentenceIndex);
    
    // If current sentence not in visible indices, render all (fallback)
    if (currentSlideIndex === -1) {
      console.log('⚠️ Current sentence not in visible indices, rendering all slides');
      return { start: 0, end: mobileVisibleIndices.length };
    }

    // Calculate range: [currentIndex - 1, currentIndex, currentIndex + 1]
    const start = Math.max(0, currentSlideIndex - 1);
    const end = Math.min(mobileVisibleIndices.length, currentSlideIndex + 2);

    console.log('🎯 Lazy loading range:', {
      currentSentenceIndex,
      currentSlideIndex,
      start,
      end,
      renderCount: end - start,
      totalSlides: mobileVisibleIndices.length,
      percentageRendered: ((end - start) / mobileVisibleIndices.length * 100).toFixed(1) + '%'
    });

    return { start, end };
  }, [isMobile, mobileVisibleIndices, currentSentenceIndex]);

  // Lazy loading enabled slides (only the ones to render)
  const lazySlidesToRender = useMemo(() => {
    return mobileVisibleIndices.slice(lazySlideRange.start, lazySlideRange.end);
  }, [mobileVisibleIndices, lazySlideRange]);

  // Auto-scroll mobile dictation slides to current sentence (with lazy loading support)
  useEffect(() => {
    if (isMobile && dictationSlidesRef.current && transcriptData.length > 0) {
      const container = dictationSlidesRef.current;
      const slideIndex = mobileVisibleIndices.indexOf(currentSentenceIndex);
      
      if (slideIndex !== -1) {
        // Find the actual rendered slide by data-slide-index attribute
        const targetSlide = container.querySelector(`[data-slide-index="${slideIndex}"]`);
        
        if (targetSlide) {
          // Scroll to center the slide
          targetSlide.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center'
          });
          
          console.log('📱 Auto-scrolled dictation to slide (lazy):', {
            currentSentenceIndex,
            slideIndex,
            totalVisibleSlides: mobileVisibleIndices.length,
            lazyRange: `${lazySlideRange.start}-${lazySlideRange.end}`,
            renderedSlides: lazySlideRange.end - lazySlideRange.start
          });
        } else {
          console.warn('⚠️ Target slide not found in lazy-loaded range');
        }
      }
    }
  }, [currentSentenceIndex, isMobile, mobileVisibleIndices, transcriptData.length, lazySlideRange]);

  const goToPreviousSentence = useCallback(() => {
    // Find current position in sorted list
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPositionInSorted > 0) {
      // Get previous index from sorted list
      const newIndex = sortedTranscriptIndices[currentPositionInSorted - 1];
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick, sortedTranscriptIndices]);

  const goToNextSentence = useCallback(() => {
    // Find current position in sorted list
    const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
    if (currentPositionInSorted < sortedTranscriptIndices.length - 1) {
      // Get next index from sorted list
      const newIndex = sortedTranscriptIndices[currentPositionInSorted + 1];
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
  }, [currentSentenceIndex, transcriptData, handleSentenceClick, sortedTranscriptIndices]);

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
      
      // Haptic feedback for swipe
      hapticEvents.slideSwipe();
      
      setSwipeDirection('left');
      goToNextSentence();
      setTimeout(() => setSwipeDirection(null), 300);
    } else if (isRightSwipe) {
      e.preventDefault();
      
      // Haptic feedback for swipe
      hapticEvents.slideSwipe();
      
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
      
      console.log('📝 Transcript loaded:', {
        path: jsonPath,
        totalSentences: data.length,
        firstSentence: data[0]?.text?.substring(0, 50) + '...',
        lastSentence: data[data.length - 1]?.text?.substring(0, 50) + '...'
      });
      
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

  // Format study time to HH:MM:SS
  const formatStudyTime = (totalSeconds) => {
    if (!isFinite(totalSeconds)) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

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
  const handleWordClickForPopup = useCallback(async (word, eventOrElement) => {
    // Handle both event object and element reference
    let element = eventOrElement;
    if (eventOrElement && eventOrElement.target) {
      // It's an event object
      element = eventOrElement.target;
    } else if (!eventOrElement || !(eventOrElement instanceof Element)) {
      // Invalid input
      console.error('Invalid event/element in handleWordClickForPopup');
      return;
    }

    // Pause main audio nếu đang phát
    if (typeof window !== 'undefined' && window.mainAudioRef?.current) {
      const audio = window.mainAudioRef.current;
      if (!audio.paused) {
        audio.pause();
      }
    }

    // Pause YouTube if playing
    if (isYouTube && youtubePlayerRef.current) {
      const player = youtubePlayerRef.current;
      if (player.getPlayerState && player.getPlayerState() === window.YT.PlayerState.PLAYING) {
        if (player.pauseVideo) player.pauseVideo();
      }
    }

    const cleanedWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
    if (!cleanedWord) return;

    // Speak the word
    speakText(cleanedWord);

    const rect = element.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    if (isMobileView) {
      // Mobile: Show tooltip above word with boundary checks
      const tooltipHeight = 50; // Estimated tooltip height
      const tooltipWidth = 200; // Estimated tooltip width
      
      let top = rect.top - 10;
      let left = rect.left + rect.width / 2;

      // Keep tooltip within viewport
      // Check top boundary
      if (top - tooltipHeight < 10) {
        top = rect.bottom + 10 + tooltipHeight; // Show below if not enough space above
      }

      // Check left boundary
      const halfWidth = tooltipWidth / 2;
      if (left - halfWidth < 10) {
        left = halfWidth + 10;
      }
      
      // Check right boundary
      if (left + halfWidth > window.innerWidth - 10) {
        left = window.innerWidth - halfWidth - 10;
      }

      setTooltipWord(cleanedWord);
      setTooltipPosition({ top, left });
      setShowTooltip(true);

      // Check cache first
      const targetLang = user?.nativeLanguage || 'vi';
      const cached = translationCache.get(cleanedWord, 'de', targetLang);
      if (cached) {
        setTooltipTranslation(cached);
        return;
      }

      // Fetch translation for tooltip
      try {
        const response = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: cleanedWord,
            context: '',
            sourceLang: 'de',
            targetLang: targetLang
          })
        });

        const data = await response.json();
        if (data.success && data.translation) {
          setTooltipTranslation(data.translation);
          translationCache.set(cleanedWord, data.translation, 'de', targetLang);
        }
      } catch (error) {
        console.error('Translation error:', error);
        setTooltipTranslation('...');
      }
    } else {
      // Desktop: Show full popup (top/bottom only)
      const popupWidth = 350;
      const popupHeight = 280;
      const gapFromWord = 30;

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;

      let top, left, arrowPos;

      // Default: try to show above
      if (spaceAbove >= popupHeight + gapFromWord + 20) {
        top = rect.top - popupHeight - gapFromWord;
        arrowPos = 'bottom';
      } else {
        // Show below if not enough space above
        top = rect.bottom + gapFromWord;
        arrowPos = 'top';
      }

      // Center horizontally with bounds checking
      left = rect.left + rect.width / 2 - popupWidth / 2;

      if (left < 20) {
        left = 20;
      }
      if (left + popupWidth > window.innerWidth - 20) {
        left = window.innerWidth - popupWidth - 20;
      }

      // Ensure popup doesn't go off screen vertically
      if (top < 20) {
        top = 20;
      }
      if (top + popupHeight > window.innerHeight - 20) {
        top = window.innerHeight - popupHeight - 20;
      }

      // Show loading indicator first
      const loadingRect = element.getBoundingClientRect();
      setLoadingPosition({
        top: loadingRect.top - 40,
        left: loadingRect.left + loadingRect.width / 2
      });
      setShowWordLoading(true);
      setShowVocabPopup(false);

      setClickedWordElement(element);
      setSelectedWord(cleanedWord);

      // Wait a moment, then show popup
      setTimeout(() => {
        setShowWordLoading(false);
        setPopupPosition({ top, left });
        setPopupArrowPosition(arrowPos);
        setShowVocabPopup(true);
      }, 400);
    }
  }, [isYouTube, user]);

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

  // Mark today's activity (first sentence completion)
  const markTodayActivity = useCallback(async () => {
    if (!user) return;
    
    // Check if already marked today
    if (streakUpdatedToday) {
      console.log('Today already marked for streak');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Today marked for streak:', data);
        
        // Mark as updated for this session and save to localStorage
        setStreakUpdatedToday(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('streakLastUpdate', new Date().toDateString());
        }
        
        // Trigger streak refresh in Header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streakUpdated'));
        }
      }
    } catch (error) {
      console.error('Error marking today activity:', error);
    }
  }, [user, streakUpdatedToday]);

  // Increment streak (+1)
  const incrementStreak = useCallback(async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/user/streak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Streak incremented:', data);
        
        // Show streak notification
        setShowStreakNotification(true);
        
        // Track number of increments today
        setStreakIncrements(prev => prev + 1);
        
        // Trigger streak refresh in Header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streakUpdated'));
        }
      }
    } catch (error) {
      console.error('Error incrementing streak:', error);
    }
  }, [user]);

  // Check if current sentence is completed
  const checkSentenceCompletion = useCallback(() => {
    setTimeout(() => {
      // Check if this sentence is already marked as completed
      if (completedSentences.includes(currentSentenceIndex)) {
        return;
      }

      // Get the sentence text and count total words that need to be filled
      const sentence = transcriptData[currentSentenceIndex];
      if (!sentence) return;

      const words = sentence.text.split(/\s+/);
      
      // Determine which words need to be filled based on hidePercentage
      const validWordIndices = [];
      words.forEach((word, idx) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          validWordIndices.push(idx);
        }
      });

      // Calculate how many words to hide (same logic as processLevelUp)
      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = Math.ceil((totalValidWords * hidePercentage) / 100);

      // Count completed words from DOM (not state) to avoid timing issues
      // This ensures we get the most up-to-date count including just-completed words
      const sentenceContainer = document.querySelector(`[data-sentence-index="${currentSentenceIndex}"]`);
      let completedWordsCount = 0;
      
      if (sentenceContainer) {
        // Count only user-completed words, EXCLUDE revealed-word and completed-word (those are already visible)
        const correctWordSpans = sentenceContainer.querySelectorAll('.correct-word:not(.revealed-word):not(.completed-word)');
        completedWordsCount = correctWordSpans.length;
      } else {
        // Fallback to state if DOM element not found (shouldn't happen)
        completedWordsCount = Object.keys(completedWords[currentSentenceIndex] || {}).length;
      }

      console.log(`Checking sentence ${currentSentenceIndex}:`, {
        totalValidWords,
        wordsToHideCount,
        completedWordsCount,
        completedWords: completedWords[currentSentenceIndex],
        fromDOM: sentenceContainer ? 'yes' : 'no (fallback to state)'
      });

      if (completedWordsCount >= wordsToHideCount && wordsToHideCount > 0) {
        // All words are correct, mark sentence as completed
        const updatedCompleted = [...completedSentences, currentSentenceIndex];
        setCompletedSentences(updatedCompleted);
        saveProgress(updatedCompleted, completedWords);
        console.log(`✅ Sentence ${currentSentenceIndex} completed!`);
        
        // Streak logic: Start counting from 2nd sentence
        const newConsecutive = consecutiveSentences + 1;
        setConsecutiveSentences(newConsecutive);

        console.log(`Consecutive sentences: ${newConsecutive}`);

        // Sentence 1: Just mark today, no streak yet
        if (newConsecutive === 1) {
          console.log('First sentence - no streak yet (streak = 0)');
          // Just trigger Header refresh to mark today as active
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('streakUpdated'));
          }
        }

        // Sentence 2+: Increment streak and show notification
        if (newConsecutive >= 2) {
          const streakCount = newConsecutive - 1; // Streak = consecutive - 1
          console.log(`🔥 Sentence ${newConsecutive} completed! Streak will be ${streakCount}`);
          incrementStreak();
        }

        // Auto-navigate to next incomplete sentence after a short delay (if enabled)
        if (autoJumpToIncomplete) {
          setTimeout(() => {
            // Find current position in sorted list
            const currentPositionInSorted = sortedTranscriptIndices.indexOf(currentSentenceIndex);
            console.log('🎯 Auto-navigation:', {
              currentSentenceIndex,
              currentPositionInSorted,
              sortedLength: sortedTranscriptIndices.length,
              updatedCompleted
            });
            
            // Find next incomplete sentence (first incomplete in sorted list after current)
            let nextIncompleteIndex = -1;
            for (let i = 0; i < sortedTranscriptIndices.length; i++) {
              const sentenceIdx = sortedTranscriptIndices[i];
              if (!updatedCompleted.includes(sentenceIdx)) {
                nextIncompleteIndex = sentenceIdx;
                console.log(`✅ Found next incomplete sentence at index ${nextIncompleteIndex}`);
                break;
              }
            }
            
            // Navigate to next incomplete sentence if found
            if (nextIncompleteIndex !== -1 && nextIncompleteIndex !== currentSentenceIndex) {
              console.log(`🚀 Auto-jumping to sentence ${nextIncompleteIndex}`);
              setCurrentSentenceIndex(nextIncompleteIndex);
              const item = transcriptData[nextIncompleteIndex];
              if (item) {
                handleSentenceClick(item.start, item.end);
              }
            } else {
              console.log('🎉 All sentences completed!');
              
              // Haptic feedback for lesson completion
              hapticEvents.lessonComplete();
              
              // Show celebration toast
              toast.success('🎉 All sentences completed! Great job!');
            }
          }, 400); // Increased to 400ms to let user see completion + smooth scroll
        } else {
          console.log('🔕 Auto-jump disabled, staying on current sentence');
        }
        
      }
    }, 50); // Reduced to 50ms for faster detection
  }, [completedSentences, currentSentenceIndex, completedWords, saveProgress, consecutiveSentences, streakUpdatedToday, markTodayActivity, incrementStreak, sortedTranscriptIndices, transcriptData, handleSentenceClick, hidePercentage, autoJumpToIncomplete]);

  // Show points animation
  const showPointsAnimation = useCallback((points, element) => {
    if (!element) return;
    
    // Get element position (starting point)
    const rect = element.getBoundingClientRect();
    const startPosition = {
      top: rect.top + rect.height / 2 - 10,
      left: rect.left + rect.width / 2
    };
    
    // Get header points badge position (end point)
    const headerBadge = document.querySelector('[title="Your total points"]');
    let endPosition = null;

    if (headerBadge) {
      const badgeRect = headerBadge.getBoundingClientRect();
      endPosition = {
        top: badgeRect.top + badgeRect.height / 2,
        left: badgeRect.left + badgeRect.width / 2
      };
    } else {
      // Fallback: animate upwards if header badge not found
      endPosition = {
        top: startPosition.top - 100,
        left: startPosition.left
      };
    }
    
    const animationId = Date.now() + Math.random();
    setPointsAnimations(prev => [...prev, { 
      id: animationId, 
      points, 
      startPosition,
      endPosition 
    }]);
    
    // Remove animation after it completes
    setTimeout(() => {
      setPointsAnimations(prev => prev.filter(a => a.id !== animationId));
    }, 1000);
  }, []);

  // Update points function
  const updatePoints = useCallback(async (pointsChange, reason, element = null) => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch('/api/user/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ pointsChange, reason })
      });
      
        if (response.ok) {
          const data = await response.json();
          console.log(`Points updated: ${pointsChange > 0 ? '+' : ''}${pointsChange} (${reason})`);

          // Show animation
          if (element) {
            showPointsAnimation(pointsChange, element);
          }

          // Trigger points refresh in AuthContext (if available)
          if (typeof window !== 'undefined') {
            if (window.refreshUserPoints) {
              window.refreshUserPoints();
            }
            // Also emit custom event for Header to listen
            window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: { pointsChange, reason } }));
          }
        }
    } catch (error) {
      console.error('Error updating points:', error);
    }
  }, [user, showPointsAnimation]);

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
    
    if (input.value.toLowerCase() === sanitizedCorrectWord.toLowerCase()) {
      // Haptic feedback for correct word
      hapticEvents.wordCorrect();
      
      saveWord(correctWord);
      
      // Save this word completion to database
      saveWordCompletion(wordIndex, correctWord);
      
      // Award points for correct word (+1 point)
      const wordKey = `${currentSentenceIndex}-${wordIndex}`;
      if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
        updatePoints(1, `Correct word: ${correctWord}`, input);
        setWordPointsProcessed(prev => ({
          ...prev,
          [currentSentenceIndex]: {
            ...(prev[currentSentenceIndex] || {}),
            [wordIndex]: 'correct'
          }
        }));
      }
      
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

      console.log('🔍 Word incorrect:', {
        input: input.value,
        correct: sanitizedCorrectWord,
        inputLength: input.value.length,
        correctLength: sanitizedCorrectWord.length,
        wordIndex,
        alreadyProcessed: wordPointsProcessed[currentSentenceIndex]?.[wordIndex]
      });

      // Deduct points for incorrect attempt (-0.5 points, only once per word)
      if (input.value.length === sanitizedCorrectWord.length) {
        console.log('✓ Length matches! Checking if word already processed...');
        // Only deduct when user has typed the full word length
        const wordKey = `${currentSentenceIndex}-${wordIndex}`;
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          console.log('✓ Word not yet processed! Proceeding with penalty and streak reset...');
          
          // Haptic feedback for incorrect word
          hapticEvents.wordIncorrect();
          
          updatePoints(-0.5, `Incorrect word attempt: ${input.value}`, input);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'incorrect'
            }
          }));

          // Reset consecutive sentence counter when user makes a mistake
          console.log('❌ Mistake made! Resetting consecutive counter from', consecutiveSentences, 'to 0');
          setConsecutiveSentences(0);

          // Clear streak-related local storage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('streakLastUpdate');
          }
          setStreakUpdatedToday(false);
          setStreakIncrements(0);

          // Always reset streak in database when user makes a mistake
          // This ensures streak is reset even if consecutiveSentences is 0
          const token = localStorage.getItem('token');
          if (token && user) {
            fetch('/api/user/streak', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ action: 'reset' })
            }).then(() => {
              console.log('Streak reset to 0 in database');
              // Trigger streak refresh in Header
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('streakUpdated'));
              }
            }).catch(err => console.error('Error resetting streak:', err));
          }
        } else {
          console.log('⚠️ Word already processed, skipping penalty and streak reset');
        }
      } else {
        console.log('⚠️ Length mismatch, waiting for full word length');
      }
    }
  }, [saveWord, updateInputBackground, checkSentenceCompletion, saveWordCompletion, currentSentenceIndex, wordPointsProcessed, updatePoints, consecutiveSentences, user]);

  /**
   * Seeded random number generator for deterministic word selection
   * Uses the sentence index as seed to ensure consistency across re-renders
   */
  const seededRandom = useCallback((seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }, []);

  // Mask text function - replace letters with asterisks (deprecated - use maskTextByPercentage)
  const maskText = useCallback((text) => {
    return text.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
  }, []);

  // Mask text by percentage - used for transcript display
  const maskTextByPercentage = useCallback((text, sentenceIdx, hidePercent, sentenceWordsCompleted = {}) => {
    if (hidePercent === 100) {
      // Mask all letters except completed words
      const words = text.split(/\s+/);
      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          // If word is completed, show it
          if (sentenceWordsCompleted[wordIndex]) {
            return word;
          }
          // Otherwise mask it
          return word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
        }
        return word;
      });
      return processedWords.join(" ");
    }

    const words = text.split(/\s+/);

    // Determine which words to hide
    const validWordIndices = [];
    words.forEach((word, idx) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      if (pureWord.length >= 1) {
        validWordIndices.push(idx);
      }
    });

    // Calculate how many words to hide
    const totalValidWords = validWordIndices.length;
    const wordsToHideCount = Math.ceil((totalValidWords * hidePercent) / 100);

    // Deterministically select words to hide (same logic as processLevelUp)
    const hiddenWordIndices = new Set();
    const shuffled = [...validWordIndices].sort((a, b) => {
      const seedA = seededRandom(sentenceIdx * 1000 + a);
      const seedB = seededRandom(sentenceIdx * 1000 + b);
      return seedA - seedB;
    });
    for (let i = 0; i < wordsToHideCount; i++) {
      hiddenWordIndices.add(shuffled[i]);
    }

    // Process each word
    const processedWords = words.map((word, wordIndex) => {
      const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
      if (pureWord.length >= 1) {
        // If word is completed, always show it
        if (sentenceWordsCompleted[wordIndex]) {
          return word;
        }

        const shouldHide = hiddenWordIndices.has(wordIndex);
        if (shouldHide) {
          // Mask this word
          return word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, '*');
        } else {
          // Show this word
          return word;
        }
      }
      return word;
    });

    return processedWords.join(" ");
  }, [seededRandom]);

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

  // Show hint for a word - now opens suggestion popup instead of revealing directly
  const showHint = useCallback((button, correctWord, wordIndex) => {
    // Haptic feedback for hint button
    hapticEvents.wordHintUsed();
    
    // If user is not logged in, reveal the word directly
    if (!user) {
      const container = button.parentElement;
      const input = container.querySelector('.word-input');

      if (input) {
        // Save this word completion to database
        saveWordCompletion(wordIndex, correctWord);

        // Award points for correct word (+1 point) and show animation
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          updatePoints(1, `Correct word from hint: ${correctWord}`, button);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'correct'
            }
          }));
        }

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
      return;
    }

    // For logged-in users, show suggestion popup
    // Get current sentence context
    const context = transcriptData[currentSentenceIndex]?.text || '';

    // Calculate popup position relative to the hint button
    const rect = button.getBoundingClientRect();
    const isMobileView = window.innerWidth <= 768;

    let top, left;

    if (isMobileView) {
      // Mobile: position to the right/left of button, centered vertically
      const popupWidth = 300; // Estimated mobile popup width
      const popupHeight = 50; // Estimated mobile popup height

      top = rect.top + (rect.height / 2); // Center vertically with the button
      
      // Determine if there's more space on right or left
      const spaceOnRight = window.innerWidth - rect.right;
      const spaceOnLeft = rect.left;

      if (spaceOnRight >= popupWidth + 10) {
        // Show on right if there's enough space
        left = rect.right + 5;
      } else if (spaceOnLeft >= popupWidth + 10) {
        // Show on left if there's enough space
        left = rect.left - popupWidth - 5;
      } else if (spaceOnRight > spaceOnLeft) {
        // Show on right even if tight
        left = rect.right + 5;
      } else {
        // Show on left even if tight
        left = rect.left - popupWidth - 5;
      }

      // Keep within screen bounds
      if (left < 10) {
        left = 10;
      }
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }
    } else {
      // Desktop: position to the right/left of button, centered vertically
      const popupWidth = 280;
      const popupHeight = 250;

      top = rect.top + (rect.height / 2); // Center vertically with the button
      
      // Determine if there's more space on right or left
      const spaceOnRight = window.innerWidth - rect.right;
      const spaceOnLeft = rect.left;

      if (spaceOnRight >= popupWidth + 10) {
        // Show on right if there's enough space
        left = rect.right + 5;
      } else if (spaceOnLeft >= popupWidth + 10) {
        // Show on left if there's enough space
        left = rect.left - popupWidth - 5;
      } else if (spaceOnRight > spaceOnLeft) {
        // Show on right even if tight
        left = rect.right + 5;
      } else {
        // Show on left even if tight
        left = rect.left - popupWidth - 5;
      }

      // Check if popup would go off left edge
      if (left < 10) {
        left = Math.max(10, (window.innerWidth - popupWidth) / 2);
      }

      // Check if popup would go off bottom of screen
      if (top + popupHeight > window.innerHeight - 10) {
        top = Math.max(10, window.innerHeight - popupHeight - 10);
      }

      // Check if popup would go off top
      if (top < 10) {
        top = 10;
      }
    }

    // Set state for popup
    setSuggestionWord(correctWord);
    setSuggestionWordIndex(wordIndex);
    setSuggestionContext(context);
    setSuggestionPosition({ top, left });
    setShowSuggestionPopup(true);
  }, [transcriptData, currentSentenceIndex, user, saveWord, saveWordCompletion, checkSentenceCompletion, wordPointsProcessed, updatePoints]);

  // Handle correct answer from suggestion popup
  const handleCorrectSuggestion = useCallback((correctWord, wordIndex) => {
    // Find the button with this word index
    const button = document.querySelector(`button[onclick*="showHint"][onclick*="${correctWord}"][onclick*="${wordIndex}"]`);
    if (button) {
      const container = button.parentElement;
      const input = container.querySelector('.word-input');
      
      if (input) {
        // Save this word completion to database
        saveWordCompletion(wordIndex, correctWord);
        
        // Award points for correct word (+1 point) and show animation
        if (!wordPointsProcessed[currentSentenceIndex]?.[wordIndex]) {
          updatePoints(1, `Correct word from hint: ${correctWord}`, button);
          setWordPointsProcessed(prev => ({
            ...prev,
            [currentSentenceIndex]: {
              ...(prev[currentSentenceIndex] || {}),
              [wordIndex]: 'correct'
            }
          }));
        }
        
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
    }
    
    // Close popup
    setShowSuggestionPopup(false);
  }, [saveWord, checkSentenceCompletion, saveWordCompletion, wordPointsProcessed, currentSentenceIndex, updatePoints]);

  // Handle wrong answer from suggestion popup
  const handleWrongSuggestion = useCallback((correctWord, wordIndex, selectedWord) => {
    // Close popup after showing feedback
    setShowSuggestionPopup(false);

    // Show points animation for wrong suggestion
    const wrongButton = document.querySelector('.popup .optionButton.wrong') ||
                       document.querySelector('.popup .optionButtonMobile.wrong') ||
                       document.querySelector('.popupMobile .optionButtonMobile.wrong');
    if (wrongButton) {
      showPointsAnimation(-0.5, wrongButton);
    }

    // Update points
    updatePoints(-0.5, `Wrong suggestion selected: ${selectedWord}, correct: ${correctWord}`);

    // Reset streak when wrong word is selected
    console.log('❌ Wrong word selected from suggestion! Resetting streak...');
    setConsecutiveSentences(0);

    // Clear streak-related local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('streakLastUpdate');
    }
    setStreakUpdatedToday(false);
    setStreakIncrements(0);

    // Always reset streak in database when user makes a mistake
    const token = localStorage.getItem('token');
    if (token && user) {
      fetch('/api/user/streak', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'reset' })
      }).then(() => {
        console.log('Streak reset to 0 in database (wrong suggestion)');
        // Trigger streak refresh in Header
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('streakUpdated'));
        }
      }).catch(err => console.error('Error resetting streak:', err));
    }
  }, [showPointsAnimation, updatePoints, user]);

  /**
   * ============================================================================
   * DYNAMIC HTML GENERATION FOR DICTATION
   * ============================================================================
   *
   * This function generates HTML dynamically with GLOBAL CSS classes.
   *
   * WHY GLOBAL CLASSES:
   * -------------------
   * - We use innerHTML to create interactive word elements at runtime
   * - CSS Modules would require dynamic class name generation (complex)
   * - Global classes are simpler and work well when properly scoped
   *
   * GLOBAL CLASSES GENERATED:
   * -------------------------
   * - .word-container    → Wrapper for each word + input/button
   * - .hint-btn          → Button to reveal the word
   * - .word-input        → Input field for typing
   * - .correct-word      → Display for correctly typed word
   * - .completed-word    → Word from a completed sentence
   * - .word-punctuation  → Punctuation marks
   *
   * SCOPING MECHANISM:
   * ------------------
   * These classes are styled in dictationPage.module.css using:
   *   .dictationInputArea :global(.word-input) { }
   *
   * This means they ONLY work inside .dictationInputArea and won't
   * affect other components/pages.
   *
   * CSS MODULES PATTERN:
   * --------------------
   * ✅ Container uses CSS Modules: className={styles.dictationInputArea}
   * ⚠️ Children use global classes: class="word-input"
   * ✅ Global classes are scoped by parent CSS Module class
   *
   * This is a VALID and DOCUMENTED approach when working with dynamic HTML.
   * See: dictationPage.module.css (line 977) for detailed documentation.
   * ============================================================================
   */
  const processLevelUp = useCallback((sentence, isCompleted, sentenceWordsCompleted, hidePercent) => {
    const sentences = sentence.split(/\n+/);

    const processedSentences = sentences.map((sentence) => {
      const words = sentence.split(/\s+/);

      // Determine which words to hide based on hidePercentage
      const validWordIndices = [];
      words.forEach((word, idx) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          validWordIndices.push(idx);
        }
      });

      // Calculate how many words to hide
      const totalValidWords = validWordIndices.length;
      const wordsToHideCount = Math.ceil((totalValidWords * hidePercent) / 100);

      // Deterministically select words to hide based on sentence index and word position
      const hiddenWordIndices = new Set();
      if (hidePercent < 100) {
        // Use seeded random to make it consistent for the same sentence
        // Seed is based on currentSentenceIndex to ensure same words are hidden on each render
        const shuffled = [...validWordIndices].sort((a, b) => {
          const seedA = seededRandom(currentSentenceIndex * 1000 + a);
          const seedB = seededRandom(currentSentenceIndex * 1000 + b);
          return seedA - seedB;
        });
        for (let i = 0; i < wordsToHideCount; i++) {
          hiddenWordIndices.add(shuffled[i]);
        }
      } else {
        // Hide all words (100%)
        validWordIndices.forEach(idx => hiddenWordIndices.add(idx));
      }

      const processedWords = words.map((word, wordIndex) => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        if (pureWord.length >= 1) {
          const nonAlphaNumeric = word.replace(/[a-zA-Z0-9üäöÜÄÖß]/g, "");

          // Check if this specific word is completed
          const isWordCompleted = sentenceWordsCompleted && sentenceWordsCompleted[wordIndex];

          // If entire sentence is completed, show all words
          if (isCompleted) {
            return `<span class="word-container completed">
              <span class="correct-word completed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }

          // If this specific word is completed, show it
          if (isWordCompleted) {
            return `<span class="word-container">
              <span class="correct-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }

          // Check if this word should be hidden based on hidePercentage
          const shouldHide = hiddenWordIndices.has(wordIndex);

          if (shouldHide) {
            // Show input with hint button (hidden)
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
                 oninput="window.checkWord?.(this, '${pureWord}', ${wordIndex})"
                 onclick="window.handleInputClick?.(this, '${pureWord}')"
                 onkeydown="window.disableArrowKeys?.(event)"
                 onfocus="window.handleInputFocus?.(this, '${pureWord}')"
                 onblur="window.handleInputBlur?.(this, '${pureWord}')"
                 maxlength="${pureWord.length}"
                 size="${dynamicSize}"
                 placeholder="${'*'.repeat(pureWord.length)}"
                 autocomplete="off"
                 style="width: ${dynamicSize}ch;"
               />
             <span class="word-punctuation">${nonAlphaNumeric}</span>
           </span>`;
          } else {
            // Show the word (not hidden)
            return `<span class="word-container">
              <span class="correct-word revealed-word" onclick="window.handleWordClickForPopup && window.handleWordClickForPopup('${pureWord}', this)">${pureWord}</span>
              <span class="word-punctuation">${nonAlphaNumeric}</span>
            </span>`;
          }
        }
        return `<span>${word}</span>`;
      });

      return processedWords.join(" ");
    });

    return processedSentences.join(" ");
  }, [currentSentenceIndex, seededRandom]);

  // Initialize dictation for current sentence
  useEffect(() => {
    console.log('🔍 Dictation render check:', {
      transcriptDataLength: transcriptData.length,
      currentSentenceIndex,
      hasSentence: !!transcriptData[currentSentenceIndex],
      progressLoaded,
      sentenceText: transcriptData[currentSentenceIndex]?.text?.substring(0, 50)
    });

    // Render dictation content if transcript is loaded (even if progress is still loading)
    if (transcriptData.length > 0 && transcriptData[currentSentenceIndex]) {
      const text = transcriptData[currentSentenceIndex].text;
      const isCompleted = progressLoaded && completedSentences.includes(currentSentenceIndex);
      const sentenceWordsCompleted = progressLoaded ? (completedWords[currentSentenceIndex] || {}) : {};

      console.log('✅ Rendering sentence', currentSentenceIndex, ':', {
        isCompleted,
        sentenceWordsCompleted,
        allCompletedWords: completedWords,
        hidePercentage,
        textLength: text.length,
        progressLoaded
      });

      const processed = processLevelUp(text, isCompleted, sentenceWordsCompleted, hidePercentage);
      console.log('📝 Processed HTML length:', processed.length);
      setProcessedText(processed);
      
      // Detect sentence length and add appropriate class + set word-length CSS variables
      setTimeout(() => {
        // NOTE: Using class selector here instead of ref because this element
        // is rendered via dangerouslySetInnerHTML. The class is from CSS Modules
        // (styles.dictationInputArea) but we query it as a plain class.
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

      // Expose functions to window object for dynamic HTML event handlers
      // NOTE: These functions are called from dynamically generated HTML (innerHTML)
      // via onclick, oninput, etc. Since the HTML is created as strings, we can't
      // use React event handlers directly. This is a valid pattern for this use case.
      if (typeof window !== 'undefined') {
        window.checkWord = checkWord;
        window.handleInputClick = handleInputClick;
        window.handleInputFocus = handleInputFocus;
        window.handleInputBlur = handleInputBlur;
        window.saveWord = saveWord;
        window.showHint = showHint;
        window.handleWordClickForPopup = handleWordClickForPopup;
        window.showPointsAnimation = showPointsAnimation;
        window.disableArrowKeys = (e) => {
          // Prevent all arrow keys and space from being typed in input fields
          if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
          }
        };
      }
    }
  }, [currentSentenceIndex, transcriptData, processLevelUp, checkWord, handleInputClick, handleInputFocus, handleInputBlur, saveWord, showHint, handleWordClickForPopup, completedSentences, completedWords, progressLoaded, hidePercentage, showPointsAnimation]);

  const handleBackToHome = () => router.push('/');

  // Calculate accurate progress based on words completed (not just sentences)
  const progressPercentage = useMemo(() => {
    if (!transcriptData || transcriptData.length === 0) return 0;

    let totalWords = 0;
    let completedWordsCount = 0;

    transcriptData.forEach((segment, sentenceIndex) => {
      const words = segment.text.split(/\s+/);
      const validWords = words.filter(word => {
        const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
        return pureWord.length >= 1;
      });

      totalWords += validWords.length;

      // Count completed words for this sentence
      const sentenceWordsCompleted = completedWords[sentenceIndex] || {};
      const completedCount = Object.keys(sentenceWordsCompleted).filter(
        wordIdx => sentenceWordsCompleted[wordIdx]
      ).length;

      completedWordsCount += completedCount;
    });

    return totalWords > 0 ? Math.round((completedWordsCount / totalWords) * 100) : 0;
  }, [transcriptData, completedWords]);

  // Set initial sentence to first incomplete sentence when progress is loaded
  useEffect(() => {
    if (progressLoaded && sortedTranscriptIndices.length > 0 && !hasJumpedToIncomplete.current && transcriptData.length > 0) {
      // Always jump to first incomplete sentence in sorted list
      const firstIncompleteSentence = sortedTranscriptIndices[0];
      
      console.log('🎯 Jump Logic Debug:', {
        totalSentences: transcriptData.length,
        sortedIndicesLength: sortedTranscriptIndices.length,
        completedSentences: completedSentences,
        firstIncompleteSentence: firstIncompleteSentence,
        isFirstCompleted: completedSentences.includes(firstIncompleteSentence),
        sortedIndices: sortedTranscriptIndices.slice(0, 10) // Show first 10
      });
      
      setCurrentSentenceIndex(firstIncompleteSentence);
      
      // Also seek video to that sentence's start time
      const targetSentence = transcriptData[firstIncompleteSentence];
      if (targetSentence) {
        // Seek to the sentence without auto-playing
        if (isYouTube && youtubePlayerRef.current?.seekTo) {
          youtubePlayerRef.current.seekTo(targetSentence.start, true);
          setCurrentTime(targetSentence.start);
        } else if (audioRef.current) {
          audioRef.current.currentTime = targetSentence.start;
          setCurrentTime(targetSentence.start);
        }
        setSegmentPlayEndTime(targetSentence.end);
      }
      
      hasJumpedToIncomplete.current = true;
    }
  }, [progressLoaded, sortedTranscriptIndices, completedSentences, transcriptData, isYouTube]);

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
        title={`${lesson.displayTitle || lesson.title} - Diktat Übung | PapaGeil`}
        description={`Verbessere dein Deutsch mit Diktat: "${lesson.title}". ✓ Level ${lesson.difficulty || 'A1-C2'} ✓ Hörverstehen trainieren ✓ Rechtschreibung üben ✓ Mit sofortigem Feedback`}
        keywords={`Diktat ${lesson.title}, Deutsch Diktat üben, ${lesson.difficulty || 'A1-C2'} Deutsch, Hörverstehen Deutsch, Rechtschreibung Deutsch, PapaGeil Diktat, German dictation practice, Deutsch schreiben lernen`}
        ogType="video.other"
        ogImage={lesson.thumbnail || '/og-image.jpg'}
        canonicalUrl={`/dictation/${lessonId}`}
        locale="de_DE"
        author="PapaGeil"
        publishedTime={lesson.createdAt}
        modifiedTime={lesson.updatedAt || lesson.createdAt}
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
            {/* Video Header */}
            <div className={styles.videoHeader}>
              <h3 className={styles.transcriptTitle}>Video</h3>
              <div className={styles.studyTimer}>
                <span className={styles.timerIcon}>⏱️</span>
                <span className={styles.timerText}>{formatStudyTime(studyTime)}</span>
              </div>
            </div>

            <div className={styles.videoWrapper}>
              {/* Video Container - Always visible */}
              <div className={styles.videoContainer}>
                {isYouTube ? (
                  <div className={styles.videoPlayerWrapper}>
                    <div id="youtube-player"></div>
                     <div className={styles.videoOverlay} onClick={() => transcriptData[currentSentenceIndex] && handleSentenceClick(transcriptData[currentSentenceIndex].start, transcriptData[currentSentenceIndex].end)}>
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
                  <div className={styles.controlRow}>
                    <label className={styles.toggleLabel}>
                      <input
                        type="checkbox"
                        checked={autoStop}
                        onChange={(e) => setAutoStop(e.target.checked)}
                        className={styles.toggleInput}
                      />
                      <span className={styles.toggleSlider}></span>
                      <span className={styles.toggleText}>Auto Stop</span>
                    </label>
                    <button className={`${styles.startButton} ${styles.controlStartButton}`} onClick={handlePlayPause}>
                      ▶ Start
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Dictation Area */}
          <div className={styles.middleSection}>
            {/* Dictation Header */}
            <div className={styles.dictationHeader}>
              <h3 className={styles.dictationHeaderTitle}>
                {isMobile 
                  ? (autoJumpToIncomplete && mobileVisibleIndices.length > 0 && mobileVisibleIndices.length < transcriptData.length
                      ? (
                          <>
                            <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>
                            <span className={styles.sentenceDivider}>/</span>
                            <span className={styles.sentenceRemaining}>{mobileVisibleIndices.length}</span>
                          </>
                        )
                      : <span className={styles.sentenceNumber}>#{currentSentenceIndex + 1}</span>)
                  : 'Dictation'}
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Hide Level Selector */}
                <div className={styles.hideLevelSelector}>
                  <select
                    value={difficultyLevel}
                    onChange={(e) => handleDifficultyChange(e.target.value)}
                    className={styles.hideLevelDropdown}
                    title="Wählen Sie den Schwierigkeitsgrad"
                  >
                    <option value="a1">A1 (10%)</option>
                    <option value="a2">A2 (30%)</option>
                    <option value="b1">B1 (30%)</option>
                    <option value="b2">B2 (60%)</option>
                    <option value="c1">C1 (100%)</option>
                    <option value="c2">C2 (100%)</option>
                  </select>
                </div>
                {/* Auto-Jump Toggle Button - Show on both desktop and mobile */}
                <button
                  onClick={() => setAutoJumpToIncomplete(!autoJumpToIncomplete)}
                  className={styles.autoJumpToggle}
                  data-active={autoJumpToIncomplete}
                  title={autoJumpToIncomplete ? 'Auto-jump: ON (Click to disable)' : 'Auto-jump: OFF (Click to enable)'}
                >
                  {autoJumpToIncomplete ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="13 17 18 12 13 7"></polyline>
                      <polyline points="6 17 11 12 6 7"></polyline>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  )}
                </button>
              </div>
              {!isMobile && (
                <div className={styles.sentenceCounter}>
                  #{currentSentenceIndex + 1} / {transcriptData.length}
                </div>
              )}
            </div>

            <div className={styles.dictationContainer}>
              {/* Mobile: Horizontal Scrollable Slides with Lazy Loading */}
              {transcriptData.length === 0 ? (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: '100%',
                  padding: '20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)'
                }}>
                  <div>
                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                    <div>Loading dictation...</div>
                  </div>
                </div>
              ) : isMobile ? (
                <div className={styles.dictationSlidesWrapper}>
                  {/* Progress Dots Indicator */}
                  <div className={styles.progressDotsContainer}>
                    {mobileVisibleIndices.map((originalIndex, dotIndex) => {
                      const isActive = originalIndex === currentSentenceIndex;
                      const isCompleted = completedSentences.includes(originalIndex);
                      return (
                        <button
                          key={`dot-${originalIndex}`}
                          className={`${styles.progressDot} ${isActive ? styles.progressDotActive : ''} ${isCompleted ? styles.progressDotCompleted : ''}`}
                          onClick={() => {
                            // Haptic feedback for dot click
                            hapticEvents.dotClick();
                            
                            setCurrentSentenceIndex(originalIndex);
                            const sentence = transcriptData[originalIndex];
                            if (sentence) {
                              handleSentenceClick(sentence.start, sentence.end);
                            }
                          }}
                          aria-label={`Go to sentence ${originalIndex + 1}`}
                          title={`Sentence ${originalIndex + 1}${isCompleted ? ' (completed)' : ''}`}
                        />
                      );
                    })}
                  </div>

                  <div 
                    className={styles.dictationSlides}
                    ref={dictationSlidesRef}
                  >
                    {/* Spacer for slides before lazy range */}
                    {lazySlideRange.start > 0 && (
                      <div 
                        className={styles.slidesSpacer}
                        style={{ 
                          width: `calc(${lazySlideRange.start} * (94% + 12px))`,
                          flexShrink: 0
                        }}
                      />
                    )}

                    {/* Render only lazy-loaded slides */}
                    {lazySlidesToRender.map((originalIndex, arrayIndex) => {
                      const sentence = transcriptData[originalIndex];
                      const isCompleted = completedSentences.includes(originalIndex);
                      const sentenceWordsCompleted = completedWords[originalIndex] || {};
                      const isActive = originalIndex === currentSentenceIndex;
                      
                      // Generate processed text for this sentence
                      const sentenceProcessedText = processLevelUp(
                        sentence.text,
                        isCompleted,
                        sentenceWordsCompleted,
                        hidePercentage
                      );

                      return (
                        <div
                          key={originalIndex}
                          data-slide-index={lazySlideRange.start + arrayIndex}
                          className={`${styles.dictationSlide} ${isActive ? styles.dictationSlideActive : ''}`}
                          onClick={() => {
                            if (!isActive) {
                              setCurrentSentenceIndex(originalIndex);
                              handleSentenceClick(sentence.start, sentence.end);
                            }
                          }}
                        >
                          {isCompleted && (
                            <div className={styles.slideHeader}>
                              <span className={styles.slideCompleted}>✓</span>
                            </div>
                          )}
                          <div
                            className={`${styles.dictationInputArea} ${swipeDirection && isActive ? styles[`swipe-${swipeDirection}`] : ''}`}
                            data-sentence-index={originalIndex}
                            dangerouslySetInnerHTML={{ __html: sentenceProcessedText }}
                            onTouchStart={isActive ? handleTouchStart : undefined}
                            onTouchMove={isActive ? handleTouchMove : undefined}
                            onTouchEnd={isActive ? handleTouchEnd : undefined}
                          />
                          {isActive && (
                            <div className={styles.dictationActions}>
                              <button
                                className={styles.showAllWordsButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Reveal all words for current sentence
                                  const slideElement = e.currentTarget.closest(`.${styles.dictationSlide}`);
                                  const allInputs = slideElement.querySelectorAll('.word-input');
                                  const wordsToComplete = {};

                                  allInputs.forEach((input) => {
                                    const wordIndexMatch = input.id.match(/word-(\d+)/);
                                    if (wordIndexMatch) {
                                      const wordIndex = parseInt(wordIndexMatch[1]);
                                      const correctWord = input.getAttribute('oninput').match(/'([^']+)'/)[1];
                                      wordsToComplete[wordIndex] = correctWord;
                                      saveWord(correctWord);
                                    }
                                  });

                                  setCompletedWords(prevWords => {
                                    const updatedWords = { ...prevWords };
                                    if (!updatedWords[currentSentenceIndex]) {
                                      updatedWords[currentSentenceIndex] = {};
                                    }
                                    updatedWords[currentSentenceIndex] = {
                                      ...updatedWords[currentSentenceIndex],
                                      ...wordsToComplete
                                    };
                                    
                                    // Only mark as completed if we actually revealed words AND they meet the threshold
                                    if (Object.keys(wordsToComplete).length > 0) {
                                      // Calculate total words that needed to be filled
                                      const sentence = transcriptData[currentSentenceIndex];
                                      if (sentence) {
                                        const words = sentence.text.split(/\s+/);
                                        const validWordIndices = [];
                                        words.forEach((word, idx) => {
                                          const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
                                          if (pureWord.length >= 1) {
                                            validWordIndices.push(idx);
                                          }
                                        });
                                        
                                        const totalValidWords = validWordIndices.length;
                                        const wordsToHideCount = Math.ceil((totalValidWords * hidePercentage) / 100);
                                        const totalCompletedWords = Object.keys(updatedWords[currentSentenceIndex]).length;
                                        
                                        // Mark as completed only if total completed words >= required threshold
                                        if (totalCompletedWords >= wordsToHideCount && wordsToHideCount > 0 && !completedSentences.includes(currentSentenceIndex)) {
                                          const updatedCompleted = [...completedSentences, currentSentenceIndex];
                                          setCompletedSentences(updatedCompleted);
                                          saveProgress(updatedCompleted, updatedWords);
                                          console.log(`✅ Sentence ${currentSentenceIndex} completed via Show All (mobile)!`);
                                          
                                          // Auto-jump to next incomplete sentence if enabled
                                          if (autoJumpToIncomplete) {
                                            setTimeout(() => {
                                              // Find next incomplete sentence
                                              let nextIncompleteIndex = -1;
                                              for (let i = 0; i < sortedTranscriptIndices.length; i++) {
                                                const sentenceIdx = sortedTranscriptIndices[i];
                                                if (!updatedCompleted.includes(sentenceIdx)) {
                                                  nextIncompleteIndex = sentenceIdx;
                                                  console.log(`🚀 Auto-jumping to sentence ${nextIncompleteIndex} after Show All (mobile)`);
                                                  break;
                                                }
                                              }
                                              
                                              // Navigate to next incomplete sentence if found
                                              if (nextIncompleteIndex !== -1 && nextIncompleteIndex !== currentSentenceIndex) {
                                                setCurrentSentenceIndex(nextIncompleteIndex);
                                                const item = transcriptData[nextIncompleteIndex];
                                                if (item) {
                                                  handleSentenceClick(item.start, item.end);
                                                }
                                              } else {
                                                console.log('🎉 All sentences completed!');
                                                toast.success('🎉 All sentences completed! Great job!');
                                              }
                                            }, 400);
                                          }
                                        } else {
                                          // Just save progress without marking as complete
                                          saveProgress(completedSentences, updatedWords);
                                        }
                                      }
                                    } else {
                                      saveProgress(completedSentences, updatedWords);
                                    }
                                    
                                    return updatedWords;
                                  });
                                }}
                              >
                                Show all
                              </button>
                              
                              <button 
                                className={styles.nextButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  goToNextSentence();
                                }}
                                disabled={sortedTranscriptIndices.indexOf(currentSentenceIndex) >= sortedTranscriptIndices.length - 1}
                              >
                                Next
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                  <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Spacer for slides after lazy range */}
                    {lazySlideRange.end < mobileVisibleIndices.length && (
                      <div 
                        className={styles.slidesSpacer}
                        style={{ 
                          width: `calc(${mobileVisibleIndices.length - lazySlideRange.end} * (94% + 12px))`,
                          flexShrink: 0
                        }}
                      />
                    )}
                  </div>
                </div>
              ) : (
                /* Desktop: Single Sentence View */
                <>
                  <div
                    className={`${styles.dictationInputArea} ${swipeDirection ? styles[`swipe-${swipeDirection}`] : ''}`}
                    data-sentence-index={currentSentenceIndex}
                    dangerouslySetInnerHTML={{ __html: processedText }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  />

                  <div className={styles.dictationActions}>
                    <button
                      className={styles.showAllWordsButton}
                      onClick={() => {
                        const allInputs = document.querySelectorAll('.word-input');
                        const wordsToComplete = {};

                        allInputs.forEach((input) => {
                          const wordIndexMatch = input.id.match(/word-(\d+)/);
                          if (wordIndexMatch) {
                            const wordIndex = parseInt(wordIndexMatch[1]);
                            const correctWord = input.getAttribute('oninput').match(/'([^']+)'/)[1];
                            wordsToComplete[wordIndex] = correctWord;
                            saveWord(correctWord);
                          }
                        });

                        setCompletedWords(prevWords => {
                          const updatedWords = { ...prevWords };
                          if (!updatedWords[currentSentenceIndex]) {
                            updatedWords[currentSentenceIndex] = {};
                          }
                          updatedWords[currentSentenceIndex] = {
                            ...updatedWords[currentSentenceIndex],
                            ...wordsToComplete
                          };
                          
                          // Only mark as completed if we actually revealed words AND they meet the threshold
                          if (Object.keys(wordsToComplete).length > 0) {
                            // Calculate total words that needed to be filled
                            const sentence = transcriptData[currentSentenceIndex];
                            if (sentence) {
                              const words = sentence.text.split(/\s+/);
                              const validWordIndices = [];
                              words.forEach((word, idx) => {
                                const pureWord = word.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "");
                                if (pureWord.length >= 1) {
                                  validWordIndices.push(idx);
                                }
                              });
                              
                              const totalValidWords = validWordIndices.length;
                              const wordsToHideCount = Math.ceil((totalValidWords * hidePercentage) / 100);
                              const totalCompletedWords = Object.keys(updatedWords[currentSentenceIndex]).length;
                              
                              // Mark as completed only if total completed words >= required threshold
                              if (totalCompletedWords >= wordsToHideCount && wordsToHideCount > 0 && !completedSentences.includes(currentSentenceIndex)) {
                                const updatedCompleted = [...completedSentences, currentSentenceIndex];
                                setCompletedSentences(updatedCompleted);
                                saveProgress(updatedCompleted, updatedWords);
                                console.log(`✅ Sentence ${currentSentenceIndex} completed via Show All!`);
                                
                                // Auto-jump to next incomplete sentence if enabled
                                if (autoJumpToIncomplete) {
                                  setTimeout(() => {
                                    // Find next incomplete sentence
                                    let nextIncompleteIndex = -1;
                                    for (let i = 0; i < sortedTranscriptIndices.length; i++) {
                                      const sentenceIdx = sortedTranscriptIndices[i];
                                      if (!updatedCompleted.includes(sentenceIdx)) {
                                        nextIncompleteIndex = sentenceIdx;
                                        console.log(`🚀 Auto-jumping to sentence ${nextIncompleteIndex} after Show All`);
                                        break;
                                      }
                                    }
                                    
                                    // Navigate to next incomplete sentence if found
                                    if (nextIncompleteIndex !== -1 && nextIncompleteIndex !== currentSentenceIndex) {
                                      setCurrentSentenceIndex(nextIncompleteIndex);
                                      const item = transcriptData[nextIncompleteIndex];
                                      if (item) {
                                        handleSentenceClick(item.start, item.end);
                                      }
                                    } else {
                                      console.log('🎉 All sentences completed!');
                                      toast.success('🎉 All sentences completed! Great job!');
                                    }
                                  }, 400);
                                }
                              } else {
                                // Just save progress without marking as complete
                                saveProgress(completedSentences, updatedWords);
                              }
                            }
                          } else {
                            saveProgress(completedSentences, updatedWords);
                          }
                          
                          return updatedWords;
                        });
                      }}
                    >
                      Show all words
                    </button>
                    
                    <button 
                      className={styles.nextButton}
                      onClick={goToNextSentence}
                      disabled={sortedTranscriptIndices.indexOf(currentSentenceIndex) >= sortedTranscriptIndices.length - 1}
                    >
                      Next
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708z"/>
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right Column - Transcript List */}
          <div className={styles.rightSection}>
            <div className={styles.transcriptHeader}>
              <h3 className={styles.transcriptTitle}>
                Transcript
              </h3>
              <ProgressIndicator
                completedSentences={completedSentences}
                totalSentences={transcriptData.length}
                completedWords={completedWords}
                totalWords={transcriptData.reduce((sum, sentence) => {
                  const words = sentence.text.split(/\s+/).filter(w => w.replace(/[^a-zA-Z0-9üäöÜÄÖß]/g, "").length >= 1);
                  return sum + words.length;
                }, 0)}
                difficultyLevel={difficultyLevel}
                hidePercentage={hidePercentage}
                studyTime={studyTime}
              />
            </div>
            
             <div className={styles.transcriptSection} ref={transcriptSectionRef}>
               <div className={styles.transcriptList}>
                 {sortedTranscriptIndices.map((originalIndex) => {
                   const segment = transcriptData[originalIndex];
                   const isCompleted = completedSentences.includes(originalIndex);
                   const sentenceWordsCompleted = completedWords[originalIndex] || {};

                   return (
                     <div
                       key={originalIndex}
                       ref={(el) => {
                         transcriptItemRefs.current[originalIndex] = el;
                       }}
                       className={`${styles.transcriptItem} ${originalIndex === currentSentenceIndex ? styles.active : ''}`}
                       onClick={() => handleSentenceClick(segment.start, segment.end)}
                     >
                       <div className={styles.transcriptItemNumber}>#{originalIndex + 1}</div>
                       <div className={styles.transcriptItemText}>
                         {isCompleted ? segment.text : maskTextByPercentage(segment.text, originalIndex, hidePercentage, sentenceWordsCompleted)}
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
            disabled={sortedTranscriptIndices.indexOf(currentSentenceIndex) === 0}
            title="Previous"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button 
            className={styles.mobileControlBtn}
            onClick={goToNextSentence}
            disabled={sortedTranscriptIndices.indexOf(currentSentenceIndex) >= sortedTranscriptIndices.length - 1}
            title="Next"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Mobile Tooltip */}
      {showTooltip && (
        <WordTooltip
          translation={tooltipTranslation}
          position={tooltipPosition}
          onClose={() => {
            setShowTooltip(false);
            setTooltipTranslation('');
          }}
        />
      )}

      {/* Loading indicator for word lookup */}
      {showWordLoading && (
        <>
          <style>{`
            @keyframes wordLoadingSpin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
          <div
            style={{
              position: 'fixed',
              top: `${loadingPosition.top}px`,
              left: `${loadingPosition.left}px`,
              transform: 'translateX(-50%)',
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.85)',
              color: 'white',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div
              style={{
                width: '12px',
                height: '12px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'wordLoadingSpin 0.6s linear infinite'
              }}
            />
            Loading...
          </div>
        </>
      )}

      {/* Desktop Dictionary Popup */}
      {showVocabPopup && !isMobile && (
        <DictionaryPopup
          word={selectedWord}
          position={popupPosition}
          arrowPosition={popupArrowPosition}
          lessonId={lessonId}
          context={transcriptData[currentSentenceIndex]?.text || ''}
          onClose={() => {
            setShowVocabPopup(false);
            setClickedWordElement(null);
          }}
        />
      )}

      {/* Word Suggestion Popup */}
      {showSuggestionPopup && (
        <WordSuggestionPopup
          correctWord={suggestionWord}
          context={suggestionContext}
          wordIndex={suggestionWordIndex}
          position={suggestionPosition}
          onCorrectAnswer={handleCorrectSuggestion}
          onWrongAnswer={handleWrongSuggestion}
          onClose={() => setShowSuggestionPopup(false)}
        />
      )}

      {/* Points animations */}
      {pointsAnimations.map(animation => (
        <PointsAnimation
          key={animation.id}
          points={animation.points}
          startPosition={animation.startPosition}
          endPosition={animation.endPosition}
          onComplete={() => {}}
        />
      ))}

      {/* Streak notification */}
      <StreakNotification 
        show={showStreakNotification}
        onComplete={() => setShowStreakNotification(false)}
      />
    </div>
  );
};

const DictationPage = () => {
  return <DictationPageContent />;
};

export default DictationPage;
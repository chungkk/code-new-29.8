import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../../components/SEO';
import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import SentenceListItem from '../../components/SentenceListItem';
import DictionaryPopup from '../../components/DictionaryPopup';
import WordTooltip from '../../components/WordTooltip';
import { useProgress } from '../../lib/hooks/useProgress';
import { useLessonData } from '../../lib/hooks/useLessonData';
import { youtubeAPI } from '../../lib/youtubeApi';
import { useAuth } from '../../context/AuthContext';
import { speakText } from '../../lib/textToSpeech';
import { toast } from 'react-toastify';
import { translationCache } from '../../lib/translationCache';
import styles from '../../styles/shadowingPage.module.css';

const MAX_STUDY_TIME = 24 * 60 * 60; // 24 hours in seconds
const DEBUG_TIMER = false; // Set to true to enable timer logs

const ShadowingPageContent = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId } = useRouter().query;
  
  const [transcriptData, setTranscriptData] = useState([]);
  const [isTextHidden, setIsTextHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [segmentEndTimeLocked, setSegmentEndTimeLocked] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [pausedPositions, setPausedPositions] = useState({}); // { sentenceIndex: pausedTime }
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekTimeout, setUserSeekTimeout] = useState(null);

  // Use SWR hook for combined lesson + progress data
  const { lesson, progress: loadedProgress, studyTime: loadedStudyTime, isLoading: loading } = useLessonData(lessonId, 'shadowing');

  // Parroto-style controls
  const [autoStop, setAutoStop] = useState(true);
  const [showIPA, setShowIPA] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
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
  const [isMobile, setIsMobile] = useState(false);

  // Progress loading state
  const [progressLoaded, setProgressLoaded] = useState(false);

  // Study time tracking
  const [studyTime, setStudyTime] = useState(0); // Total study time in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [lastPauseTime, setLastPauseTime] = useState(null); // Track when video was paused
  const timerIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const hasStartedTimerRef = useRef(false); // Track if timer has been started

  const { user } = useAuth();

  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const playerContainerRef = useRef(null);
  const initTimerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const { saveProgress } = useProgress(lessonId, 'shadowing');
  const activeTranscriptItemRef = useRef(null);
  const transcriptListRef = useRef(null);

  // Leaderboard tracking
  const sessionStartTimeRef = useRef(Date.now());
  const completedSentencesRef = useRef(new Set());
  const lastStatsUpdateRef = useRef(Date.now());

  // Update monthly leaderboard stats
  const updateMonthlyStats = useCallback(async (forceUpdate = false) => {
    if (!user) return;

    const now = Date.now();
    const timeSinceLastUpdate = (now - lastStatsUpdateRef.current) / 1000; // in seconds

    // Only update if at least 60 seconds have passed or force update
    if (!forceUpdate && timeSinceLastUpdate < 60) return;

    const totalTimeSpent = Math.floor((now - sessionStartTimeRef.current) / 1000);
    const newSentencesCompleted = completedSentencesRef.current.size;

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
      completedSentencesRef.current.clear();
      lastStatsUpdateRef.current = now;
    } catch (error) {
      console.error('Error updating monthly stats:', error);
    }
  }, [user]);

  // Track sentence completion
  useEffect(() => {
    if (currentSentenceIndex >= 0 && transcriptData[currentSentenceIndex]) {
      completedSentencesRef.current.add(currentSentenceIndex);
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

  // Load progress from SWR hook
  useEffect(() => {
    if (loadedStudyTime !== undefined) {
      const validatedLoadedTime = Math.min(loadedStudyTime, MAX_STUDY_TIME);
      setStudyTime(validatedLoadedTime);
      if (DEBUG_TIMER) console.log('Loaded study time from SWR:', validatedLoadedTime);
      setProgressLoaded(true);
    }
  }, [loadedStudyTime]);



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
            mode: 'shadowing',
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
      return;
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
      return;
    }

    // Handle resume: clear pause timeout and restart timer if needed
    if (isPlaying && lastPauseTime !== null && !isTimerRunning && hasStartedTimerRef.current) {
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
  }, [isPlaying, user, lessonId, studyTime, isTimerRunning, lastPauseTime, progressLoaded]);

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

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
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
            mode: 'shadowing',
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
  }, [lastActivityTime, isTimerRunning, user, lessonId, studyTime, progressLoaded]);

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
            mode: 'shadowing',
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

  // Use centralized YouTube API manager
  useEffect(() => {
    if (typeof window === 'undefined') return;

    youtubeAPI.waitForAPI()
      .then(() => setIsYouTubeAPIReady(true))
      .catch(err => console.error('YouTube API error:', err));
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

    const initializeYouTubePlayer = () => {
      const playerOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
      const videoId = getYouTubeVideoId(lesson.youtubeUrl);
      if (!videoId) {
        console.error('Invalid YouTube URL:', lesson.youtubeUrl);
        return;
      }

      // Check if player container exists
      if (!playerContainerRef.current) {
        console.error('YouTube player container not found, retrying...');
        // Retry after a short delay
        setTimeout(initializeYouTubePlayer, 100);
        return;
      }

    // Destroy existing player if any
    if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
      try {
        youtubePlayerRef.current.destroy();
      } catch (e) {
        console.error('Error destroying previous player:', e);
      }
      youtubePlayerRef.current = null;
    }

      // Small delay to ensure DOM is ready
      initTimerRef.current = setTimeout(() => {
        try {
          // Create the player
          youtubePlayerRef.current = new window.YT.Player('youtube-player-shadowing', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          origin: playerOrigin,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration());

            // Only set size on desktop - mobile uses CSS aspect-ratio
            const isMobile = window.innerWidth <= 768;
            if (!isMobile) {
              if (playerContainerRef.current && playerContainerRef.current.parentElement) {
                // Get parent container (videoPlayerWrapper) dimensions
                const wrapper = playerContainerRef.current.parentElement;
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
        } catch (error) {
          console.error('Error initializing YouTube player:', error);
        }
      }, 100); // 100ms delay
    };

    // Start initialization
    initializeYouTubePlayer();

    // Add resize listener to adjust player size when window resizes (desktop only)
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile && youtubePlayerRef.current && youtubePlayerRef.current.setSize) {
        if (playerContainerRef.current && playerContainerRef.current.parentElement) {
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
      if (initTimerRef.current) {
        clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);

      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        try {
          youtubePlayerRef.current.destroy();
        } catch (e) {
          console.error('Error destroying player on cleanup:', e);
        }
        youtubePlayerRef.current = null;
      }
    };
  }, [lesson, isYouTubeAPIReady]);

  // Load transcript when lesson is ready (from SWR)
  useEffect(() => {
    if (lesson && lesson.json) {
      loadTranscript(lesson.json);
    }
  }, [lesson]);

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

  // Update playback speed
  useEffect(() => {
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (player && player.setPlaybackRate) {
        player.setPlaybackRate(playbackSpeed);
      }
    } else {
      const audio = audioRef.current;
      if (audio) {
        audio.playbackRate = playbackSpeed;
      }
    }
  }, [playbackSpeed, isYouTube]);

  // Tìm câu hiện tại dựa trên thời gian
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

  // Scroll active sentence to top of transcript
  const scrollToActiveSentence = useCallback(() => {
    if (activeTranscriptItemRef.current && transcriptListRef.current) {
      const container = transcriptListRef.current;
      const activeItem = activeTranscriptItemRef.current;

      const containerRect = container.getBoundingClientRect();
      const itemRect = activeItem.getBoundingClientRect();

      // Calculate the position to scroll to (100px offset so user can see previous sentence)
      const scrollTop = activeItem.offsetTop - container.offsetTop - 100;

      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // Auto-scroll to active transcript item within transcript container only
  useEffect(() => {
    scrollToActiveSentence();
  }, [currentSentenceIndex, scrollToActiveSentence]);

  // Cleanup user seek timeout
  useEffect(() => {
    return () => {
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
    };
  }, [userSeekTimeout]);

  // Calculate popup position based on word element
  const calculatePopupPosition = useCallback((element, isMobile) => {
    const rect = element.getBoundingClientRect();

    if (isMobile) {
      const tooltipHeight = 200;
      const tooltipWidth = 240;
      const gapFromWord = 20;

      let top = rect.top - tooltipHeight - gapFromWord;
      let left = rect.left + rect.width / 2;
      let arrowPos = 'bottom';

      // Check if there's enough space above
      if (top < 10) {
        top = rect.bottom + gapFromWord;
        arrowPos = 'top';
      }

      // Center horizontally with bounds checking
      const halfWidth = tooltipWidth / 2;
      if (left - halfWidth < 10) {
        left = halfWidth + 10;
      }
      if (left + halfWidth > window.innerWidth - 10) {
        left = window.innerWidth - halfWidth - 10;
      }

      return { top, left, arrowPos };
    } else {
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

      return { top, left, arrowPos };
    }
  }, []);

  // Update popup position on scroll
  useEffect(() => {
    if (!showVocabPopup || !clickedWordElement) return;

    let rafId = null;
    let isUpdating = false;

    const updatePopupPosition = () => {
      if (!isUpdating) {
        isUpdating = true;
        rafId = requestAnimationFrame(() => {
          const isMobileView = window.innerWidth <= 768;
          const { top, left, arrowPos } = calculatePopupPosition(clickedWordElement, isMobileView);
          setPopupPosition({ top, left });
          setPopupArrowPosition(arrowPos);
          isUpdating = false;
        });
      }
    };

    // Update on scroll and resize with requestAnimationFrame for smoothness
    window.addEventListener('scroll', updatePopupPosition, true); // Use capture phase for all scrollable elements
    window.addEventListener('resize', updatePopupPosition);

    return () => {
      window.removeEventListener('scroll', updatePopupPosition, true);
      window.removeEventListener('resize', updatePopupPosition);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [showVocabPopup, clickedWordElement, calculatePopupPosition]);

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

      // Scroll to the sentence immediately
      setTimeout(() => scrollToActiveSentence(), 100);
    }, [transcriptData, isYouTube, isPlaying, currentTime, pausedPositions, currentSentenceIndex, userSeekTimeout, scrollToActiveSentence]);

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

  // Handle word click for vocabulary popup
  const handleWordClickForPopup = useCallback(async (word, event) => {
    // Pause main audio if playing
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

    // Speak the word (always, for both guests and users)
    speakText(cleanedWord);

    // Show translation popup/tooltip for both guests and users
    const isMobileView = window.innerWidth <= 768;
    const element = event.target;

    if (isMobileView) {
      // Mobile: show simple tooltip with translation only
      const rect = element.getBoundingClientRect();
      const tooltipTop = rect.top - 10;
      const tooltipLeft = rect.left + rect.width / 2;

      setTooltipWord(cleanedWord);
      setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      setShowTooltip(true);

      // Fetch translation
      let translation = translationCache.get(cleanedWord, 'de', 'vi');
      if (!translation) {
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
              targetLang: 'vi'
            })
          });
          if (response.ok) {
            const data = await response.json();
            translation = data.translation;
            translationCache.set(cleanedWord, translation, 'de', 'vi');
          }
        } catch (error) {
          console.error('Translation error:', error);
          translation = 'Übersetzung nicht verfügbar';
        }
      }
      setTooltipTranslation(translation || 'Übersetzung nicht verfügbar');
    } else {
      // Desktop: show popup immediately with loading state
      const { top, left, arrowPos } = calculatePopupPosition(element, isMobileView);

      setClickedWordElement(element);
      setSelectedWord(cleanedWord);
      setPopupPosition({ top, left });
      setPopupArrowPosition(arrowPos);
      setShowVocabPopup(true);
    }
  }, [isYouTube, calculatePopupPosition]);

  // Save vocabulary to database
  const saveVocabulary = useCallback(async ({ word, translation, notes }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        toast.error(t('lesson.vocabulary.loginRequired'));
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
        toast.success(t('lesson.vocabulary.success'));
      } else {
        const error = await response.json();
        toast.error(error.message || t('lesson.vocabulary.error'));
      }
    } catch (error) {
      console.error('Save vocabulary error:', error);
      toast.error(t('lesson.vocabulary.generalError'));
    }
  }, [lessonId, transcriptData, currentSentenceIndex, t]);

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

          saveProgress({
            currentSentenceIndex,
            lastPlayed: new Date()
          });
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
        if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
          const currentSentence = transcriptData[currentSentenceIndex];

          if (audio.currentTime >= currentSentence.end - 0.05) {
            audio.currentTime = currentSentence.start;
          }

          audio.play();
          setIsPlaying(true);
          setSegmentPlayEndTime(currentSentence.end);
          setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục

          saveProgress({
            currentSentenceIndex,
            lastPlayed: new Date()
          });
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
  }, [transcriptData, currentSentenceIndex, isYouTube, saveProgress]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle keys when not in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const isMediaReady = isYouTube ? (youtubePlayerRef.current && duration > 0) : (audioRef.current && isFinite(audioRef.current.duration));

      switch (event.key) {
        case 'ArrowLeft':
          if (isMediaReady) {
            event.preventDefault();
            handleSeek('backward');
          }
          break;
        case 'ArrowRight':
          if (isMediaReady) {
            event.preventDefault();
            handleSeek('forward');
          }
          break;
        case ' ':
          if (isMediaReady) {
            event.preventDefault();
            handlePlayPause();
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          goToPreviousSentence();
          break;
        case 'ArrowDown':
          event.preventDefault();
          goToNextSentence();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence, isYouTube, duration]);

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

  const handleBackToHome = () => {
    router.push('/');
  };

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
          <h1>{t('lesson.notFound.title')}</h1>
          <p style={{ marginTop: '20px' }} dangerouslySetInnerHTML={{ __html: t('lesson.notFound.description', { lessonId }) }} />
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
            {t('lesson.notFound.backButton')}
          </button>
        </div>
      </div>
    );
  }

  // Generate structured data for this lesson
  const videoData = lesson.youtubeUrl ? generateVideoStructuredData({
    ...lesson,
    title: lesson.displayTitle || lesson.title,
    description: `Shadowing Übung: ${lesson.title}. Verbessere deine deutsche Aussprache durch aktives Nachsprechen.`,
    thumbnail: lesson.thumbnail,
    videoUrl: lesson.youtubeUrl,
    duration: duration ? `PT${Math.floor(duration)}S` : undefined,
  }) : null;

  const breadcrumbData = generateBreadcrumbStructuredData([
    { name: 'Home', url: '/' },
    { name: 'Shadowing', url: '/shadowing' },
    { name: lesson.displayTitle || lesson.title, url: `/shadowing/${lessonId}` }
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
    <>
      <SEO
        title={`${lesson.displayTitle || lesson.title} - Shadowing Übung | PapaGeil`}
        description={`Verbessere deine deutsche Aussprache mit Shadowing: "${lesson.title}". ✓ Level ${lesson.difficulty || 'A1-C2'} ✓ Interaktive Übung ✓ Mit Untertiteln und IPA-Transkription`}
        keywords={`Shadowing ${lesson.title}, Deutsch Aussprache üben, ${lesson.difficulty || 'A1-C2'} Deutsch, Shadowing Methode, PapaGeil ${lesson.displayTitle}, Deutsch sprechen lernen, German pronunciation practice, Hörverstehen Deutsch`}
        ogImage={lesson.thumbnail || '/og-image.jpg'}
        ogType="video.other"
        canonicalUrl={`/shadowing/${lessonId}`}
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

      <div className={`${styles.page} dark-theme`}>
        {!isYouTube && (
          <audio ref={audioRef} controls style={{ display: 'none' }}>
            <source src={lesson.audio} type="audio/mp3" />
            Ihr Browser unterstützt das Audio-Tag nicht.
          </audio>
        )}
        


           <div className={`${styles.appContainer} ${styles.appContainerOffset}`}>
             {/* Single Container - New Design */}
             <div className={styles.mainContainer}>
               {/* Left Section: Video + Current Sentence + Controls */}
               <div className={styles.leftSection}>
                 {/* Video Section */}
                 <div className={styles.videoSection}>
                   <div className={styles.videoHeader}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <h3 className={styles.transcriptTitle}>{t('lesson.ui.video')}</h3>
                       <div className={styles.studyTimer}>
                         <span className={styles.timerIcon}>⏱️</span>
                         <span className={styles.timerText}>{formatStudyTime(studyTime)}</span>
                       </div>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                       <label className={styles.toggleLabel}>
                         <input
                           type="checkbox"
                           checked={autoStop}
                           onChange={(e) => setAutoStop(e.target.checked)}
                           className={styles.toggleInput}
                         />
                         <span className={styles.toggleSlider}></span>
                         <span className={styles.toggleText}>{t('lesson.ui.autoStop')}</span>
                       </label>
                       <button className={styles.speedButton} onClick={() => {
                         const speeds = [0.5, 0.75, 1, 1.25, 1.5];
                         const currentIndex = speeds.indexOf(playbackSpeed);
                         const nextIndex = (currentIndex + 1) % speeds.length;
                         setPlaybackSpeed(speeds[nextIndex]);
                       }}>
                         ⚡ {playbackSpeed}x
                       </button>
                     </div>
                   </div>
                   {/* Video Player */}
                   <div className={styles.videoContainer}>
                      {isYouTube ? (
                        <div className={styles.videoWrapper}>
                          <div ref={playerContainerRef} id="youtube-player-shadowing" style={{ width: '100%', height: '100%' }}></div>
                          <div className={styles.videoOverlay} onClick={() => transcriptData[currentSentenceIndex] && handleSentenceClick(transcriptData[currentSentenceIndex].start, transcriptData[currentSentenceIndex].end)}></div>
                        </div>
                     ) : (
                       <div className={styles.videoPlaceholder}>
                         <svg viewBox="0 0 24 24" fill="currentColor">
                           <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                         </svg>
                       </div>
                     )}
                      <div className={styles.videoTimer}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </div>
                   </div>
                 </div>

                 {/* Current Sentence Display */}
                 {transcriptData[currentSentenceIndex] && (
                   <div className={styles.currentSentenceDisplay}>
                     <div className={styles.currentSentenceText}>
                       {transcriptData[currentSentenceIndex].text.split(/\s+/).map((word, idx) => {
                         const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
                         if (cleanWord.length > 0) {
                           return (
                             <span
                               key={idx}
                               className={styles.word}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleWordClickForPopup(word, e);
                               }}
                               style={{ marginRight: '6px', cursor: 'pointer' }}
                             >
                               {word}
                             </span>
                           );
                         }
                         return <span key={idx} style={{ marginRight: '6px' }}>{word}</span>;
                       })}
                     </div>
                     {showIPA && transcriptData[currentSentenceIndex].ipa && (
                       <div className={styles.currentSentenceIPA}>
                         {transcriptData[currentSentenceIndex].ipa}
                       </div>
                     )}
                   </div>
                 )}
               </div>

               {/* Right Section: Transcript */}
               <div className={styles.transcriptSection}>
                 <div className={styles.transcriptHeader}>
                   <h3 className={styles.transcriptTitle}>Transcript</h3>
                   <div className={styles.transcriptHeaderControls}>
                     <button
                       className={`${styles.headerControlButton} ${showIPA ? styles.headerControlButtonActive : ''}`}
                       onClick={() => setShowIPA(!showIPA)}
                     >
                       <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                         <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                       </svg>
                       IPA
                     </button>
                     <button
                       className={`${styles.headerControlButton} ${showTranslation ? styles.headerControlButtonActive : ''}`}
                       onClick={() => setShowTranslation(!showTranslation)}
                     >
                       <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                         {showTranslation ? (
                           <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                         ) : (
                           <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                         )}
                       </svg>
                       Trans
                     </button>
                   </div>
                 </div>
                 
                 {/* Mobile Controls Bar - Only visible on mobile */}
                 <div className={styles.mobileControlsBar}>
                   <button
                     className={`${styles.mobileControlButton} ${autoStop ? styles.mobileControlButtonActive : ''}`}
                     onClick={() => setAutoStop(!autoStop)}
                   >
                     {autoStop ? (
                       <>
                         <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                           <path d="M6 6h12v12H6z"/>
                         </svg>
                         Auto: ON
                       </>
                     ) : (
                       <>
                         <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                           <path d="M8 5v14l11-7z"/>
                         </svg>
                         Auto: OFF
                       </>
                     )}
                   </button>
                 </div>

                 <div className={styles.transcriptList} ref={transcriptListRef}>
                   {transcriptData.map((segment, index) => (
                     <div
                       key={index}
                       ref={currentSentenceIndex === index ? activeTranscriptItemRef : null}
                       className={`${styles.transcriptItem} ${currentSentenceIndex === index ? styles.transcriptItemActive : ''}`}
                       onClick={() => handleSentenceClick(segment.start, segment.end)}
                     >
                       <div className={styles.transcriptItemHeader}>
                         <span className={styles.transcriptNumber}>#{index + 1}</span>
                       </div>

                       <div className={styles.transcriptText}>
                         {segment.text.split(/\s+/).map((word, idx) => {
                           const cleanWord = word.replace(/[.,!?;:)(\[\]{}\"'`„"‚'»«›‹—–-]/g, '');
                           if (cleanWord.length > 0) {
                             return (
                               <span
                                 key={idx}
                                 className={isMobile ? styles.word : ''}
                                 onClick={isMobile ? (e) => {
                                   e.stopPropagation();
                                   handleWordClickForPopup(word, e);
                                 } : undefined}
                                 style={{ marginRight: '6px' }}
                               >
                                 {word}
                               </span>
                             );
                           }
                           return <span key={idx} style={{ marginRight: '6px' }}>{word}</span>;
                         })}
                       </div>

                       {showIPA && segment.ipa && (
                         <div className={styles.transcriptIPA}>{segment.ipa}</div>
                       )}

                       {showTranslation && segment.translation && (
                         <div className={styles.transcriptTranslation}>{segment.translation}</div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
              </div>

              {/* Start Button Below Script */}
              <div className={styles.startButtonContainer}>
                <button 
                  className={styles.navButton}
                  onClick={goToPreviousSentence}
                  disabled={currentSentenceIndex === 0}
                  title="Previous Sentence"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                  </svg>
                </button>
                
                <button 
                  className={`${styles.startButton} ${isPlaying ? styles.startButtonPlaying : ''}`} 
                  onClick={handlePlayPause}
                >
                  {isPlaying ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                      Start
                    </>
                  )}
                </button>
                
                <button 
                  className={styles.navButton}
                  onClick={goToNextSentence}
                  disabled={currentSentenceIndex >= transcriptData.length - 1}
                  title="Next Sentence"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                    <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                  </svg>
                </button>
              </div>
        </div>

         {/* Footer Controls - Hidden in Parroto design */}
         {/* <div suppressHydrationWarning>
           <FooterControls
             onSeek={handleSeek}
             onPlayPause={handlePlayPause}
             isPlaying={isPlaying}
             classNames={footerClassNames}
           />
         </div> */}

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

         {/* Dictionary Popup (desktop only) */}
         {showVocabPopup && (
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

         {/* Word Tooltip (mobile only - simple translation) */}
         {showTooltip && (
           <WordTooltip
             translation={tooltipTranslation}
             position={tooltipPosition}
             onClose={() => setShowTooltip(false)}
           />
         )}
       </div>
     </>
   );
};

const ShadowingPage = () => {
  return <ShadowingPageContent />;
};

export default ShadowingPage;

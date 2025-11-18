import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../../components/SEO';
import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import SentenceListItem from '../../components/SentenceListItem';
import DictionaryPopup from '../../components/DictionaryPopup';
import WordTooltip from '../../components/WordTooltip';
import { useProgress } from '../../lib/hooks/useProgress';
import { useAuth } from '../../context/AuthContext';
import { speakText } from '../../lib/textToSpeech';
import { toast } from 'react-toastify';
import { translationCache } from '../../lib/translationCache';
import styles from '../../styles/shadowingPage.module.css';


const ShadowingPageContent = () => {
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
  const [lesson, setLesson] = useState(null);
  const [pausedPositions, setPausedPositions] = useState({}); // { sentenceIndex: pausedTime }
  const [loading, setLoading] = useState(true);
  const [isUserSeeking, setIsUserSeeking] = useState(false);
  const [userSeekTimeout, setUserSeekTimeout] = useState(null);

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
  
  // Mobile tooltip states
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipWord, setTooltipWord] = useState('');
  const [tooltipTranslation, setTooltipTranslation] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });

  // Study time tracking
  const [studyTime, setStudyTime] = useState(0); // Total study time in seconds
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const [lastPauseTime, setLastPauseTime] = useState(null); // Track when video was paused
  const timerIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const pauseTimeoutRef = useRef(null);
  const hasStartedTimerRef = useRef(false); // Track if timer has been started
  const MAX_STUDY_TIME = 24 * 60 * 60; // 24 hours in seconds
  const DEBUG_TIMER = true; // Set to true to enable timer logs

  const { user } = useAuth();

  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const [isYouTubeAPIReady, setIsYouTubeAPIReady] = useState(false);
  const { progress, saveProgress } = useProgress(lessonId, 'shadowing');
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

  // Load study time and video timestamp from database
  useEffect(() => {
    const loadProgress = async () => {
      console.log('[SHADOWING] loadProgress called, lessonId:', lessonId, 'user:', user ? 'logged in' : 'not logged in');

      if (!lessonId) {
        console.log('[SHADOWING] No lessonId, skipping load');
        return;
      }

      // Wait for user to load before trying to get progress
      if (!user) {
        console.log('[SHADOWING] No user, skipping load');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('[SHADOWING] No token, skipping load');
          return;
        }

        console.log('[SHADOWING] Fetching progress from API...');
        const res = await fetch(`/api/progress?lessonId=${lessonId}&mode=shadowing`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('[SHADOWING] API response status:', res.status);

        if (res.ok) {
          const apiResponse = await res.json();
          console.log('[SHADOWING] Raw API response:', apiResponse);

          // Extract progress and studyTime
          const data = apiResponse.progress || apiResponse;
          const loadedStudyTime = apiResponse.studyTime || 0;

          console.log('[SHADOWING] Extracted studyTime:', loadedStudyTime);

          // Load study time (with validation)
          const validatedLoadedTime = Math.min(loadedStudyTime, MAX_STUDY_TIME);
          setStudyTime(validatedLoadedTime);
          console.log('[SHADOWING] Study time set to:', validatedLoadedTime);

          // Load video timestamp
          const loadedVideoTimestamp = data.videoTimestamp;
          if (loadedVideoTimestamp && loadedVideoTimestamp > 0) {
            // Save to localStorage as backup
            localStorage.setItem(`videoTimestamp_${lessonId}_shadowing`, loadedVideoTimestamp.toString());
            if (DEBUG_TIMER) console.log('Loaded video timestamp:', loadedVideoTimestamp);
          }
        } else {
          console.error('[SHADOWING] API returned error status:', res.status);
        }
      } catch (error) {
        console.error('[SHADOWING] Error loading progress:', error);
      }
    };

    loadProgress();
  }, [lessonId, user]); // Reload when user is ready

  // Restore video position from saved timestamp
  useEffect(() => {
    if (!lessonId || duration === 0) return;

    const savedTimestamp = localStorage.getItem(`videoTimestamp_${lessonId}_shadowing`);
    if (savedTimestamp) {
      const timestamp = parseFloat(savedTimestamp);
      if (timestamp > 0 && timestamp < duration) {
        console.log('Restoring video position to:', timestamp);

        // Seek to saved position
        if (isYouTube && youtubePlayerRef.current?.seekTo) {
          youtubePlayerRef.current.seekTo(timestamp, true);
          setCurrentTime(timestamp);
        } else if (audioRef.current) {
          audioRef.current.currentTime = timestamp;
          setCurrentTime(timestamp);
        }
      }
    }
  }, [lessonId, duration, isYouTube]);

  // Auto-save video timestamp periodically (every 5 seconds)
  useEffect(() => {
    if (!lessonId || currentTime === 0) return;

    const saveTimestamp = () => {
      // Save to localStorage
      localStorage.setItem(`videoTimestamp_${lessonId}_shadowing`, currentTime.toString());
    };

    // Save immediately
    saveTimestamp();

    // Set up interval to save every 5 seconds
    const intervalId = setInterval(saveTimestamp, 5000);

    return () => clearInterval(intervalId);
  }, [lessonId, currentTime]);

  // Study timer - starts when user plays video for the first time
  // Stops on inactivity (3 min), pause > 30s, or page unload
  useEffect(() => {
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
  }, [isPlaying, lastPauseTime, isTimerRunning]);

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
    }, 3 * 60 * 1000);

    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [lastActivityTime, isTimerRunning]);

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

  // Keep latest studyTime in ref to avoid recreating effect
  const studyTimeRef = useRef(studyTime);
  useEffect(() => {
    studyTimeRef.current = studyTime;
  }, [studyTime]);

  // Save study time periodically (every 30 seconds) and on unmount
  useEffect(() => {
    const saveStudyTime = async () => {
      const currentStudyTime = studyTimeRef.current;
      if (!user || !lessonId || currentStudyTime === 0) return;

      // Validate before saving
      const validatedStudyTime = Math.min(currentStudyTime, MAX_STUDY_TIME);

      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/progress', {
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

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[SHADOWING] Save error:', errorData);
        } else {
          if (DEBUG_TIMER) console.log('Study time saved:', validatedStudyTime);
        }
      } catch (error) {
        console.error('Error saving study time:', error);
      }
    };

    // Save every 30 seconds
    const interval = setInterval(saveStudyTime, 30000);

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
  }, [user, lessonId]); // Removed studyTime from dependencies

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
    youtubePlayerRef.current = new window.YT.Player('youtube-player-shadowing', {
      height: '100%',
      width: '100%',
      videoId: videoId,
      playerVars: {
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        origin: playerOrigin,
        cc_load_policy: 0,
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        enablejsapi: 1,
        widget_referrer: playerOrigin,
        autohide: 1,
      },
      events: {
        onReady: (event) => {
          setDuration(event.target.getDuration());
          const playerElement = document.getElementById('youtube-player-shadowing');
          if (playerElement && playerElement.parentElement) {
            // Get parent container (videoPlayerWrapper) dimensions
            const wrapper = playerElement.parentElement;
            const rect = wrapper.getBoundingClientRect();

            // Set player size to fill the container
            if (rect.width > 0 && rect.height > 0) {
              event.target.setSize(rect.width, rect.height);
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

    // Add resize listener to adjust player size when window resizes
    const handleResize = () => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.setSize) {
        const playerElement = document.getElementById('youtube-player-shadowing');
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
  }, [lesson, isYouTubeAPIReady]);

  // Fetch lesson data from API
  useEffect(() => {
    const fetchLesson = async () => {
      if (!lessonId) return;
      
      try {
        setLoading(true);
        const res = await fetch(`/api/lessons/${lessonId}`);
        
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
        console.error('Error loading lesson:', error);
        setLesson(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLesson();
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
      console.log('Đang tải transcript từ:', jsonPath);
      const response = await fetch(jsonPath);
      if (!response.ok) {
        throw new Error(`Không thể tải file JSON tại: ${jsonPath}`);
      }
      const data = await response.json();
      console.log('Transcript đã tải thành công:', data);
      setTranscriptData(data);
    } catch (error) {
      console.error('Lỗi tải transcript:', error);
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

    // Speak the word
    speakText(cleanedWord);

    const isMobileView = window.innerWidth <= 768;
    const element = event.target;

    // Calculate position
    const { top, left, arrowPos } = calculatePopupPosition(element, isMobileView);

    // Store element reference for scroll updates
    setClickedWordElement(element);
    setSelectedWord(cleanedWord);
    setPopupPosition({ top, left });
    setPopupArrowPosition(arrowPos);
    setShowVocabPopup(true);
  }, [isYouTube, user, calculatePopupPosition]);

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
            videoTimestamp: player.getCurrentTime ? player.getCurrentTime() : 0,
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
            videoTimestamp: audio.currentTime,
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
                     <h3 className={styles.transcriptTitle}>Video</h3>
                     <div className={styles.studyTimer}>
                       <span className={styles.timerIcon}>⏱️</span>
                       <span className={styles.timerText}>{formatStudyTime(studyTime)}</span>
                     </div>
                   </div>
                   {/* Video Player */}
                   <div className={styles.videoContainer}>
                     {isYouTube ? (
                       <div className={styles.videoWrapper}>
                         <div id="youtube-player-shadowing" style={{ width: '100%', height: '100%' }}></div>
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
                             >
                               {word}
                             </span>
                           );
                         }
                         return <span key={idx}>{word}</span>;
                       })}
                     </div>
                     {showIPA && transcriptData[currentSentenceIndex].ipa && (
                       <div className={styles.currentSentenceIPA}>
                         {transcriptData[currentSentenceIndex].ipa}
                       </div>
                     )}
                   </div>
                 )}



                    {/* Controls */}
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
                        <div className={styles.controlGroup}>
                          <button className={styles.iconButton} title="Settings">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                              <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
                            </svg>
                          </button>
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
                    </div>
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
                          <div className={styles.transcriptActions}>
                            <button className={styles.transcriptActionBtn} title="Report">
                              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                              </svg>
                            </button>
                          </div>
                       </div>

                       <div className={styles.transcriptText}>
                         {segment.text}
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
                <button className={styles.startButton} onClick={handlePlayPause}>
                  ▶ Start
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

         {/* Dictionary Popup (both mobile and desktop) */}
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
       </div>
     </>
   );
};

const ShadowingPage = () => {
  return <ShadowingPageContent />;
};

export default ShadowingPage;

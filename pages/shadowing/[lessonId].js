import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import SEO, { generateVideoStructuredData, generateBreadcrumbStructuredData } from '../../components/SEO';
import AudioControls from '../../components/AudioControls';
import FooterControls from '../../components/FooterControls';
import SentenceListItem from '../../components/SentenceListItem';
import { useProgress } from '../../lib/hooks/useProgress';
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
  
  const audioRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isYouTube, setIsYouTube] = useState(false);
  const { progress, saveProgress } = useProgress(lessonId, 'shadowing');

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

    const playerOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

      // Load YouTube iframe API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }

      const createPlayer = () => {
        youtubePlayerRef.current = new window.YT.Player('youtube-player-shadowing', {
          height: '140',
          width: '140',
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
          },
          events: {
            onReady: (event) => {
              setDuration(event.target.getDuration());
              const container = document.getElementById('youtube-player-shadowing');
              if (container) {
                const rect = container.getBoundingClientRect();
                // Adjust size based on screen width for mobile
                const isMobile = window.innerWidth <= 768;
                const scaleFactor = isMobile ? 1.0 : 1.0;
                event.target.setSize(rect.width * scaleFactor, rect.height * scaleFactor);
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              }
            },
            onError: (event) => {
              console.error('YouTube player error:', event);
              // Optionally, show user a message or retry
            }
          }
        });
      };

      if (window.YT && window.YT.Player) {
        createPlayer();
      } else {
        window.onYouTubeIframeAPIReady = createPlayer;
      }

    return () => {
      if (youtubePlayerRef.current && youtubePlayerRef.current.destroy) {
        youtubePlayerRef.current.destroy();
      }
    };
  }, [lesson]);

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
            player.pauseVideo();
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

  // Cleanup user seek timeout
  useEffect(() => {
    return () => {
      if (userSeekTimeout) clearTimeout(userSeekTimeout);
    };
  }, [userSeekTimeout]);

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
          if (player) player.pauseVideo();
        } else {
          const audio = audioRef.current;
          if (audio) audio.pause();
        }
        setIsPlaying(false);
        // Save paused position
        setPausedPositions(prev => ({ ...prev, [clickedIndex]: currentTime }));
       } else {
          // Play the sentence from start
          let seekTime = startTime;

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

          saveProgress({
            currentSentenceIndex,
            currentTime: player.getCurrentTime ? player.getCurrentTime() : 0,
            lastPlayed: new Date()
          });
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
            currentTime: audio.currentTime,
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
        title={`${lesson.displayTitle || lesson.title} - Papageil Shadowing Übung`}
        description={`Übe deine deutsche Aussprache mit dieser Shadowing-Lektion: ${lesson.title}. Höre zu und sprich nach, um dein Deutsch zu verbessern.`}
        keywords={`Shadowing ${lesson.title}, Deutsch Aussprache üben, Papageil Shadowing, ${lesson.displayTitle}, Deutsch Hörverstehen`}
        image={lesson.thumbnail || undefined}
        type="video.other"
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
                 {/* Video Player */}
                 <div className={styles.videoContainer}>
                    {isYouTube ? (
                      <div className={styles.videoWrapper}>
                        <div id="youtube-player-shadowing" style={{ width: '100%', height: '100%' }}></div>
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

                 {/* Current Sentence Display */}
                 {transcriptData[currentSentenceIndex] && (
                   <div className={styles.currentSentenceDisplay}>
                     <div className={styles.currentSentenceText}>
                       {transcriptData[currentSentenceIndex].text.split(' ').map((word, idx) => (
                         <span key={idx} className={styles.word}>
                           {word}
                         </span>
                       ))}
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

                 <div className={styles.transcriptList}>
                   {transcriptData.map((segment, index) => (
                     <div
                       key={index}
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

                       <div className={styles.transcriptText}>{segment.text}</div>

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

               {/* Play/Pause Button Below Script */}
               <div className={styles.startButtonContainer}>
                 <button className={styles.startButton} onClick={handlePlayPause}>
                   {isPlaying ? '⏸ Pause' : '▶ Play'}
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
       </div>
     </>
   );
};

const ShadowingPage = () => {
  return <ShadowingPageContent />;
};

export default ShadowingPage;

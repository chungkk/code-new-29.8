import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import AudioControls from '../../components/AudioControls';
import Transcript from '../../components/Transcript';
import FooterControls from '../../components/FooterControls';
import SentenceListItem from '../../components/SentenceListItem';
import { useProgress } from '../../lib/hooks/useProgress';

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
  const [loading, setLoading] = useState(true);
  
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
    const videoId = getYouTubeVideoId(lesson.youtubeUrl);
    if (!videoId) return;

    // Load YouTube iframe API
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

     window.onYouTubeIframeAPIReady = () => {
       youtubePlayerRef.current = new window.YT.Player('youtube-player-shadowing', {
         height: '280',
         width: '280',
         videoId: videoId,
         playerVars: {
           controls: 0,
           disablekb: 1,
           fs: 0,
           modestbranding: 1,
           playsinline: 1,
         },
         events: {
           onReady: (event) => {
             setDuration(event.target.getDuration());
             const container = document.getElementById('youtube-player-shadowing');
             const rect = container.getBoundingClientRect();
             event.target.setSize(rect.width * 1.2, rect.height * 1.2);
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

    if (window.YT && window.YT.Player) {
       youtubePlayerRef.current = new window.YT.Player('youtube-player-shadowing', {
         height: '280',
         width: '280',
         videoId: videoId,
         playerVars: {
           controls: 0,
           disablekb: 1,
           fs: 0,
           modestbranding: 1,
           playsinline: 1,
         },
         events: {
           onReady: (event) => {
             setDuration(event.target.getDuration());
             const container = document.getElementById('youtube-player-shadowing');
             const rect = container.getBoundingClientRect();
             event.target.setSize(rect.width * 1.2, rect.height * 1.2);
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

          // Auto-stop when segment ends
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

  // Tìm câu hiện tại dựa trên thời gian
  useEffect(() => {
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
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked, isYouTube]);

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
    if (isYouTube) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      player.seekTo(startTime);
      player.playVideo();
      setIsPlaying(true);
      setSegmentPlayEndTime(endTime);
      setSegmentEndTimeLocked(true);
    } else {
      const audio = audioRef.current;
      if (!audio) return;

      audio.currentTime = startTime;
      audio.play();
      setIsPlaying(true);
      setSegmentPlayEndTime(endTime);
      setSegmentEndTimeLocked(true);
    }

    // Update currentSentenceIndex to match the clicked sentence
    const clickedIndex = transcriptData.findIndex(
      (item) => item.start === startTime && item.end === endTime
    );
    if (clickedIndex !== -1) {
      setCurrentSentenceIndex(clickedIndex);
    }
  }, [transcriptData, isYouTube]);

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
      player.seekTo(newTime);

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
            player.seekTo(currentSentence.start);
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
        <title>{lesson.displayTitle} - Shadowing</title>
        <meta name="description" content={`Shadowing Übung: ${lesson.title}`} />
      </Head>

      <div className="shadowing-page dark-theme">
        {!isYouTube && (
          <audio ref={audioRef} controls style={{ display: 'none' }}>
            <source src={lesson.audio} type="audio/mp3" />
            Ihr Browser unterstützt das Audio-Tag nicht.
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
                            <div id="youtube-player-shadowing" style={{ width: '100%', height: '100%' }}></div>
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
             <div className="current-sentence-section">
              <div className="current-sentence-container">
                <h3>Aktueller Satz</h3>
                <Transcript
                  transcriptData={transcriptData}
                  currentTime={currentTime}
                  isHidden={isTextHidden}
                  onSentenceClick={handleSentenceClick}
                  currentSentenceIndex={currentSentenceIndex}
                  onPreviousSentence={goToPreviousSentence}
                  onNextSentence={goToNextSentence}
                  isPlaying={isPlaying}
                  lessonId={lessonId}
                />
              </div>
            </div>
            
            <div className="sentence-list-section">
              <div className="sentence-list-container">
                <h3>Satzliste</h3>
                <div className="sentence-list">
                  {transcriptData.map((segment, index) => (
                    <SentenceListItem
                      key={index}
                      segment={segment}
                      index={index}
                      currentSentenceIndex={currentSentenceIndex}
                      currentTime={currentTime}
                      isCompleted={true}
                      lessonId={lessonId}
                      onSentenceClick={handleSentenceClick}
                      formatTime={formatTime}
                      maskText={(text) => text}
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
    </>
  );
};

const ShadowingPage = () => {
  return <ShadowingPageContent />;
};

export default ShadowingPage;

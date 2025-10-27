import React, { useState, useEffect, useRef } from 'react';
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
  const { progress, saveProgress } = useProgress(lessonId, 'shadowing');

  // Expose audioRef globally để components có thể pause khi phát từ
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.mainAudioRef = audioRef;
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.mainAudioRef = null;
      }
    };
  }, []);

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
    const audio = audioRef.current;
    if (!audio) return;

    let animationFrameId = null;

    const updateTime = () => {
      if (audio && !audio.paused) {
        setCurrentTime(audio.currentTime);
        
        // Auto-stop when segment ends
        if (segmentPlayEndTime !== null && audio.currentTime >= segmentPlayEndTime - 0.02) {
          audio.pause();
          setSegmentPlayEndTime(null);
        }
        
        animationFrameId = requestAnimationFrame(updateTime);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      animationFrameId = requestAnimationFrame(updateTime);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      setSegmentPlayEndTime(null);
      setSegmentEndTimeLocked(false);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
    
    const handleLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handlePause);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Initial time update
    setCurrentTime(audio.currentTime);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handlePause);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [segmentPlayEndTime]);

  // Tìm câu hiện tại dựa trên thời gian
  useEffect(() => {
    if (!transcriptData.length) return;

    const currentIndex = transcriptData.findIndex(
      (item, index) => currentTime >= item.start && currentTime < item.end
    );

    if (currentIndex !== -1 && currentIndex !== currentSentenceIndex) {
      setCurrentSentenceIndex(currentIndex);

      // Khi câu thay đổi và đang phát, update endTime của câu mới (chỉ khi không lock)
      const audio = audioRef.current;
      if (audio && !audio.paused && !segmentEndTimeLocked) {
        const newSentence = transcriptData[currentIndex];
        setSegmentPlayEndTime(newSentence.end);
      }
    }
  }, [currentTime, transcriptData, currentSentenceIndex, segmentEndTimeLocked]);

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

  const handleSentenceClick = (startTime, endTime) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = startTime;
    if (audio.paused) {
      audio.play();
    }
    setSegmentPlayEndTime(endTime);
    setSegmentEndTimeLocked(true);
  };

  const goToPreviousSentence = () => {
    if (currentSentenceIndex > 0) {
      const newIndex = currentSentenceIndex - 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
  };

  const goToNextSentence = () => {
    if (currentSentenceIndex < transcriptData.length - 1) {
      const newIndex = currentSentenceIndex + 1;
      setCurrentSentenceIndex(newIndex);
      const item = transcriptData[newIndex];
      handleSentenceClick(item.start, item.end);
    }
  };

  const handleSeek = (direction) => {
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
  };

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      if (transcriptData.length > 0 && currentSentenceIndex < transcriptData.length) {
        const currentSentence = transcriptData[currentSentenceIndex];

        if (audio.currentTime >= currentSentence.end - 0.05) {
          audio.currentTime = currentSentence.start;
        }

        audio.play();
        setSegmentPlayEndTime(currentSentence.end);
        setSegmentEndTimeLocked(false); // Cho phép chuyển câu tự động khi phát liên tục

        saveProgress({
          currentSentenceIndex,
          currentTime: audio.currentTime,
          lastPlayed: new Date()
        });
      } else {
        audio.play();
        setSegmentEndTimeLocked(false);
      }
    } else {
      audio.pause();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle keys when not in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const audio = audioRef.current;
      const isAudioReady = audio && isFinite(audio.duration);

      switch (event.key) {
        case 'ArrowLeft':
          if (isAudioReady) {
            event.preventDefault();
            handleSeek('backward');
          }
          break;
        case 'ArrowRight':
          if (isAudioReady) {
            event.preventDefault();
            handleSeek('forward');
          }
          break;
        case ' ':
          if (isAudioReady) {
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
  }, [handleSeek, handlePlayPause, goToPreviousSentence, goToNextSentence]);

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
        <audio ref={audioRef} controls style={{ display: 'none' }}>
          <source src={lesson.audio} type="audio/mp3" />
          Ihr Browser unterstützt das Audio-Tag nicht.
        </audio>

        <div className="shadowing-app-container" style={{ marginTop: '100px' }}>
          <div className="shadowing-layout">
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

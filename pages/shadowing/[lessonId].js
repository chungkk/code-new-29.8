import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from 'next-auth/react';
import AudioControls from '../../components/AudioControls';
import Transcript from '../../components/Transcript';
import FooterControls from '../../components/FooterControls';
import { useProgress } from '../../lib/hooks/useProgress';

const ShadowingPage = () => {
  const router = useRouter();
  const { lessonId } = useRouter().query;
  const { data: session } = useSession();
  
  const [transcriptData, setTranscriptData] = useState([]);
  const [isTextHidden, setIsTextHidden] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [segmentPlayEndTime, setSegmentPlayEndTime] = useState(null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  
  const audioRef = useRef(null);
  const { progress, saveProgress } = useProgress(lessonId, 'shadowing');

  // Lesson data - in a real app, this would come from an API
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

  useEffect(() => {
    console.log('Lesson ID:', lessonId);
    console.log('Lesson data:', lesson);
    if (lesson) {
      loadTranscript(lesson.json);
    } else {
      console.error('Lesson không tồn tại:', lessonId);
    }
  }, [lesson, lessonId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      
      // Auto-stop when segment ends
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

  // Tìm câu hiện tại dựa trên thời gian
  useEffect(() => {
    if (!transcriptData.length) return;
    
    const currentIndex = transcriptData.findIndex(
      (item, index) => currentTime >= item.start && currentTime < item.end
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
        
        if (session) {
          saveProgress({
            currentSentenceIndex,
            currentTime: audio.currentTime,
            lastPlayed: new Date()
          });
        }
      } else {
        audio.play();
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
        <title>{lesson.displayTitle} - Shadowing</title>
        <meta name="description" content={`Shadowing Übung: ${lesson.title}`} />
      </Head>
      
      <div className="shadowing-page">
        <audio ref={audioRef} controls style={{ display: 'none' }}>
          <source src={lesson.audio} type="audio/mp3" />
          Trình duyệt của bạn không hỗ trợ thẻ audio.
        </audio>

        <div className="shadowing-app-container" style={{ marginTop: '100px' }}>
          <div className="shadowing-layout">
            <div className="current-sentence-section">
              <Transcript
                transcriptData={transcriptData}
                currentTime={currentTime}
                isHidden={isTextHidden}
                onSentenceClick={handleSentenceClick}
                currentSentenceIndex={currentSentenceIndex}
                onPreviousSentence={goToPreviousSentence}
                onNextSentence={goToNextSentence}
              />
            </div>
            
            <div className="sentence-list-section">
              <div className="sentence-list-container">
                <h3>Satzliste</h3>
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
                          {segment.text.trim()}
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

export default ShadowingPage;

import React, { useState, useRef, useCallback } from 'react';
import styles from '../styles/ShadowingVoiceRecorder.module.css';

/**
 * Voice Recorder Component for Shadowing Practice
 * Uses Whisper API for transcription
 *
 * @param {Object} props
 * @param {Function} props.onTranscript - Callback when transcription is complete
 * @param {Function} props.onAudioRecorded - Callback when audio is recorded (returns blob)
 * @param {string} props.language - Language code (de-DE, vi-VN, etc.)
 */
const ShadowingVoiceRecorder = ({
  onTranscript,
  onAudioRecorded,
  language = 'de-DE'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordedBlob(null);
      audioChunksRef.current = [];

      // Pause main audio/video when starting recording
      if (typeof window !== 'undefined') {
        // Pause YouTube player
        if (window.mainYoutubePlayerRef?.current) {
          const player = window.mainYoutubePlayerRef.current;
          if (player.pauseVideo) {
            player.pauseVideo();
          }
        }
        // Pause audio player
        if (window.mainAudioRef?.current) {
          const audio = window.mainAudioRef.current;
          if (!audio.paused) {
            audio.pause();
          }
        }
      }

      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Create blob from recorded chunks
        const audioBlob = new Blob(audioChunksRef.current, {
          type: audioChunksRef.current[0]?.type || 'audio/webm'
        });
        setRecordedBlob(audioBlob);

        if (onAudioRecorded) {
          onAudioRecorded(audioBlob);
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Không thể truy cập microphone');
      setIsRecording(false);
    }
  }, [onAudioRecorded]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // Process the recorded audio with Whisper
    setIsProcessing(true);

    // Wait for blob to be ready
    setTimeout(async () => {
      if (audioChunksRef.current.length > 0) {
        await processWhisperAudio();
      }
    }, 100);
  }, []);

  // Process audio with Whisper API
  const processWhisperAudio = useCallback(async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: audioChunksRef.current[0]?.type || 'audio/webm'
      });

      const formData = new FormData();
      formData.append('audio', audioBlob, 'shadowing-voice.webm');
      formData.append('language', language.split('-')[0]);

      const response = await fetch('/api/whisper-transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.text) {
        if (onTranscript) {
          onTranscript(data.text);
        }
        setError(null);
      } else {
        setError(data.message || 'Transcription failed');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Lỗi khi xử lý âm thanh');
    } finally {
      setIsProcessing(false);
    }
  }, [language, onTranscript]);

  // Handle button click
  const handleButtonClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return (
    <div className={styles.container}>
      <button
        className={`${styles.recordButton} ${isRecording ? styles.recording : ''} ${isProcessing ? styles.processing : ''}`}
        onClick={handleButtonClick}
        disabled={isProcessing}
        type="button"
        title={isProcessing ? 'Đang xử lý...' : isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
      >
        {isProcessing ? (
          <span className={styles.spinner}>⏳</span>
        ) : isRecording ? (
          <>
            <span className={styles.stopIcon}>⏹️</span>
            <span className={styles.pulse}></span>
          </>
        ) : (
          <span className={styles.micIcon}>🎤</span>
        )}
      </button>

      {/* Error display */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ShadowingVoiceRecorder;

import React, { useState, useRef, useCallback } from 'react';
import { useSpeechRecognition } from '../lib/hooks/useSpeechRecognition';
import styles from '../styles/ShadowingVoiceRecorder.module.css';

/**
 * Voice Recorder Component for Shadowing Practice
 * Supports manual start/stop and audio playback
 *
 * @param {Object} props
 * @param {Function} props.onTranscript - Callback when transcription is complete
 * @param {Function} props.onAudioRecorded - Callback when audio is recorded (returns blob)
 * @param {string} props.language - Language code (de-DE, vi-VN, etc.)
 * @param {'web-speech'|'whisper'} props.mode - Recognition mode
 */
const ShadowingVoiceRecorder = ({
  onTranscript,
  onAudioRecorded,
  language = 'de-DE',
  mode = 'web-speech'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  // Web Speech API hook
  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported: isSpeechSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript
  } = useSpeechRecognition({
    language: language,
    continuous: true, // Keep listening until manually stopped
    interimResults: true,
    onResult: (text, isFinal) => {
      // Don't auto-stop, wait for user to click stop
    },
    onError: (err) => {
      setError(err);
      setIsRecording(false);
    }
  });

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setRecordedBlob(null);
      audioChunksRef.current = [];

      // Start audio recording for both modes
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

      // Start speech recognition based on mode
      if (mode === 'web-speech') {
        if (!isSpeechSupported) {
          throw new Error('Trình duyệt không hỗ trợ nhận dạng giọng nói');
        }
        startListening();
      }

      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError(err.message || 'Không thể truy cập microphone');
      setIsRecording(false);
    }
  }, [mode, isSpeechSupported, startListening, onAudioRecorded]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    setIsRecording(false);

    // Stop Web Speech API
    if (mode === 'web-speech') {
      stopListening();

      // Wait a bit for final transcript
      setTimeout(() => {
        if (transcript && onTranscript) {
          onTranscript(transcript);
        }
        resetTranscript();
      }, 500);
    }

    // Stop media recorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    // For Whisper mode, process the recorded audio
    if (mode === 'whisper') {
      setIsProcessing(true);

      // Wait for blob to be ready
      setTimeout(async () => {
        if (audioChunksRef.current.length > 0) {
          await processWhisperAudio();
        }
      }, 100);
    }
  }, [mode, transcript, onTranscript, stopListening, resetTranscript]);

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
      >
        {isProcessing ? (
          <>
            <span className={styles.spinner}>⏳</span>
            <span>Đang xử lý...</span>
          </>
        ) : isRecording ? (
          <>
            <span className={styles.stopIcon}>⏹️</span>
            <span>Dừng</span>
            <span className={styles.pulse}></span>
          </>
        ) : (
          <>
            <span className={styles.micIcon}>🎤</span>
            <span>Bắt đầu nói</span>
          </>
        )}
      </button>

      {/* Interim transcript display for Web Speech API */}
      {mode === 'web-speech' && isRecording && interimTranscript && (
        <div className={styles.interimText}>
          {interimTranscript}
        </div>
      )}

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

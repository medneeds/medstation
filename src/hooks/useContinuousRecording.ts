import { useState, useRef, useCallback, useEffect } from 'react';

interface UseContinuousRecordingOptions {
  onAudioChunk: (audioBlob: Blob) => void;
  onAudioLevel: (level: number) => void;
  chunkIntervalMs?: number;
  silenceThreshold?: number;
}

export function useContinuousRecording({
  onAudioChunk,
  onAudioLevel,
  chunkIntervalMs = 3000,
  silenceThreshold = 0.01,
}: UseContinuousRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Chunking strategy
  // We MUST produce standalone, valid container files per chunk.
  // Using MediaRecorder timeslice or concatenating small fragments can generate
  // non-seekable / headerless fragments that Whisper rejects with 400.
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || isPaused) {
      onAudioLevel(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    onAudioLevel(normalizedLevel);
    
    if (isRecording && !isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording, isPaused, onAudioLevel]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      streamRef.current = stream;

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Determine supported mimeType with fallback for Safari/iOS
      const getSupportedMimeType = () => {
        const types = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg',
          ''
        ];
        for (const type of types) {
          if (type === '' || MediaRecorder.isTypeSupported(type)) {
            console.log(`[ContinuousRecording] Using mimeType: ${type || 'default'}`);
            return type;
          }
        }
        return '';
      };

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};

      const clearChunkTimer = () => {
        if (chunkTimerRef.current) {
          clearTimeout(chunkTimerRef.current);
          chunkTimerRef.current = null;
        }
      };

      const startNewRecorder = () => {
        clearChunkTimer();

        if (!isRecordingRef.current) return;
        if (isPausedRef.current) return;

        chunksRef.current = [];

        const recorder = new MediaRecorder(stream, recorderOptions);
        mediaRecorderRef.current = recorder;
        console.log(`[ContinuousRecording] MediaRecorder started (mimeType: ${recorder.mimeType || 'default'})`);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        recorder.onstop = () => {
          // Build a real file (with container) for Whisper
          const inferredType =
            chunksRef.current[0]?.type || recorder.mimeType || mimeType || '';
          const blob = new Blob(chunksRef.current, { type: inferredType });
          chunksRef.current = [];

          if (!isPausedRef.current && blob.size > 0) {
            onAudioChunk(blob);
          }

          // Continue recording next chunk
          if (isRecordingRef.current && !isPausedRef.current) {
            startNewRecorder();
          }
        };

        recorder.start();

        // Force-close this chunk after chunkIntervalMs to guarantee headers per chunk.
        chunkTimerRef.current = setTimeout(() => {
          try {
            if (recorder.state === 'recording') recorder.stop();
          } catch (e) {
            console.warn('[ContinuousRecording] Failed to stop recorder for chunk boundary', e);
          }
        }, chunkIntervalMs);
      };
      
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);

      // Start first chunk recorder
      startNewRecorder();

      // Start audio level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, [chunkIntervalMs, updateAudioLevel, onAudioChunk]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    mediaRecorderRef.current = null;
    analyserRef.current = null;
    
    setIsRecording(false);
    setIsPaused(false);
    onAudioLevel(0);
  }, [onAudioLevel]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      isPausedRef.current = true;
      setIsPaused(true);
      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
      onAudioLevel(0);
    }
  }, [onAudioLevel]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      isPausedRef.current = false;
      setIsPaused(false);
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [updateAudioLevel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  return {
    isRecording,
    isPaused,
    error,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
  };
}

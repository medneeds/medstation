import { useState, useRef, useCallback, useEffect } from 'react';

interface UseContinuousRecordingOptions {
  onAudioChunk: (audioBlob: Blob) => void;
  onAudioLevel: (level: number) => void;
  chunkIntervalMs?: number;
}

export function useContinuousRecording({
  onAudioChunk,
  onAudioLevel,
  chunkIntervalMs = 3000,
}: UseContinuousRecordingOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for media resources
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Refs for chunking strategy (stop/restart to get valid container per chunk)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const mimeTypeRef = useRef<string>('');
  const recorderOptionsRef = useRef<MediaRecorderOptions>({});

  // Stable refs for callbacks to avoid re-creating functions
  const onAudioChunkRef = useRef(onAudioChunk);
  const onAudioLevelRef = useRef(onAudioLevel);
  
  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);
  
  useEffect(() => {
    onAudioLevelRef.current = onAudioLevel;
  }, [onAudioLevel]);

  // Audio level monitoring
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || isPausedRef.current) {
      onAudioLevelRef.current(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    onAudioLevelRef.current(normalizedLevel);
    
    if (isRecordingRef.current && !isPausedRef.current) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, []);

  // Clear chunk timer helper
  const clearChunkTimer = useCallback(() => {
    if (chunkTimerRef.current) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
  }, []);

  // Start a new MediaRecorder for a single chunk
  const startNewChunkRecorder = useCallback(() => {
    clearChunkTimer();

    if (!isRecordingRef.current || isPausedRef.current || !streamRef.current) {
      return;
    }

    chunksRef.current = [];

    try {
      const recorder = new MediaRecorder(streamRef.current, recorderOptionsRef.current);
      mediaRecorderRef.current = recorder;
      console.log(`[ContinuousRecording] New chunk recorder started (mimeType: ${recorder.mimeType || 'default'})`);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Build a valid file with container headers
        const inferredType = chunksRef.current[0]?.type || recorder.mimeType || mimeTypeRef.current || '';
        const blob = new Blob(chunksRef.current, { type: inferredType });
        chunksRef.current = [];

        if (!isPausedRef.current && blob.size > 1000) {
          console.log(`[ContinuousRecording] Sending chunk: ${blob.size} bytes, type: ${inferredType}`);
          onAudioChunkRef.current(blob);
        }

        // Continue with next chunk if still recording
        if (isRecordingRef.current && !isPausedRef.current) {
          startNewChunkRecorder();
        }
      };

      recorder.start();

      // Schedule stop after chunkIntervalMs to create a complete, valid container
      chunkTimerRef.current = setTimeout(() => {
        try {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        } catch (e) {
          console.warn('[ContinuousRecording] Failed to stop recorder for chunk boundary', e);
        }
      }, chunkIntervalMs);
    } catch (err) {
      console.error('[ContinuousRecording] Error creating new recorder:', err);
    }
  }, [clearChunkTimer, chunkIntervalMs]);

  // Main start function
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
      const types = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        ''
      ];
      
      let selectedMimeType = '';
      for (const type of types) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
          selectedMimeType = type;
          console.log(`[ContinuousRecording] Using mimeType: ${type || 'default'}`);
          break;
        }
      }
      
      mimeTypeRef.current = selectedMimeType;
      recorderOptionsRef.current = selectedMimeType ? { mimeType: selectedMimeType } : {};
      
      // Set state
      isRecordingRef.current = true;
      isPausedRef.current = false;
      setIsRecording(true);
      setIsPaused(false);

      // Start first chunk recorder
      startNewChunkRecorder();

      // Start audio level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, [startNewChunkRecorder, updateAudioLevel]);

  // Stop recording
  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    clearChunkTimer();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[ContinuousRecording] Error stopping recorder:', e);
      }
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
    chunksRef.current = [];
    
    setIsRecording(false);
    setIsPaused(false);
    onAudioLevelRef.current(0);
  }, [clearChunkTimer]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      isPausedRef.current = true;
      setIsPaused(true);
      clearChunkTimer();
      onAudioLevelRef.current(0);
    }
  }, [clearChunkTimer]);

  // Resume recording
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
      isRecordingRef.current = false;
      isPausedRef.current = false;
      
      if (chunkTimerRef.current) {
        clearTimeout(chunkTimerRef.current);
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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

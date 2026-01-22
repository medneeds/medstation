import { useState, useRef, useCallback, useEffect } from 'react';

interface UseContinuousRecordingOptions {
  onAudioChunk: (audioBlob: Blob, avgLevel: number) => void;
  onAudioLevel: (level: number) => void;
  chunkIntervalMs?: number;
  silenceThreshold?: number; // Minimum average level to consider as speech
}

export function useContinuousRecording({
  onAudioChunk,
  onAudioLevel,
  chunkIntervalMs = 3000,
  silenceThreshold = 0.02, // ~2% of max level - very sensitive
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

  // Audio level tracking for silence detection
  const levelSamplesRef = useRef<number[]>([]);
  const peakLevelRef = useRef<number>(0);

  // Stable refs for callbacks to avoid re-creating functions
  const onAudioChunkRef = useRef(onAudioChunk);
  const onAudioLevelRef = useRef(onAudioLevel);
  
  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);
  
  useEffect(() => {
    onAudioLevelRef.current = onAudioLevel;
  }, [onAudioLevel]);

  // Audio level monitoring with sampling for silence detection
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current || isPausedRef.current) {
      onAudioLevelRef.current(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = average / 255;
    
    // Track samples for averaging over the chunk period
    levelSamplesRef.current.push(normalizedLevel);
    
    // Track peak level
    if (normalizedLevel > peakLevelRef.current) {
      peakLevelRef.current = normalizedLevel;
    }
    
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
    // Reset level tracking for this chunk
    levelSamplesRef.current = [];
    peakLevelRef.current = 0;

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

        // Calculate average audio level during this chunk
        const samples = levelSamplesRef.current;
        const avgLevel = samples.length > 0 
          ? samples.reduce((a, b) => a + b, 0) / samples.length 
          : 0;
        const peak = peakLevelRef.current;
        
        // Reset for next chunk
        levelSamplesRef.current = [];
        peakLevelRef.current = 0;

        // Only send if not paused, has minimum size, AND has audio activity
        const hasSpeech = avgLevel >= silenceThreshold || peak >= silenceThreshold * 2;
        
        if (!isPausedRef.current && blob.size > 1000 && hasSpeech) {
          console.log(`[ContinuousRecording] Sending chunk: ${blob.size} bytes, avgLevel: ${avgLevel.toFixed(3)}, peak: ${peak.toFixed(3)}`);
          onAudioChunkRef.current(blob, avgLevel);
        } else if (!isPausedRef.current && blob.size > 1000) {
          console.log(`[ContinuousRecording] Skipping silent chunk: avgLevel: ${avgLevel.toFixed(3)}, peak: ${peak.toFixed(3)}, threshold: ${silenceThreshold}`);
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

  // Pause recording - stop current recorder and don't start a new one
  const pauseRecording = useCallback(() => {
    clearChunkTimer();
    isPausedRef.current = true;
    setIsPaused(true);
    
    // Stop current recorder to flush its data, but don't trigger a new chunk
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn('[ContinuousRecording] Error stopping recorder on pause:', e);
      }
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    onAudioLevelRef.current(0);
  }, [clearChunkTimer]);

  // Resume recording - start a fresh chunk recorder
  const resumeRecording = useCallback(() => {
    void (async () => {
      if (!isRecordingRef.current) return;

      // Ensure we don't end up with parallel recorders if the user clicks fast
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }

      isPausedRef.current = false;
      setIsPaused(false);

      // Some browsers may end the audio track while paused/backgrounded.
      // If that happens, reacquire the mic stream to keep continuous transcription.
      const hasLiveTrack = !!streamRef.current?.getAudioTracks().some((t) => t.readyState === 'live');

      if (!hasLiveTrack) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });

          streamRef.current = stream;

          // Recreate / resume audio analysis pipeline
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContext();
          }

          if (audioContextRef.current.state === 'suspended') {
            try {
              await audioContextRef.current.resume();
            } catch {
              // ignore
            }
          }

          const source = audioContextRef.current.createMediaStreamSource(stream);
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 256;
          source.connect(analyserRef.current);
        } catch (err) {
          console.error('[ContinuousRecording] Error reacquiring mic on resume:', err);
          setError('Não foi possível retomar o microfone. Verifique as permissões.');
          stopRecording();
          return;
        }
      } else if (audioContextRef.current?.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch {
          // ignore
        }
      }

      // Restart chunking cycle
      startNewChunkRecorder();

      // Restart audio level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    })();
  }, [startNewChunkRecorder, stopRecording, updateAudioLevel]);

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

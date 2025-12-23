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
  const chunksRef = useRef<Blob[]>([]);
  const chunkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

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

  const processChunk = useCallback(() => {
    if (chunksRef.current.length > 0 && !isPaused) {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm;codecs=opus' });
      if (blob.size > 0) {
        onAudioChunk(blob);
      }
      chunksRef.current = [];
    }
  }, [onAudioChunk, isPaused]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      streamRef.current = stream;

      // Setup audio analysis
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && !isPaused) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      
      setIsRecording(true);
      setIsPaused(false);

      // Start chunk interval
      chunkIntervalRef.current = setInterval(processChunk, chunkIntervalMs);
      
      // Start audio level monitoring
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  }, [chunkIntervalMs, processChunk, updateAudioLevel, isPaused]);

  const stopRecording = useCallback(() => {
    // Process any remaining chunks
    processChunk();

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

    if (chunkIntervalRef.current) {
      clearInterval(chunkIntervalRef.current);
      chunkIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    chunksRef.current = [];
    mediaRecorderRef.current = null;
    analyserRef.current = null;
    
    setIsRecording(false);
    setIsPaused(false);
    onAudioLevel(0);
  }, [processChunk, onAudioLevel]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      onAudioLevel(0);
    }
  }, [onAudioLevel]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
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

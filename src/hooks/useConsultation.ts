import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SpeakerType = 'doctor' | 'patient' | 'companion';

export interface TranscriptionSegment {
  id: string;
  speaker: SpeakerType;
  text: string;
  timestamp: Date;
  confidence: number;
  isEdited: boolean;
}

export interface AnamnesisStructure {
  chiefComplaint: string;
  historyPresentIllness: string;
  pastMedicalHistory: string;
  familyHistory: string;
  medications: string;
  allergies: string;
  socialHistory: string;
  reviewOfSystems: string;
  physicalExam: string;
  diagnosticHypotheses: string;
  plan: string;
}

interface UseConsultationOptions {
  caseId?: string;
}

const EMPTY_ANAMNESIS: AnamnesisStructure = {
  chiefComplaint: '',
  historyPresentIllness: '',
  pastMedicalHistory: '',
  familyHistory: '',
  medications: '',
  allergies: '',
  socialHistory: '',
  reviewOfSystems: '',
  physicalExam: '',
  diagnosticHypotheses: '',
  plan: '',
};

// Strict anti-hallucination: drop obvious noise, never infer/fill
const HALLUCINATION_PATTERNS = [
  /^\.+$/,
  /^,+$/,
  /^\s*$/,
  /^(obrigad[oa]|obrigado por assistir)/i,
  /^tchau+\.?$/i,
  /^até\s*(mais|logo|a próxima)/i,
  /^(legendas|transcrição|tradução)/i,
  /^(música|♪|🎵)/i,
  /^inscreva-se/i,
  /^www\./i,
  /^@/,
  /^[!?.]{2,}$/,
  /^(silêncio|\.{3,}|…+)$/i,
  /^(hum+|uhm+|ah+|eh+|mm+)\.?$/i,
];

function isHallucination(text: string): boolean {
  const t = text.trim();
  if (t.length < 2) return true;
  return HALLUCINATION_PATTERNS.some((p) => p.test(t));
}

export function useConsultation({ caseId: _caseId }: UseConsultationOptions = {}) {
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [partialTranscription, setPartialTranscription] = useState('');
  const [structure, setStructure] = useState<AnamnesisStructure>(EMPTY_ANAMNESIS);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentSpeaker, setCurrentSpeakerState] = useState<SpeakerType>('doctor');
  const currentSpeakerRef = useRef<SpeakerType>('doctor');
  const setCurrentSpeaker = useCallback((s: SpeakerType) => {
    currentSpeakerRef.current = s;
    setCurrentSpeakerState(s);
  }, []);

  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parallel raw audio capture for final Whisper review
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);

  // ElevenLabs Scribe v2 Realtime - VAD ~700ms, no diarization
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    onPartialTranscript: (data: { text: string }) => {
      setPartialTranscription(data?.text || '');
    },
    onCommittedTranscript: (data: { text: string }) => {
      const text = (data?.text || '').trim();
      setPartialTranscription('');
      if (!text || isHallucination(text)) return;

      setSegments((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          speaker: 'doctor',
          text,
          timestamp: new Date(),
          confidence: 0.95,
          isEdited: false,
        },
      ]);
    },
    onError: (err: unknown) => {
      console.error('[Scribe] error:', err);
      setError('Erro na transcrição em tempo real');
    },
  });

  const stopAudioLevelMonitor = useCallback(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  const startAudioLevelMonitor = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        setAudioLevel(Math.min(1, rms * 3));
        levelRafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('Audio level monitor failed:', e);
    }
  }, []);

  const startTimer = useCallback(() => {
    setStartTime(new Date());
    setElapsedTime(0);
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime((p) => p + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      // 1. Get mic stream for parallel raw capture + level monitor
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      audioStreamRef.current = stream;
      startAudioLevelMonitor(stream);

      // 2. Start parallel MediaRecorder for full-session raw audio
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ];
      const supportedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
      audioChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };
      recorder.start(1000); // collect 1s blobs
      mediaRecorderRef.current = recorder;

      // 3. Get Scribe token + connect realtime
      const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');
      if (tokenError || !data?.token) {
        throw new Error(tokenError?.message || 'Falha ao obter token de transcrição');
      }

      await scribe.connect({
        token: data.token,
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      setIsRecording(true);
      setIsPaused(false);
      startTimer();
      toast.success('Modo Consultório ativado — transcrevendo em tempo real');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar gravação';
      console.error('[useConsultation] start error:', err);
      setError(msg);
      toast.error(msg);
      // cleanup partial state
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      stopAudioLevelMonitor();
    } finally {
      setIsConnecting(false);
    }
  }, [scribe, startAudioLevelMonitor, stopAudioLevelMonitor, startTimer]);

  const pauseRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
    } catch { /* ignore */ }
    audioStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    setIsPaused(true);
    stopTimer();
    toast.info('Gravação pausada');
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    try {
      if (mediaRecorderRef.current?.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
    } catch { /* ignore */ }
    audioStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
    setIsPaused(false);
    timerIntervalRef.current = setInterval(() => setElapsedTime((p) => p + 1), 1000);
    toast.info('Gravação retomada');
  }, []);

  const stopMediaResources = useCallback(() => {
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => { /* ignore */ });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    stopAudioLevelMonitor();
  }, [stopAudioLevelMonitor]);

  // Final review pass: send full session audio to Whisper for high-precision rewrite
  const runFinalReview = useCallback(async (audioBlob: Blob) => {
    if (!audioBlob || audioBlob.size < 2000) return;
    setIsFinalizing(true);
    try {
      const reader = new FileReader();
      const base64: string = await new Promise((resolve, reject) => {
        reader.onload = () => {
          const r = reader.result as string;
          resolve(r.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      const { data, error: fnError } = await supabase.functions.invoke('consultation-transcribe', {
        body: { audio: base64, mimeType: audioBlob.type },
      });

      if (fnError) throw fnError;
      const finalText = (data?.text || '').trim();
      if (finalText && !isHallucination(finalText)) {
        // Replace live segments with single high-precision final segment
        setSegments([
          {
            id: crypto.randomUUID(),
            speaker: 'doctor',
            text: finalText,
            timestamp: new Date(),
            confidence: 0.99,
            isEdited: false,
          },
        ]);
        toast.success('Revisão final concluída (Whisper)');
      }
    } catch (err) {
      console.error('[useConsultation] final review failed:', err);
      toast.warning('Revisão final indisponível — usando transcrição ao vivo');
    } finally {
      setIsFinalizing(false);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    stopTimer();

    // Disconnect Scribe
    try { await scribe.disconnect(); } catch { /* ignore */ }

    // Stop MediaRecorder and gather full audio
    const recorder = mediaRecorderRef.current;
    let finalBlob: Blob | null = null;
    if (recorder && recorder.state !== 'inactive') {
      finalBlob = await new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const type = recorder.mimeType || 'audio/webm';
          resolve(new Blob(audioChunksRef.current, { type }));
        };
        try { recorder.stop(); } catch { resolve(new Blob(audioChunksRef.current, { type: 'audio/webm' })); }
      });
    }
    mediaRecorderRef.current = null;
    stopMediaResources();

    setIsRecording(false);
    setIsPaused(false);
    setPartialTranscription('');

    if (finalBlob) {
      await runFinalReview(finalBlob);
    }
  }, [scribe, stopTimer, stopMediaResources, runFinalReview]);

  const updateStructure = useCallback(async () => {
    if (segments.length === 0) return;
    setIsStructuring(true);
    try {
      const transcriptionText = segments.map((s) => s.text).join('\n');
      const { data, error: fnError } = await supabase.functions.invoke('structure-anamnesis', {
        body: { transcription: transcriptionText },
      });
      if (fnError) throw fnError;
      if (data?.structure) {
        setStructure((prev) => ({ ...prev, ...data.structure }));
      }
    } catch (err) {
      console.error('Error structuring anamnesis:', err);
      toast.error('Erro ao estruturar anamnese');
    } finally {
      setIsStructuring(false);
    }
  }, [segments]);

  const changeSpeaker = useCallback((segmentId: string, newSpeaker: SpeakerType) => {
    setSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, speaker: newSpeaker, isEdited: true, confidence: 1 } : s)));
  }, []);

  const editSegmentText = useCallback((segmentId: string, newText: string) => {
    setSegments((prev) => prev.map((s) => (s.id === segmentId ? { ...s, text: newText, isEdited: true } : s)));
  }, []);

  const deleteSegment = useCallback((segmentId: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
  }, []);

  const updateStructureField = useCallback((field: keyof AnamnesisStructure, value: string) => {
    setStructure((prev) => ({ ...prev, [field]: value }));
  }, []);

  const reset = useCallback(() => {
    setSegments([]);
    setPartialTranscription('');
    setStructure(EMPTY_ANAMNESIS);
    setStartTime(null);
    setElapsedTime(0);
    stopTimer();
  }, [stopTimer]);

  const formatElapsedTime = useCallback(() => {
    const h = Math.floor(elapsedTime / 3600);
    const m = Math.floor((elapsedTime % 3600) / 60);
    const s = elapsedTime % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsedTime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
      try { scribe.disconnect(); } catch { /* ignore */ }
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close().catch(() => { /* ignore */ });
      if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    // State
    segments,
    partialTranscription,
    currentTranscription: partialTranscription, // backward-compat
    structure,
    isRecording,
    isPaused,
    isConnecting,
    isTranscribing: scribe.isConnected && !!partialTranscription,
    isStructuring,
    isFinalizing,
    startTime,
    elapsedTime,
    formattedTime: formatElapsedTime(),
    currentSpeaker: 'doctor' as SpeakerType,
    audioLevel,
    error,
    scribeConnected: scribe.isConnected,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    updateStructure,
    changeSpeaker,
    editSegmentText,
    deleteSegment,
    updateStructureField,
    startTimer,
    stopTimer,
    reset,
  };
}

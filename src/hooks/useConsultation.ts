import { useState, useCallback, useRef, useEffect } from 'react';
import { useScribe, CommitStrategy } from '@elevenlabs/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type SpeakerType = 'doctor' | 'patient' | 'companion';
export type ListeningHealth = 'idle' | 'live' | 'reconnecting' | 'down';

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

// Sessão de escuta longa — consultório
export const MAX_SESSION_SECONDS = 60 * 60; // 60 minutos
export const COUNTDOWN_FROM_SECONDS = 10 * 60; // mostra tempo restante nos últimos 10 min
const AUDIO_BLOCK_MS = 10 * 60 * 1000; // blocos de 10 min para a revisão final
const MAX_RECONNECT_ATTEMPTS = 3;
const DRAFT_KEY = 'consultorio-draft-v1';
const DRAFT_MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface ConsultationDraft {
  savedAt: string;
  elapsedSeconds: number;
  segments: { id: string; speaker: SpeakerType; text: string; timestamp: string; confidence: number; isEdited: boolean }[];
  structure: AnamnesisStructure;
  reviewedTranscript: string;
  smartSummary: string;
}

function readDraft(): ConsultationDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsultationDraft;
    if (!parsed?.segments?.length) return null;
    if (Date.now() - new Date(parsed.savedAt).getTime() > DRAFT_MAX_AGE_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

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
  const [changedFields, setChangedFields] = useState<Set<keyof AnamnesisStructure>>(new Set());
  const [lastStructuredAt, setLastStructuredAt] = useState<Date | null>(null);
  const [smartSummary, setSmartSummary] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [reviewedTranscript, setReviewedTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [listeningHealth, setListeningHealth] = useState<ListeningHealth>('idle');
  const [limitReached, setLimitReached] = useState(false);
  const [recoverableDraft, setRecoverableDraft] = useState<ConsultationDraft | null>(() => readDraft());
  const [currentSpeaker, setCurrentSpeakerState] = useState<SpeakerType>('doctor');
  const [liveStructuring, setLiveStructuring] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('consultorio-live-structuring') !== '0';
  });
  const [specialty, setSpecialty] = useState<string>(() => {
    if (typeof window === 'undefined') return 'auto';
    return localStorage.getItem('consultorio-specialty') || 'auto';
  });
  const [detectedSpecialty, setDetectedSpecialty] = useState<string>('');
  const specialtyRef = useRef<string>(specialty);
  useEffect(() => {
    specialtyRef.current = specialty;
    if (typeof window !== 'undefined') {
      localStorage.setItem('consultorio-specialty', specialty);
    }
    if (specialty !== 'auto') setDetectedSpecialty('');
  }, [specialty]);
  const currentSpeakerRef = useRef<SpeakerType>('doctor');
  const setCurrentSpeaker = useCallback((s: SpeakerType) => {
    currentSpeakerRef.current = s;
    setCurrentSpeakerState(s);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('consultorio-live-structuring', liveStructuring ? '1' : '0');
    }
  }, [liveStructuring]);

  // ---- Cronômetro baseado em relógio real ----------------------------------
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningSinceRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);

  // ---- Captura de áudio em blocos (revisão final) --------------------------
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const blockChunksRef = useRef<Blob[]>([]);
  const audioBlocksRef = useRef<Blob[]>([]);
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelRafRef = useRef<number | null>(null);

  // ---- Saúde da escuta -----------------------------------------------------
  const isRecordingRef = useRef(false);
  const isPausedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectingRef = useRef(false);
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ElevenLabs Scribe v2 Realtime - VAD ~700ms, no diarization
  const scribe = useScribe({
    modelId: 'scribe_v2_realtime',
    commitStrategy: CommitStrategy.VAD,
    languageCode: 'por',
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
          speaker: currentSpeakerRef.current,
          text,
          timestamp: new Date(),
          confidence: 0.95,
          isEdited: false,
        },
      ]);
    },
    onError: (err: unknown) => {
      console.error('[Scribe] error:', err);
      if (isRecordingRef.current && !isPausedRef.current) {
        setListeningHealth('reconnecting');
      }
    },
  });

  const scribeRef = useRef(scribe);
  useEffect(() => {
    scribeRef.current = scribe;
  }, [scribe]);

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

  const syncElapsed = useCallback(() => {
    const base = accumulatedRef.current;
    const live = runningSinceRef.current ? (Date.now() - runningSinceRef.current) / 1000 : 0;
    setElapsedTime(Math.floor(base + live));
  }, []);

  const startTimer = useCallback(() => {
    if (!startTime) setStartTime(new Date());
    runningSinceRef.current = Date.now();
    syncElapsed();
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(syncElapsed, 500);
  }, [startTime, syncElapsed]);

  const stopTimer = useCallback(() => {
    if (runningSinceRef.current) {
      accumulatedRef.current += (Date.now() - runningSinceRef.current) / 1000;
      runningSinceRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    syncElapsed();
  }, [syncElapsed]);

  // ---- Blocos de áudio -----------------------------------------------------
  const flushBlockRecorder = useCallback(async (): Promise<void> => {
    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    if (blockTimerRef.current) {
      clearTimeout(blockTimerRef.current);
      blockTimerRef.current = null;
    }
    if (!recorder || recorder.state === 'inactive') return;

    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = new Blob(blockChunksRef.current, { type });
        blockChunksRef.current = [];
        if (blob.size > 2000) audioBlocksRef.current.push(blob);
        resolve();
      };
      try {
        recorder.stop();
      } catch {
        resolve();
      }
    });
  }, []);

  const startBlockRecorder = useCallback((stream: MediaStream) => {
    const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    const supportedMime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
    const recorder = new MediaRecorder(stream, supportedMime ? { mimeType: supportedMime } : undefined);
    blockChunksRef.current = [];
    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) blockChunksRef.current.push(ev.data);
    };
    recorder.start(1000);
    mediaRecorderRef.current = recorder;

    blockTimerRef.current = setTimeout(() => {
      void (async () => {
        await flushBlockRecorder();
        const liveStream = audioStreamRef.current;
        if (isRecordingRef.current && !isPausedRef.current && liveStream) {
          startBlockRecorder(liveStream);
        }
      })();
    }, AUDIO_BLOCK_MS);
  }, [flushBlockRecorder]);

  // ---- Conexão da escuta ---------------------------------------------------
  const connectScribe = useCallback(async () => {
    const { data, error: tokenError } = await supabase.functions.invoke('elevenlabs-scribe-token');
    if (tokenError || !data?.token) {
      throw new Error(tokenError?.message || 'Falha ao obter token de transcrição');
    }
    await scribeRef.current.connect({
      token: data.token,
      microphone: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  }, []);

  const attemptReconnect = useCallback(async () => {
    if (reconnectingRef.current) return;
    reconnectingRef.current = true;
    setListeningHealth('reconnecting');

    while (
      isRecordingRef.current &&
      !isPausedRef.current &&
      reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
    ) {
      reconnectAttemptsRef.current += 1;
      const wait = 1000 * reconnectAttemptsRef.current;
      await new Promise((r) => setTimeout(r, wait));
      if (!isRecordingRef.current || isPausedRef.current) break;
      try {
        try { await scribeRef.current.disconnect(); } catch { /* ignore */ }
        await connectScribe();
        reconnectAttemptsRef.current = 0;
        reconnectingRef.current = false;
        setListeningHealth('live');
        setError(null);
        toast.success('Escuta restabelecida');
        return;
      } catch (err) {
        console.error('[useConsultation] reconnect failed:', err);
      }
    }

    reconnectingRef.current = false;
    if (isRecordingRef.current && !isPausedRef.current) {
      setListeningHealth('down');
      setError('A escuta parou. Pause e retome a gravação para reconectar.');
    }
  }, [connectScribe]);

  const startRecording = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    setLimitReached(false);
    try {
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

      isRecordingRef.current = true;
      isPausedRef.current = false;
      reconnectAttemptsRef.current = 0;
      startBlockRecorder(stream);

      await connectScribe();

      setIsRecording(true);
      setIsPaused(false);
      setListeningHealth('live');
      startTimer();
      toast.success('Modo Escuta ativado — transcrevendo em tempo real');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar gravação';
      console.error('[useConsultation] start error:', err);
      isRecordingRef.current = false;
      setError(msg);
      setListeningHealth('idle');
      toast.error(msg);
      try { mediaRecorderRef.current?.stop(); } catch { /* ignore */ }
      mediaRecorderRef.current = null;
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
      stopAudioLevelMonitor();
    } finally {
      setIsConnecting(false);
    }
  }, [connectScribe, startAudioLevelMonitor, stopAudioLevelMonitor, startTimer, startBlockRecorder]);

  const pauseRecording = useCallback(() => {
    isPausedRef.current = true;
    setIsPaused(true);
    setListeningHealth('idle');
    setPartialTranscription('');
    stopTimer();
    // Fecha a escuta de verdade: conexões ociosas são derrubadas pelo serviço.
    void (async () => {
      try { await scribeRef.current.disconnect(); } catch { /* ignore */ }
      await flushBlockRecorder();
    })();
    audioStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    toast.info('Gravação pausada');
  }, [stopTimer, flushBlockRecorder]);

  const resumeRecording = useCallback(() => {
    void (async () => {
      setIsConnecting(true);
      try {
        let stream = audioStreamRef.current;
        const hasLiveTrack = !!stream?.getAudioTracks().some((t) => t.readyState === 'live');
        if (!hasLiveTrack) {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
          });
          audioStreamRef.current = stream;
          startAudioLevelMonitor(stream);
        } else {
          stream!.getAudioTracks().forEach((t) => (t.enabled = true));
        }

        isPausedRef.current = false;
        reconnectAttemptsRef.current = 0;
        await connectScribe();
        startBlockRecorder(audioStreamRef.current!);

        setIsPaused(false);
        setListeningHealth('live');
        setError(null);
        startTimer();
        toast.info('Gravação retomada');
      } catch (err) {
        console.error('[useConsultation] resume error:', err);
        isPausedRef.current = true;
        setListeningHealth('down');
        setError('Não foi possível retomar a escuta. Tente novamente.');
        toast.error('Não foi possível retomar a escuta.');
      } finally {
        setIsConnecting(false);
      }
    })();
  }, [connectScribe, startAudioLevelMonitor, startBlockRecorder, startTimer]);

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

  // Revisão final em blocos: cada bloco de ~10 min é transcrito em alta
  // precisão e os textos são recolados. Um bloco que falha não derruba o resto.
  const runFinalReview = useCallback(async (blocks: Blob[]) => {
    const usable = blocks.filter((b) => b.size > 2000);
    if (usable.length === 0) return;

    setIsFinalizing(true);
    setReviewProgress({ done: 0, total: usable.length });
    const parts: string[] = [];
    let failures = 0;

    for (let i = 0; i < usable.length; i++) {
      const blob = usable[i];
      try {
        const reader = new FileReader();
        const base64: string = await new Promise((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const { data, error: fnError } = await supabase.functions.invoke('consultation-transcribe', {
          body: { audio: base64, mimeType: blob.type },
        });
        if (fnError) throw fnError;
        const text = (data?.text || '').trim();
        if (text && !isHallucination(text)) parts.push(text);
      } catch (err) {
        failures += 1;
        console.error(`[useConsultation] final review block ${i + 1} failed:`, err);
      } finally {
        setReviewProgress({ done: i + 1, total: usable.length });
      }
    }

    if (parts.length > 0) {
      setReviewedTranscript(parts.join('\n\n'));
      if (failures > 0) {
        toast.warning('Parte do áudio não pôde ser revisada — usando a transcrição ao vivo nesse trecho.');
      } else {
        toast.success('Revisão final concluída — falantes preservados');
      }
    } else {
      toast.warning('Revisão final indisponível — usando transcrição ao vivo');
    }
    setIsFinalizing(false);
  }, []);

  const stopRecording = useCallback(async () => {
    isRecordingRef.current = false;
    isPausedRef.current = false;
    stopTimer();

    try { await scribeRef.current.disconnect(); } catch { /* ignore */ }
    await flushBlockRecorder();

    const blocks = audioBlocksRef.current.slice();
    audioBlocksRef.current = [];
    stopMediaResources();

    setIsRecording(false);
    setIsPaused(false);
    setPartialTranscription('');
    setListeningHealth('idle');

    if (blocks.length > 0) {
      await runFinalReview(blocks);
    }
  }, [stopTimer, stopMediaResources, runFinalReview, flushBlockRecorder]);

  const stopRecordingRef = useRef(stopRecording);
  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  // ---- Vigia da sessão: saúde da escuta + limite de 60 min -----------------
  useEffect(() => {
    if (!isRecording || isPaused) {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
      return;
    }

    watchdogRef.current = setInterval(() => {
      const base = accumulatedRef.current;
      const live = runningSinceRef.current ? (Date.now() - runningSinceRef.current) / 1000 : 0;
      const elapsed = base + live;

      if (elapsed >= MAX_SESSION_SECONDS) {
        setLimitReached(true);
        void stopRecordingRef.current();
        return;
      }

      if (!scribeRef.current.isConnected && !reconnectingRef.current) {
        void attemptReconnect();
      }
    }, 5000);

    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [isRecording, isPaused, attemptReconnect]);

  const buildTranscriptForAI = useCallback(
    (opts?: { preferReviewed?: boolean }) => {
      if (opts?.preferReviewed && reviewedTranscript) return reviewedTranscript;
      return segments
        .map((s) => {
          const who = s.speaker === 'doctor' ? 'Médico' : s.speaker === 'patient' ? 'Paciente' : 'Acompanhante';
          return `${who}: ${s.text}`;
        })
        .join('\n');
    },
    [segments, reviewedTranscript]
  );

  const structuringRef = useRef(false);

  const runStructuring = useCallback(
    async (opts?: { silent?: boolean; preferReviewed?: boolean }) => {
      if (structuringRef.current) return;
      const transcriptionText = buildTranscriptForAI({ preferReviewed: opts?.preferReviewed });
      if (!transcriptionText.trim()) return;

      structuringRef.current = true;
      setIsStructuring(true);
      try {
        const { data, error: fnError } = await supabase.functions.invoke('structure-anamnesis', {
          body: { transcription: transcriptionText, specialty: specialtyRef.current },
        });
        if (fnError) throw fnError;
        if (data?.structure) {
          const { detectedSpecialty: detected, ...sections } = data.structure as Record<string, string>;
          if (specialtyRef.current === 'auto' && detected) setDetectedSpecialty(detected);
          setStructure((prev) => {
            const next = { ...prev } as AnamnesisStructure;
            const changed = new Set<keyof AnamnesisStructure>();
            (Object.keys(prev) as (keyof AnamnesisStructure)[]).forEach((k) => {
              const incoming = (sections[k] || '').trim();
              const current = (prev[k] || '').trim();
              // Atualiza seção por seção: só mexe no que realmente mudou,
              // evitando o painel inteiro "piscar" a cada nova leva de falas.
              if (incoming && incoming !== current) {
                next[k] = sections[k];
                changed.add(k);
              }
            });
            setChangedFields(changed);
            return changed.size > 0 ? next : prev;
          });
          setLastStructuredAt(new Date());
        }
      } catch (err) {
        console.error('Error structuring anamnesis:', err);
        if (!opts?.silent) toast.error('Erro ao estruturar anamnese');
      } finally {
        structuringRef.current = false;
        setIsStructuring(false);
      }
    },
    [buildTranscriptForAI]
  );

  const updateStructure = useCallback(
    () => runStructuring({ preferReviewed: true }),
    [runStructuring]
  );

  // ---- Estruturação ao vivo, com ritmo adaptativo --------------------------
  const lastLiveCountRef = useRef(0);
  useEffect(() => {
    if (!liveStructuring || !isRecording || isPaused) return;
    if (segments.length < 3) return;

    // consultas longas: espaça as atualizações para não competir com a escuta
    const step = segments.length > 120 ? 10 : segments.length > 50 ? 6 : 3;
    const delay = segments.length > 120 ? 9000 : segments.length > 50 ? 6000 : 4000;
    if (segments.length - lastLiveCountRef.current < step) return;

    const timer = setTimeout(() => {
      lastLiveCountRef.current = segments.length;
      void runStructuring({ silent: true });
    }, delay);

    return () => clearTimeout(timer);
  }, [segments.length, liveStructuring, isRecording, isPaused, runStructuring]);

  // Limpa o realce dos campos alterados
  useEffect(() => {
    if (changedFields.size === 0) return;
    const t = setTimeout(() => setChangedFields(new Set()), 2600);
    return () => clearTimeout(t);
  }, [changedFields]);

  // ---- Rascunho automático -------------------------------------------------
  const persistDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (segments.length === 0) return;
    const draft: ConsultationDraft = {
      savedAt: new Date().toISOString(),
      elapsedSeconds: Math.floor(accumulatedRef.current + (runningSinceRef.current ? (Date.now() - runningSinceRef.current) / 1000 : 0)),
      segments: segments.map((s) => ({ ...s, timestamp: s.timestamp.toISOString() })),
      structure,
      reviewedTranscript,
      smartSummary,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('[useConsultation] draft save failed', e);
    }
  }, [segments, structure, reviewedTranscript, smartSummary]);

  useEffect(() => {
    const t = setTimeout(persistDraft, 800);
    return () => clearTimeout(t);
  }, [persistDraft]);

  useEffect(() => {
    const onHide = () => persistDraft();
    window.addEventListener('beforeunload', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('beforeunload', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [persistDraft]);

  const clearDraft = useCallback(() => {
    if (typeof window !== 'undefined') localStorage.removeItem(DRAFT_KEY);
    setRecoverableDraft(null);
  }, []);

  const restoreDraft = useCallback(() => {
    const draft = recoverableDraft ?? readDraft();
    if (!draft) return;
    setSegments(
      draft.segments.map((s) => ({ ...s, timestamp: new Date(s.timestamp) }))
    );
    setStructure({ ...EMPTY_ANAMNESIS, ...draft.structure });
    setReviewedTranscript(draft.reviewedTranscript || '');
    setSmartSummary(draft.smartSummary || '');
    accumulatedRef.current = draft.elapsedSeconds || 0;
    runningSinceRef.current = null;
    setElapsedTime(Math.floor(draft.elapsedSeconds || 0));
    setStartTime(new Date(draft.savedAt));
    setRecoverableDraft(null);
    toast.success('Consulta recuperada 👏');
  }, [recoverableDraft]);

  const discardDraft = useCallback(() => {
    clearDraft();
    toast.info('Rascunho descartado');
  }, [clearDraft]);

  // Resumo clínico inteligente da consulta
  const generateSummary = useCallback(async () => {
    const transcriptionText = buildTranscriptForAI({ preferReviewed: true });
    if (!transcriptionText.trim()) {
      toast.error('Não há transcrição para resumir.');
      return;
    }
    setIsSummarizing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('structure-anamnesis', {
        body: { transcription: transcriptionText, mode: 'summary' },
      });
      if (fnError) throw fnError;
      const text = (data?.summary || '').trim();
      if (!text) throw new Error('Resumo vazio');
      setSmartSummary(text);
      toast.success('Resumo inteligente pronto 👏');
    } catch (err) {
      console.error('Error generating summary:', err);
      toast.error('Não foi possível gerar o resumo agora.');
    } finally {
      setIsSummarizing(false);
    }
  }, [buildTranscriptForAI]);

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
    setChangedFields(new Set());
    setSmartSummary('');
    setReviewedTranscript('');
    setLastStructuredAt(null);
    lastLiveCountRef.current = 0;
    setStartTime(null);
    setElapsedTime(0);
    setLimitReached(false);
    setReviewProgress({ done: 0, total: 0 });
    accumulatedRef.current = 0;
    runningSinceRef.current = null;
    audioBlocksRef.current = [];
    stopTimer();
    clearDraft();
  }, [stopTimer, clearDraft]);

  const formatElapsedTime = useCallback(() => {
    const h = Math.floor(elapsedTime / 3600);
    const m = Math.floor((elapsedTime % 3600) / 60);
    const s = elapsedTime % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [elapsedTime]);

  const remainingSeconds = Math.max(0, MAX_SESSION_SECONDS - elapsedTime);
  const formatRemaining = () => {
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      try { void scribeRef.current.disconnect(); } catch { /* ignore */ }
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
    changedFields,
    lastStructuredAt,
    smartSummary,
    isSummarizing,
    reviewedTranscript,
    liveStructuring,
    setLiveStructuring,
    specialty,
    setSpecialty,
    detectedSpecialty,

    isRecording,
    isPaused,
    isConnecting,
    isTranscribing: scribe.isConnected && !!partialTranscription,
    isStructuring,
    isFinalizing,
    reviewProgress,
    startTime,
    elapsedTime,
    formattedTime: formatElapsedTime(),
    remainingSeconds,
    formattedRemaining: formatRemaining(),
    maxSessionSeconds: MAX_SESSION_SECONDS,
    countdownFromSeconds: COUNTDOWN_FROM_SECONDS,
    limitReached,
    listeningHealth,
    currentSpeaker,
    setCurrentSpeaker,
    audioLevel,
    error,
    scribeConnected: scribe.isConnected,

    // Rascunho
    recoverableDraft,
    restoreDraft,
    discardDraft,
    clearDraft,

    // Actions
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    updateStructure,
    generateSummary,
    buildTranscriptForAI,
    changeSpeaker,
    editSegmentText,
    deleteSegment,
    updateStructureField,

    startTimer,
    stopTimer,
    reset,
  };
}

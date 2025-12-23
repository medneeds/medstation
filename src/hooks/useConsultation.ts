import { useState, useCallback, useRef } from 'react';
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

export function useConsultation({ caseId }: UseConsultationOptions = {}) {
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [structure, setStructure] = useState<AnamnesisStructure>(EMPTY_ANAMNESIS);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isStructuring, setIsStructuring] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const lastSpeakerRef = useRef<SpeakerType>('doctor');
  const structureTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    setStartTime(new Date());
    timerIntervalRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  const inferSpeaker = useCallback((text: string): { speaker: SpeakerType; confidence: number } => {
    const lowerText = text.toLowerCase();
    
    // Doctor patterns
    const doctorPatterns = [
      /\?$/, // Questions
      /como está|o que traz|há quanto tempo|desde quando/i,
      /vamos examinar|preciso pedir|vou receitar|vou prescrever/i,
      /me conte|me fale|descreva/i,
      /alguma alergia|usa algum medicamento|já teve/i,
      /ao exame|à palpação|à ausculta/i,
    ];
    
    // Patient patterns
    const patientPatterns = [
      /estou com|sinto|tenho sentido|apareceu/i,
      /começou|faz.*dias|há.*semanas|desde/i,
      /dói quando|piora se|melhora com/i,
      /não consigo|não aguento|me incomoda/i,
      /tomo|uso|tô tomando/i,
    ];
    
    // Companion patterns
    const companionPatterns = [
      /ele está|ela está|ele tem|ela tem/i,
      /meu filho|minha filha|minha mãe|meu pai/i,
      /o paciente|a paciente|ele sente|ela sente/i,
      /trouxe porque|vim porque ele|vim porque ela/i,
    ];
    
    let doctorScore = 0;
    let patientScore = 0;
    let companionScore = 0;
    
    doctorPatterns.forEach(pattern => {
      if (pattern.test(lowerText)) doctorScore += 2;
    });
    
    patientPatterns.forEach(pattern => {
      if (pattern.test(lowerText)) patientScore += 2;
    });
    
    companionPatterns.forEach(pattern => {
      if (pattern.test(lowerText)) companionScore += 3;
    });
    
    // Turn-taking logic: if last was doctor asking, next is likely patient
    if (lastSpeakerRef.current === 'doctor' && patientScore >= doctorScore) {
      patientScore += 1;
    }
    
    const maxScore = Math.max(doctorScore, patientScore, companionScore);
    const totalScore = doctorScore + patientScore + companionScore;
    
    let speaker: SpeakerType;
    let confidence: number;
    
    if (companionScore === maxScore && companionScore > 0) {
      speaker = 'companion';
      confidence = totalScore > 0 ? companionScore / totalScore : 0.5;
    } else if (doctorScore >= patientScore) {
      speaker = 'doctor';
      confidence = totalScore > 0 ? doctorScore / totalScore : 0.5;
    } else {
      speaker = 'patient';
      confidence = totalScore > 0 ? patientScore / totalScore : 0.5;
    }
    
    // Minimum confidence
    confidence = Math.max(0.4, Math.min(0.95, confidence));
    
    lastSpeakerRef.current = speaker;
    
    return { speaker, confidence };
  }, []);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    if (audioBlob.size < 1000) return; // Skip very small chunks
    
    setIsTranscribing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      const base64Audio = await base64Promise;
      
      const { data, error } = await supabase.functions.invoke('consultation-transcribe', {
        body: { audio: base64Audio },
      });
      
      if (error) throw error;
      
      if (data?.text && data.text.trim()) {
        const text = data.text.trim();
        const { speaker, confidence } = inferSpeaker(text);
        
        const newSegment: TranscriptionSegment = {
          id: crypto.randomUUID(),
          speaker,
          text,
          timestamp: new Date(),
          confidence,
          isEdited: false,
        };
        
        setSegments(prev => [...prev, newSegment]);
        setCurrentTranscription('');
        
        // Schedule structure update
        if (structureTimeoutRef.current) {
          clearTimeout(structureTimeoutRef.current);
        }
        structureTimeoutRef.current = setTimeout(() => {
          updateStructure();
        }, 5000);
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
    } finally {
      setIsTranscribing(false);
    }
  }, [inferSpeaker]);

  const updateStructure = useCallback(async () => {
    if (segments.length === 0) return;
    
    setIsStructuring(true);
    
    try {
      const transcriptionText = segments
        .map(s => `[${s.speaker === 'doctor' ? 'Médico' : s.speaker === 'patient' ? 'Paciente' : 'Acompanhante'}]: ${s.text}`)
        .join('\n');
      
      const { data, error } = await supabase.functions.invoke('structure-anamnesis', {
        body: { transcription: transcriptionText },
      });
      
      if (error) throw error;
      
      if (data?.structure) {
        setStructure(prev => ({
          ...prev,
          ...data.structure,
        }));
      }
    } catch (err) {
      console.error('Error structuring anamnesis:', err);
    } finally {
      setIsStructuring(false);
    }
  }, [segments]);

  const changeSpeaker = useCallback((segmentId: string, newSpeaker: SpeakerType) => {
    setSegments(prev => prev.map(seg => 
      seg.id === segmentId 
        ? { ...seg, speaker: newSpeaker, isEdited: true, confidence: 1 }
        : seg
    ));
  }, []);

  const editSegmentText = useCallback((segmentId: string, newText: string) => {
    setSegments(prev => prev.map(seg => 
      seg.id === segmentId 
        ? { ...seg, text: newText, isEdited: true }
        : seg
    ));
  }, []);

  const deleteSegment = useCallback((segmentId: string) => {
    setSegments(prev => prev.filter(seg => seg.id !== segmentId));
  }, []);

  const updateStructureField = useCallback((field: keyof AnamnesisStructure, value: string) => {
    setStructure(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const reset = useCallback(() => {
    setSegments([]);
    setCurrentTranscription('');
    setStructure(EMPTY_ANAMNESIS);
    setStartTime(null);
    setElapsedTime(0);
    stopTimer();
    lastSpeakerRef.current = 'doctor';
    
    if (structureTimeoutRef.current) {
      clearTimeout(structureTimeoutRef.current);
      structureTimeoutRef.current = null;
    }
  }, [stopTimer]);

  const finalize = useCallback(async () => {
    // Force structure update
    await updateStructure();
    stopTimer();
    toast.success('Consulta finalizada com sucesso!');
  }, [updateStructure, stopTimer]);

  const formatElapsedTime = useCallback(() => {
    const hours = Math.floor(elapsedTime / 3600);
    const minutes = Math.floor((elapsedTime % 3600) / 60);
    const seconds = elapsedTime % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [elapsedTime]);

  return {
    // State
    segments,
    currentTranscription,
    structure,
    isTranscribing,
    isStructuring,
    startTime,
    elapsedTime,
    formattedTime: formatElapsedTime(),
    
    // Actions
    processAudioChunk,
    updateStructure,
    changeSpeaker,
    editSegmentText,
    deleteSegment,
    updateStructureField,
    startTimer,
    stopTimer,
    reset,
    finalize,
  };
}

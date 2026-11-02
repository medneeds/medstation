import { useCallback, useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssistantGlyph } from "@/components/AssistantGlyph";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { copyText } from "@/lib/clipboard";
import { todayISO, type WardUnit } from "@/hooks/useWard";
import {
  countdownSeconds, formatClock, joinPartTranscripts, pickRecorderMime, reachedRoundLimit,
  roundPartPath, shouldRotatePart, ROUND_MAX_SECONDS,
  type WardRoundItem, type WardRoundSession,
} from "@/lib/wardRound";
import {
  AlertTriangle, Check, ChevronRight, Copy, FileAudio, History, Loader2, Mic, Pause, Play,
  RotateCcw, Sparkles, Square, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface RoundPatientOption {
  admissionId: string;
  bed: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  unit: WardUnit | null;
  patients: RoundPatientOption[];
  onOpenPatient: (admissionId: string) => void;
  onSaved: () => void;
}

type Phase = "intro" | "recording" | "finishing" | "structuring" | "review";
type PartStatus = "uploading" | "transcribing" | "done" | "error";
interface Part { index: number; status: PartStatus; text: string; path?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function invokeError(error: unknown, data: unknown): Promise<string> {
  let msg = (data as any)?.error || "";
  try {
    const ctx = (error as any)?.context;
    if (!msg && ctx && typeof ctx.json === "function") msg = (await ctx.json())?.error || "";
  } catch { /* ignora */ }
  return msg || (error as any)?.message || "Tente novamente.";
}

const fmtDate = (iso: string) => iso.split("-").reverse().join("/");

/**
 * Gravação do round multiprofissional de um setor: grava em partes de ~10 min
 * (transcritas enquanto o round segue), guarda o áudio e a transcrição integral
 * e organiza o que foi discutido por paciente, em tópicos.
 */
export function RoundRecorderSheet({ open, onOpenChange, unit, patients, onOpenPatient, onSaved }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState("gravar");
  const [phase, setPhase] = useState<Phase>("intro");
  const [consent, setConsent] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(0);
  const [parts, setParts] = useState<Part[]>([]);
  const [items, setItems] = useState<WardRoundItem[]>([]);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<WardRoundSession[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [audioUrls, setAudioUrls] = useState<Record<string, string[]>>({});
  const [copiedAll, setCopiedAll] = useState(false);

  const userIdRef = useRef<string>("");
  const sessionRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mimeRef = useRef({ mime: "", ext: "webm" });
  const partIndexRef = useRef(0);
  const partSecondsRef = useRef(0);
  const totalRef = useRef(0);
  const pausedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<any>(null);
  const partsRef = useRef<Part[]>([]);
  const blobsRef = useRef<Record<number, Blob>>({});
  const pendingRef = useRef<Promise<void>[]>([]);
  const stopWaiterRef = useRef<(() => void) | null>(null);
  const persistChainRef = useRef<Promise<void>>(Promise.resolve());
  const finishingRef = useRef(false);

  const setPart = useCallback((index: number, patch: Partial<Part>) => {
    const next = [...partsRef.current];
    const i = next.findIndex((p) => p.index === index);
    if (i >= 0) next[i] = { ...next[i], ...patch };
    else next.push({ index, status: "uploading", text: "", ...patch });
    next.sort((a, b) => a.index - b.index);
    partsRef.current = next;
    setParts(next);
  }, []);

  /** Grava o progresso no banco em fila (sem atropelar atualizações). */
  const persistProgress = useCallback(() => {
    const id = sessionRef.current;
    if (!id) return;
    const snapshot = partsRef.current;
    persistChainRef.current = persistChainRef.current.then(async () => {
      await supabase.from("ward_round_sessions").update({
        duration_seconds: totalRef.current,
        audio_paths: snapshot.filter((p) => p.path).map((p) => p.path!) as string[],
        part_transcripts: snapshot.filter((p) => p.status === "done").map((p) => ({ index: p.index, text: p.text })),
        transcript: joinPartTranscripts(snapshot.filter((p) => p.status === "done")),
      }).eq("id", id);
    }).catch(() => undefined);
  }, []);

  const processPart = useCallback(async (index: number, blob: Blob) => {
    const id = sessionRef.current;
    if (!id) return;
    blobsRef.current[index] = blob;
    const existing = partsRef.current.find((p) => p.index === index);
    const path = existing?.path ?? roundPartPath(userIdRef.current, id, index, mimeRef.current.ext);
    setPart(index, { status: "uploading", path });

    if (!existing?.path || existing.status === "uploading" || existing.status === "error") {
      let uploaded = false;
      for (let attempt = 0; attempt < 4 && !uploaded; attempt++) {
        const { error } = await supabase.storage.from("round-audio").upload(path, blob, {
          contentType: blob.type || mimeRef.current.mime || "audio/webm",
          upsert: true,
        });
        if (!error) uploaded = true;
        else await sleep(1500 * (attempt + 1));
      }
      if (!uploaded) { setPart(index, { status: "error" }); return; }
      persistProgress();
    }

    setPart(index, { status: "transcribing" });
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error } = await supabase.functions.invoke("round-transcribe", {
        body: { sessionId: id, path, mimeType: blob.type || mimeRef.current.mime },
      });
      if (!error && (data as any)?.success) {
        setPart(index, { status: "done", text: String((data as any).transcription || "") });
        persistProgress();
        return;
      }
      const status = (error as any)?.context?.status;
      if (status === 402 || status === 400 || status === 401 || status === 403) break;
      await sleep(2500 * (attempt + 1));
    }
    setPart(index, { status: "error" });
  }, [persistProgress, setPart]);

  const startPart = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const index = partIndexRef.current;
    const chunks: Blob[] = [];
    const opts: MediaRecorderOptions = { audioBitsPerSecond: 32000 };
    if (mimeRef.current.mime) opts.mimeType = mimeRef.current.mime;
    const rec = new MediaRecorder(stream, opts);
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: rec.mimeType || mimeRef.current.mime || "audio/webm" });
      if (blob.size > 0) pendingRef.current.push(processPart(index, blob));
      const w = stopWaiterRef.current;
      if (w && recorderRef.current === rec) { stopWaiterRef.current = null; w(); }
    };
    rec.start(1000);
    recorderRef.current = rec;
    partSecondsRef.current = 0;
  }, [processPart]);

  const rotatePart = useCallback(() => {
    const old = recorderRef.current;
    partIndexRef.current += 1;
    startPart();
    if (old && old.state !== "inactive") old.stop();
  }, [startPart]);

  const releaseDevices = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    try { void wakeLockRef.current?.release?.(); } catch { /* ignora */ }
    wakeLockRef.current = null;
    setLevel(0);
  }, []);

  const structure = useCallback(async (opts?: { durationSeconds?: number }) => {
    const id = sessionRef.current;
    if (!id) return;
    setPhase("structuring");
    const full = joinPartTranscripts(partsRef.current.filter((p) => p.status === "done"));
    if (full) setTranscript(full);
    const { data, error } = await supabase.functions.invoke("round-structure", {
      body: { sessionId: id, transcript: full || undefined, durationSeconds: opts?.durationSeconds },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Não foi possível organizar o round", description: await invokeError(error, data), variant: "destructive" });
      setPhase("finishing");
      return;
    }
    setItems(((data as any)?.items as WardRoundItem[]) || []);
    setPhase("review");
    onSaved();
  }, [onSaved, toast]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase("finishing");
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((res) => {
        stopWaiterRef.current = res;
        try { rec.stop(); } catch { res(); }
        setTimeout(res, 4000);
      });
    }
    releaseDevices();
    await Promise.allSettled(pendingRef.current);
    await persistChainRef.current;
    finishingRef.current = false;
    const duration = totalRef.current;
    if (partsRef.current.some((p) => p.status === "error")) {
      toast({ title: "Algumas partes não foram transcritas", description: "Toque em Tentar de novo ou organize com o que já foi transcrito.", variant: "destructive" });
      return;
    }
    await structure({ durationSeconds: duration });
  }, [releaseDevices, structure, toast]);

  const tick = useCallback(() => {
    if (pausedRef.current) return;
    totalRef.current += 1;
    partSecondsRef.current += 1;
    setElapsed(totalRef.current);
    if (reachedRoundLimit(totalRef.current)) {
      toast({ title: "Limite de 90 minutos atingido", description: "Encerrando e organizando o round." });
      void finish();
    } else if (shouldRotatePart(partSecondsRef.current)) {
      rotatePart();
    }
  }, [finish, rotatePart, toast]);

  const tickRef = useRef(tick);
  useEffect(() => { tickRef.current = tick; }, [tick]);

  const start = async () => {
    if (!unit) return;
    if (!consent) { toast({ title: "Confirme que a equipe foi avisada", variant: "destructive" }); return; }
    if (typeof MediaRecorder === "undefined") {
      toast({ title: "Este navegador não grava áudio", description: "Use o Chrome, Edge ou Safari atualizado.", variant: "destructive" });
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre de novo na sua conta.");
      userIdRef.current = user.id;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      streamRef.current = stream;
      const { data, error } = await supabase.from("ward_round_sessions").insert({
        user_id: user.id, unit_id: unit.id, unit_name: unit.name, round_date: todayISO(),
        status: "recording", consent_confirmed_at: new Date().toISOString(),
      }).select().single();
      if (error || !data) throw new Error("Não foi possível iniciar o round.");

      sessionRef.current = (data as any).id;
      setSessionId((data as any).id);
      mimeRef.current = pickRecorderMime((m) => MediaRecorder.isTypeSupported?.(m) ?? false);
      partIndexRef.current = 0; totalRef.current = 0; pausedRef.current = false;
      partsRef.current = []; blobsRef.current = {}; pendingRef.current = [];
      setParts([]); setItems([]); setTranscript(""); setElapsed(0); setPaused(false);

      // Indicador de nível do som
      try {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        audioCtxRef.current = ctx;
        const buf = new Uint8Array(analyser.fftSize);
        const loop = () => {
          analyser.getByteTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
          setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch { /* sem indicador */ }

      try { wakeLockRef.current = await (navigator as any).wakeLock?.request?.("screen"); } catch { /* opcional */ }

      startPart();
      timerRef.current = window.setInterval(() => tickRef.current(), 1000);
      setPhase("recording");
    } catch (e: any) {
      releaseDevices();
      const denied = e?.name === "NotAllowedError";
      toast({
        title: denied ? "Microfone bloqueado" : "Não foi possível começar",
        description: denied ? "Libere o microfone para este site nas configurações do navegador." : e?.message,
        variant: "destructive",
      });
    }
  };

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (pausedRef.current) { rec.resume(); pausedRef.current = false; setPaused(false); }
    else { rec.pause(); pausedRef.current = true; setPaused(true); }
  };

  const retryFailed = async () => {
    setPhase("finishing");
    const failed = partsRef.current.filter((p) => p.status === "error");
    pendingRef.current = failed.map((p) => {
      const blob = blobsRef.current[p.index];
      return blob ? processPart(p.index, blob) : Promise.resolve();
    });
    await Promise.allSettled(pendingRef.current);
    await persistChainRef.current;
    if (!partsRef.current.some((p) => p.status === "error")) await structure({ durationSeconds: totalRef.current });
  };

  // Avisa antes de sair da página no meio da gravação.
  useEffect(() => {
    if (phase !== "recording") return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [phase]);

  useEffect(() => () => releaseDevices(), [releaseDevices]);

  const resetToIntro = () => {
    sessionRef.current = null;
    setSessionId(null); setPhase("intro"); setParts([]); partsRef.current = [];
    setItems([]); setTranscript(""); setElapsed(0); setConsent(false);
  };

  const handleOpenChange = (v: boolean) => {
    const busy = phase === "finishing" && (finishingRef.current || partsRef.current.some((p) => p.status === "uploading" || p.status === "transcribing"));
    if (!v && (phase === "recording" || phase === "structuring" || busy)) {
      toast({ title: phase === "recording" ? "Finalize o round antes de fechar" : "Aguarde terminar de organizar" });
      return;
    }
    if (!v && (phase === "review" || phase === "finishing")) resetToIntro();
    onOpenChange(v);
  };

  // Histórico do setor
  const loadHistory = useCallback(async () => {
    if (!unit) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from("ward_round_sessions")
      .select("id,unit_id,unit_name,round_date,started_at,ended_at,duration_seconds,status,transcript,audio_paths")
      .eq("unit_id", unit.id)
      .order("started_at", { ascending: false })
      .limit(20);
    setHistory((data as WardRoundSession[]) || []);
    setHistoryLoading(false);
  }, [unit]);

  useEffect(() => { if (open && tab === "anteriores") void loadHistory(); }, [open, tab, loadHistory]);

  const loadAudio = async (s: WardRoundSession) => {
    if (audioUrls[s.id] || !s.audio_paths?.length) return;
    const { data } = await supabase.storage.from("round-audio").createSignedUrls(s.audio_paths, 3600);
    setAudioUrls((prev) => ({ ...prev, [s.id]: (data || []).map((d) => d.signedUrl).filter(Boolean) as string[] }));
  };

  const openSession = async (s: WardRoundSession) => {
    const { data } = await supabase.from("ward_round_items").select("*").eq("session_id", s.id).order("created_at");
    sessionRef.current = s.id;
    setSessionId(s.id);
    setTranscript(s.transcript || "");
    setItems((data as WardRoundItem[]) || []);
    partsRef.current = [];
    setParts([]);
    totalRef.current = s.duration_seconds;
    setPhase((data || []).length || s.status === "ready" ? "review" : "finishing");
    setTab("gravar");
  };

  // Revisão
  const saveItem = async (item: WardRoundItem, patch: Partial<WardRoundItem>) => {
    const { error } = await supabase.from("ward_round_items").update(patch as any).eq("id", item.id);
    if (error) { toast({ title: "Não foi possível salvar", variant: "destructive" }); return; }
    setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));
    onSaved();
  };

  const assign = (item: WardRoundItem, admissionId: string) => {
    const p = patients.find((x) => x.admissionId === admissionId);
    if (!p) return;
    void saveItem(item, { admission_id: p.admissionId, bed_label: p.bed, patient_label: p.name });
    toast({ title: `Vinculado ao leito ${p.bed}` });
  };

  const copyAll = async () => {
    const text = items
      .map((it) => `${it.admission_id ? `LEITO ${it.bed_label} · ${it.patient_label}` : `NÃO IDENTIFICADO · ${it.patient_label ?? ""}`}\n\n${it.content}`)
      .join("\n\n\n");
    const ok = await copyText(text);
    if (ok) { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 1600); }
    toast({ title: ok ? "Round copiado" : "Não foi possível copiar", variant: ok ? undefined : "destructive" });
  };

  const left = countdownSeconds(elapsed);
  const doneParts = parts.filter((p) => p.status === "done").length;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <AssistantGlyph size="sm" animate={phase === "recording" && !paused}>
              <Users className="h-4 w-4" />
            </AssistantGlyph>
            <div className="min-w-0">
              <SheetTitle className="text-left">Round multiprofissional</SheetTitle>
              <SheetDescription className="text-left">
                {unit?.name ?? "Setor"} · grava o round inteiro e organiza o que foi discutido de cada paciente.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => phase === "recording" ? undefined : setTab(v)} className="mt-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gravar"><Mic className="h-3.5 w-3.5 mr-1.5" /> Gravar</TabsTrigger>
            <TabsTrigger value="anteriores" disabled={phase === "recording"}><History className="h-3.5 w-3.5 mr-1.5" /> Rounds anteriores</TabsTrigger>
          </TabsList>

          <TabsContent value="gravar" className="mt-5 space-y-5">
            {phase === "intro" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-hairline bg-primary/5 p-4 space-y-2 text-sm">
                  <p className="font-medium">Como funciona</p>
                  <ul className="space-y-1.5 text-muted-foreground list-disc pl-4">
                    <li>Grave o round inteiro do setor, até 90 minutos, com pausa quando precisar.</li>
                    <li>Ao mudar de paciente, diga o leito ou o nome. Isso ajuda a separar cada caso.</li>
                    <li>No final você recebe a transcrição integral e, para cada paciente, os tópicos discutidos: intervenções, dispositivos, culturas, antibióticos, enfermagem e fisioterapia, alta, família e pendências.</li>
                    <li>Nada é completado ou inventado: só entra o que foi dito.</li>
                  </ul>
                  <p className="text-xs text-muted-foreground">
                    {patients.length} paciente{patients.length === 1 ? "" : "s"} internado{patients.length === 1 ? "" : "s"} neste setor.
                  </p>
                </div>
                <label className="flex items-start gap-3 rounded-lg border border-hairline p-3 cursor-pointer">
                  <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
                  <span className="text-sm">
                    Avisei a equipe que o round será gravado.
                    <span className="block text-xs text-muted-foreground mt-0.5">O áudio e o texto ficam guardados só na sua conta.</span>
                  </span>
                </label>
                <Button onClick={() => void start()} disabled={!consent || !unit} className="w-full sm:w-auto">
                  <Mic className="h-4 w-4 mr-2" /> Começar gravação
                </Button>
              </div>
            )}

            {phase === "recording" && (
              <div className="space-y-5">
                <div className="rounded-lg border border-hairline bg-card p-5 text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-mono text-muted-foreground">
                    <span className={cn("h-2 w-2 rounded-full", paused ? "bg-muted-foreground" : "bg-destructive animate-pulse")} />
                    {paused ? "Pausado" : "Gravando"}
                  </div>
                  <p className="font-display text-4xl font-semibold tabular-nums">{formatClock(elapsed)}</p>
                  <div className="flex items-end justify-center gap-1 h-8" aria-hidden>
                    {Array.from({ length: 24 }).map((_, i) => {
                      const shape = 0.35 + 0.65 * Math.abs(Math.sin((i + 1) * 1.7));
                      const h = paused ? 0.08 : Math.max(0.08, level * shape);
                      return <span key={i} className="w-1 rounded-full bg-primary/70 transition-all duration-100" style={{ height: `${Math.round(h * 100)}%` }} />;
                    })}
                  </div>
                  {left !== null ? (
                    <p className="text-sm font-medium text-destructive">Faltam {formatClock(left)} para o limite de 90 minutos</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Limite: {ROUND_MAX_SECONDS / 60} minutos</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Dica: diga o leito ou o nome do paciente ao passar para o próximo.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={togglePause}>
                    {paused ? <><Play className="h-4 w-4 mr-2" /> Continuar</> : <><Pause className="h-4 w-4 mr-2" /> Pausar</>}
                  </Button>
                  <Button onClick={() => void finish()}>
                    <Square className="h-4 w-4 mr-2" /> Finalizar round
                  </Button>
                </div>
                {parts.length > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    {doneParts} de {parts.length} parte{parts.length === 1 ? "" : "s"} já transcrita{parts.length === 1 ? "" : "s"}
                  </p>
                )}
              </div>
            )}

            {(phase === "finishing" || phase === "structuring") && (
              <div className="space-y-4">
                <div className="rounded-lg border border-hairline bg-primary/5 p-4 flex items-center gap-3">
                  <Loader2 className={cn("h-5 w-5 text-primary", (phase === "structuring" || parts.some((p) => p.status !== "done" && p.status !== "error")) ? "animate-spin" : "hidden")} />
                  <div className="text-sm">
                    <p className="font-medium">{phase === "structuring" ? "Organizando o round por paciente..." : "Transcrevendo a gravação..."}</p>
                    <p className="text-muted-foreground text-xs">Gravação de {formatClock(totalRef.current)}. Pode levar até um minuto.</p>
                  </div>
                </div>
                {parts.length > 0 && (
                  <ul className="space-y-1.5">
                    {parts.map((p) => (
                      <li key={p.index} className="flex items-center justify-between rounded-md border border-hairline px-3 py-2 text-sm">
                        <span className="flex items-center gap-2"><FileAudio className="h-4 w-4 text-muted-foreground" /> Parte {p.index + 1}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.status === "done" && <span className="text-primary inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> transcrita</span>}
                          {p.status === "uploading" && "salvando..."}
                          {p.status === "transcribing" && "transcrevendo..."}
                          {p.status === "error" && <span className="text-destructive">falhou</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {phase === "finishing" && !parts.some((p) => p.status === "uploading" || p.status === "transcribing") && (
                  <div className="flex flex-wrap gap-2">
                    {parts.some((p) => p.status === "error") && (
                      <Button variant="outline" onClick={() => void retryFailed()}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Tentar de novo
                      </Button>
                    )}
                    <Button onClick={() => void structure({ durationSeconds: totalRef.current })}>
                      <Sparkles className="h-4 w-4 mr-2" /> Organizar {parts.some((p) => p.status === "error") ? "com o que foi transcrito" : "o round"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {phase === "review" && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">
                    {items.filter((i) => i.admission_id).length} paciente{items.filter((i) => i.admission_id).length === 1 ? "" : "s"} organizado{items.filter((i) => i.admission_id).length === 1 ? "" : "s"}
                    {items.some((i) => !i.admission_id) ? ` · ${items.filter((i) => !i.admission_id).length} trecho(s) sem paciente` : ""}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => void structure()} title="Organizar de novo">
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reorganizar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void copyAll()} disabled={!items.length}>
                      {copiedAll ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />} Copiar tudo
                    </Button>
                  </div>
                </div>

                {items.length === 0 && (
                  <div className="rounded-lg border border-dashed border-hairline p-6 text-center text-sm text-muted-foreground">
                    Não encontrei discussão de pacientes nesta gravação. A transcrição integral está abaixo.
                  </div>
                )}

                {items.map((it) => (
                  <div key={it.id} className={cn("rounded-lg border p-4 space-y-3", it.admission_id ? "border-hairline" : "border-amber-500/40 bg-amber-500/5")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {it.admission_id ? (
                        <div className="min-w-0">
                          <p className="font-mono text-2xs uppercase tracking-mono text-muted-foreground">Leito {it.bed_label}</p>
                          <p className="font-medium truncate">{it.patient_label}</p>
                        </div>
                      ) : (
                        <div className="min-w-0 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="font-medium">Não identificado</p>
                            {it.patient_label && it.patient_label !== "Não identificado" && (
                              <p className="text-xs text-muted-foreground">Dito no round: {it.patient_label}</p>
                            )}
                          </div>
                        </div>
                      )}
                      {it.admission_id ? (
                        <Button size="sm" variant="ghost" onClick={() => { handleOpenChange(false); onOpenPatient(it.admission_id!); }}>
                          Abrir paciente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Select onValueChange={(v) => assign(it, v)}>
                          <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Escolher o leito" /></SelectTrigger>
                          <SelectContent>
                            {patients.map((p) => (
                              <SelectItem key={p.admissionId} value={p.admissionId}>Leito {p.bed} · {p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Textarea
                      defaultValue={it.content}
                      rows={Math.min(18, Math.max(5, it.content.split("\n").length + 1))}
                      className="font-mono text-[0.8rem] leading-relaxed"
                      onBlur={(e) => { if (e.target.value !== it.content) void saveItem(it, { content: e.target.value }); }}
                    />
                  </div>
                ))}

                {transcript && (
                  <details className="rounded-lg border border-hairline p-3">
                    <summary className="cursor-pointer text-sm font-medium">Transcrição integral do round</summary>
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" variant="ghost" onClick={async () => {
                        const ok = await copyText(transcript);
                        toast({ title: ok ? "Transcrição copiada" : "Não foi possível copiar", variant: ok ? undefined : "destructive" });
                      }}>
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                      </Button>
                    </div>
                    <pre className="mt-1 max-h-80 overflow-y-auto whitespace-pre-wrap font-mono text-[0.78rem] text-muted-foreground">{transcript}</pre>
                  </details>
                )}

                <p className="text-xs text-muted-foreground">
                  Cada bloco já ficou salvo no paciente. Ao abrir o paciente, use "Usar na evolução de hoje" para levar os tópicos ao Carpe Diem.
                </p>
                <Button variant="outline" onClick={resetToIntro}>
                  <Mic className="h-4 w-4 mr-2" /> Gravar outro round
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="anteriores" className="mt-5 space-y-3">
            {historyLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</div>
            )}
            {!historyLoading && history.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum round gravado neste setor ainda.</p>
            )}
            {history.map((s) => (
              <details key={s.id} className="rounded-lg border border-hairline p-3" onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) void loadAudio(s); }}>
                <summary className="cursor-pointer text-sm font-medium flex flex-wrap items-center gap-2">
                  {fmtDate(s.round_date)} · {new Date(s.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  <span className="text-muted-foreground font-normal">· {formatClock(s.duration_seconds)}</span>
                  <Badge variant={s.status === "ready" ? "default" : "secondary"} className="ml-auto">
                    {s.status === "ready" ? "Organizado" : s.status === "error" ? "Com falha" : "Incompleto"}
                  </Badge>
                </summary>
                <div className="mt-3 space-y-3">
                  {(audioUrls[s.id] || []).map((url, i) => (
                    <div key={url} className="space-y-1">
                      <p className="text-2xs font-mono uppercase tracking-mono text-muted-foreground">Parte {i + 1}</p>
                      <audio controls preload="none" src={url} className="w-full h-9" />
                    </div>
                  ))}
                  {s.transcript ? (
                    <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-[0.78rem] text-muted-foreground">{s.transcript}</pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem transcrição.</p>
                  )}
                  <Button size="sm" variant="outline" onClick={() => void openSession(s)}>
                    Ver organização por paciente <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </details>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

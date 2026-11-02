import { useCallback, useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AssistantGlyph } from "@/components/AssistantGlyph";
import { AgentVoiceInput } from "@/components/AgentVoiceInput";
import { CarpeDiemFileButton } from "@/components/rotina/CarpeDiemFileButton";
import { applySpoken } from "@/lib/voiceAccess";
import { appendBlock, CARPE_DIEM_MAX_CHANGES, type WardRoundItem } from "@/lib/wardRound";
import { copyText } from "@/lib/clipboard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ageFromDob, daysOfStay, todayISO,
  type WardAdmission, type WardBed, type WardRound, type WardUnit,
} from "@/hooks/useWard";
import { Check, Copy, Loader2, LogOut, Move, Save, Sparkles, Sun, History, Pencil, Users, ArrowDownToLine } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  admission: WardAdmission | null;
  bed: WardBed | null;
  unit: WardUnit | null;
  beds: WardBed[];
  units: WardUnit[];
  occupiedBedIds: Set<string>;
  onMove: (admission: WardAdmission, toBed: WardBed, reason?: string) => Promise<void>;
  onDischarge: (admissionId: string, summary?: string) => Promise<void>;
  onChanged: () => void;
  onEdit?: (admission: WardAdmission) => void;
}

export function RoundSheet({
  open, onOpenChange, admission, bed, unit, beds, units, occupiedBedIds,
  onMove, onDischarge, onChanged, onEdit,
}: Props) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("draft");
  const [roundId, setRoundId] = useState<string | null>(null);
  const [previous, setPrevious] = useState<WardRound | null>(null);
  const [history, setHistory] = useState<WardRound[]>([]);
  const [changes, setChanges] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [moveTo, setMoveTo] = useState("");
  const [roundItems, setRoundItems] = useState<WardRoundItem[]>([]);

  const date = todayISO();

  const load = useCallback(async () => {
    if (!admission) return;
    setLoading(true);
    const [{ data }, { data: items }] = await Promise.all([
      supabase
        .from("ward_rounds")
        .select("*")
        .eq("admission_id", admission.id)
        .order("round_date", { ascending: false }),
      supabase
        .from("ward_round_items")
        .select("*")
        .eq("admission_id", admission.id)
        .order("round_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    const rows = (data as WardRound[]) || [];
    setRoundItems((items as WardRoundItem[]) || []);
    setHistory(rows);
    const today = rows.find((r) => r.round_date === date) || null;
    const prev = rows.find((r) => r.round_date < date) || null;
    setPrevious(prev);
    if (today) {
      setRoundId(today.id);
      setContent(today.content);
      setStatus(today.status);
    } else {
      setRoundId(null);
      setStatus("draft");
      setContent(prev ? prev.content : "");
    }
    setChanges("");
    setLoading(false);
  }, [admission, date]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  /** Acrescenta texto lido de arquivo ou tópicos do round ao campo do Carpe Diem. */
  const addBlock = (block: string) => {
    setChanges((prev) => {
      const next = appendBlock(prev, block);
      if (next.length > CARPE_DIEM_MAX_CHANGES) {
        toast({
          title: "Texto longo demais",
          description: "O Carpe Diem lê até 10.000 caracteres. Apague o que não for necessário antes de atualizar.",
          variant: "destructive",
        });
      }
      return next;
    });
  };

  const applyRoundItem = async (item: WardRoundItem) => {
    addBlock(`[Round multiprofissional de ${item.round_date.split("-").reverse().join("/")}]\n${item.content}`);
    const at = new Date().toISOString();
    setRoundItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, applied_to_round_at: at } : x)));
    await supabase.from("ward_round_items").update({ applied_to_round_at: at }).eq("id", item.id);
    toast({ title: "Tópicos do round no campo do Carpe Diem", description: "Revise e toque em Atualizar evolução de hoje." });
  };

  const patientMeta = useMemo(() => {
    if (!admission) return null;
    const age = ageFromDob(admission.date_of_birth);
    return {
      name: admission.patient_name,
      age: age ? `${age} anos` : "",
      bed: bed?.label ?? "",
      unit: unit?.name ?? "",
      admittedOn: admission.admitted_on,
      dayOfStay: daysOfStay(admission.admitted_on),
      diagnosis: admission.main_diagnosis ?? "",
      comorbidities: admission.comorbidities ?? "",
    };
  }, [admission, bed, unit]);

  const persist = async (nextStatus: string, origin = "manual", body = content) => {
    if (!admission) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("sem sessão");
      if (roundId) {
        const { error } = await supabase
          .from("ward_rounds")
          .update({ content: body, status: nextStatus, origin })
          .eq("id", roundId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ward_rounds")
          .insert({
            user_id: user.id,
            admission_id: admission.id,
            round_date: date,
            content: body,
            status: nextStatus,
            origin,
          })
          .select()
          .single();
        if (error) throw error;
        setRoundId((data as WardRound).id);
      }
      setStatus(nextStatus);
      onChanged();
      toast({ title: nextStatus === "final" ? "Evolução concluída" : "Rascunho salvo" });
    } catch {
      toast({ title: "Não foi possível salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runCarpeDiem = async () => {
    if (!admission) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("carpe-diem-round", {
        body: {
          patient: patientMeta,
          previousRound: previous?.content || content || "",
          changes,
          roundDate: date,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const text = (data as any)?.content?.trim();
      if (!text) throw new Error("Resposta vazia");
      setContent(text);
      await persist("draft", "ai", text);
      setChanges("");
    } catch (e: any) {
      toast({ title: "Carpe Diem indisponível", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const doCopy = async () => {
    const ok = await copyText(content);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
    toast({ title: ok ? "Evolução copiada" : "Não foi possível copiar", variant: ok ? undefined : "destructive" });
  };

  const freeBeds = beds.filter((b) => !occupiedBedIds.has(b.id));

  if (!admission) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="space-y-2">
          <div className="flex items-start gap-3">
            <AssistantGlyph size="sm" animate={false}>
              <Sun className="h-4 w-4" />
            </AssistantGlyph>
            <div className="min-w-0">
              <SheetTitle className="truncate text-left">{admission.patient_name}</SheetTitle>
              <SheetDescription className="text-left">
                Leito {bed?.label ?? "—"} · {unit?.name ?? "sem unidade"} · D{daysOfStay(admission.admitted_on)}
                {patientMeta?.age ? ` · ${patientMeta.age}` : ""}
              </SheetDescription>
            </div>
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                className="ml-auto shrink-0"
                onClick={() => onEdit(admission)}
              >
                <Pencil className="h-3.5 w-3.5 mr-1" /> Editar dados
              </Button>
            )}
          </div>
          {admission.main_diagnosis && (
            <p className="text-sm text-muted-foreground text-left">{admission.main_diagnosis}</p>
          )}
        </SheetHeader>


        <div className="mt-5 space-y-5">
          <div className="rounded-lg border border-hairline bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium">Carpe Diem — o que mudou hoje?</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <CarpeDiemFileButton onText={addBlock} disabled={generating} />
                <AgentVoiceInput
                  context="Evolução médica diária de enfermaria e UTI. Termos clínicos, medicações e doses."
                  disabled={generating}
                  onTranscription={(t, o) => setChanges((prev) => applySpoken(prev, t, o?.replace))}
                />
              </div>
            </div>
            <Textarea
              rows={3}
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="Febre 38,5 durante a noite, retirado cateter central, D5 de meropenem, desmame de noradrenalina... Você também pode ditar ou anexar foto e PDF de exames."
            />
            <Button onClick={runCarpeDiem} disabled={generating} className="w-full sm:w-auto">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {previous ? "Atualizar evolução de hoje" : "Gerar evolução inicial"}
            </Button>
            {previous && (
              <p className="text-2xs font-mono uppercase tracking-mono text-muted-foreground">
                Base: evolução de {previous.round_date.split("-").reverse().join("/")}
              </p>
            )}
          </div>

          {roundItems.length > 0 && (
            <div className="rounded-lg border border-hairline p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Round multiprofissional</span>
              </div>
              {roundItems.slice(0, 1).map((it) => (
                <div key={it.id} className="space-y-2">
                  <p className="text-2xs font-mono uppercase tracking-mono text-muted-foreground">
                    {it.round_date.split("-").reverse().join("/")}
                    {it.round_date === date ? " · hoje" : ""}
                  </p>
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap font-mono text-[0.78rem] leading-relaxed">{it.content}</pre>
                  <Button size="sm" variant={it.applied_to_round_at ? "outline" : "default"} onClick={() => void applyRoundItem(it)}>
                    <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" />
                    {it.applied_to_round_at ? "Usar de novo na evolução" : "Usar na evolução de hoje"}
                  </Button>
                </div>
              ))}
              {roundItems.length > 1 && (
                <div className="space-y-2 pt-1">
                  {roundItems.slice(1).map((it) => (
                    <details key={it.id} className="rounded-md border border-hairline p-2.5">
                      <summary className="cursor-pointer text-sm">Round de {it.round_date.split("-").reverse().join("/")}</summary>
                      <pre className="mt-2 whitespace-pre-wrap font-mono text-[0.76rem] text-muted-foreground">{it.content}</pre>
                      <Button size="sm" variant="ghost" className="mt-1" onClick={() => void applyRoundItem(it)}>
                        <ArrowDownToLine className="h-3.5 w-3.5 mr-1.5" /> Usar na evolução de hoje
                      </Button>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="round">Evolução de hoje</Label>
              <div className="flex items-center gap-2">
                <Badge variant={status === "final" ? "default" : "secondary"}>
                  {status === "final" ? "Concluída" : "Rascunho"}
                </Badge>
                <Button size="sm" variant="outline" onClick={doCopy}>
                  {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  Copiar
                </Button>
              </div>
            </div>
            <Textarea
              id="round"
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="font-mono text-[0.82rem] leading-relaxed"
              placeholder={loading ? "Carregando..." : "Escreva ou gere a evolução do dia."}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => persist("draft")} disabled={saving}>
                <Save className="h-4 w-4 mr-2" /> Salvar rascunho
              </Button>
              <Button onClick={() => persist("final")} disabled={saving}>
                <Check className="h-4 w-4 mr-2" /> Concluir evolução
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Mover de leito</Label>
              <div className="flex gap-2">
                <Select value={moveTo} onValueChange={setMoveTo}>
                  <SelectTrigger><SelectValue placeholder="Leito de destino" /></SelectTrigger>
                  <SelectContent>
                    {freeBeds.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {units.find((u) => u.id === b.unit_id)?.name} · {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  disabled={!moveTo}
                  onClick={async () => {
                    const target = beds.find((b) => b.id === moveTo);
                    if (!target) return;
                    await onMove(admission, target);
                    setMoveTo("");
                    toast({ title: "Paciente movido" });
                    onOpenChange(false);
                  }}
                >
                  <Move className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alta hospitalar</Label>
              <Button
                variant="outline"
                className="w-full text-destructive hover:text-destructive"
                onClick={async () => {
                  if (!confirm(`Dar alta a ${admission.patient_name}? O leito será liberado e o histórico fica no arquivo.`)) return;
                  await onDischarge(admission.id, content);
                  toast({ title: "Alta registrada" });
                  onOpenChange(false);
                }}
              >
                <LogOut className="h-4 w-4 mr-2" /> Dar alta
              </Button>
            </div>
          </div>

          {history.filter((r) => r.round_date !== date).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <Label>Evoluções anteriores</Label>
              </div>
              <div className="space-y-2">
                {history.filter((r) => r.round_date !== date).map((r) => (
                  <details key={r.id} className="rounded-lg border border-hairline p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {r.round_date.split("-").reverse().join("/")}
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap font-mono text-[0.78rem] text-muted-foreground">{r.content}</pre>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

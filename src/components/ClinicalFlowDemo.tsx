import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TestTube2, Stethoscope, Pill, MessagesSquare, Compass,
  Play, RotateCcw, Check, Clock, Copy, ArrowRight, ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";

interface FlowStage {
  id: string;
  assistant: string;
  icon: LucideIcon;
  label: string;
  title: string;
  input: string;
  output: string[];
  seconds: number;
}

const CASE_SUMMARY =
  "Homem, 62 anos, chega ao plantão com dor torácica há 2 horas, sudorese e dispneia. HAS e diabetes em uso irregular de medicação.";

const stages: FlowStage[] = [
  {
    id: "exame",
    assistant: "Examinus",
    icon: TestTube2,
    label: "Exame resumido",
    title: "Laboratório e ECG organizados",
    input: "Cola do sistema: hemograma, eletrólitos, troponina, função renal e laudo do ECG (texto bruto, fora de ordem).",
    output: [
      "ALTERADOS",
      "Troponina T 340 ng/L (VR <14) — em elevação",
      "Creatinina 1,6 mg/dL / TFG 44 — disfunção renal",
      "Glicemia 268 mg/dL",
      "",
      "ECG: supra de ST em parede inferior (D2, D3, aVF)",
      "",
      "IMPRESSÃO: padrão compatível com evento coronariano agudo com repercussão renal.",
    ],
    seconds: 6,
  },
  {
    id: "anamnese",
    assistant: "Clínicus",
    icon: Stethoscope,
    label: "Anamnese estruturada",
    title: "História clínica pronta para o prontuário",
    input: "Sua fala solta no plantão ou o texto digitado às pressas sobre o caso.",
    output: [
      "IDENTIFICAÇÃO: masculino, 62 anos",
      "",
      "QUEIXA: dor torácica há 2 horas",
      "",
      "HDA: dor retroesternal em aperto, início súbito em repouso, irradiação para mandíbula, acompanhada de sudorese fria e dispneia. Sem melhora com repouso.",
      "",
      "ANTECEDENTES: HAS, DM2, adesão irregular ao tratamento.",
      "",
      "EXAME FÍSICO: REG, corado, PA 158x94, FC 98, SatO2 94% ar ambiente.",
    ],
    seconds: 9,
  },
  {
    id: "prescricao",
    assistant: "Prescriptus",
    icon: Pill,
    label: "Prescrição direcionada",
    title: "Condutas sugeridas para o caso",
    input: "O mesmo caso, agora com o pedido: conduta inicial no pronto-socorro.",
    output: [
      "1. AAS 300 mg VO — mastigar, dose de ataque",
      "2. Clopidogrel 300 mg VO — dose de ataque",
      "3. Morfina 2 mg IV se dor refratária",
      "4. Oxigênio se SatO2 < 90%",
      "5. Enoxaparina — ajustar dose pela TFG 44",
      "",
      "ALERTA: função renal reduzida — evitar contraste desnecessário e revisar doses.",
    ],
    seconds: 7,
  },
  {
    id: "parecer",
    assistant: "Mediscuss",
    icon: MessagesSquare,
    label: "Parecer organizado",
    title: "Discussão pronta para acionar a especialidade",
    input: "Pedido de parecer à cardiologia, com o caso já estruturado.",
    output: [
      "MOTIVO DO PARECER: IAM com supra de ST inferior, tempo de dor 2h.",
      "",
      "RESUMO: paciente hipertenso e diabético, dor típica, troponina em ascensão, supra em parede inferior.",
      "",
      "CONDUTA JÁ INSTITUÍDA: dupla antiagregação, anticoagulação ajustada, analgesia.",
      "",
      "PERGUNTA OBJETIVA: disponibilidade de hemodinâmica em até 90 min ou indicação de trombólise?",
    ],
    seconds: 8,
  },
  {
    id: "alta",
    assistant: "Orientus",
    icon: Compass,
    label: "Orientações de alta",
    title: "Explicação que o paciente entende",
    input: "Fase de alta: converter o plano clínico em linguagem simples.",
    output: [
      "O QUE ACONTECEU",
      "Você teve um infarto: uma artéria do coração ficou entupida.",
      "",
      "COMO SE CUIDAR EM CASA",
      "Tome os remédios todos os dias, no mesmo horário, sem parar por conta própria.",
      "Evite esforço pesado nas primeiras semanas.",
      "",
      "VOLTE AO PRONTO-SOCORRO SE",
      "Sentir dor no peito novamente, falta de ar ou desmaio.",
    ],
    seconds: 5,
  },
];

const TOTAL_SECONDS = stages.reduce((a, s) => a + s.seconds, 0);
const STEP_MS = 1400;

export function ClinicalFlowDemo({ onPrimary }: { onPrimary?: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState<number>(-1);
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const play = useCallback(() => {
    clearTimeout(timer.current);
    setPlaying(true);
    setDone(-1);
    setActive(0);
    const advance = (i: number) => {
      timer.current = setTimeout(() => {
        setDone(i);
        if (i < stages.length - 1) {
          setActive(i + 1);
          advance(i + 1);
        } else {
          setPlaying(false);
        }
      }, STEP_MS);
    };
    advance(0);
  }, []);

  const elapsed = stages.slice(0, done + 1).reduce((a, s) => a + s.seconds, 0);
  const stage = stages[active];
  const revealed = done >= active;

  const copyOutput = async () => {
    await navigator.clipboard.writeText(stage.output.join("\n"));
    toast.success(`${stage.label} copiado`);
  };

  return (
    <div className="space-y-5">
      {/* Caso base */}
      <Card className="p-4 md:p-5 border border-hairline bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
          <div className="flex-1 space-y-1.5">
            <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-primary">
              Caso do plantão
            </span>
            <p className="text-sm md:text-base text-foreground/90 leading-relaxed">{CASE_SUMMARY}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={play} disabled={playing} className="whitespace-nowrap">
              {playing ? (
                <>Rodando o fluxo…</>
              ) : done === stages.length - 1 ? (
                <><RotateCcw className="w-4 h-4 mr-2" />Rodar de novo</>
              ) : (
                <><Play className="w-4 h-4 mr-2" />Rodar o fluxo completo</>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Linha do tempo */}
      <div className="-mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto scrollbar-none snap-x snap-mandatory scroll-px-4">
        <div className="flex items-stretch gap-2 min-w-max md:min-w-0">
          {stages.map((s, i) => {
            const Icon = s.icon;
            const isDone = done >= i;
            const isActive = i === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(i)}
                aria-pressed={isActive}
                className={cn(
                  "snap-start flex-1 min-w-[9.5rem] text-left rounded-xl border px-3 py-2.5 transition-all duration-300",
                  isActive
                    ? "border-primary/50 bg-primary/10 shadow-[0_10px_28px_-20px_hsl(var(--primary)/0.9)]"
                    : "border-border/60 bg-card/50 hover:border-primary/35 hover:-translate-y-0.5",
                  playing && isActive && !isDone && "animate-pulse",
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "grid place-items-center w-6 h-6 rounded-full border text-[0.6rem] font-mono shrink-0",
                      isDone
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {isDone ? <Check className="w-3 h-3" /> : i + 1}
                  </span>
                  <Icon className={cn("w-3.5 h-3.5", isActive ? "text-primary" : "text-muted-foreground")} />
                </div>
                <p className="text-xs font-medium mt-1.5 whitespace-nowrap">{s.label}</p>
                <p className="text-[0.65rem] text-muted-foreground whitespace-nowrap">
                  {s.assistant} · {s.seconds}s
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Painel do passo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-2 p-4 md:p-5 border border-hairline bg-muted/30">
          <Badge variant="secondary" className="text-[0.65rem]">O que você entrega</Badge>
          <h4 className="font-display text-base md:text-lg tracking-tight mt-3">{stage.assistant}</h4>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{stage.input}</p>
        </Card>

        <Card
          className={cn(
            "md:col-span-3 p-4 md:p-5 border transition-all duration-500",
            revealed
              ? "border-primary/40 bg-card shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]"
              : "border-dashed border-border/60 bg-card/40",
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge className="text-[0.65rem]">{stage.label}</Badge>
            {revealed && (
              <Button variant="ghost" size="sm" onClick={copyOutput} className="h-7 px-2 text-xs">
                <Copy className="w-3.5 h-3.5 mr-1.5" />Copiar
              </Button>
            )}
          </div>
          <h4 className="font-display text-base md:text-lg tracking-tight mb-3">{stage.title}</h4>
          {revealed ? (
            <div className="space-y-3 animate-fade-in">
              <div className="rounded-xl border border-border/50 bg-background/60 p-3 space-y-1">
                {stage.output.map((line, j) => (
                  <p key={j} className="text-xs md:text-[0.8rem] font-mono leading-relaxed text-foreground/90">
                    {line || "\u00A0"}
                  </p>
                ))}
              </div>
              <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
                  Saída de apoio, gerada por IA a partir do que foi informado. Revise doses, alergias, contraindicações
                  e dados do paciente antes de usar. Não substitui sua avaliação nem sua decisão médica.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-6 text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {playing ? "Organizando as informações…" : "Clique em “Rodar o fluxo completo” para ver o resultado."}
              </p>
              <div className="h-1.5 w-full max-w-xs mx-auto rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full bg-primary/70 rounded-full transition-all duration-500", playing ? "w-2/3 animate-pulse" : "w-0")} />
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Rodapé de tempo */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card/60 px-3.5 py-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">
            Tempo do fluxo:{" "}
            <span className="font-mono text-foreground">{elapsed}s</span> de {TOTAL_SECONDS}s
            <span className="hidden sm:inline"> · o mesmo trabalho digitado leva ~35 min</span>
          </span>
        </div>
        {onPrimary && (
          <Button variant="outline" onClick={onPrimary}>
            Testar com o seu caso agora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

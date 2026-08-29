import { useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TestTube2, Stethoscope, Pill, MessagesSquare, Compass, Wind,
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
    id: "gasometria",
    assistant: "Gasometrus",
    icon: Wind,
    label: "Gasometria interpretada",
    title: "Distúrbio ácido-base lido automaticamente",
    input: "Cola os valores da gasometria arterial, do jeito que saem da máquina.",
    output: [
      "pH 7,29 | pCO2 30 | HCO3 14 | BE -10 | Lactato 4,2 | SatO2 94%",
      "",
      "INTERPRETAÇÃO",
      "Acidose metabólica com ânion gap elevado",
      "Compensação respiratória adequada (Winter: pCO2 esperado 29-33)",
      "Hiperlactatemia — hipoperfusão tecidual",
      "",
      "IMPRESSÃO: acidose lática por baixo débito, coerente com evento coronariano agudo.",
    ],
    seconds: 5,
  },
  {
    id: "anamnese",
    assistant: "Clínicus",
    icon: Stethoscope,
    label: "Anamnese estruturada",
    title: "História clínica pronta para o prontuário",
    input: "Sua fala solta no plantão ou o texto digitado às pressas sobre o caso.",
    output: [
      "IDENTIFICAÇÃO",
      "Masculino, 62 anos, natural e procedente da região, admitido no pronto-socorro por demanda espontânea.",
      "",
      "QUEIXA PRINCIPAL",
      "Dor torácica há 2 horas.",
      "",
      "HISTÓRIA DA DOENÇA ATUAL",
      "Paciente refere dor retroesternal de início súbito há cerca de 2 horas, em repouso, de caráter constritivo (em aperto), intensidade 8/10, com irradiação para mandíbula e face medial do membro superior esquerdo. Associa sudorese fria, náusea e dispneia progressiva aos mínimos esforços. Nega melhora com repouso ou mudança de decúbito. Nega febre, tosse, síncope ou trauma recente. Nega episódios anginosos prévios semelhantes.",
      "",
      "ANTECEDENTES PESSOAIS",
      "Hipertensão arterial sistêmica e diabetes mellitus tipo 2, ambos com adesão irregular ao tratamento (losartana e metformina, uso intermitente há cerca de 3 meses). Nega cirurgias prévias, alergias medicamentosas conhecidas ou internações no último ano.",
      "",
      "HÁBITOS E HISTÓRIA FAMILIAR",
      "Tabagista 20 maços-ano, etilismo social. Pai com infarto agudo do miocárdio aos 58 anos.",
      "",
      "EXAME FÍSICO",
      "Regular estado geral, consciente, orientado, corado, hidratado, acianótico, anictérico, sudoreico. PA 158x94 mmHg, FC 98 bpm, FR 22 irpm, SatO2 94% em ar ambiente, Tax 36,4 °C, HGT 268 mg/dL.",
      "Cardiovascular: ritmo cardíaco regular, bulhas normofonéticas em 2 tempos, sem sopros; pulsos periféricos simétricos e cheios; TEC < 3s.",
      "Respiratório: murmúrio vesicular presente bilateralmente, com estertores finos em bases; sem sibilos.",
      "Abdome: plano, flácido, indolor, sem visceromegalias. Extremidades sem edema ou sinais de TVP.",
      "",
      "HIPÓTESES DIAGNÓSTICAS",
      "1. Síndrome coronariana aguda com supradesnivelamento de ST (parede inferior).",
      "2. Lesão renal aguda pré-renal por baixo débito.",
      "3. Descompensação hiperglicêmica em DM2 sem adesão.",
      "",
      "CONDUTA INICIAL",
      "Monitorização contínua, acesso venoso periférico calibroso, ECG seriado, curva de troponina, acionamento da hemodinâmica e início de terapia antitrombótica conforme protocolo institucional.",
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
      "MEDIDAS GERAIS",
      "Dieta zero até definição de reperfusão. Repouso no leito com cabeceira a 30°.",
      "Monitorização cardíaca contínua, oximetria e PA não invasiva a cada 15 min.",
      "Acesso venoso periférico calibroso em dois membros.",
      "",
      "ANTIAGREGAÇÃO",
      "1. AAS 300 mg VO — mastigar e engolir, dose de ataque; manter 100 mg/dia.",
      "2. Clopidogrel 300 mg VO em dose de ataque (75 mg se > 75 anos); manter 75 mg/dia.",
      "   Alternativa: ticagrelor 180 mg VO de ataque, se não houver contraindicação e sem uso de trombolítico.",
      "",
      "ANTICOAGULAÇÃO",
      "3. Enoxaparina 1 mg/kg SC a cada 12h — TFG 44 mL/min: manter dose plena com vigilância; reduzir para 1 mg/kg/dia se TFG < 30.",
      "   Alternativa: heparina não fracionada 60 UI/kg em bolus (máx. 4.000 UI) + 12 UI/kg/h, com controle de TTPa 1,5-2,5x.",
      "",
      "ANALGESIA E SUPORTE",
      "4. Morfina 2 mg IV lenta, repetir a cada 5-15 min se dor refratária (máx. 10 mg) — usar com parcimônia: pode reduzir a absorção dos antiagregantes.",
      "5. Oxigênio suplementar apenas se SatO2 < 90% (cateter nasal 2-3 L/min).",
      "6. Antiemético: ondansetrona 4 mg IV se náusea.",
      "",
      "CONTROLE METABÓLICO",
      "7. Insulina regular SC conforme protocolo (glicemia capilar 268 mg/dL), meta 140-180 mg/dL. Suspender metformina até estabilização e reavaliação da função renal.",
      "",
      "REPERFUSÃO",
      "8. Angioplastia primária em até 90 min do primeiro contato médico. Se transferência > 120 min, considerar trombólise (tenecteplase ajustada por peso), respeitando contraindicações.",
      "",
      "EVITAR NESTE CASO",
      "Nitrato se houver hipotensão, infarto de VD ou uso de inibidor de PDE5 nas últimas 24-48h.",
      "AINEs e contraste desnecessário — TFG 44 mL/min, risco de piora renal.",
      "",
      "ALERTA: doses são sugestões de apoio para adulto de 70 kg. Confira peso, função renal, alergias e protocolo do seu serviço antes de prescrever.",
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
      "MOTIVO DO PARECER: IAM com supra de ST (parede inferior), tempo de dor 2h.",
      "",
      "PACIENTE: masculino, 64 anos, HAS e DM2. Em uso: metformina, losartana, sinvastatina.",
      "",
      "QUADRO ATUAL: dor torácica opressiva há 2h, irradiada para MSE, sudorese e dispneia.",
      "",
      "EXAMES RELEVANTES: ECG — supra de 1,5 mm em D2, D3 e aVF; depressão em V1-V3 (espelho).",
      "Troponina 0,42 ng/mL (em ascensão). TFG 44 mL/min. Glicemia 268 mg/dL.",
      "",
      "CONDUTA JÁ INSTITUÍDA: AAS 300 mg + ticagrelor 180 mg VO; enoxaparina 1 mg/kg SC (ajustada à TFG);",
      "morfixan SL; insulina regular para controle glicêmico; decisão de angioplastia primária.",
      "",
      "PERGUNTA OBJETIVA À HEMODINÂMICA: há sala disponível para angioplastia primária em até 90 min?",
      "Se não, autorizamos trombólise (tenecteplase por peso) e transferência para centro de referência.",
      "",
      "RISCOS A SINALIZAR: disfunção de VD associada a IAM inferior — reservar volume e inotrópicos.",
      "Glicemia capilar a cada 1h; monitorar ritmo para TV/FV nas primeiras 24h.",
    ],
    seconds: 9,
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
      "Você teve um infarto no coração: uma artéria ficou entupida e o sangue não passava.",
      "Fizemos um procedimento para desobstruir e colocar um suporte (stent) dentro da artéria.",
      "",
      "SEUS REMÉDIOS — TOME TODOS OS DIAS, NO MESMO HORÁRIO, SEM FALTAR",
      "Ácido acetilsalicílico e ticagrelor (para o sangue não formar coágulo).",
      "Atorvastatina (para proteger as artérias).",
      "Losartana e metformina — continuar tomando pelo mesmo motivo de antes.",
      "Não pare nenhuma medicação por conta própria, mesmo se se sentir bem.",
      "",
      "COMO SE CUIDAR EM CASA",
      "Beba bastante água e evite esforço pesado nas primeiras duas semanas.",
      "Caminhadas leves são permitidas; levante pesos e faça exercício forte só depois de liberar.",
      "Não fume — fumar endurece as artérias e pode entupir o stent.",
      "",
      "VOLTE AO PRONTO-SOCORRO IMEDIATAMENTE SE",
      "Dor no peito de novo (igual ou parecida com a de agora), falta de ar, desmaio.",
      "Sangramento que não para, fezes escuras ou manchas pelo corpo sem motivo.",
      "",
      "RETORNO PREVISTO: em 7 dias com o cardiologista e com seu clínico de sempre.",
      "Leve a receita, os exames e a lista de remédios que você já tomava em casa.",
    ],
    seconds: 8,
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
    <div className="space-y-3.5">
      {/* Caso base */}
      <Card className="p-3 md:p-4 border border-hairline bg-card/60 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-2.5 md:gap-4">
          <div className="flex-1 space-y-1.5">
            <span className="text-[0.6rem] uppercase tracking-[0.22em] font-mono text-primary">
              Caso do plantão
            </span>
            <p className="text-[0.8rem] md:text-sm text-foreground/90 leading-relaxed">{CASE_SUMMARY}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <Button
              onClick={play}
              disabled={playing}
              className="w-full md:w-auto min-h-[44px] whitespace-nowrap"
            >
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

      {/* Linha do tempo — grade de 2 colunas no mobile, linha única no desktop */}
      <div className="md:overflow-x-auto md:scrollbar-none">
        <div className="grid grid-cols-2 gap-2 md:flex md:items-stretch md:min-w-0">
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
                  "min-w-0 w-full md:flex-1 text-left rounded-xl border px-2.5 py-2 min-h-[44px] transition-colors duration-300",
                  isActive
                    ? "border-primary/50 bg-primary/10 shadow-[0_10px_28px_-20px_hsl(var(--primary)/0.9)]"
                    : "border-border/60 bg-card/50 hover:border-primary/35",
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
                <p className="text-xs font-medium mt-1.5 break-words md:whitespace-nowrap">{s.label}</p>
                <p className="text-[0.65rem] text-muted-foreground break-words md:whitespace-nowrap">
                  {s.assistant} · {s.seconds}s
                </p>
              </button>
            );
          })}
        </div>
      </div>


      {/* Painel do passo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 min-w-0">
        <Card className="md:col-span-2 min-w-0 p-3.5 md:p-4 border border-hairline bg-muted/30">
          <Badge variant="secondary" className="text-[0.65rem]">O que você entrega</Badge>
          <h4 className="font-display text-sm md:text-base tracking-tight mt-2">{stage.assistant}</h4>
          <p className="text-[0.8rem] text-muted-foreground mt-1.5 leading-relaxed">{stage.input}</p>
        </Card>

        <Card
          className={cn(
            "md:col-span-3 min-w-0 p-3.5 md:p-4 border transition-opacity duration-500",
            revealed
              ? "border-primary/40 bg-card shadow-[0_18px_40px_-24px_hsl(var(--primary)/0.55)]"
              : "border-dashed border-border/60 bg-card/40",
          )}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge className="text-[0.65rem] min-w-0 break-words">{stage.label}</Badge>
            {revealed && (
              <Button variant="ghost" size="sm" onClick={copyOutput} className="h-9 px-2.5 text-xs shrink-0">
                <Copy className="w-3.5 h-3.5 mr-1.5" />Copiar
              </Button>
            )}
          </div>
          <h4 className="font-display text-sm md:text-base tracking-tight mb-2">{stage.title}</h4>
          {revealed ? (
            <div className="space-y-3 animate-fade-in">
              <div className="rounded-xl border border-border/50 bg-background/60 p-2.5 space-y-0.5 max-h-[15rem] md:max-h-[19rem] overflow-y-auto overscroll-contain no-scrollbar">
                {stage.output.map((line, j) => (
                  <p key={j} className="text-[0.7rem] md:text-xs font-mono leading-relaxed text-foreground/90 break-words">
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
            <div className="rounded-xl border border-dashed border-border/50 bg-background/40 p-5 text-center space-y-2">
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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 text-center w-full">
        <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card/60 px-3.5 py-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">
            Tempo do fluxo:{" "}
            <span className="font-mono text-foreground">{elapsed}s</span> de {TOTAL_SECONDS}s
            <span className="hidden sm:inline"> · o mesmo trabalho digitado leva ~35 min</span>
          </span>
        </div>
        {onPrimary && (
          <Button variant="outline" onClick={onPrimary} className="w-full sm:w-auto min-h-[44px]">
            Testar com o seu caso agora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

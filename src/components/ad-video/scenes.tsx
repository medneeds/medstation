import { motion } from "framer-motion";
import { LogoMark } from "@/components/LogoMark";

export const AD = {
  bg: "#0A0F0D",
  white: "#FFFFFF",
  accent: "#4FA47F",
  amber: "#E8A33D",
  green: "#3FBF7F",
};

/** t = segundos decorridos DENTRO da cena. */
export interface SceneProps {
  t: number;
  dur: number;
}

const Wrap = ({
  children,
  bg = AD.bg,
  color = AD.white,
}: {
  children: React.ReactNode;
  bg?: string;
  color?: string;
}) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden font-sans"
    style={{ background: bg, color, letterSpacing: "-0.02em" }}
  >
    {children}
  </div>
);

const Title = ({ children, size = 96 }: { children: React.ReactNode; size?: number }) => (
  <div
    className="px-16 text-center font-bold uppercase"
    style={{ fontSize: size, lineHeight: 1.02, letterSpacing: "-0.03em" }}
  >
    {children}
  </div>
);

const Label = ({ children, color = AD.accent }: { children: React.ReactNode; color?: string }) => (
  <div
    className="font-mono text-4xl font-bold uppercase"
    style={{ color, letterSpacing: "0.1em" }}
  >
    {children}
  </div>
);

/* ── CENA 1 — O relógio ───────────────────────────────────────── */
export function Scene1Clock({ t }: SceneProps) {
  const lockAt = 4.4;
  const p = Math.min(1, t / lockAt);
  // slot machine: acelera de 07:00 até travar em 08:40
  const spinning = t < lockAt;
  const totalMin = 7 * 60;
  const target = 8 * 60 + 40;
  const eased = Math.pow(p, 0.55);
  const minutes = spinning
    ? Math.floor(totalMin + eased * (target - totalMin) + (1 - p) * 37 * Math.sin(t * 34))
    : target;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(Math.abs(minutes % 60)).padStart(2, "0");
  const shake = spinning ? 0 : Math.sin((t - lockAt) * 40) * Math.max(0, 8 - (t - lockAt) * 26);

  return (
    <Wrap bg="#000000">
      <motion.div
        className="font-mono font-bold tabular-nums"
        style={{ fontSize: 260, letterSpacing: "-0.04em", transform: `translateX(${shake}px)` }}
      >
        {hh}:{mm}
      </motion.div>
      <div
        className="mt-24 flex h-40 w-[760px] items-center border px-8"
        style={{ borderColor: "rgba(255,255,255,0.22)" }}
      >
        <motion.span
          className="inline-block h-16 w-[10px]"
          style={{ background: AD.white }}
          animate={{ opacity: [1, 1, 0, 0] }}
          transition={{ duration: 1, repeat: Infinity, times: [0, 0.49, 0.5, 1], ease: "linear" }}
        />
      </div>
    </Wrap>
  );
}

/* ── CENA 2 — A virada ────────────────────────────────────────── */
export function Scene2Turn() {
  return (
    <Wrap bg={AD.white} color="#000000">
      <Title size={108}>Não foi a medicina que te atrasou.</Title>
    </Wrap>
  );
}

/* ── CENA 3 — Cérebro vs. teclado ─────────────────────────────── */
const TYPED = `Paciente admitido em unidade de terapia intensiva, sob ventilação mecânica invasiva, em uso de noradrenalina, mantendo pressão arterial média acima de 65 mmHg`;

export function Scene3BrainVsKeyboard({ t, dur }: SceneProps) {
  const chars = Math.floor((t / dur) * TYPED.length * 0.85);
  const synapse = (i: number) => {
    const phase = (t % 1) - i * 0.12;
    return phase > 0 && phase < 0.2 ? 1 : 0.18;
  };
  return (
    <Wrap>
      <div className="absolute inset-x-0 top-0 flex h-1/2 flex-col items-center justify-center gap-10">
        <svg width="420" height="360" viewBox="0 0 120 100">
          <path
            d="M60 8C34 8 18 26 18 46c0 18 12 30 26 34v12h32V80c14-4 26-16 26-34C102 26 86 8 60 8Z"
            fill="none"
            stroke={AD.white}
            strokeWidth="2.5"
          />
          {[
            [42, 36],
            [60, 28],
            [76, 40],
            [50, 54],
            [70, 60],
            [60, 44],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="4.5" fill={AD.accent} opacity={synapse(i)} />
          ))}
        </svg>
        <Label>Decisão: segundos</Label>
      </div>

      <div
        className="absolute inset-x-0 bottom-0 h-1/2 border-t"
        style={{ borderColor: "rgba(255,255,255,0.14)" }}
      >
        <div className="flex h-full flex-col justify-center gap-12 px-20">
          <p
            className="font-mono text-4xl leading-snug"
            style={{ color: "rgba(255,255,255,0.85)", minHeight: 260 }}
          >
            {TYPED.slice(0, chars)}
            <span style={{ color: AD.accent }}>▌</span>
          </p>
          <div className="h-3 w-full" style={{ background: "rgba(255,255,255,0.12)" }}>
            <div
              className="h-full"
              style={{ width: `${(t / dur) * 34}%`, background: AD.accent }}
            />
          </div>
          <Label>Registro: horas</Label>
        </div>
      </div>
    </Wrap>
  );
}

/* ── CENA 4 — A pilha ─────────────────────────────────────────── */
const DOCS = ["Admissão UTI", "Emergência", "Parecer", "Exames complementares", "Resumo de alta"];

export function Scene4Stack({ t, dur }: SceneProps) {
  return (
    <Wrap>
      <div className="relative h-[1100px] w-[820px]">
        {DOCS.map((d, i) => {
          const start = 0.5 + i * 0.8;
          const shown = t >= start;
          const p = Math.min(1, Math.max(0, (t - start) / 0.45));
          return (
            <div
              key={d}
              className="absolute left-1/2 flex h-56 w-[760px] items-center border px-12"
              style={{
                top: 120 + i * 170,
                background: "rgba(255,255,255,0.04)",
                borderColor: "rgba(255,255,255,0.18)",
                opacity: shown ? 1 : 0,
                transform: `translateX(-50%) translateY(${(1 - p) * -420}px) scale(${0.92 + p * 0.08}) rotate(${(i % 2 ? -1 : 1) * 1.2}deg)`,
              }}
            >
              <span
                className="font-mono text-5xl font-bold uppercase"
                style={{ letterSpacing: "0.06em" }}
              >
                {d}
              </span>
            </div>
          );
        })}
      </div>
      {t > dur - 2 && (
        <motion.div
          initial={{ rotate: -24, scale: 1.6, opacity: 0 }}
          animate={{ rotate: -8, scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0.9, 0.2, 1] }}
          className="absolute px-14 py-8 font-bold uppercase"
          style={{
            fontSize: 84,
            color: AD.accent,
            border: `8px solid ${AD.accent}`,
            letterSpacing: "-0.02em",
          }}
        >
          Todo dia. Do zero.
        </motion.div>
      )}
    </Wrap>
  );
}

/* ── CENA 5 — A marca ─────────────────────────────────────────── */
export function Scene5Brand({ t }: SceneProps) {
  const implode = Math.min(1, t / 0.6);
  return (
    <Wrap bg={AD.bg}>
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${AD.accent}22, transparent 62%)`,
          opacity: implode,
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: implode, transform: `scale(${0.4 + implode * 0.6})` }}
        className="flex flex-col items-center gap-16"
      >
        <LogoMark className="h-[320px] w-[320px]" />
        <div className="font-bold uppercase" style={{ fontSize: 104, letterSpacing: "-0.03em" }}>
          MedStation
        </div>
      </motion.div>
      <div className="mt-20" style={{ opacity: t > 1.2 ? 1 : 0 }}>
        <Label>Feita por médico. Para médico.</Label>
      </div>
    </Wrap>
  );
}

/* ── CENA 6 — O motor ─────────────────────────────────────────── */
const INPUTS = ["PA 80x40", "Lactato 4,2", "FiO2 60%", "Glasgow 13", "Diurese 0,3 mL/kg/h"];
const HYPO = [
  { t: "Choque séptico de foco pulmonar", c: "#E2494A" },
  { t: "Lesão renal aguda pré-renal", c: "#E8802D" },
  { t: "Encefalopatia metabólica", c: "#E8C43D" },
];

export function Scene6Engine({ t }: SceneProps) {
  const converge = Math.min(1, Math.max(0, (t - 2.2) / 1.2));
  const pulse = t > 3.4 && t < 4.1;
  const outStart = 4.2;

  return (
    <Wrap>
      <div className="absolute left-0 right-0 top-[140px] flex flex-col items-center gap-6">
        {INPUTS.map((v, i) => {
          const x = (i % 2 ? 1 : -1) * (200 - i * 22);
          return (
            <motion.div
              key={v}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
              className="border px-10 py-6 font-mono text-4xl"
              style={{
                borderColor: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.04)",
                transform: `translateX(${x * (1 - converge)}px) scale(${1 - converge * 0.45})`,
                opacity: 1 - converge * 0.9,
              }}
            >
              {v}
            </motion.div>
          );
        })}
      </div>

      <div
        className="absolute left-1/2 top-[700px] -translate-x-1/2"
        style={{ opacity: converge, transform: `translateX(-50%) scale(${pulse ? 1.14 : 1})`, transition: "transform 200ms" }}
      >
        <div
          className="flex h-[240px] w-[240px] items-center justify-center rounded-full"
          style={{ border: `4px solid ${AD.accent}`, background: `${AD.accent}1A` }}
        >
          <LogoMark className="h-[150px] w-[150px]" />
        </div>
      </div>

      <div
        className="absolute inset-x-24 bottom-[120px] border p-14"
        style={{
          borderColor: "rgba(255,255,255,0.2)",
          background: "rgba(255,255,255,0.03)",
          opacity: t > outStart ? 1 : 0,
        }}
      >
        <div className="flex flex-col gap-10">
          <div style={{ opacity: t > outStart + 0.2 ? 1 : 0 }}>
            <Label>Raciocínio clínico</Label>
            <p className="mt-4 font-mono text-3xl" style={{ color: "rgba(255,255,255,0.8)" }}>
              Instabilidade hemodinâmica com hiperlactatemia e hipoperfusão sistêmica.
            </p>
          </div>
          <div style={{ opacity: t > outStart + 0.9 ? 1 : 0 }}>
            <Label>Hipóteses — por gravidade</Label>
            <div className="mt-5 flex flex-col gap-4">
              {HYPO.map((h, i) => (
                <div
                  key={h.t}
                  className="flex items-center gap-6 font-mono text-3xl"
                  style={{ opacity: t > outStart + 1.1 + i * 0.4 ? 1 : 0 }}
                >
                  <span className="h-10 w-4" style={{ background: h.c }} />
                  <span style={{ color: "rgba(255,255,255,0.9)" }}>
                    {i + 1}. {h.t}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ opacity: t > outStart + 2.5 ? 1 : 0 }}>
            <Label>Conduta</Label>
            <p className="mt-4 font-mono text-3xl" style={{ color: "rgba(255,255,255,0.8)" }}>
              Ressuscitação volêmica guiada · Noradrenalina para PAM ≥ 65 · Coleta de culturas
            </p>
          </div>
        </div>
      </div>
    </Wrap>
  );
}

/* ── CENA 7 — Os módulos ──────────────────────────────────────── */
const MODULES = ["Admissão", "Evolução", "Parecer", "Alta"];

export function Scene7Modules({ t, dur }: SceneProps) {
  const merge = t > dur - 1.6;
  return (
    <Wrap>
      <div
        className="grid grid-cols-2"
        style={{
          gap: merge ? 0 : 40,
          transition: "gap 500ms cubic-bezier(0.2,0.9,0.2,1)",
          border: merge ? `4px solid ${AD.accent}` : "4px solid transparent",
          padding: merge ? 24 : 0,
        }}
      >
        {MODULES.map((m, i) => (
          <div
            key={m}
            className="flex h-[420px] w-[420px] items-center justify-center border font-bold uppercase"
            style={{
              borderColor: merge ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.22)",
              background: "rgba(255,255,255,0.04)",
              fontSize: 58,
              letterSpacing: "-0.02em",
              opacity: t > 0.2 + i * 0.3 ? 1 : 0,
              transform: `scale(${t > 0.2 + i * 0.3 ? 1 : 0.9})`,
            }}
          >
            {m}
          </div>
        ))}
      </div>
      <div className="mt-24" style={{ opacity: merge ? 1 : 0 }}>
        <Label>Tudo em um só lugar.</Label>
      </div>
    </Wrap>
  );
}

/* ── CENA 8 — O lock clínico ──────────────────────────────────── */
export function Scene8Lock({ t, dur }: SceneProps) {
  const zoom = 1 + Math.min(1, t / dur) * 0.5;
  return (
    <Wrap>
      <div
        className="absolute inset-x-24 border p-14"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.03)",
          transform: `scale(${zoom})`,
          transformOrigin: "center",
        }}
      >
        <Label>Raciocínio clínico</Label>
        <div className="mt-8 flex flex-col gap-5">
          {[0.9, 0.7, 0.85].map((w, i) => (
            <div
              key={i}
              className="h-6"
              style={{ width: `${w * 100}%`, background: "rgba(255,255,255,0.14)" }}
            />
          ))}
        </div>
        <div
          className="mt-16 flex items-center gap-8 px-10 py-8"
          style={{ background: `${AD.amber}1F`, borderLeft: `10px solid ${AD.amber}` }}
        >
          <span style={{ fontSize: 64, color: AD.amber }}>⚠</span>
          <span
            className="font-mono font-bold uppercase"
            style={{ fontSize: 46, color: AD.amber, letterSpacing: "0.06em" }}
          >
            Dado não informado
          </span>
        </div>
      </div>
      {t > dur - 1.6 && (
        <div className="absolute bottom-[140px]">
          <Label color={AD.amber}>Sinalizado. Não inventado.</Label>
        </div>
      )}
    </Wrap>
  );
}

/* ── CENA 9 — Revisar e aprovar ───────────────────────────────── */
export function Scene9Approve({ t, dur }: SceneProps) {
  const p = Math.min(1, t / (dur * 0.55));
  const clicked = t > dur * 0.6;
  const closing = t > dur * 0.78;
  return (
    <Wrap>
      <div
        className="absolute inset-x-24 border p-14"
        style={{
          borderColor: "rgba(255,255,255,0.18)",
          background: "rgba(255,255,255,0.03)",
          transform: closing ? "scale(0.6) translateY(300px)" : "scale(1)",
          opacity: closing ? 0.25 : 1,
          transition: "transform 400ms cubic-bezier(0.2,0.9,0.2,1), opacity 400ms",
        }}
      >
        <div className="flex flex-col gap-5">
          {[0.95, 0.8, 0.9, 0.6, 0.88, 0.72, 0.94].map((w, i) => (
            <div
              key={i}
              className="h-6"
              style={{ width: `${w * 100}%`, background: "rgba(255,255,255,0.14)" }}
            />
          ))}
        </div>
        <div
          className="mt-20 flex items-center justify-center gap-6 py-10 font-bold uppercase"
          style={{
            fontSize: 52,
            border: `4px solid ${clicked ? AD.green : AD.accent}`,
            color: clicked ? AD.green : AD.white,
            background: clicked ? `${AD.green}1F` : "transparent",
            transform: clicked ? "scale(0.98)" : "scale(1)",
          }}
        >
          ✓ Revisar e aprovar
        </div>
      </div>
      <div
        className="absolute"
        style={{
          left: "52%",
          top: `${18 + p * 62}%`,
          fontSize: 68,
          filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
        }}
      >
        ➤
      </div>
      {closing && (
        <div className="absolute bottom-[160px]">
          <Label color={AD.green}>A caneta continua sua.</Label>
        </div>
      )}
    </Wrap>
  );
}

/* ── CENA 10 — CTA ────────────────────────────────────────────── */
export function Scene10Cta({ t }: SceneProps) {
  return (
    <Wrap bg={AD.bg}>
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, ${AD.accent}1F, transparent 60%)` }}
      />
      <LogoMark className="h-[280px] w-[280px]" />
      <div
        className="mt-14 font-bold uppercase"
        style={{ fontSize: 110, letterSpacing: "-0.03em" }}
      >
        MedStation
      </div>
      <div
        className="mt-24 font-bold uppercase"
        style={{ fontSize: 84, opacity: t > 1 ? 1 : 0, letterSpacing: "-0.02em" }}
      >
        Comece hoje
      </div>
      <div
        className="mt-10 font-mono"
        style={{ fontSize: 56, color: AD.accent, opacity: t > 1.8 ? 1 : 0, letterSpacing: "0.04em" }}
      >
        medstation-ai.com.br
      </div>
    </Wrap>
  );
}

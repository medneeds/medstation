import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Stethoscope, Activity, Wind, Calculator, Sigma, Pill,
  FileCheck, BookOpen, Compass, FileText, MessagesSquare, Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Anel 3D com os 12 assistentes da MedStation orbitando lentamente.
 * As placas de vidro são DOM (Html do drei), então sempre encaram a câmera;
 * a profundidade vem da rotação do grupo, do anel-guia inclinado e do parallax
 * que segue o mouse. Ao passar o mouse sobre um assistente, a placa reage
 * (escala + brilho) e revela uma frase de efeito.
 */

type Assistant = { name: string; Icon: LucideIcon; tagline: string };

const ASSISTANTS: Assistant[] = [
  { name: "Clínicus", Icon: Stethoscope, tagline: "Anamnese e evolução em segundos." },
  { name: "Examinus", Icon: Activity, tagline: "Interprete exames e imagens sem fricção." },
  { name: "Gasometrus", Icon: Wind, tagline: "Gasometria à beira do leito." },
  { name: "Scorius", Icon: Calculator, tagline: "Scores clínicos na hora exata." },
  { name: "Numerus", Icon: Sigma, tagline: "Cálculos e doses sem erro." },
  { name: "Prescriptus", Icon: Pill, tagline: "Prescrição segura e inteligente." },
  { name: "Atestus", Icon: FileCheck, tagline: "Atestados com rigor e CID." },
  { name: "Protocolus", Icon: BookOpen, tagline: "Protocolos globais na ponta do dedo." },
  { name: "Orientus", Icon: Compass, tagline: "Orientações claras para o paciente." },
  { name: "CODexus", Icon: FileText, tagline: "Documentos clínicos organizados." },
  { name: "Mediscuss", Icon: MessagesSquare, tagline: "Discussão clínica quando precisar." },
  { name: "Legalis", Icon: Scale, tagline: "Blindagem jurídica e ética do registro." },
];

const RADIUS = 2.15;

function OrbitRing() {
  // Anel-guia: torus fino inclinado que dá a sensação de "trilho" da órbita.
  const geometry = useMemo(() => new THREE.TorusGeometry(RADIUS, 0.006, 8, 128), []);
  return (
    <mesh geometry={geometry} rotation-x={Math.PI / 2}>
      <meshBasicMaterial color="#4ade80" transparent opacity={0.22} />
    </mesh>
  );
}

function AssistantPlates() {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    // Órbita lenta e contínua (pausa levemente quando um assistente está em foco)
    group.current.rotation.y += dt * (hovered === null ? 0.22 : 0.06);
    // Parallax sutil seguindo o mouse (com easing independente de framerate)
    const { x, y } = state.pointer;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, 0.62 + y * 0.14, 2.5, dt);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, -x * 0.07, 2.5, dt);
    // Flutuação vertical suave (base deslocada p/ cima para os rótulos inferiores caberem)
    group.current.position.y = 0.28 + Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
  });

  return (
    <group ref={group} rotation-x={0.62}>
      <OrbitRing />
      {ASSISTANTS.map(({ name, Icon, tagline }, i) => {
        const angle = (i / ASSISTANTS.length) * Math.PI * 2;
        const x = Math.cos(angle) * RADIUS;
        const z = Math.sin(angle) * RADIUS;
        const isHover = hovered === i;
        const dim = hovered !== null && !isHover;
        return (
          <Html
            key={name}
            position={[x, 0, z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="relative flex flex-col items-center gap-1.5 select-none cursor-pointer pointer-events-auto transition-transform duration-200"
              style={{
                animation: `orb-bob 3.6s ease-in-out ${i * 0.3}s infinite`,
                transform: isHover ? "scale(1.35)" : "scale(1)",
                opacity: dim ? 0.45 : 1,
                zIndex: isHover ? 30 : 1,
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Frase de efeito no hover */}
              <div
                className={`absolute bottom-full mb-2 whitespace-nowrap rounded-full border border-primary/40 bg-background/90 px-2.5 py-1 text-[9px] font-medium text-foreground shadow-lg backdrop-blur-md transition-all duration-200 ${
                  isHover ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
                }`}
              >
                {tagline}
              </div>
              <div
                className={`h-14 w-14 rounded-2xl border grid place-items-center transition-all duration-200 ${
                  isHover
                    ? "border-primary bg-primary/20 shadow-[0_14px_32px_-10px_hsl(var(--primary)/0.8),inset_0_1px_0_hsl(var(--primary)/0.5)]"
                    : "border-primary/30 bg-primary/10 shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(var(--primary)/0.35)]"
                }`}
              >
                <Icon className="h-[22px] w-[22px] text-primary" strokeWidth={1.6} />
              </div>
              <span
                className={`text-[10px] uppercase tracking-[0.12em] font-medium whitespace-nowrap transition-colors duration-200 ${
                  isHover ? "text-primary" : "text-muted-foreground/80"
                }`}
              >
                {name}
              </span>
            </div>
          </Html>
        );
      })}
    </group>
  );
}

export function AssistantOrbit() {
  return (
    <div className="relative h-[420px] xl:h-[520px] w-full" aria-hidden="true">
      {/* brilho ambiente atrás da órbita */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.7, 7.6], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
      >
        <Suspense fallback={null}>
          <AssistantPlates />
        </Suspense>
      </Canvas>
      {/* Texto central dentro da órbita */}
      <div className="pointer-events-none absolute inset-0 z-0 flex flex-col items-center justify-center text-center px-6">
        <div className="inline-flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="h-px w-7 bg-primary/70" />
          Para médicos ocupados
        </div>
        <h2 className="mt-2.5 font-display text-3xl xl:text-4xl leading-[0.98] tracking-tight text-foreground">
          Produza mais.
          <br />
          <span className="italic text-primary">Digite menos.</span>
        </h2>
        <p className="mt-3 text-xs xl:text-sm text-muted-foreground leading-relaxed max-w-[17rem]">
          Documentação, Copiloto e Fluxo em uma só plataforma. Em segundos, no seu fluxo.
        </p>
      </div>
      <style>{`
        @keyframes orb-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import {
  Stethoscope, Activity, Wind, Calculator, Sigma, Pill,
  FileCheck, BookOpen, Compass, FileText, MessagesSquare, Scale,
} from "lucide-react";

/**
 * Anel 3D com os 12 assistentes da MedStation orbitando lentamente.
 * As placas de vidro são DOM (Html do drei), então sempre encaram a câmera;
 * a profundidade vem da rotação do grupo, do anel-guia inclinado e do parallax
 * que segue o mouse. Apenas visual — sem interação de clique.
 */

const ASSISTANTS = [
  { name: "Clínicus", Icon: Stethoscope },
  { name: "Examinus", Icon: Activity },
  { name: "Gasometrus", Icon: Wind },
  { name: "Scorius", Icon: Calculator },
  { name: "Numerus", Icon: Sigma },
  { name: "Prescriptus", Icon: Pill },
  { name: "Atestus", Icon: FileCheck },
  { name: "Protocolus", Icon: BookOpen },
  { name: "Orientus", Icon: Compass },
  { name: "CODexus", Icon: FileText },
  { name: "Mediscuss", Icon: MessagesSquare },
  { name: "Legalis", Icon: Scale },
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

  useFrame((state, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.05);
    // Órbita lenta e contínua
    group.current.rotation.y += dt * 0.22;
    // Parallax sutil seguindo o mouse (com easing independente de framerate)
    const { x, y } = state.pointer;
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, y * 0.18, 2.5, dt);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, -x * 0.08, 2.5, dt);
    // Flutuação vertical suave
    group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.08;
  });

  return (
    <group ref={group} rotation-x={0.16}>
      <OrbitRing />
      {ASSISTANTS.map(({ name, Icon }, i) => {
        const angle = (i / ASSISTANTS.length) * Math.PI * 2;
        const x = Math.cos(angle) * RADIUS;
        const z = Math.sin(angle) * RADIUS;
        return (
          <Html
            key={name}
            position={[x, 0, z]}
            center
            zIndexRange={[20, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="flex flex-col items-center gap-1.5 select-none"
              style={{ animation: `orb-bob 3.6s ease-in-out ${i * 0.3}s infinite` }}
            >
              <div className="h-12 w-12 rounded-2xl border border-primary/30 bg-primary/10 backdrop-blur-md grid place-items-center shadow-[0_10px_24px_-12px_hsl(var(--primary)/0.6),inset_0_1px_0_hsl(var(--primary)/0.35)]">
                <Icon className="h-5 w-5 text-primary" strokeWidth={1.6} />
              </div>
              <span className="text-[9px] uppercase tracking-[0.14em] text-muted-foreground/80 font-medium">
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
    <div className="relative h-[360px] xl:h-[440px] w-full" aria-hidden="true">
      {/* brilho ambiente atrás da órbita */}
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <div className="h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 1.2, 6.4], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <AssistantPlates />
        </Suspense>
      </Canvas>
      <style>{`
        @keyframes orb-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

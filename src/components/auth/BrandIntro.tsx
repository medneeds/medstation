import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { LogoMark } from "@/components/LogoMark";

const SESSION_KEY = "medstation_brand_intro_played";
const PENDING_KEY = "medstation_brand_intro_pending";

/** Marca que a abertura deve tocar na próxima entrada no dashboard (pós-login). */
export function armBrandIntro() {
  try {
    sessionStorage.setItem(PENDING_KEY, "1");
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

interface BrandIntroProps {
  /** Chamado quando a abertura termina (ou é pulada). */
  onFinish?: () => void;
  /** Reexibe a abertura mesmo se já tocou nesta sessão. */
  force?: boolean;
}

/**
 * Abertura cinematográfica da marca — estilo tela inicial de streaming.
 * Sequência: escurecimento → monograma emerge com varredura de luz →
 * wordmark abre o tracking → tudo recua e revela a tela de login.
 */
export function BrandIntro({ onFinish, force = false }: BrandIntroProps) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(() => {
    if (force) return true;
    if (typeof window === "undefined") return false;
    // Só toca quando o login acabou de acontecer.
    if (sessionStorage.getItem(PENDING_KEY) !== "1") return false;
    sessionStorage.removeItem(PENDING_KEY);
    return sessionStorage.getItem(SESSION_KEY) !== "1";
  });

  useEffect(() => {
    if (!visible) {
      onFinish?.();
      return;
    }
    const total = reduce ? 600 : 2300;
    const t = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(false);
      onFinish?.();
    }, total);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduce]);

  const skip = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
    onFinish?.();
  };

  const ease = [0.16, 1, 0.3, 1] as const;

  const brand = (mirrored = false) => (
    <div className="flex flex-col items-center">
      <div className="relative">
        <LogoMark
          className={
            mirrored
              ? "h-24 w-24 md:h-32 md:w-32"
              : "h-24 w-24 md:h-32 md:w-32 drop-shadow-[0_28px_70px_hsl(var(--primary)/0.32)]"
          }
        />
        {!mirrored && !reduce && (
          <motion.div
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18%]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.35, delay: 0.55, times: [0, 0.12, 0.75, 1], ease: "linear" }}
          >
            <motion.div
              className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/55 to-transparent blur-md will-change-transform"
              initial={{ x: "-170%" }}
              animate={{ x: "260%" }}
              transition={{ duration: 1.2, delay: 0.6, ease: [0.33, 0, 0.15, 1] }}
            />
          </motion.div>
        )}
      </div>

      <span className="mt-6 font-display text-3xl md:text-5xl font-medium tracking-[0.06em] text-foreground">
        MedStation
      </span>
    </div>
  );

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="brand-intro"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-background cursor-pointer"
          onClick={skip}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          aria-label="Abertura MedStation"
        >
          {/* Ambiência */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[140px] will-change-transform"
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: [0, 0.85, 0.45], scale: [0.75, 1.04, 1] }}
              transition={{ duration: 2.2, ease }}
            />
            <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:26px_26px]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Bloco da marca + reflexo */}
          <motion.div
            className="relative z-10 flex flex-col items-center will-change-transform"
            initial={{ scale: reduce ? 1 : 1.28, opacity: 0, filter: reduce ? "none" : "blur(10px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: reduce ? 0.35 : 1.5, ease }}
          >
            <div className="flex flex-col items-center">
              {brand()}

              <motion.span
                className="mt-3 text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.34em] text-muted-foreground"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: reduce ? 0.1 : 1.05, ease }}
              >
                Produza mais. Digite menos.
              </motion.span>
            </div>

            {/* Reflexo espelhado */}
            <motion.div
              aria-hidden
              className="mt-3 select-none [transform:scaleY(-1)] [mask-image:linear-gradient(to_top,transparent_8%,black_94%)] [-webkit-mask-image:linear-gradient(to_top,transparent_8%,black_94%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.22 }}
              transition={{ duration: 1.2, delay: 0.75, ease }}
            >
              <div className="blur-[1.5px]">{brand(true)}</div>
            </motion.div>
          </motion.div>

          <motion.span
            className="absolute bottom-8 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.5] }}
            transition={{ duration: 1.6, delay: 1.2, ease: "easeInOut" }}
          >
            toque para continuar
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

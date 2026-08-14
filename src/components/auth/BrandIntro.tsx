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
    const total = reduce ? 700 : 2600;
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

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="brand-intro"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-background cursor-pointer"
          onClick={skip}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Abertura MedStation"
        >
          {/* Ambiência */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[140px]"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: [0, 0.9, 0.5], scale: [0.7, 1.05, 1] }}
              transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="absolute inset-0 opacity-[0.05] [background-image:radial-gradient(hsl(var(--foreground))_1px,transparent_1px)] [background-size:26px_26px]" />
            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Bloco da marca + reflexo */}
          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              className="flex flex-col items-center"
              initial={{ scale: reduce ? 1 : 1.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: reduce ? 0.4 : 1.9, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="relative">
                <LogoMark className="h-24 w-24 md:h-32 md:w-32 drop-shadow-[0_24px_60px_hsl(var(--primary)/0.35)]" />
                {/* Varredura de luz */}
                {!reduce && (
                  <motion.div
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18%]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.6, delay: 0.5, times: [0, 0.1, 0.8, 1] }}
                  >
                    <motion.div
                      className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-primary/60 to-transparent blur-md"
                      initial={{ x: "-160%" }}
                      animate={{ x: "260%" }}
                      transition={{ duration: 1.3, delay: 0.6, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </motion.div>
                )}
              </div>

              <motion.span
                className="mt-6 font-display text-3xl md:text-5xl font-medium text-foreground"
                initial={{ opacity: 0, letterSpacing: reduce ? "0.02em" : "0.42em" }}
                animate={{ opacity: 1, letterSpacing: "0.06em" }}
                transition={{ duration: reduce ? 0.4 : 1.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                MedStation
              </motion.span>

              <motion.span
                className="mt-3 text-[0.62rem] md:text-[0.7rem] uppercase tracking-[0.34em] text-muted-foreground"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.15 }}
              >
                Produza mais. Digite menos.
              </motion.span>
            </motion.div>

            {/* Reflexo espelhado */}
            <motion.div
              aria-hidden
              className="mt-3 select-none [transform:scaleY(-1)] opacity-30 [mask-image:linear-gradient(to_top,transparent_5%,black_92%)] [-webkit-mask-image:linear-gradient(to_top,transparent_5%,black_92%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.28 }}
              transition={{ duration: 1.4, delay: 0.8 }}
            >
              <div className="flex flex-col items-center blur-[1px]">
                <LogoMark className="h-24 w-24 md:h-32 md:w-32" />
                <span className="mt-6 font-display text-3xl md:text-5xl font-medium tracking-[0.06em] text-foreground">
                  MedStation
                </span>
              </div>
            </motion.div>
          </div>

          <span className="absolute bottom-8 text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground/70">
            toque para continuar
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

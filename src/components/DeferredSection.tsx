import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

/** Agenda trabalho para o próximo período ocioso, com fallback por timeout. */
function scheduleIdle(cb: () => void, timeout = 1200) {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    const id = w.requestIdleCallback(cb, { timeout });
    return () => w.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(cb, Math.min(timeout, 800));
  return () => window.clearTimeout(t);
}

interface DeferredSectionProps {
  /** Conteúdo pesado (normalmente um componente React.lazy). */
  children: ReactNode;
  /** Altura reservada para evitar CLS enquanto o bloco não montou. */
  minHeight?: number | string;
  /** Margem de pré-carregamento antes de entrar na viewport. */
  rootMargin?: string;
  /**
   * Inicia o download do chunk logo após o first paint, em idle.
   * Separa PREFETCH (rede/parse antecipados) de MOUNT (render).
   */
  prefetch?: () => Promise<unknown>;
  /**
   * Após o first paint, monta o bloco em idle depois deste atraso (ms),
   * mesmo que ainda esteja longe da viewport. Escalonar entre seções evita
   * montar vários chunks no mesmo frame durante o scroll.
   */
  mountAfterMs?: number;
  className?: string;
}

/**
 * Monta o conteúdo antes de o usuário chegar nele: prefetch em idle logo após o
 * first paint, mount escalonado em idle e, como rede de segurança, um
 * IntersectionObserver com margem larga. Reserva espaço para não causar CLS.
 */
export function DeferredSection({
  children,
  minHeight = 320,
  rootMargin = "1200px",
  prefetch,
  mountAfterMs,
  className,
}: DeferredSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  // Prefetch do chunk assim que o browser estiver ocioso.
  useEffect(() => {
    if (!prefetch || show) return;
    return scheduleIdle(() => {
      void prefetch().catch(() => {
        /* prefetch é best-effort; o mount refaz o import */
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mount escalonado após o first paint, independente do scroll.
  useEffect(() => {
    if (show || mountAfterMs === undefined) return;
    const t = window.setTimeout(() => scheduleIdle(() => setShow(true)), mountAfterMs);
    return () => window.clearTimeout(t);
  }, [show, mountAfterMs]);

  // Rede de segurança: scroll muito rápido antes do idle.
  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} className={className} style={show ? undefined : { minHeight }}>
      {show ? (
        <Suspense fallback={<div style={{ minHeight }} aria-hidden="true" />}>{children}</Suspense>
      ) : null}
    </div>
  );
}

/** Monta o filho apenas quando o browser estiver ocioso (pós first paint). */
export function DeferredIdle({ children, delayMs = 0 }: { children: ReactNode; delayMs?: number }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelIdle: (() => void) | undefined;
    const t = window.setTimeout(() => {
      cancelIdle = scheduleIdle(() => setReady(true), 2000);
    }, delayMs);
    return () => {
      window.clearTimeout(t);
      cancelIdle?.();
    };
  }, [delayMs]);

  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

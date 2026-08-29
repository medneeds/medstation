import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";

interface DeferredSectionProps {
  /** Conteúdo pesado (normalmente um componente React.lazy). */
  children: ReactNode;
  /** Altura reservada para evitar CLS enquanto o bloco não montou. */
  minHeight?: number | string;
  /** Margem de pré-carregamento antes de entrar na viewport. */
  rootMargin?: string;
  className?: string;
}

/**
 * Monta o conteúdo somente quando a seção se aproxima da viewport.
 * Reserva espaço para não causar CLS e não altera o visual final.
 */
export function DeferredSection({
  children,
  minHeight = 320,
  rootMargin = "400px",
  className,
}: DeferredSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

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
    <div
      ref={ref}
      className={className}
      style={show ? undefined : { minHeight, contentVisibility: "auto", containIntrinsicSize: `${typeof minHeight === "number" ? `${minHeight}px` : minHeight}` } as React.CSSProperties}
    >
      {show ? (
        <Suspense fallback={<div style={{ minHeight }} aria-hidden="true" />}>{children}</Suspense>
      ) : null}
    </div>
  );
}

/** Monta o filho apenas quando o browser estiver ocioso (pós first paint). */
export function DeferredIdle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(() => setReady(true));
      return () => (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  if (!ready) return null;
  return <Suspense fallback={null}>{children}</Suspense>;
}

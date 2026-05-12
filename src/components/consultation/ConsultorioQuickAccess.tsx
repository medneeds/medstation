import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, UsersRound, FolderOpen, Pill, X, History, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type RecentCase = {
  id: string;
  title: string;
  status: string | null;
  updated_at: string;
  patient_name: string | null;
};

const QUICK_LINKS = [
  {
    key: "patients",
    label: "Pacientes",
    description: "Cadastrar e gerenciar a sua base de pacientes.",
    href: "/patients",
    Icon: UsersRound,
    accent: "text-emerald-500",
  },
  {
    key: "cases",
    label: "Casos clínicos",
    description: "Acompanhe casos abertos e adicione anotações.",
    href: "/cases",
    Icon: FolderOpen,
    accent: "text-sky-500",
  },
  {
    key: "prescriptions",
    label: "Prescrições",
    description: "Banco pessoal de prescrições com paciente vinculado.",
    href: "/prescricoes",
    Icon: Pill,
    accent: "text-amber-500",
  },
] as const;

function openInNewTab(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function ConsultorioHistoryButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<RecentCase[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: casesData } = await supabase
          .from("cases")
          .select("id,title,status,updated_at,patient_id")
          .order("updated_at", { ascending: false })
          .limit(15);

        const patientIds = Array.from(
          new Set((casesData ?? []).map((c) => c.patient_id).filter(Boolean) as string[])
        );
        let patientMap: Record<string, string> = {};
        if (patientIds.length > 0) {
          const { data: patients } = await supabase
            .from("patients")
            .select("id,name")
            .in("id", patientIds);
          patientMap = Object.fromEntries((patients ?? []).map((p) => [p.id, p.name]));
        }

        const formatted: RecentCase[] = (casesData ?? []).map((c) => ({
          id: c.id,
          title: c.title,
          status: c.status,
          updated_at: c.updated_at,
          patient_name: c.patient_id ? patientMap[c.patient_id] ?? null : null,
        }));
        if (!cancelled) setCases(formatted);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Histórico de casos recentes"
        aria-label="Abrir histórico de casos recentes"
        className={cn(
          "inline-flex items-center justify-center h-8 w-8 md:h-9 md:w-9 rounded-full",
          "bg-muted/50 ring-1 ring-border/60 text-muted-foreground hover:text-foreground",
          "hover:bg-muted transition-colors"
        )}
      >
        <History className="h-3.5 w-3.5 md:h-4 md:w-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Casos recentes
            </SheetTitle>
            <SheetDescription>
              Últimos casos registrados. Toque para abrir em uma nova aba.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Carregando…
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                Nenhum caso registrado ainda.
              </div>
            ) : (
              <ul className="space-y-2">
                {cases.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openInNewTab(`/cases/${c.id}`)}
                      className="w-full text-left p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{c.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.patient_name ?? "Sem paciente vinculado"}
                          </p>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-foreground transition-colors shrink-0 mt-0.5" />
                      </div>
                      <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                        {formatDistanceToNow(new Date(c.updated_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-3 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => openInNewTab("/cases")}
            >
              <FolderOpen className="h-4 w-4" />
              Ver todos os casos
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function ConsultorioQuickAccessFAB() {
  const [open, setOpen] = useState(false);

  // ESC fecha
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute bottom-14 right-0 w-72 rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-xl p-2"
          >
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Prontuário
              </p>
            </div>
            <ul className="space-y-0.5">
              {QUICK_LINKS.map(({ key, label, description, href, Icon, accent }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => {
                      openInNewTab(href);
                      setOpen(false);
                    }}
                    className="w-full text-left flex items-start gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors"
                  >
                    <span
                      className={cn(
                        "shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md bg-muted/60",
                        accent
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium leading-tight flex items-center gap-1.5">
                        {label}
                        <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                      </span>
                      <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">
                        {description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.94 }}
        aria-expanded={open}
        aria-label="Abrir acesso rápido ao prontuário"
        className={cn(
          "relative inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full",
          "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground",
          "shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.55)] ring-1 ring-primary/30",
          "hover:shadow-[0_14px_36px_-10px_hsl(var(--primary)/0.7)] transition-shadow"
        )}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="inline-flex"
        >
          {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </motion.span>
      </motion.button>
    </div>
  );
}

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ConsultationMode } from "@/components/ConsultationMode";
import { PremiumConsultorioGuard } from "@/components/PremiumConsultorioGuard";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FolderOpen, UsersRound, Pill, Stethoscope, ClipboardList,
  Microscope, Activity, FileSignature, X, ExternalLink, PanelRightOpen,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

type PanelKey =
  | "casos" | "pacientes" | "banco"
  | "clinicus" | "prescriptus" | "examinus" | "gasometrus" | "atestus" | "orientus";

type PanelMeta = {
  key: PanelKey;
  label: string;
  href: string;
  Icon: typeof FolderOpen;
  group: "prontuario" | "assistente";
  accent: string;
};

const PANELS: PanelMeta[] = [
  { key: "casos",       label: "Casos",       href: "/cases?embed=1",        Icon: FolderOpen,    group: "prontuario", accent: "text-sky-500" },
  { key: "pacientes",   label: "Pacientes",   href: "/patients?embed=1",     Icon: UsersRound,    group: "prontuario", accent: "text-emerald-500" },
  { key: "banco",       label: "Banco Rx",    href: "/prescricoes?embed=1",  Icon: Pill,          group: "prontuario", accent: "text-amber-500" },
  { key: "clinicus",    label: "Clínicus",    href: "/clinicus?embed=1",     Icon: Stethoscope,   group: "assistente", accent: "text-primary" },
  { key: "prescriptus", label: "Prescriptus", href: "/prescriptus?embed=1",  Icon: FileSignature, group: "assistente", accent: "text-amber-500" },
  { key: "examinus",    label: "Examinus",    href: "/examinus?embed=1",     Icon: Microscope,    group: "assistente", accent: "text-violet-500" },
  { key: "gasometrus",  label: "Gasometrus",  href: "/gasometrus?embed=1",   Icon: Activity,      group: "assistente", accent: "text-rose-500" },
  { key: "atestus",     label: "Atestus",     href: "/atestus?embed=1",      Icon: ClipboardList, group: "assistente", accent: "text-cyan-500" },
  { key: "orientus",    label: "Orientus",    href: "/orientus?embed=1",     Icon: ClipboardList, group: "assistente", accent: "text-teal-500" },
];

export default function Consultorio() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  const [active, setActive] = useState<PanelKey | null>(null);
  const meta = active ? PANELS.find((p) => p.key === active)! : null;

  const open = useCallback((k: PanelKey) => setActive(k), []);
  const close = useCallback(() => setActive(null), []);

  const consultation = (
    <ConsultationMode caseId={caseId} onExit={() => navigate("/dashboard")} />
  );

  return (
    <PremiumConsultorioGuard>
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8 relative">
        {active && !isMobile ? (
          <ResizablePanelGroup direction="horizontal" className="h-full w-full">
            <ResizablePanel defaultSize={55} minSize={30}>
              {consultation}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={45} minSize={25}>
              <SidePanelContent meta={meta!} onClose={close} onSwitch={open} />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <>
            {consultation}
            {active && isMobile && (
              <div className="fixed inset-0 z-40 bg-background animate-in fade-in">
                <SidePanelContent meta={meta!} onClose={close} onSwitch={open} />
              </div>
            )}
          </>
        )}

        {/* FAB aberto (só quando painel fechado) */}
        {!active && <OpenPanelFAB onOpen={open} />}
      </div>
    </PremiumConsultorioGuard>
  );
}

function SidePanelContent({
  meta, onClose, onSwitch,
}: { meta: PanelMeta; onClose: () => void; onSwitch: (k: PanelKey) => void }) {
  const Icon = meta.Icon;
  const prontuarios = PANELS.filter((p) => p.group === "prontuario");
  const assistentes = PANELS.filter((p) => p.group === "assistente");

  return (
    <div className="flex flex-col h-full bg-background border-l border-border/60">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={cn("h-4 w-4 shrink-0", meta.accent)} />
          <span className="text-sm font-medium truncate">{meta.label}</span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={meta.href.replace("?embed=1", "")}
            target="_blank" rel="noopener noreferrer"
            title="Abrir em nova aba"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose} title="Fechar painel">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="px-2 py-2 border-b border-border/60 flex flex-wrap gap-1 bg-muted/30">
        <PillRow label="Prontuário" items={prontuarios} active={meta.key} onSwitch={onSwitch} />
      </div>
      <div className="px-2 py-2 border-b border-border/60 flex flex-wrap gap-1 bg-muted/20">
        <PillRow label="Assistentes" items={assistentes} active={meta.key} onSwitch={onSwitch} />
      </div>

      <iframe
        key={meta.key}
        src={meta.href}
        title={meta.label}
        className="flex-1 w-full border-0 bg-background"
      />
    </div>
  );
}

function PillRow({
  label, items, active, onSwitch,
}: { label: string; items: PanelMeta[]; active: PanelKey; onSwitch: (k: PanelKey) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1">{label}</span>
      {items.map(({ key, label: l, Icon, accent }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSwitch(key)}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
              isActive
                ? "bg-background text-foreground ring-1 ring-border shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5", isActive && accent)} />
            {l}
          </button>
        );
      })}
    </div>
  );
}

function OpenPanelFAB({ onOpen }: { onOpen: (k: PanelKey) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40">
      {open && (
        <div className="mb-2 flex flex-col items-end gap-1.5 animate-in slide-in-from-bottom-2 fade-in">
          <FabSection title="Prontuário" items={PANELS.filter((p) => p.group === "prontuario")}
            onPick={(k) => { onOpen(k); setOpen(false); }} />
          <FabSection title="Assistentes" items={PANELS.filter((p) => p.group === "assistente")}
            onPick={(k) => { onOpen(k); setOpen(false); }} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir painel lateral"
        title="Abrir prontuário ou assistente em painel lateral"
        className={cn(
          "inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full",
          "bg-gradient-to-b from-primary to-primary/85 text-primary-foreground",
          "shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.55)] ring-1 ring-primary/30",
          "hover:shadow-[0_14px_36px_-10px_hsl(var(--primary)/0.7)] transition-all",
          open && "rotate-45"
        )}
      >
        <PanelRightOpen className="h-5 w-5 md:h-6 md:w-6" />
      </button>
    </div>
  );
}

function FabSection({
  title, items, onPick,
}: { title: string; items: PanelMeta[]; onPick: (k: PanelKey) => void }) {
  return (
    <div className="bg-card/95 backdrop-blur ring-1 ring-border/60 rounded-xl p-2 shadow-lg max-w-[260px]">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-1 pb-1">{title}</div>
      <div className="grid grid-cols-3 gap-1">
        {items.map(({ key, label, Icon, accent }) => (
          <button
            key={key}
            type="button"
            onClick={() => onPick(key)}
            className="flex flex-col items-center gap-1 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-[10px] text-muted-foreground hover:text-foreground"
            title={label}
          >
            <Icon className={cn("h-4 w-4", accent)} />
            <span className="truncate w-full text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

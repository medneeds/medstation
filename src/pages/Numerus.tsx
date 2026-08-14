import { useState } from "react";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import CalculatorPanel from "@/components/numerus/CalculatorPanel";
import { Calculator, Sigma, MessageSquare, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "calculadoras" | "chat";

export default function Numerus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;
  const [tab, setTab] = useState<Tab>("calculadoras");

  const tabs: { key: Tab; label: string; icon: typeof Calculator }[] = [
    { key: "calculadoras", label: "Calculadoras", icon: SlidersHorizontal },
    { key: "chat", label: "Chat", icon: MessageSquare },
  ];

  return (
    <PremiumAgentGuard agentName="Numerus">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8 flex flex-col min-h-0">
        <div className="shrink-0 flex items-center gap-1.5 px-3 sm:px-5 pt-3 pb-2 border-b border-border/40">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 text-[12.5px] px-3.5 py-1.5 rounded-full border transition-all",
                tab === t.key
                  ? "border-primary/50 bg-primary/10 text-primary font-medium"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/30",
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0">
          {tab === "calculadoras" ? (
            <CalculatorPanel />
          ) : (
            <AgentChat
              agentName="Numerus"
              agentIcon={<Sigma className="h-8 w-8" />}
              agentColor="text-primary"
              agentType="numerus"
              caseId={caseId}
              placeholder="Calculadoras médicas e conversores de unidades para seu dia a dia..."
            />
          )}
        </div>
      </div>
    </PremiumAgentGuard>
  );
}

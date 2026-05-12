import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Wind } from "lucide-react";

export default function Gasometrus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Gasometrus">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Gasometrus"
          agentIcon={<Wind className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="gasometrus"
          caseId={caseId}
          placeholder="Cole os valores da gasometria para análise completa..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

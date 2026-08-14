import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Calculator } from "lucide-react";

export default function Scorius() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Scorius">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Scorius"
          agentIcon={<Calculator className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="scorius"
          caseId={caseId}
          placeholder="Calcule scores e classificações de risco de forma rápida e precisa..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Activity } from "lucide-react";

export default function Scorius() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Scorius">
      <div className="h-full -m-3 md:-m-6">
        <AgentChat
          agentName="Scorius"
          agentIcon={<Activity className="h-8 w-8" />}
          agentColor="text-warning"
          agentType="scorius"
          caseId={caseId}
          placeholder="Calcule scores e classificações de risco de forma rápida e precisa..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

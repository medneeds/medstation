import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Calculator } from "lucide-react";

export default function Numerus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Numerus">
      <div className="h-full -m-3 md:-m-6">
        <AgentChat
          agentName="Numerus"
          agentIcon={<Calculator className="h-8 w-8" />}
          agentColor="text-accent"
          agentType="numerus"
          caseId={caseId}
          placeholder="Calculadoras médicas e conversores de unidades para seu dia a dia..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

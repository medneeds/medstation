import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Compass } from "lucide-react";

export default function Orientus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Orientus">
      <div className="h-full -m-3 md:-m-6">
        <AgentChat
          agentName="Orientus"
          agentIcon={<Compass className="h-8 w-8" />}
          agentColor="text-orange-500"
          agentType="orientus"
          caseId={caseId}
          placeholder="Qual orientação ao paciente você precisa gerar?"
        />
      </div>
    </PremiumAgentGuard>
  );
}

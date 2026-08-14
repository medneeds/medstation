import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Stethoscope } from "lucide-react";

export default function Clinicus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Clínicus">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Clínicus"
          agentIcon={<Stethoscope className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="clinicus"
          caseId={caseId}
          placeholder="Estruture anamneses e histórias clínicas de forma clara e organizada..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

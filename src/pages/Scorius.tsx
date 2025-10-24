import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Activity, Heart, Brain } from "lucide-react";

export default function Scorius() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Scorius">
      <div className="h-full p-6">
        <AgentChat
        agentName="Scorius"
        agentIcon={<Activity className="h-8 w-8" />}
        agentColor="text-warning"
        agentType="scorius"
        caseId={caseId}
        placeholder="Solicite cálculo de scores prognósticos (APACHE, SOFA, etc)..."
        actionButtons={[
          {
            label: "APACHE II",
            icon: <Heart className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Calcular APACHE II"),
          },
          {
            label: "SOFA Score",
            icon: <Activity className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Calcular SOFA"),
          },
          {
            label: "Glasgow",
            icon: <Brain className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Calcular Glasgow"),
          },
        ]}
        />
      </div>
    </PremiumAgentGuard>
  );
}

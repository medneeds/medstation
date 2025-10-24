import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Calculator, Ruler, Droplet } from "lucide-react";

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
        placeholder="Solicite cálculos clínicos, conversões de unidades ou fórmulas..."
        actionButtons={[
          {
            label: "Converter Unidades",
            icon: <Ruler className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Converter unidades"),
          },
          {
            label: "Calcular Doses",
            icon: <Droplet className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Calcular doses"),
          },
        ]}
        />
      </div>
    </PremiumAgentGuard>
  );
}

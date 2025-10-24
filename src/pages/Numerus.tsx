import { AgentChat } from "@/components/AgentChat";
import { Calculator, Ruler, Droplet } from "lucide-react";

export default function Numerus() {
  return (
    <AgentChat
      agentName="Numerus"
      agentIcon={<Calculator className="h-8 w-8" />}
      agentColor="text-accent"
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
  );
}

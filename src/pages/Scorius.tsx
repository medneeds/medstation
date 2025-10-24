import { AgentChat } from "@/components/AgentChat";
import { Activity, Heart, Brain } from "lucide-react";

export default function Scorius() {
  return (
    <AgentChat
      agentName="Scorius"
      agentIcon={<Activity className="h-8 w-8" />}
      agentColor="text-warning"
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
  );
}

import { AgentChat } from "@/components/AgentChat";
import { FlaskConical, Upload, Sparkles, FileSearch } from "lucide-react";

export default function Examinus() {
  return (
    <AgentChat
      agentName="Examinus"
      agentIcon={<FlaskConical className="h-8 w-8" />}
      agentColor="text-secondary"
      agentType="examinus"
      placeholder="Cole resultados de exames, peça interpretações ou análises..."
      actionButtons={[
        {
          label: "Importar Arquivo",
          icon: <Upload className="mr-2 h-4 w-4" />,
          onClick: () => console.log("Importar exame"),
        },
        {
          label: "Sumário IA",
          icon: <Sparkles className="mr-2 h-4 w-4" />,
          onClick: () => console.log("Gerar sumário"),
        },
        {
          label: "Buscar Valores",
          icon: <FileSearch className="mr-2 h-4 w-4" />,
          onClick: () => console.log("Buscar valores"),
        },
      ]}
    />
  );
}

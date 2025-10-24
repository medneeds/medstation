import { AgentChat } from "@/components/AgentChat";
import { FlaskConical, Upload, Sparkles, FileSearch } from "lucide-react";

export default function Examinus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <div className="h-full -m-3 md:-m-6">
      <AgentChat
        agentName="Examinus"
        agentIcon={<FlaskConical className="h-8 w-8" />}
        agentColor="text-secondary"
        agentType="examinus"
        caseId={caseId}
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
    </div>
  );
}

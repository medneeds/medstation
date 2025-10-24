import { AgentChat } from "@/components/AgentChat";
import { FileText, Plus, FileDown } from "lucide-react";

export default function Clinicus() {
  return (
    <AgentChat
      agentName="Clínicus"
      agentIcon={<FileText className="h-8 w-8" />}
      agentColor="text-primary"
      agentType="clinicus"
      placeholder="Descreva o caso clínico, solicite relatórios ou faça perguntas..."
      actionButtons={[
        {
          label: "Novo Relatório",
          icon: <Plus className="mr-2 h-4 w-4" />,
          onClick: () => console.log("Criar relatório"),
        },
        {
          label: "Exportar PDF",
          icon: <FileDown className="mr-2 h-4 w-4" />,
          onClick: () => console.log("Exportar PDF"),
        },
      ]}
    />
  );
}

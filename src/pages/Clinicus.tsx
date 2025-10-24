import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { FileText, Plus, FileDown } from "lucide-react";

export default function Clinicus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Clínicus">
      <div className="h-full">
        <AgentChat
          agentName="Clínicus"
          agentIcon={<FileText className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="clinicus"
          caseId={caseId}
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
      </div>
    </PremiumAgentGuard>
  );
}

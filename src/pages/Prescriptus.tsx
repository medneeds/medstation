import { AgentChat } from "@/components/AgentChat";
import { Pill, Plus, AlertTriangle, FileDown } from "lucide-react";

export default function Prescriptus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <div className="h-full p-6">
      <AgentChat
        agentName="Prescriptus"
        agentIcon={<Pill className="h-8 w-8" />}
        agentColor="text-destructive"
        agentType="prescriptus"
        caseId={caseId}
        placeholder="Digite medicações, doses ou solicite prescrições estruturadas..."
        actionButtons={[
          {
            label: "Nova Prescrição",
            icon: <Plus className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Nova prescrição"),
          },
          {
            label: "Verificar Interações",
            icon: <AlertTriangle className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Verificar interações"),
          },
          {
            label: "Gerar PDF",
            icon: <FileDown className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Gerar PDF"),
          },
        ]}
      />
    </div>
  );
}

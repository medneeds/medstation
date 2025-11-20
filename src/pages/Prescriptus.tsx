import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Pill, Plus, AlertTriangle, FileDown, FileSignature } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Prescriptus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;
  const navigate = useNavigate();

  return (
    <PremiumAgentGuard agentName="Prescriptus">
      <div className="h-full -m-3 md:-m-6">
        <AgentChat
        agentName="Prescriptus"
        agentIcon={<Pill className="h-8 w-8" />}
        agentColor="text-destructive"
        agentType="prescriptus"
        caseId={caseId}
        placeholder="Prescrições estruturadas e guiadas por evidências científicas..."
        actionButtons={[
          {
            label: "Nova Prescrição Real",
            icon: <FileSignature className="mr-2 h-4 w-4" />,
            onClick: () => navigate("/prescricoes/nova"),
          },
          {
            label: "Verificar Interações",
            icon: <AlertTriangle className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Verificar interações"),
          },
          {
            label: "Ver Prescrições",
            icon: <FileDown className="mr-2 h-4 w-4" />,
            onClick: () => navigate("/prescricoes"),
          },
        ]}
        />
      </div>
    </PremiumAgentGuard>
  );
}

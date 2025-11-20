import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { FileText, Plus, FileDown } from "lucide-react";

export default function Clinicus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Clínicus">
      <div className="h-full -m-3 md:-m-6">
        <AgentChat
          agentName="Clínicus"
          agentIcon={<FileText className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="clinicus"
          caseId={caseId}
          placeholder="Estruture anamneses e histórias clínicas de forma clara e organizada..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

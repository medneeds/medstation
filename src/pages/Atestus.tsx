import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { FileCheck } from "lucide-react";

export default function Atestus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Atestus">
      <div className="h-full -m-3 md:-m-6">
        <AgentChat
          agentName="Atestus"
          agentIcon={<FileCheck className="h-8 w-8" />}
          agentColor="text-emerald-500"
          agentType="atestus"
          caseId={caseId}
          placeholder="Descreva o atestado que você precisa gerar..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

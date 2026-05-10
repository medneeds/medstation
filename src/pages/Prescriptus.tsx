import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Pill } from "lucide-react";

export default function Prescriptus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Prescriptus">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Prescriptus"
          agentIcon={<Pill className="h-8 w-8" />}
          agentColor="text-destructive"
          agentType="prescriptus"
          caseId={caseId}
          placeholder="Prescrições estruturadas e guiadas por evidências científicas..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

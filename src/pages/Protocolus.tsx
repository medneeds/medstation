import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { BookOpen } from "lucide-react";

export default function Protocolus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Protocolus">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Protocolus"
          agentIcon={<BookOpen className="h-8 w-8" />}
          agentColor="text-amber-500"
          agentType="protocolus"
          caseId={caseId}
          placeholder="Qual protocolo ou guideline você precisa consultar?"
        />
      </div>
    </PremiumAgentGuard>
  );
}

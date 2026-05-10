import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { FileText } from "lucide-react";

export default function Codexus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="CODexus">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="CODexus"
          agentIcon={<FileText className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="codexus"
          caseId={caseId}
          placeholder="Codificação CID-10 e TISS automatizada e precisa..."
        />
      </div>
    </PremiumAgentGuard>
  );
}

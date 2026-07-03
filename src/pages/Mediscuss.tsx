import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { MessagesSquare } from "lucide-react";

export default function Mediscuss() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Mediscuss">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Mediscuss"
          agentIcon={<MessagesSquare className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="mediscuss"
          caseId={caseId}
          placeholder="Cole os dados do caso. Eu monto o pedido de parecer, discussão, internação, UTI ou transferência prontos para o prontuário."
        />
      </div>
    </PremiumAgentGuard>
  );
}

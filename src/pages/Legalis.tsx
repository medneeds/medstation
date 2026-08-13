import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Scale } from "lucide-react";

export default function Legalis() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="Legalis">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Legalis"
          agentIcon={<Scale className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="legalis"
          caseId={caseId}
          placeholder="Descreva a dúvida ética, cole o registro para blindagem ou relate o questionamento recebido. Eu fundamento, blindo e escrevo o documento."
        />
      </div>
    </PremiumAgentGuard>
  );
}

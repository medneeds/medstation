import { AgentChat } from "@/components/AgentChat";
import { Activity } from "lucide-react";

export default function Examinus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
      <AgentChat
        agentName="Examinus"
        agentIcon={<Activity className="h-8 w-8" />}
        agentColor="text-primary"
        agentType="examinus"
        caseId={caseId}
        placeholder="Cole laboratoriais ou laudos de imagem (TC, RM, USG, RX) — texto, PDF ou foto. Eu resumo o que importa. 😎"
      />
    </div>
  );
}

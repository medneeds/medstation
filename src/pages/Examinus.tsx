import { AgentChat } from "@/components/AgentChat";
import { TestTube2 } from "lucide-react";

export default function Examinus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
      <AgentChat
        agentName="Examinus"
        agentIcon={<TestTube2 className="h-8 w-8" />}
        agentColor="text-primary"
        agentType="examinus"
        caseId={caseId}
        placeholder="Cole resultados de exames - hemograma, bioquímica, imagens, PDFs... Literalmente qualquer um! 😎"
      />
    </div>
  );
}

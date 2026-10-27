import { useLocation } from "react-router-dom";
import { Workflow } from "lucide-react";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { operadorActionForPath } from "@/lib/operador";

export default function Operador() {
  const { pathname } = useLocation();
  const initialAction = operadorActionForPath(pathname);

  return (
    <PremiumAgentGuard agentName="Modo Operador">
      <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
        <AgentChat
          agentName="Modo Operador"
          agentIcon={<Workflow className="h-8 w-8" />}
          agentColor="text-primary"
          agentType="operador"
          initialOperadorAction={initialAction}
          placeholder="Cole qualquer material: anotação solta, prontuário, exames, laudo ou mensagem. Diga o que quer e eu converto, organizo ou indico o assistente certo."
        />
      </div>
    </PremiumAgentGuard>
  );
}

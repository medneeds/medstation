import { DashboardLayout } from "@/components/DashboardLayout";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { BookOpen } from "lucide-react";

export default function Protocolus() {
  return (
    <DashboardLayout>
      <PremiumAgentGuard agentName="Protocolus">
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <BookOpen className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Protocolus</h1>
              <p className="text-sm text-muted-foreground">
                Protocolos clínicos e guidelines atualizados
              </p>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <AgentChat 
              agentName="Protocolus"
              agentIcon={<BookOpen className="h-5 w-5" />}
              agentColor="text-amber-500"
              agentType="protocolus"
              placeholder="Qual protocolo ou guideline você precisa consultar?"
            />
          </div>
        </div>
      </PremiumAgentGuard>
    </DashboardLayout>
  );
}

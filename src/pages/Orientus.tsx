import { DashboardLayout } from "@/components/DashboardLayout";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { Compass } from "lucide-react";

export default function Orientus() {
  return (
    <DashboardLayout>
      <PremiumAgentGuard agentName="Orientus">
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Compass className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Orientus</h1>
              <p className="text-sm text-muted-foreground">
                Orientações ao paciente e instruções de alta
              </p>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <AgentChat 
              agentName="Orientus"
              agentIcon={<Compass className="h-5 w-5" />}
              agentColor="text-orange-500"
              agentType="orientus"
              placeholder="Qual orientação ao paciente você precisa gerar?"
            />
          </div>
        </div>
      </PremiumAgentGuard>
    </DashboardLayout>
  );
}

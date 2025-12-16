import { DashboardLayout } from "@/components/DashboardLayout";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { FileCheck } from "lucide-react";

export default function Atestus() {
  return (
    <DashboardLayout>
      <PremiumAgentGuard agentName="Atestus">
        <div className="h-[calc(100vh-4rem)] flex flex-col">
          <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-background/50 backdrop-blur-sm">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <FileCheck className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Atestus</h1>
              <p className="text-sm text-muted-foreground">
                Geração inteligente de atestados médicos
              </p>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <AgentChat 
              agentName="Atestus"
              agentIcon={<FileCheck className="h-5 w-5" />}
              agentColor="text-emerald-500"
              agentType="atestus"
              placeholder="Descreva o atestado que você precisa gerar..."
            />
          </div>
        </div>
      </PremiumAgentGuard>
    </DashboardLayout>
  );
}

import { useState } from "react";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { ConsultationMode } from "@/components/ConsultationMode";
import { FileText, Stethoscope, Sparkles, Mic, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Clinicus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;
  const [isConsultationMode, setIsConsultationMode] = useState(false);

  return (
    <PremiumAgentGuard agentName="Clínicus">
      {isConsultationMode ? (
        <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8">
          <ConsultationMode 
            caseId={caseId} 
            onExit={() => setIsConsultationMode(false)} 
          />
        </div>
      ) : (
        <div className="h-[calc(100dvh-3.5rem)] -m-4 md:-m-6 lg:-m-8 flex flex-col">
          {/* Consultation Mode Highlight Banner */}
          <button
            type="button"
            onClick={() => setIsConsultationMode(true)}
            className="group relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/15 hover:via-primary/10 transition-all text-left"
          >
            <div className="absolute inset-y-0 left-0 w-1 bg-primary" />
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
            
            <div className="relative flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-md animate-pulse" />
                <div className="relative h-10 w-10 md:h-11 md:w-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                  <Stethoscope className="h-5 w-5 md:h-5 md:w-5 text-primary" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm md:text-base">Modo Consultório</span>
                  <span className="inline-flex items-center gap-1 text-[10px] md:text-xs font-medium text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-full">
                    <Sparkles className="h-2.5 w-2.5" />
                    Novo
                  </span>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 line-clamp-2 md:line-clamp-1">
                  Transcreva a consulta ao vivo e gere a anamnese estruturada automaticamente
                </p>
              </div>

              <Button
                size="sm"
                className="hidden sm:inline-flex gap-2 flex-shrink-0 group-hover:translate-x-0.5 transition-transform"
              >
                <Mic className="h-4 w-4" />
                <span>Ativar</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
              <div className="sm:hidden flex-shrink-0">
                <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
          
          {/* Regular Chat */}
          <div className="flex-1">
            <AgentChat
              agentName="Clínicus"
              agentIcon={<FileText className="h-8 w-8" />}
              agentColor="text-primary"
              agentType="clinicus"
              caseId={caseId}
              placeholder="Estruture anamneses e histórias clínicas de forma clara e organizada..."
            />
          </div>
        </div>
      )}
    </PremiumAgentGuard>
  );
}

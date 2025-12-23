import { useState } from "react";
import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { ConsultationMode } from "@/components/ConsultationMode";
import { FileText, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Clinicus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;
  const [isConsultationMode, setIsConsultationMode] = useState(false);

  return (
    <PremiumAgentGuard agentName="Clínicus">
      {isConsultationMode ? (
        <div className="h-full -m-3 md:-m-6">
          <ConsultationMode 
            caseId={caseId} 
            onExit={() => setIsConsultationMode(false)} 
          />
        </div>
      ) : (
        <div className="h-full -m-3 md:-m-6 flex flex-col">
          {/* Consultation Mode Toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
            <div className="flex items-center gap-3">
              <Stethoscope className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="consultation-mode" className="font-medium cursor-pointer">
                  Modo Consultório
                </Label>
                <p className="text-xs text-muted-foreground">
                  Transcrição em tempo real com diarização
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="consultation-mode"
                checked={isConsultationMode}
                onCheckedChange={setIsConsultationMode}
              />
            </div>
          </div>
          
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

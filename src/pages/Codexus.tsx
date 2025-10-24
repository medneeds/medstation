import { AgentChat } from "@/components/AgentChat";
import { PremiumAgentGuard } from "@/components/PremiumAgentGuard";
import { FileText, Search, Database, Copy } from "lucide-react";

export default function Codexus() {
  const searchParams = new URLSearchParams(window.location.search);
  const caseId = searchParams.get("caseId") || undefined;

  return (
    <PremiumAgentGuard agentName="CODexus">
      <div className="h-full p-3 md:p-6">
        <AgentChat
        agentName="CODexus"
        agentIcon={<FileText className="h-8 w-8" />}
        agentColor="text-primary"
        agentType="codexus"
        caseId={caseId}
        placeholder="Busque diagnósticos, códigos CID-10 ou códigos LOINC..."
        actionButtons={[
          {
            label: "Buscar CID-10",
            icon: <Search className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Buscar CID-10"),
          },
          {
            label: "Buscar LOINC",
            icon: <Database className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Buscar LOINC"),
          },
          {
            label: "Copiar Códigos",
            icon: <Copy className="mr-2 h-4 w-4" />,
            onClick: () => console.log("Copiar códigos"),
          },
        ]}
        />
      </div>
    </PremiumAgentGuard>
  );
}

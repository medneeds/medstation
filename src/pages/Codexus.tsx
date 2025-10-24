import { AgentChat } from "@/components/AgentChat";
import { FileText, Search, Database, Copy } from "lucide-react";

export default function Codexus() {
  return (
    <AgentChat
      agentName="CODexus"
      agentIcon={<FileText className="h-8 w-8" />}
      agentColor="text-primary"
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
  );
}

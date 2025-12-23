import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  FlaskConical,
  Activity,
  Sigma,
  Pill,
  FileText,
  Wind,
  FileCheck,
  BookOpen,
  Compass,
  Calculator,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentButtonsProps {
  caseId: string;
}

const agents = [
  { name: "Clínicus", path: "/clinicus", icon: Stethoscope, color: "text-blue-600" },
  { name: "Examinus", path: "/examinus", icon: FlaskConical, color: "text-examinus" },
  { name: "Scorius", path: "/scorius", icon: Calculator, color: "text-red-600" },
  { name: "Numerus", path: "/numerus", icon: Sigma, color: "text-green-600" },
  { name: "Prescriptus", path: "/prescriptus", icon: Pill, color: "text-orange-600" },
  { name: "CODexus", path: "/codexus", icon: FileText, color: "text-indigo-600" },
  { name: "Gasometrus", path: "/gasometrus", icon: Wind, color: "text-cyan-600" },
  { name: "Atestus", path: "/atestus", icon: FileCheck, color: "text-emerald-600" },
  { name: "Protocolus", path: "/protocolus", icon: BookOpen, color: "text-amber-600" },
  { name: "Orientus", path: "/orientus", icon: Compass, color: "text-rose-600" },
];

export function AgentButtons({ caseId }: AgentButtonsProps) {
  const navigate = useNavigate();

  const handleAgentClick = (path: string) => {
    navigate(`${path}?caseId=${caseId}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Stethoscope className="h-4 w-4 mr-2" />
          Consultar Assistente IA
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {agents.map((agent) => {
          const Icon = agent.icon;
          return (
            <DropdownMenuItem
              key={agent.name}
              onClick={() => handleAgentClick(agent.path)}
              className="cursor-pointer"
            >
              <Icon className={`h-4 w-4 mr-2 ${agent.color}`} />
              {agent.name}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Folder,
  Pill,
  FileText,
  Stethoscope,
  FlaskConical,
  Calculator,
  Sigma,
  Wind,
  FileCheck,
  BookOpen,
  Compass,
  StickyNote,
  ArrowRight,
} from "lucide-react";

interface SearchResult {
  id: string;
  type: "case" | "note";
  title: string;
  subtitle?: string;
  tags?: string[];
  icon: React.ReactNode;
  action: () => void;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const agents = [
  { name: "Examinus", path: "/examinus", icon: FlaskConical, color: "text-examinus", description: "Extração e formatação de exames laboratoriais e de imagem" },
  { name: "Clínicus", path: "/clinicus", icon: Stethoscope, color: "text-blue-500", description: "Anamneses hospitalares estruturadas e passagem de plantão" },
  { name: "Scorius", path: "/scorius", icon: Calculator, color: "text-red-500", description: "Cálculo e interpretação de scores clínicos e escalas prognósticas" },
  { name: "Numerus", path: "/numerus", icon: Sigma, color: "text-green-500", description: "Calculadoras médicas e conversão de unidades" },
  { name: "Prescriptus", path: "/prescriptus", icon: Pill, color: "text-orange-500", description: "Prescrições estruturadas com Bula Inteligente integrada" },
  { name: "CODexus", path: "/codexus", icon: FileText, color: "text-indigo-500", description: "Codificação CID-10, TISS e procedimentos médicos" },
  { name: "Gasometrus", path: "/gasometrus", icon: Wind, color: "text-cyan-500", description: "Análise completa e interpretação de gasometria arterial" },
  { name: "Atestus", path: "/atestus", icon: FileCheck, color: "text-emerald-500", description: "Geração de atestados médicos e declarações" },
  { name: "Protocolus", path: "/protocolus", icon: BookOpen, color: "text-amber-500", description: "Consulta a protocolos e guidelines nacionais e internacionais" },
  { name: "Orientus", path: "/orientus", icon: Compass, color: "text-rose-500", description: "Orientações ao paciente e instruções de alta hospitalar" },
];

const quickActions: { name: string; path: string; icon: typeof StickyNote; description: string }[] = [];

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Filter agents and actions based on query
  const filteredAgents = useMemo(() => {
    if (!query.trim()) return agents;
    const q = query.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();
    return quickActions.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }, [query]);

  // Search database for cases, patients, etc.
  useEffect(() => {
    const searchDatabase = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar consultas salvas (cases)
        const { data: cases } = await supabase
          .from("cases")
          .select("id, title, chief_complaint, tags, updated_at")
          .eq("user_id", user.id)
          .or(`title.ilike.%${query}%,chief_complaint.ilike.%${query}%`)
          .order("updated_at", { ascending: false })
          .limit(6);

        // Buscar notas
        const { data: notes } = await supabase
          .from("notes")
          .select("id, title, content")
          .eq("user_id", user.id)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .limit(5);

        const searchResults: SearchResult[] = [];

        cases?.forEach((c) => {
          searchResults.push({
            id: c.id,
            type: "case",
            title: c.title,
            subtitle: c.chief_complaint || undefined,
            tags: c.tags || undefined,
            icon: <Folder className="h-4 w-4 text-primary" />,
            action: () => {
              navigate(`/consultorio?caseId=${c.id}`);
              onOpenChange(false);
            },
          });
        });

        notes?.forEach((n) => {
          searchResults.push({
            id: n.id,
            type: "note",
            title: n.title,
            subtitle: n.content ? n.content.substring(0, 60) + "..." : undefined,
            icon: <StickyNote className="h-4 w-4 text-yellow-500" />,
            action: () => {
              navigate(`/notes/${n.id}`);
              onOpenChange(false);
            },
          });
        });
        setResults(searchResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchDatabase, 300);
    return () => clearTimeout(debounce);
  }, [query, navigate, onOpenChange]);

  // Calculate total items for keyboard navigation
  const totalItems = filteredAgents.length + filteredActions.length + results.length;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
      } else if (e.key === "Enter") {
        e.preventDefault();
        // Execute selected item
        let currentIndex = 0;
        
        // Check agents
        if (selectedIndex < filteredAgents.length) {
          navigate(filteredAgents[selectedIndex].path);
          onOpenChange(false);
          return;
        }
        currentIndex += filteredAgents.length;

        // Check quick actions
        if (selectedIndex < currentIndex + filteredActions.length) {
          navigate(filteredActions[selectedIndex - currentIndex].path);
          onOpenChange(false);
          return;
        }
        currentIndex += filteredActions.length;

        // Check results
        if (selectedIndex < currentIndex + results.length) {
          results[selectedIndex - currentIndex].action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedIndex, totalItems, filteredAgents, filteredActions, results, navigate, onOpenChange]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  let itemIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <div className="flex items-center border-b px-4">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar casos, pacientes, agentes ou comandos..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 text-base h-14"
            autoFocus
          />
          {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-2">
            {/* Agents Section */}
            {filteredAgents.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  Assistentes IA
                </p>
                <div className="space-y-0.5">
                  {filteredAgents.map((agent) => {
                    const Icon = agent.icon;
                    const isSelected = selectedIndex === itemIndex;
                    const currentIdx = itemIndex++;
                    return (
                      <button
                        key={agent.name}
                        onClick={() => {
                          navigate(agent.path);
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIdx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className={`p-1.5 rounded-md bg-background border ${agent.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{agent.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {agent.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quick Actions Section */}
            {filteredActions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  Ações Rápidas
                </p>
                <div className="space-y-0.5">
                  {filteredActions.map((action) => {
                    const Icon = action.icon;
                    const isSelected = selectedIndex === itemIndex;
                    const currentIdx = itemIndex++;
                    return (
                      <button
                        key={action.name}
                        onClick={() => {
                          navigate(action.path);
                          onOpenChange(false);
                        }}
                        onMouseEnter={() => setSelectedIndex(currentIdx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="p-1.5 rounded-md bg-background border">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{action.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Results Section */}
            {results.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground px-2 py-1.5">
                  Resultados
                </p>
                <div className="space-y-0.5">
                  {results.map((result) => {
                    const isSelected = selectedIndex === itemIndex;
                    const currentIdx = itemIndex++;
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={result.action}
                        onMouseEnter={() => setSelectedIndex(currentIdx)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="p-1.5 rounded-md bg-background border">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{result.title}</p>
                            <Badge variant="secondary" className="text-[10px] shrink-0">
                              {result.type === "case" && "Caso"}
                              {result.type === "patient" && "Paciente"}
                              {result.type === "note" && "Nota"}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.subtitle}
                            </p>
                          )}
                          {result.tags && result.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {result.tags.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-[10px]">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State */}
            {query && !isSearching && results.length === 0 && filteredAgents.length === 0 && filteredActions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum resultado para "{query}"</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
              fechar
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

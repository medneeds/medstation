import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Loader2, Folder, Calendar } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  notes: string;
  chief_complaint: string;
  status: string;
  tags: string[];
  patient_name: string;
  created_at: string;
  updated_at: string;
  rank: number;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase.rpc("search_cases", {
        search_query: query,
        user_uuid: user.id,
      });

      if (error) throw error;

      setResults(data || []);
    } catch (error: any) {
      console.error("Erro na busca:", error);
      toast({
        title: "Erro na busca",
        description: error.message || "Não foi possível realizar a busca.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (caseId: string) => {
    // Navigation removed - cases module hidden
    onOpenChange(false);
    setQuery("");
    setResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar Casos</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            placeholder="Digite para buscar casos, pacientes ou sintomas..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isSearching}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        <ScrollArea className="h-96">
          {results.length === 0 && query && !isSearching && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum resultado encontrado</p>
            </div>
          )}

          {results.length === 0 && !query && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Digite algo para começar a busca</p>
            </div>
          )}

          <div className="space-y-2">
            {results.map((result) => (
              <Button
                key={result.id}
                variant="outline"
                className="w-full justify-start h-auto p-4 text-left"
                onClick={() => handleResultClick(result.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Folder className="h-4 w-4 shrink-0" />
                    <h4 className="font-medium truncate">{result.title}</h4>
                    <Badge variant="secondary" className="shrink-0">
                      {result.status}
                    </Badge>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">
                    Paciente: {result.patient_name}
                  </p>

                  {result.chief_complaint && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {result.chief_complaint}
                    </p>
                  )}

                  {result.tags && result.tags.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {result.tags.map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(result.updated_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

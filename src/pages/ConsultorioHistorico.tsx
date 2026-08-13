import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCaseFolders } from "@/hooks/useCaseFolders";
import { copyText } from "@/lib/clipboard";
import { toast } from "sonner";
import { CalendarDays, Copy, Folder, FolderOpen, Loader2, Mic, Search, FileText } from "lucide-react";

interface CaseRow {
  id: string;
  title: string;
  chief_complaint: string | null;
  notes: string | null;
  consultation_date: string;
  created_at: string;
  folder_id: string | null;
}

const NO_FOLDER = "__sem_pasta__";

function formatDate(value: string) {
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export default function ConsultorioHistorico() {
  const navigate = useNavigate();
  const { folders } = useCaseFolders();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("cases")
        .select("id, title, chief_complaint, notes, consultation_date, created_at, folder_id")
        .order("consultation_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) toast.error("Não foi possível carregar o histórico.");
      setCases((data as CaseRow[]) ?? []);
      setIsLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cases.filter((c) => {
      if (folderFilter === NO_FOLDER && c.folder_id) return false;
      if (folderFilter !== "all" && folderFilter !== NO_FOLDER && c.folder_id !== folderFilter) return false;
      if (from && c.consultation_date < from) return false;
      if (to && c.consultation_date > to) return false;
      if (q) {
        const hay = `${c.title} ${c.chief_complaint ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [cases, query, folderFilter, from, to]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: CaseRow[] }>();
    for (const c of filtered) {
      const key = c.folder_id ?? NO_FOLDER;
      const name = c.folder_id ? folders.find((f) => f.id === c.folder_id)?.name ?? "Pasta" : "Sem pasta";
      if (!map.has(key)) map.set(key, { name, items: [] });
      map.get(key)!.items.push(c);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => (a.id === NO_FOLDER ? 1 : b.id === NO_FOLDER ? -1 : a.name.localeCompare(b.name)));
  }, [filtered, folders]);

  const byDate = (items: CaseRow[]) => {
    const map = new Map<string, CaseRow[]>();
    for (const c of items) {
      if (!map.has(c.consultation_date)) map.set(c.consultation_date, []);
      map.get(c.consultation_date)!.push(c);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  };

  const handleCopy = async (c: CaseRow) => {
    if (!c.notes) {
      toast.error("Esta consulta não tem anamnese salva.");
      return;
    }
    const ok = await copyText(c.notes);
    toast[ok ? "success" : "error"](ok ? "Anamnese copiada 👏" : "Não foi possível copiar.");
  };

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Histórico de consultas | MedStation AI</title>
        <meta name="description" content="Consulte, filtre por pasta e data e copie as anamneses salvas no Modo Consultório." />
      </Helmet>

      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Histórico de consultas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Suas consultas salvas, organizadas por pasta e data.
          </p>
        </div>
        <Button onClick={() => navigate("/consultorio")} className="gap-2 h-10 w-full sm:w-auto">
          <Mic className="h-4 w-4" />
          Novo atendimento
        </Button>
      </header>

      {/* Filtros */}
      <Card className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Buscar</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="Nome ou queixa" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Pasta</Label>
          <Select value={folderFilter} onValueChange={setFolderFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Todas as pastas</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
              <SelectItem value={NO_FOLDER}>Sem pasta</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando histórico...
        </div>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center space-y-3">
          <FolderOpen className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">Nenhuma consulta encontrada com esses filtros.</p>
          <Button variant="outline" onClick={() => navigate("/consultorio")} className="gap-2">
            <Mic className="h-4 w-4" /> Iniciar atendimento
          </Button>
        </Card>
      ) : (
        <Accordion type="multiple" defaultValue={grouped.map((g) => g.id)} className="space-y-3">
          {grouped.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg bg-card px-4">
              <AccordionTrigger className="hover:no-underline">
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Folder className="h-4 w-4 text-primary" />
                  {group.name}
                  <Badge variant="secondary" className="ml-1">{group.items.length}</Badge>
                </span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pb-4">
                {byDate(group.items).map(([date, items]) => (
                  <div key={date} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <span className="font-medium">{formatDate(date)}</span>
                      <span className="h-px flex-1 bg-border" />
                    </div>
                    <ul className="space-y-2">
                      {items.map((c) => (
                        <li
                          key={c.id}
                          className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/40 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.title}</p>
                            {c.chief_complaint && (
                              <p className="text-xs text-muted-foreground truncate">{c.chief_complaint}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => handleCopy(c)}>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-xs">Copiar</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => {
                                if (!c.notes) {
                                  toast.error("Esta consulta não tem anamnese salva.");
                                  return;
                                }
                                sessionStorage.setItem("agent-prefill", c.notes);
                                navigate("/clinicus");
                              }}
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline text-xs">Abrir no Clínicus</span>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}

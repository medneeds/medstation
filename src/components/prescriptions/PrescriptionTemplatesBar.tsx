import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BookmarkPlus, ChevronDown, Library, Trash2 } from "lucide-react";

export interface TemplateMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Template {
  id: string;
  name: string;
  medications: TemplateMedication[];
  observations: string | null;
  use_count: number;
}

interface Props {
  medications: TemplateMedication[];
  observations: string;
  onApply: (meds: TemplateMedication[], observations: string | null) => void;
}

const toMeds = (raw: unknown): TemplateMedication[] =>
  Array.isArray(raw)
    ? raw.map((m: any) => ({
        name: String(m?.name ?? ""),
        dosage: String(m?.dosage ?? ""),
        frequency: String(m?.frequency ?? ""),
        duration: String(m?.duration ?? ""),
        instructions: String(m?.instructions ?? ""),
      }))
    : [];

export function PrescriptionTemplatesBar({ medications, observations, onApply }: Props) {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("prescription_templates")
      .select("id, name, medications, observations, use_count")
      .order("use_count", { ascending: false })
      .order("name");
    setTemplates((data || []).map((t) => ({ ...t, medications: toMeds(t.medications) })));
  };

  useEffect(() => {
    load();
  }, []);

  const filled = medications.filter((m) => m.name.trim());

  const apply = async (t: Template) => {
    onApply(t.medications, t.observations);
    toast({ title: `Modelo "${t.name}" aplicado`, description: "Confira doses e duração para este paciente." });
    await supabase.from("prescription_templates").update({ use_count: t.use_count + 1 }).eq("id", t.id);
    load();
  };

  const remove = async (t: Template) => {
    const { error } = await supabase.from("prescription_templates").delete().eq("id", t.id);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível excluir o modelo" });
      return;
    }
    toast({ title: "Modelo excluído" });
    load();
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed || filled.length === 0) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }
    const { error } = await supabase.from("prescription_templates").insert({
      user_id: user.id,
      name: trimmed.slice(0, 80),
      medications: filled as any,
      observations: observations.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar o modelo", description: "Tente novamente em instantes." });
      return;
    }
    toast({ title: "Modelo salvo", description: "Ele aparece em Meus modelos nas próximas receitas." });
    setName("");
    setSaveOpen(false);
    load();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Library className="h-4 w-4 mr-2" />
            Meus modelos
            <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
            {templates.length ? "Mais usados primeiro" : "Nenhum modelo ainda"}
          </DropdownMenuLabel>
          {templates.length === 0 && (
            <p className="px-2 pb-2 text-xs text-muted-foreground">
              Preencha uma receita que você repete muito e toque em "Salvar como modelo".
            </p>
          )}
          {templates.map((t) => (
            <DropdownMenuItem key={t.id} onSelect={() => apply(t)} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {t.medications.map((m) => m.name).join(" · ")}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Excluir modelo ${t.name}`}
                className="p-1 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  remove(t);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuItem>
          ))}
          {templates.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuItem disabled={filled.length === 0} onSelect={() => setSaveOpen(true)}>
            <BookmarkPlus className="h-4 w-4 mr-2" />
            Salvar receita atual como modelo
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar como modelo</DialogTitle>
            <DialogDescription>
              Salva {filled.length} medicamento(s) e as observações. Dados do paciente não entram no modelo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="template-name">Nome do modelo</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: IVAS adulto, Lombalgia aguda"
              maxLength={80}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={!name.trim() || saving}>Salvar modelo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

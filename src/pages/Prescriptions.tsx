import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Search, Pill, Copy, Star, Trash2, Pencil, Loader2,
} from "lucide-react";

interface LibraryEntry {
  id: string;
  title: string;
  indication: string | null;
  cid_code: string | null;
  content: string;
  tags: string[] | null;
  source: string | null;
  source_assistant: string | null;
  is_favorite: boolean;
  use_count: number;
  updated_at: string;
}

const EMPTY: Partial<LibraryEntry> = {
  title: "",
  indication: "",
  cid_code: "",
  content: "",
  tags: [],
};

export default function Prescriptions() {
  const { toast } = useToast();
  const [items, setItems] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Partial<LibraryEntry>>(EMPTY);
  const [tagsInput, setTagsInput] = useState("");

  const isEmbed = useMemo(
    () => new URLSearchParams(window.location.search).get("embed") === "1",
    []
  );

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("prescription_library")
      .select("*")
      .order("is_favorite", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar banco", description: error.message, variant: "destructive" });
    } else {
      setItems((data ?? []) as LibraryEntry[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(EMPTY);
    setTagsInput("");
    setOpen(true);
  };

  const openEdit = (it: LibraryEntry) => {
    setEditing(it);
    setTagsInput((it.tags ?? []).join(", "));
    setOpen(true);
  };

  const save = async () => {
    if (!editing.title?.trim() || !editing.content?.trim()) {
      toast({ title: "Preencha título e conteúdo", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      user_id: user.id,
      title: editing.title!.trim(),
      indication: editing.indication?.trim() || null,
      cid_code: editing.cid_code?.trim() || null,
      content: editing.content!.trim(),
      tags,
      source: editing.source || "manual",
    };

    let error;
    if (editing.id) {
      ({ error } = await supabase.from("prescription_library").update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("prescription_library").insert(payload));
    }

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    toast({ title: editing.id ? "Atualizado" : "Adicionado ao banco" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover do banco?")) return;
    const { error } = await supabase.from("prescription_library").delete().eq("id", id);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    load();
  };

  const toggleFav = async (it: LibraryEntry) => {
    await supabase.from("prescription_library").update({ is_favorite: !it.is_favorite }).eq("id", it.id);
    load();
  };

  const copyContent = async (it: LibraryEntry) => {
    await navigator.clipboard.writeText(it.content);
    await supabase.from("prescription_library").update({ use_count: it.use_count + 1 }).eq("id", it.id);
    toast({ title: "Copiado para a área de transferência" });
  };

  const filtered = items.filter((it) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      it.title.toLowerCase().includes(q) ||
      (it.indication ?? "").toLowerCase().includes(q) ||
      (it.cid_code ?? "").toLowerCase().includes(q) ||
      (it.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
      it.content.toLowerCase().includes(q)
    );
  });

  return (
    <div className={isEmbed ? "space-y-4" : "space-y-6"}>
      {!isEmbed && (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Banco de Prescrições</h1>
            <p className="text-muted-foreground">
              Seu acervo pessoal — guarde modelos prontos para reutilizar quando precisar.
            </p>
          </div>
          <Button onClick={openNew} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Nova entrada
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por título, indicação, CID, etiqueta…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isEmbed && (
            <Button onClick={openNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova
            </Button>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={Pill}
              title={search ? "Nada encontrado" : "Seu banco está vazio"}
              description={
                search
                  ? "Tente outro termo."
                  : "Adicione modelos manualmente ou salve direto das respostas dos assistentes."
              }
              actionLabel={search ? undefined : "Adicionar primeira entrada"}
              actionIcon={search ? undefined : Plus}
              onAction={search ? undefined : openNew}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((it) => (
            <Card key={it.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {it.is_favorite && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
                      <span className="truncate">{it.title}</span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
                      {it.indication && <span>{it.indication}</span>}
                      {it.cid_code && <Badge variant="outline" className="text-[10px]">CID {it.cid_code}</Badge>}
                      {it.use_count > 0 && <span>· {it.use_count}× usado</span>}
                      {it.source_assistant && <Badge variant="secondary" className="text-[10px]">via {it.source_assistant}</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleFav(it)} title="Favoritar">
                      <Star className={`h-4 w-4 ${it.is_favorite ? "fill-amber-500 text-amber-500" : ""}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(it)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => remove(it.id)} title="Remover">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground line-clamp-4">{it.content}</pre>
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <div className="flex flex-wrap gap-1">
                    {(it.tags ?? []).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                  <Button size="sm" onClick={() => copyContent(it)}>
                    <Copy className="h-3.5 w-3.5 mr-2" /> Copiar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar entrada" : "Nova entrada no banco"}</DialogTitle>
            <DialogDescription>
              Modelo livre. Use como receita pronta, esquema terapêutico, lembrete de doses, etc.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="t">Título *</Label>
              <Input id="t" value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Ex.: Pneumonia comunitária — adulto" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="ind">Indicação</Label>
                <Input id="ind" value={editing.indication ?? ""} onChange={(e) => setEditing({ ...editing, indication: e.target.value })}
                  placeholder="Ex.: PAC sem critérios de UTI" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cid">CID</Label>
                <Input id="cid" value={editing.cid_code ?? ""} onChange={(e) => setEditing({ ...editing, cid_code: e.target.value })}
                  placeholder="Ex.: J18.9" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="c">Conteúdo *</Label>
              <Textarea id="c" rows={10} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder={"1) Amoxicilina + Clavulanato 875+125 mg, 1 cp VO 12/12h por 7 dias\n2) Sintomáticos s/n\n..."} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tg">Etiquetas (separadas por vírgula)</Label>
              <Input id="tg" value={tagsInput} onChange={(e) => setTagsInput(e.target.value)}
                placeholder="pneumologia, adulto, ambulatorial" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

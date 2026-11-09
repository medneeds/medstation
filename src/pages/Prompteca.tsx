import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bot, Copy, Library, Loader2, Play, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAdminRole } from "@/hooks/useAdminRole";
import {
  DEFAULT_STUDIO_MODEL, createThread, isStudioModel, saveAssistant, setStudioEnabled, useStudioStore,
} from "@/lib/studio";
import { PROMPTECA_CATEGORIES, STUDIO_PREFILL_KEY, categoryLabel, matchesSearch } from "@/lib/prompteca";
import {
  DetailDialog, EMPTY_PUBLISH, KindBadge, PublishDialog, RatingLine, type PromptecaItem, type PublishValue,
} from "@/components/prompteca/PromptecaDialogs";

type Tab = "all" | "assistant" | "prompt" | "mine";
type Sort = "rating" | "uses" | "recent";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "assistant", label: "Assistentes" },
  { id: "prompt", label: "Prompts" },
  { id: "mine", label: "Meus publicados" },
];

export default function Prompteca() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { assistants } = useStudioStore();
  const { isStaff } = useAdminRole();
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<PromptecaItem[]>([]);
  const [myRatings, setMyRatings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [sort, setSort] = useState<Sort>("rating");
  const [category, setCategory] = useState<string>("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [publishing, setPublishing] = useState<PublishValue | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    const [{ data, error }, { data: ratings }] = await Promise.all([
      supabase.from("prompt_library_items").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("prompt_library_ratings").select("item_id, stars"),
    ]);
    if (error) toast.error("Não consegui abrir a Prompteca. Tente de novo.");
    setItems(data ?? []);
    setMyRatings(Object.fromEntries((ratings ?? []).map((r) => [r.item_id, r.stars])));
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Atalho vindo do Studio: /prompteca?publicar=<id do assistente>
  useEffect(() => {
    const id = params.get("publicar");
    if (id === null) return;
    const a = assistants.find((x) => x.id === id);
    setPublishing(a
      ? { ...EMPTY_PUBLISH, kind: "assistant", title: a.name, content: a.instructions, model: a.model }
      : { ...EMPTY_PUBLISH });
    params.delete("publicar");
    setParams(params, { replace: true });
  }, [params, setParams, assistants]);

  const visible = useMemo(() => {
    const list = items.filter((i) => {
      if (tab === "mine") { if (i.author_id !== userId) return false; }
      else if (i.hidden) return false;
      if (tab === "assistant" && i.kind !== "assistant") return false;
      if (tab === "prompt" && i.kind !== "prompt") return false;
      if (category && i.category !== category) return false;
      return matchesSearch(i, query);
    });
    const by: Record<Sort, (a: PromptecaItem, b: PromptecaItem) => number> = {
      rating: (a, b) => Number(b.rating_avg) - Number(a.rating_avg) || b.rating_count - a.rating_count || b.use_count - a.use_count,
      uses: (a, b) => b.use_count - a.use_count || Number(b.rating_avg) - Number(a.rating_avg),
      recent: (a, b) => b.created_at.localeCompare(a.created_at),
    };
    return [...list].sort(by[sort]);
  }, [items, tab, category, query, sort, userId]);

  const open = items.find((i) => i.id === openId) ?? null;

  const patchItem = (id: string, patch: Partial<PromptecaItem>) =>
    setItems((list) => list.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const countUse = (item: PromptecaItem) => {
    if (item.author_id === userId) return;
    patchItem(item.id, { use_count: item.use_count + 1 });
    void supabase.rpc("prompt_library_count_use", { p_item: item.id });
  };

  const copy = async (item: PromptecaItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success("Copiado. Cole onde quiser.");
      countUse(item);
    } catch {
      toast.error("Não consegui copiar. Abra o prompt e selecione o texto.");
    }
  };

  const use = (item: PromptecaItem) => {
    setStudioEnabled(true);
    countUse(item);
    if (item.kind === "assistant") {
      const a = saveAssistant({
        name: item.title.slice(0, 60),
        instructions: item.content,
        model: isStudioModel(item.model) ? item.model : DEFAULT_STUDIO_MODEL,
      });
      toast.success(`${a.name} entrou nos seus assistentes.`);
      navigate(`/studio/${createThread(a).id}`);
    } else {
      sessionStorage.setItem(STUDIO_PREFILL_KEY, item.content);
      navigate(`/studio/${createThread().id}`);
    }
  };

  const rate = async (item: PromptecaItem, stars: number) => {
    if (!userId) return;
    const prev = myRatings[item.id];
    setMyRatings((r) => ({ ...r, [item.id]: stars }));
    const { error } = await supabase.from("prompt_library_ratings")
      .upsert({ item_id: item.id, user_id: userId, stars, updated_at: new Date().toISOString() }, { onConflict: "item_id,user_id" });
    if (error) {
      setMyRatings((r) => ({ ...r, [item.id]: prev ?? 0 }));
      toast.error("Não consegui salvar sua avaliação.");
      return;
    }
    toast.success("Obrigado pela avaliação.");
    const { data } = await supabase.from("prompt_library_items").select("*").eq("id", item.id).maybeSingle();
    if (data) patchItem(item.id, data);
  };

  const submit = async (v: PublishValue) => {
    if (!userId) return;
    setSaving(true);
    const row = {
      kind: v.kind,
      title: v.title.trim(),
      description: v.description.trim(),
      content: v.content.trim(),
      category: v.category,
      model: v.kind === "assistant" ? v.model : null,
    };
    const res = v.id
      ? await supabase.from("prompt_library_items").update(row).eq("id", v.id).select("*").single()
      : await supabase.from("prompt_library_items").insert({ ...row, author_id: userId }).select("*").single();
    setSaving(false);
    if (res.error || !res.data) { toast.error("Não consegui publicar. Tente de novo."); return; }
    const saved = res.data;
    setItems((list) => (v.id ? list.map((i) => (i.id === saved.id ? saved : i)) : [saved, ...list]));
    setPublishing(null);
    setOpenId(saved.id);
    toast.success(v.id ? "Alterações salvas." : "Publicado na Prompteca.");
  };

  const remove = async (item: PromptecaItem) => {
    if (!confirm(`Excluir "${item.title}" da Prompteca? As avaliações também saem.`)) return;
    const { error } = await supabase.from("prompt_library_items").delete().eq("id", item.id);
    if (error) { toast.error("Não consegui excluir."); return; }
    setItems((list) => list.filter((i) => i.id !== item.id));
    setOpenId(null);
    toast.success("Excluído.");
  };

  const toggleHidden = async (item: PromptecaItem) => {
    const { error } = await supabase.rpc("prompt_library_set_hidden", { p_item: item.id, p_hidden: !item.hidden });
    if (error) { toast.error("Não consegui alterar."); return; }
    patchItem(item.id, { hidden: !item.hidden });
    toast.success(item.hidden ? "Voltou para a Prompteca." : "Retirado da Prompteca.");
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Library className="h-5 w-5" /></span>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Prompteca</h1>
          </div>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Prompts e assistentes criados por médicos da MedStation. Copie, use no Studio e avalie os que ajudaram você.
          </p>
        </div>
        <Button className="gap-1.5" onClick={() => setPublishing({ ...EMPTY_PUBLISH })}><Plus className="h-4 w-4" /> Publicar</Button>
      </header>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)}
                className={cn("rounded-md px-3 py-1.5 text-sm transition-colors",
                  tab === t.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por tema, autor ou palavra..." className="pl-9" />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-[190px]" aria-label="Ordenar"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Mais bem avaliados</SelectItem>
              <SelectItem value="uses">Mais usados</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {[{ id: "", label: "Todas" }, ...PROMPTECA_CATEGORIES].map((c) => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)}
              className={cn("shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                category === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo a Prompteca...</div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
          <Library className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {tab === "mine" ? "Você ainda não publicou nada." : items.length === 0 ? "A Prompteca está começando." : "Nada encontrado com esses filtros."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Compartilhe um prompt ou assistente que funciona na sua rotina.</p>
          <Button variant="outline" className="mt-4 gap-1.5" onClick={() => setPublishing({ ...EMPTY_PUBLISH })}><Plus className="h-4 w-4" /> Publicar o primeiro</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((item) => (
            <article key={item.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40">
              <button type="button" className="flex flex-1 flex-col text-left" onClick={() => setOpenId(item.id)}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <KindBadge kind={item.kind} />
                  <span className="text-2xs text-muted-foreground">{categoryLabel(item.category)}</span>
                  {item.hidden && <Badge variant="destructive" className="text-2xs">Retirado</Badge>}
                </div>
                <h2 className="mt-2 line-clamp-2 font-semibold text-foreground group-hover:text-primary">{item.title}</h2>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.description || item.content}</p>
                <p className="mt-3 truncate text-xs text-foreground/80">
                  {item.author_name} <span className="text-muted-foreground">· {item.author_specialty}</span>
                </p>
                <div className="mt-1.5"><RatingLine item={item} /></div>
              </button>
              <div className="mt-3 flex gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => copy(item)}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
                <Button size="sm" className="flex-1 gap-1.5" onClick={() => use(item)}>
                  {item.kind === "assistant" ? <Bot className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} Usar
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <DetailDialog
        item={open}
        myStars={open ? myRatings[open.id] ?? 0 : 0}
        isMine={!!open && open.author_id === userId}
        isStaff={isStaff}
        onClose={() => setOpenId(null)}
        onCopy={copy}
        onUse={use}
        onRate={rate}
        onEdit={(i) => {
          setOpenId(null);
          setPublishing({ id: i.id, kind: i.kind as PublishValue["kind"], title: i.title, description: i.description, content: i.content, category: i.category, model: i.model ?? DEFAULT_STUDIO_MODEL });
        }}
        onDelete={remove}
        onToggleHidden={toggleHidden}
      />
      <PublishDialog value={publishing} assistants={assistants} saving={saving} onClose={() => setPublishing(null)} onSubmit={submit} />
    </div>
  );
}

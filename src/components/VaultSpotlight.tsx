import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Vault, Star, Folder, Plus, Upload, FileText, StickyNote, ArrowRight } from "lucide-react";

type Fav = { id: string; name: string; is_favorite: boolean };
type Recent = { id: string; title: string; kind: "note" | "file"; at: string };

export function VaultSpotlight() {
  const navigate = useNavigate();
  const [folders, setFolders] = useState<Fav[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [f, n, fl, nc, fc] = await Promise.all([
        supabase.from("vault_folders").select("id,name,is_favorite").eq("user_id", user.id)
          .order("is_favorite", { ascending: false }).order("sort_order").limit(6),
        supabase.from("notes").select("id,title,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(4),
        supabase.from("vault_files").select("id,name,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(4),
        supabase.from("notes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("vault_files").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setFolders((f.data as Fav[]) || []);
      setTotal((nc.count || 0) + (fc.count || 0));
      setRecent(
        [
          ...(n.data || []).map((x) => ({ id: x.id, title: x.title || "Sem título", kind: "note" as const, at: x.updated_at })),
          ...(fl.data || []).map((x) => ({ id: x.id, title: x.name, kind: "file" as const, at: x.created_at })),
        ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4),
      );
    })();
  }, []);

  const createNote = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("notes").insert({ user_id: user.id, title: "Nova Nota", content: "" }).select("id").single();
    if (data) navigate(`/notes/${data.id}`);
  };

  return (
    <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/15 p-2 md:p-3 text-primary">
            <Vault className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-xl font-bold leading-tight">Cofre Inteligente</h2>
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="hidden md:inline">Condutas, notas e arquivos guardados com segurança, sempre à mão no plantão.</span>
              <span className="md:hidden">Suas condutas e arquivos à mão no plantão.</span>
              {total !== null && <span className="ml-1 font-medium text-foreground">{total} itens guardados.</span>}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
          <Button size="sm" onClick={createNote} className="px-2 md:px-3"><Plus className="mr-1 md:mr-1.5 h-4 w-4" /> Nova nota</Button>
          <Button size="sm" variant="outline" asChild className="px-2 md:px-3">
            <Link to="/notes"><Upload className="mr-1 md:mr-1.5 h-4 w-4" /> <span className="md:hidden">Arquivo</span><span className="hidden md:inline">Enviar arquivo</span></Link>
          </Button>
          <Button size="sm" variant="ghost" asChild className="px-2 md:px-3">
            <Link to="/notes"><span className="md:hidden">Abrir</span><span className="hidden md:inline">Abrir o Cofre</span> <ArrowRight className="ml-1 md:ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 md:mt-5 grid gap-3 md:gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <p className="label-mono mb-2 text-muted-foreground">Pastas</p>
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crie pastas e marque as favoritas com a estrela para vê-las aqui.</p>
          ) : (
            <div className="-mx-1 flex gap-2 overflow-x-auto no-scrollbar px-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0">
              {folders.map((f) => (
                <Link key={f.id} to="/notes" className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg border bg-card px-3 py-1.5 md:py-2 text-sm hover:border-primary/60">
                  {f.is_favorite ? <Star className="h-4 w-4 fill-primary text-primary shrink-0" /> : <Folder className="h-4 w-4 text-primary shrink-0" />}
                  <span className="truncate">{f.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="label-mono mb-2 text-muted-foreground">Últimos guardados</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Use "Salvar no Cofre" nas respostas dos assistentes para guardar condutas em um clique.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {recent.map((r, i) => (
                <li key={`${r.kind}-${r.id}`} className={i >= 3 ? "hidden md:block" : undefined}>
                  <Link to={r.kind === "note" ? `/notes/${r.id}` : "/notes"} className="flex min-w-0 items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40">
                    {r.kind === "note" ? <StickyNote className="h-4 w-4 text-primary shrink-0" /> : <FileText className="h-4 w-4 text-primary shrink-0" />}
                    <span className="truncate">{r.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

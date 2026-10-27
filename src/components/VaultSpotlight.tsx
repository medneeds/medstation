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
          <div className="rounded-xl bg-primary/15 p-3 text-primary">
            <Vault className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold">Cofre Inteligente</h2>
            <p className="text-sm text-muted-foreground">
              Condutas, notas e arquivos guardados com segurança, sempre à mão no plantão.
              {total !== null && <span className="ml-1 font-medium text-foreground">{total} itens guardados.</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={createNote}><Plus className="mr-1.5 h-4 w-4" /> Nova nota</Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/notes"><Upload className="mr-1.5 h-4 w-4" /> Enviar arquivo</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link to="/notes">Abrir o Cofre <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="label-mono mb-2 text-muted-foreground">Pastas</p>
          {folders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Crie pastas e marque as favoritas com a estrela para vê-las aqui.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {folders.map((f) => (
                <Link key={f.id} to="/notes" className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm hover:border-primary/60">
                  {f.is_favorite ? <Star className="h-4 w-4 fill-primary text-primary shrink-0" /> : <Folder className="h-4 w-4 text-primary shrink-0" />}
                  <span className="truncate">{f.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="label-mono mb-2 text-muted-foreground">Últimos guardados</p>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Use "Salvar no Cofre" nas respostas dos assistentes para guardar condutas em um clique.</p>
          ) : (
            <ul className="divide-y rounded-lg border bg-card">
              {recent.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link to={r.kind === "note" ? `/notes/${r.id}` : "/notes"} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40">
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

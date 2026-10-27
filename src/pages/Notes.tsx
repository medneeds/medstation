import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus, Search, Pin, Trash2, Clock, StickyNote, Star, Folder, FolderPlus, Vault, Layers,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface VaultFolder {
  id: string;
  name: string;
  color: string;
  is_favorite: boolean;
  sort_order: number;
}

export default function Notes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | "all">("all");
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [n, f] = await Promise.all([
        supabase.from("notes").select("*").eq("user_id", user.id)
          .order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
        supabase.from("vault_folders").select("*").eq("user_id", user.id)
          .order("is_favorite", { ascending: false }).order("sort_order").order("created_at"),
      ]);
      if (n.error) throw n.error;
      if (f.error) throw f.error;
      setNotes((n.data as Note[]) || []);
      setFolders((f.data as VaultFolder[]) || []);
    } catch (error: any) {
      toast({ title: "Erro ao abrir o Cofre", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const createNewNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("notes").insert({
        user_id: user.id, title: "Nova Nota", content: "",
        folder_id: activeFolder === "all" ? null : activeFolder,
      }).select().single();
      if (error) throw error;
      navigate(`/notes/${data.id}`);
    } catch (error: any) {
      toast({ title: "Erro ao criar nota", description: error.message, variant: "destructive" });
    }
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("vault_folders")
        .insert({ user_id: user.id, name: name.slice(0, 60), sort_order: folders.length })
        .select().single();
      if (error) throw error;
      setFolders((prev) => [...prev, data as VaultFolder]);
      setNewFolderName("");
      setNewFolderOpen(false);
      toast({ title: "Pasta criada" });
    } catch (error: any) {
      toast({ title: "Erro ao criar pasta", description: error.message, variant: "destructive" });
    }
  };

  const toggleFavorite = async (folder: VaultFolder) => {
    const next = !folder.is_favorite;
    setFolders((prev) => prev.map((f) => (f.id === folder.id ? { ...f, is_favorite: next } : f)));
    const { error } = await supabase.from("vault_folders").update({ is_favorite: next }).eq("id", folder.id);
    if (error) toast({ title: "Erro ao favoritar", description: error.message, variant: "destructive" });
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    const { error } = await supabase.from("notes").update({ pinned: !currentPinned }).eq("id", noteId);
    if (error) return toast({ title: "Erro ao fixar nota", description: error.message, variant: "destructive" });
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, pinned: !currentPinned } : n)));
  };

  const moveNote = async (noteId: string, folderId: string | null) => {
    const { error } = await supabase.from("notes").update({ folder_id: folderId }).eq("id", noteId);
    if (error) return toast({ title: "Erro ao mover nota", description: error.message, variant: "destructive" });
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, folder_id: folderId } : n)));
  };

  const deleteNote = async () => {
    if (!noteToDelete) return;
    const { error } = await supabase.from("notes").delete().eq("id", noteToDelete);
    if (error) toast({ title: "Erro ao excluir nota", description: error.message, variant: "destructive" });
    else setNotes((prev) => prev.filter((n) => n.id !== noteToDelete));
    setNoteToDelete(null);
  };

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => Number(b.is_favorite) - Number(a.is_favorite) || a.sort_order - b.sort_order),
    [folders],
  );
  const countFor = (id: string) => notes.filter((n) => n.folder_id === id).length;
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;

  const q = searchQuery.toLowerCase();
  const filteredNotes = notes.filter(
    (n) =>
      (activeFolder === "all" || n.folder_id === activeFolder) &&
      (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
  );

  const getPreviewText = (content: string) => {
    const s = content.replace(/<[^>]*>/g, "").trim();
    return s.length > 140 ? s.substring(0, 140) + "..." : s;
  };

  const formatDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), days = Math.floor(diff / 86400000);
    if (m < 1) return "Agora";
    if (m < 60) return `${m}min atrás`;
    if (h < 24) return `${h}h atrás`;
    if (days < 7) return `${days}d atrás`;
    return new Date(d).toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <Vault className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Cofre Inteligente</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Suas notas, condutas e anotações organizadas em pastas
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" /> Nova pasta
          </Button>
          <Button size="sm" onClick={createNewNote}>
            <Plus className="mr-2 h-4 w-4" /> Nova nota
          </Button>
        </div>
      </div>

      {/* Painel de pastas */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveFolder("all")}
          className={cn(
            "rounded-xl border p-4 text-left transition-all hover:border-primary/60 hover:shadow-sm",
            activeFolder === "all" ? "border-primary bg-primary/10" : "bg-card",
          )}
        >
          <Layers className="h-5 w-5 text-primary mb-3" />
          <div className="font-semibold text-sm">Todas as notas</div>
          <div className="text-xs text-muted-foreground">{notes.length} itens</div>
        </button>
        {sortedFolders.map((f) => (
          <div
            key={f.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveFolder(f.id)}
            onKeyDown={(e) => e.key === "Enter" && setActiveFolder(f.id)}
            className={cn(
              "group relative cursor-pointer rounded-xl border p-4 text-left transition-all hover:border-primary/60 hover:shadow-sm",
              activeFolder === f.id ? "border-primary bg-primary/10" : "bg-card",
              f.is_favorite && activeFolder !== f.id && "border-primary/30",
            )}
          >
            <button
              type="button"
              aria-label={f.is_favorite ? "Remover dos favoritos" : "Favoritar pasta"}
              onClick={(e) => { e.stopPropagation(); toggleFavorite(f); }}
              className="absolute right-2 top-2 rounded-md p-1 hover:bg-primary/10"
            >
              <Star className={cn("h-4 w-4", f.is_favorite ? "fill-primary text-primary" : "text-muted-foreground")} />
            </button>
            <Folder className="h-5 w-5 text-primary mb-3" />
            <div className="font-semibold text-sm line-clamp-1 pr-6">{f.name}</div>
            <div className="text-xs text-muted-foreground">{countFor(f.id)} itens</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar no Cofre..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista unificada */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={StickyNote}
              title={searchQuery ? "Nada por aqui com esse termo" : "Nenhuma nota aqui ainda"}
              description={searchQuery ? "Tente outras palavras-chave." : "Guarde condutas, lembretes e rascunhos clínicos em segundos."}
              actionLabel={searchQuery ? undefined : "Criar nota"}
              actionIcon={searchQuery ? undefined : Plus}
              onAction={searchQuery ? undefined : createNewNote}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              onClick={() => navigate(`/notes/${note.id}`)}
              className="group flex cursor-pointer flex-col gap-2 p-3 md:flex-row md:items-center md:gap-4 md:p-4 hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {note.pinned && <Pin className="h-3.5 w-3.5 fill-primary text-primary shrink-0" />}
                  <h3 className="font-semibold text-sm md:text-base line-clamp-1">{note.title || "Sem título"}</h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                  {getPreviewText(note.content) || "Nota vazia"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {folderName(note.folder_id) && activeFolder === "all" && (
                  <Badge variant="secondary" className="text-xs">{folderName(note.folder_id)}</Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatDate(note.updated_at)}
                </span>
                <Select value={note.folder_id ?? "none"} onValueChange={(v) => moveNote(note.id, v === "none" ? null : v)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Mover para pasta">
                    <SelectValue placeholder="Mover" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem pasta</SelectItem>
                    {sortedFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => togglePin(note.id, note.pinned)} aria-label="Fixar">
                  <Pin className={cn("h-4 w-4", note.pinned && "fill-primary text-primary")} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setNoteToDelete(note.id)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova pasta</DialogTitle></DialogHeader>
          <Input
            autoFocus
            placeholder="Ex.: Antibioticoterapia"
            value={newFolderName}
            maxLength={60}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createFolder()}
          />
          <DialogFooter>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>Criar pasta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!noteToDelete} onOpenChange={(o) => !o && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

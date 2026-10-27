import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { VAULT_BUCKET, VAULT_MAX_FILE_BYTES, vaultStoragePath } from "@/lib/vault";
import {
  Plus, Search, Pin, Trash2, Clock, StickyNote, Star, Folder, FolderPlus, Vault, Layers, Upload, FileText, Image as ImageIcon, Paperclip,
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FolderInput } from "lucide-react";

/** Celular: mover, fixar e excluir reunidos num único botão "⋯" por item. */
function MobileItemMenu({
  folders, folderId, pinned, onMove, onTogglePin, onDelete,
}: {
  folders: { id: string; name: string }[];
  folderId: string | null;
  pinned: boolean;
  onMove: (folderId: string | null) => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden" aria-label="Opções do item">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={onTogglePin}>
          <Pin className={cn("mr-2 h-4 w-4", pinned && "fill-primary text-primary")} />
          {pinned ? "Desafixar" : "Fixar no topo"}
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <FolderInput className="mr-2 h-4 w-4" /> Mover para pasta
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="max-h-72 overflow-y-auto">
            <DropdownMenuRadioGroup value={folderId ?? "none"} onValueChange={(v) => onMove(v === "none" ? null : v)}>
              <DropdownMenuRadioItem value="none">Sem pasta</DropdownMenuRadioItem>
              {folders.map((f) => <DropdownMenuRadioItem key={f.id} value={f.id}>{f.name}</DropdownMenuRadioItem>)}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}

interface VaultFile {
  id: string;
  name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder_id: string | null;
  pinned: boolean;
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
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [fileToDelete, setFileToDelete] = useState<VaultFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [n, f, fl] = await Promise.all([
        supabase.from("notes").select("*").eq("user_id", user.id)
          .order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
        supabase.from("vault_folders").select("*").eq("user_id", user.id)
          .order("is_favorite", { ascending: false }).order("sort_order").order("created_at"),
        supabase.from("vault_files").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (!fl.error) setFiles((fl.data as VaultFile[]) || []);
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

  const uploadFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUploading(true);
    const folderId = activeFolder === "all" ? null : activeFolder;
    for (const file of Array.from(list)) {
      if (file.size > VAULT_MAX_FILE_BYTES) {
        toast({ title: `${file.name} é maior que 50 MB`, variant: "destructive" });
        continue;
      }
      const path = vaultStoragePath(user.id, file.name);
      const up = await supabase.storage.from(VAULT_BUCKET).upload(path, file, { contentType: file.type || undefined });
      if (up.error) {
        toast({ title: `Erro ao enviar ${file.name}`, description: up.error.message, variant: "destructive" });
        continue;
      }
      const { data, error } = await supabase.from("vault_files").insert({
        user_id: user.id, folder_id: folderId, name: file.name.slice(0, 200), storage_path: path,
        mime_type: file.type || null, size_bytes: file.size,
      }).select().single();
      if (error) toast({ title: `Erro ao registrar ${file.name}`, description: error.message, variant: "destructive" });
      else setFiles((prev) => [data as VaultFile, ...prev]);
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const openFile = async (file: VaultFile) => {
    const win = window.open("", "_blank");
    const { data, error } = await supabase.storage.from(VAULT_BUCKET).createSignedUrl(file.storage_path, 300);
    if (error || !data) {
      win?.close();
      return toast({ title: "Não foi possível abrir o arquivo", variant: "destructive" });
    }
    if (win) win.location.href = data.signedUrl; else window.location.href = data.signedUrl;
  };

  const moveFile = async (id: string, folderId: string | null) => {
    const { error } = await supabase.from("vault_files").update({ folder_id: folderId }).eq("id", id);
    if (error) return toast({ title: "Erro ao mover arquivo", variant: "destructive" });
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, folder_id: folderId } : f)));
  };

  const toggleFilePin = async (file: VaultFile) => {
    const { error } = await supabase.from("vault_files").update({ pinned: !file.pinned }).eq("id", file.id);
    if (!error) setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, pinned: !file.pinned } : f)));
  };

  const deleteFile = async () => {
    if (!fileToDelete) return;
    await supabase.storage.from(VAULT_BUCKET).remove([fileToDelete.storage_path]);
    const { error } = await supabase.from("vault_files").delete().eq("id", fileToDelete.id);
    if (error) toast({ title: "Erro ao excluir arquivo", variant: "destructive" });
    else setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
    setFileToDelete(null);
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
  const countFor = (id: string) =>
    notes.filter((n) => n.folder_id === id).length + files.filter((f) => f.folder_id === id).length;
  const folderName = (id: string | null) => folders.find((f) => f.id === id)?.name;

  const q = searchQuery.toLowerCase();
  const filteredNotes = notes.filter(
    (n) =>
      (activeFolder === "all" || n.folder_id === activeFolder) &&
      (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)),
  );

  const filteredFiles = files.filter(
    (f) => (activeFolder === "all" || f.folder_id === activeFolder) && f.name.toLowerCase().includes(q),
  );
  type Item = { kind: "note"; data: Note } | { kind: "file"; data: VaultFile };
  const items: Item[] = [
    ...filteredNotes.map((d) => ({ kind: "note" as const, data: d })),
    ...filteredFiles.map((d) => ({ kind: "file" as const, data: d })),
  ].sort((a, b) => Number(b.data.pinned) - Number(a.data.pinned) || b.data.updated_at.localeCompare(a.data.updated_at));
  const formatSize = (b: number | null) =>
    !b ? "" : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2 md:p-2.5 text-primary">
            <Vault className="h-5 w-5 md:h-6 md:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold tracking-tight leading-tight">Cofre Inteligente</h1>
            <p className="text-xs md:text-base text-muted-foreground">
              Suas notas, condutas e arquivos organizados em pastas
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex">
          <Button variant="outline" size="sm" className="px-2 md:px-3" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="mr-1 md:mr-2 h-4 w-4" /> <span className="md:hidden">Pasta</span><span className="hidden md:inline">Nova pasta</span>
          </Button>
          <input ref={fileInput} type="file" multiple hidden accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={(e) => uploadFiles(e.target.files)} />
          <Button variant="outline" size="sm" className="px-2 md:px-3" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <Upload className="mr-1 md:mr-2 h-4 w-4" /> {uploading ? "Enviando..." : <><span className="md:hidden">Arquivo</span><span className="hidden md:inline">Enviar arquivo</span></>}
          </Button>
          <Button size="sm" className="px-2 md:px-3" onClick={createNewNote}>
            <Plus className="mr-1 md:mr-2 h-4 w-4" /> Nova nota
          </Button>
        </div>
      </div>

      {/* Painel de pastas: no celular, faixa deslizante; no computador, grade */}
      <div className="-mx-4 flex gap-2 overflow-x-auto no-scrollbar px-4 md:mx-0 md:grid md:gap-3 md:overflow-visible md:px-0 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        <button
          type="button"
          onClick={() => setActiveFolder("all")}
          className={cn(
            "w-36 shrink-0 md:w-auto rounded-xl border p-3 md:p-4 text-left transition-all hover:border-primary/60 hover:shadow-sm",
            activeFolder === "all" ? "border-primary bg-primary/10" : "bg-card",
          )}
        >
          <Layers className="h-5 w-5 text-primary mb-2 md:mb-3" />
          <div className="font-semibold text-sm">Todas as notas</div>
          <div className="text-xs text-muted-foreground">{notes.length + files.length} itens</div>
        </button>
        {sortedFolders.map((f) => (
          <div
            key={f.id}
            role="button"
            tabIndex={0}
            onClick={() => setActiveFolder(f.id)}
            onKeyDown={(e) => e.key === "Enter" && setActiveFolder(f.id)}
            className={cn(
              "group relative w-36 shrink-0 md:w-auto cursor-pointer rounded-xl border p-3 md:p-4 text-left transition-all hover:border-primary/60 hover:shadow-sm",
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
            <Folder className="h-5 w-5 text-primary mb-2 md:mb-3" />
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
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={StickyNote}
              title={searchQuery ? "Nada por aqui com esse termo" : "Nada guardado aqui ainda"}
              description={searchQuery ? "Tente outras palavras-chave." : "Guarde condutas, lembretes, PDFs e imagens em segundos."}
              actionLabel={searchQuery ? undefined : "Criar nota"}
              actionIcon={searchQuery ? undefined : Plus}
              onAction={searchQuery ? undefined : createNewNote}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {items.map((item) => item.kind === "file" ? (
            <div
              key={`f-${item.data.id}`}
              onClick={() => openFile(item.data)}
              className="group flex cursor-pointer items-center gap-2 p-3 md:gap-4 md:p-4 hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {item.data.pinned && <Pin className="h-3.5 w-3.5 fill-primary text-primary shrink-0" />}
                  {item.data.mime_type?.startsWith("image/") ? <ImageIcon className="h-4 w-4 text-primary shrink-0" /> : item.data.mime_type === "application/pdf" ? <FileText className="h-4 w-4 text-primary shrink-0" /> : <Paperclip className="h-4 w-4 text-primary shrink-0" />}
                  <h3 className="font-semibold text-sm md:text-base line-clamp-1">{item.data.name}</h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground truncate">
                  Arquivo {formatSize(item.data.size_bytes)}
                  <span className="md:hidden">
                    {folderName(item.data.folder_id) && activeFolder === "all" && <> · {folderName(item.data.folder_id)}</>} · {formatDate(item.data.created_at)}
                  </span>
                </p>
              </div>
              <div className="shrink-0 md:hidden" onClick={(e) => e.stopPropagation()}>
                <MobileItemMenu
                  folders={sortedFolders}
                  folderId={item.data.folder_id}
                  pinned={item.data.pinned}
                  onMove={(id) => moveFile(item.data.id, id)}
                  onTogglePin={() => toggleFilePin(item.data)}
                  onDelete={() => setFileToDelete(item.data)}
                />
              </div>
              <div className="hidden md:flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                {folderName(item.data.folder_id) && activeFolder === "all" && (
                  <Badge variant="secondary" className="text-xs">{folderName(item.data.folder_id)}</Badge>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" /> {formatDate(item.data.created_at)}
                </span>
                <Select value={item.data.folder_id ?? "none"} onValueChange={(v) => moveFile(item.data.id, v === "none" ? null : v)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs" aria-label="Mover para pasta"><SelectValue placeholder="Mover" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem pasta</SelectItem>
                    {sortedFolders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => toggleFilePin(item.data)} aria-label="Fixar">
                  <Pin className={cn("h-4 w-4", item.data.pinned && "fill-primary text-primary")} />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setFileToDelete(item.data)} aria-label="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : ((note) => (
            <div
              key={note.id}
              onClick={() => navigate(`/notes/${note.id}`)}
              className="group flex cursor-pointer items-center gap-2 p-3 md:gap-4 md:p-4 hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {note.pinned && <Pin className="h-3.5 w-3.5 fill-primary text-primary shrink-0" />}
                  <h3 className="font-semibold text-sm md:text-base line-clamp-1">{note.title || "Sem título"}</h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-1">
                  {getPreviewText(note.content) || "Nota vazia"}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80 md:hidden">
                  {folderName(note.folder_id) && activeFolder === "all" && <>{folderName(note.folder_id)} · </>}{formatDate(note.updated_at)}
                </p>
              </div>
              <div className="shrink-0 md:hidden" onClick={(e) => e.stopPropagation()}>
                <MobileItemMenu
                  folders={sortedFolders}
                  folderId={note.folder_id}
                  pinned={note.pinned}
                  onMove={(id) => moveNote(note.id, id)}
                  onTogglePin={() => togglePin(note.id, note.pinned)}
                  onDelete={() => setNoteToDelete(note.id)}
                />
              </div>
              <div className="hidden md:flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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
          ))(item.data))}
        </div>
      )}

      <AlertDialog open={!!fileToDelete} onOpenChange={(o) => !o && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
            <AlertDialogDescription>{fileToDelete?.name} será removido do Cofre. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteFile} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

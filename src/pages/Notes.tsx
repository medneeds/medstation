import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Clock,
  StickyNote,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export default function Notes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar notas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createNewNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: "Nova Nota",
          content: "",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Nota criada",
        description: "Nova nota adicionada com sucesso",
      });

      navigate(`/notes/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao criar nota",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const togglePin = async (noteId: string, currentPinned: boolean) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({ pinned: !currentPinned })
        .eq("id", noteId);

      if (error) throw error;

      setNotes((prev) =>
        prev.map((note) =>
          note.id === noteId ? { ...note, pinned: !currentPinned } : note
        )
      );

      toast({
        title: !currentPinned ? "Nota fixada" : "Nota desfixada",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao fixar nota",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteNote = async () => {
    if (!noteToDelete) return;

    try {
      const { error } = await supabase
        .from("notes")
        .delete()
        .eq("id", noteToDelete);

      if (error) throw error;

      setNotes((prev) => prev.filter((note) => note.id !== noteToDelete));
      toast({
        title: "Nota excluída",
        description: "A nota foi removida com sucesso",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao excluir nota",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const openDeleteDialog = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPreviewText = (content: string) => {
    const stripped = content.replace(/<[^>]*>/g, "").trim();
    return stripped.length > 100 ? stripped.substring(0, 100) + "..." : stripped;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Agora";
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Notas</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Suas anotações e lembretes médicos
          </p>
        </div>
        <Button onClick={createNewNote} size="sm" className="md:size-lg w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Nota
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar notas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando notas...</p>
          </div>
        </div>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <StickyNote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery ? "Nenhuma nota encontrada" : "Nenhuma nota ainda"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Tente ajustar sua busca"
                  : "Crie sua primeira nota para começar"}
              </p>
              {!searchQuery && (
                <Button onClick={createNewNote}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Nota
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <Card
              key={note.id}
              className="hover:shadow-lg transition-all cursor-pointer group relative"
              onClick={() => navigate(`/notes/${note.id}`)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="space-y-3">
                  {/* Header with actions */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-base md:text-lg line-clamp-1 flex-1">
                      {note.title || "Sem título"}
                    </h3>
                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 md:h-8 md:w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePin(note.id, note.pinned);
                        }}
                      >
                        <Pin
                          className={`h-3 w-3 md:h-4 md:w-4 ${
                            note.pinned ? "fill-primary text-primary" : ""
                          }`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 md:h-8 md:w-8 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteDialog(note.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Preview */}
                  <p className="text-xs md:text-sm text-muted-foreground line-clamp-3 min-h-[60px]">
                    {getPreviewText(note.content) || "Nota vazia"}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(note.updated_at)}
                    </div>
                    {note.pinned && (
                      <Badge variant="secondary" className="text-xs">
                        Fixada
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A nota e todo seu histórico serão
              permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

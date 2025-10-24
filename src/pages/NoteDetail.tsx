import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Save,
  History,
  Clock,
  RotateCcw,
} from "lucide-react";
import { z } from "zod";

const noteSchema = z.object({
  title: z.string().trim().max(200, "Título muito longo"),
  content: z.string().max(50000, "Conteúdo muito longo"),
});

interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface NoteVersion {
  id: string;
  title: string;
  content: string;
  version_number: number;
  created_at: string;
}

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchNote();
    }
  }, [id]);

  const fetchNote = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Nota não encontrada",
          variant: "destructive",
        });
        navigate("/notes");
        return;
      }

      setNote(data);
      setTitle(data.title);
      setContent(data.content);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar nota",
        description: error.message,
        variant: "destructive",
      });
      navigate("/notes");
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const { data, error } = await supabase
        .from("note_versions")
        .select("*")
        .eq("note_id", id)
        .order("version_number", { ascending: false });

      if (error) throw error;
      setVersions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar histórico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const saveNote = useCallback(async () => {
    if (!note) return;

    try {
      // Validate input
      noteSchema.parse({ title, content });

      setSaving(true);

      const { error } = await supabase
        .from("notes")
        .update({
          title: title.trim() || "Sem título",
          content: content.trim(),
        })
        .eq("id", note.id);

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast({
        title: "Nota salva",
        description: "Suas alterações foram salvas com sucesso",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.issues[0]?.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao salvar nota",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  }, [note, title, content, toast]);

  const restoreVersion = async (version: NoteVersion) => {
    try {
      const { error } = await supabase
        .from("notes")
        .update({
          title: version.title,
          content: version.content,
        })
        .eq("id", id);

      if (error) throw error;

      setTitle(version.title);
      setContent(version.content);
      setHistoryDialogOpen(false);

      toast({
        title: "Versão restaurada",
        description: `Versão ${version.version_number} foi restaurada`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao restaurar versão",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleOpenHistory = () => {
    fetchVersions();
    setHistoryDialogOpen(true);
  };

  useEffect(() => {
    if (note) {
      const hasChanges =
        title !== note.title || content !== note.content;
      setHasUnsavedChanges(hasChanges);
    }
  }, [title, content, note]);

  // Auto-save every 3 seconds if there are unsaved changes
  useEffect(() => {
    if (hasUnsavedChanges && !saving) {
      const timer = setTimeout(() => {
        saveNote();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, saving, saveNote]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando nota...</p>
        </div>
      </div>
    );
  }

  if (!note) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-4xl mx-auto px-3 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/notes")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-2xl font-bold truncate">
                {title || "Sem título"}
              </h1>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Não salvo
                </Badge>
              )}
            </div>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              Atualizado em {formatDate(note.updated_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenHistory}
            disabled={versions.length === 0 && !historyDialogOpen}
            className="flex-1 sm:flex-none"
          >
            <History className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">Histórico</span>
          </Button>
          <Button
            onClick={saveNote}
            disabled={saving || !hasUnsavedChanges}
            size="sm"
            className="flex-1 sm:flex-none"
          >
            <Save className="h-4 w-4 md:mr-2" />
            <span className="hidden sm:inline">{saving ? "Salvando..." : "Salvar"}</span>
            <span className="sm:hidden">Salvar</span>
          </Button>
        </div>
      </div>

      {/* Editor */}
      <Card>
        <CardContent className="pt-4 md:pt-6 space-y-3 md:space-y-4">
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da nota"
              className="text-base md:text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0"
              maxLength={200}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Comece a escrever sua nota..."
              className="min-h-[300px] md:min-h-[500px] border-none shadow-none px-0 focus-visible:ring-0 resize-none text-sm md:text-base"
              maxLength={50000}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {content.length.toLocaleString()} / 50.000 caracteres
            </span>
            {hasUnsavedChanges && (
              <span>Salvamento automático em 3s...</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Histórico de Versões</DialogTitle>
            <DialogDescription>
              Visualize e restaure versões anteriores desta nota
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] md:h-[500px] pr-2 md:pr-4">
            {versions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Nenhuma versão anterior</p>
              </div>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {versions.map((version) => (
                  <Card key={version.id} className="overflow-hidden">
                    <CardHeader className="pb-2 md:pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm md:text-base truncate">
                            {version.title || "Sem título"}
                          </CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Versão {version.version_number}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(version.created_at)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreVersion(version)}
                          className="shrink-0 w-full sm:w-auto"
                        >
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Restaurar
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs md:text-sm text-muted-foreground line-clamp-3">
                        {version.content || "Nota vazia"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

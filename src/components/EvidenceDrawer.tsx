import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { evidenceSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, Mic, Clipboard, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface EvidenceDrawerProps {
  caseId: string;
  onEvidenceAdded: () => void;
}

export function EvidenceDrawer({ caseId, onEvidenceAdded }: EvidenceDrawerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  const { toast } = useToast();

  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  // Metadata
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [origin, setOrigin] = useState("");
  const [author, setAuthor] = useState("");
  const [documentDate, setDocumentDate] = useState("");

  const resetForm = () => {
    setFile(null);
    setTextContent("");
    setAudioBlob(null);
    setTitle("");
    setTags([]);
    setOrigin("");
    setAuthor("");
    setDocumentDate("");
    setActiveTab("upload");
  };

  const handleFileUpload = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Selecione um arquivo",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Determine file type
      let evidenceType: "audio" | "image" | "pdf" | "text" = "pdf";
      if (file.type.includes("pdf")) evidenceType = "pdf";
      else if (file.type.includes("image")) evidenceType = "image";

      // Validate evidence data before proceeding
      const validatedData = evidenceSchema.parse({
        title: title || file.name,
        case_id: caseId,
        type: evidenceType,
        tags: tags,
        origin: origin || "",
        author: author || "",
        notes: "",
        content: "",
      });

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("evidences")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create evidence record
      const { data: newEvidence, error: insertError } = await supabase
        .from("evidences")
        .insert({
          user_id: user.id,
          case_id: validatedData.case_id,
          type: validatedData.type,
          source_type: "upload",
          title: validatedData.title,
          file_path: fileName,
          file_size: file.size,
          tags: validatedData.tags.length > 0 ? validatedData.tags : null,
          origin: validatedData.origin,
          author: validatedData.author,
          document_date: documentDate || null,
          metadata: {
            original_name: file.name,
            mime_type: file.type,
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Evidência adicionada!",
        description: "Processando documento...",
      });

      // Trigger processing in background
      if (evidenceType === "pdf" || evidenceType === "image") {
        supabase.functions
          .invoke("process-document", {
            body: { evidenceId: newEvidence.id },
          })
          .then(({ error }) => {
            if (error) {
              console.error("Processing error:", error);
              toast({
                variant: "destructive",
                title: "Erro no processamento",
                description: "OCR falhou, mas arquivo foi salvo",
              });
            } else {
              toast({
                title: "Documento processado!",
                description: "Texto extraído com sucesso",
              });
            }
          });
      }

      onEvidenceAdded();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error.name === 'ZodError' 
        ? error.errors[0]?.message || "Dados inválidos"
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Erro ao enviar arquivo",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTextSave = async () => {
    if (!textContent.trim()) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Digite ou cole algum conteúdo",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Validate evidence data
      const validatedData = evidenceSchema.parse({
        title: title || "Texto colado",
        case_id: caseId,
        type: "text" as const,
        tags: tags,
        origin: origin || "",
        author: author || "",
        notes: "",
        content: textContent,
      });

      const { error } = await supabase.from("evidences").insert({
        user_id: user.id,
        case_id: validatedData.case_id,
        type: validatedData.type,
        source_type: "paste",
        title: validatedData.title,
        content: validatedData.content,
        tags: validatedData.tags.length > 0 ? validatedData.tags : null,
        origin: validatedData.origin,
        author: validatedData.author,
        document_date: documentDate || null,
        metadata: {
          word_count: textContent.split(/\s+/).length,
          char_count: textContent.length,
        },
      });

      if (error) throw error;

      toast({
        title: "Evidência adicionada!",
        description: "Texto salvo com sucesso",
      });

      onEvidenceAdded();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error.name === 'ZodError' 
        ? error.errors[0]?.message || "Dados inválidos"
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Erro ao salvar texto",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAudioSave = async () => {
    if (!audioBlob) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Grave um áudio primeiro",
      });
      return;
    }

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Validate evidence data
      const validatedData = evidenceSchema.parse({
        title: title || "Gravação de áudio",
        case_id: caseId,
        type: "audio" as const,
        tags: tags,
        origin: origin || "",
        author: author || "",
        notes: "",
        content: "",
      });

      // Upload audio to storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from("evidences")
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Create evidence record
      const { data: newEvidence, error: insertError } = await supabase
        .from("evidences")
        .insert({
          user_id: user.id,
          case_id: validatedData.case_id,
          type: validatedData.type,
          source_type: "recording",
          title: validatedData.title,
          file_path: fileName,
          file_size: audioBlob.size,
          tags: validatedData.tags.length > 0 ? validatedData.tags : null,
          origin: validatedData.origin,
          author: validatedData.author,
          document_date: documentDate || null,
          metadata: {
            duration: 0,
            format: "webm",
          },
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "Evidência adicionada!",
        description: "Transcrevendo áudio...",
      });

      // Trigger transcription in background
      supabase.functions
        .invoke("transcribe-audio", {
          body: { evidenceId: newEvidence.id },
        })
        .then(({ error }) => {
          if (error) {
            console.error("Transcription error:", error);
            toast({
              variant: "destructive",
              title: "Erro na transcrição",
              description: "Áudio salvo, mas transcrição falhou",
            });
          } else {
            toast({
              title: "Áudio transcrito!",
              description: "Transcrição concluída com sucesso",
            });
          }
        });

      onEvidenceAdded();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      const errorMessage = error.name === 'ZodError' 
        ? error.errors[0]?.message || "Dados inválidos"
        : error.message;
      
      toast({
        variant: "destructive",
        title: "Erro ao salvar áudio",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Auto-stop after 5 minutes
      setTimeout(() => {
        if (mediaRecorder.state === "recording") {
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 300000);

      // Store recorder in a way we can stop it
      (window as any).activeRecorder = mediaRecorder;
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao gravar",
        description: "Permissão de microfone necessária",
      });
    }
  };

  const stopRecording = () => {
    const recorder = (window as any).activeRecorder;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
      setIsRecording(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Adicionar Evidência
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Adicionar Evidência ao Caso</SheetTitle>
          <SheetDescription>
            Importe documentos, textos ou grave áudios para anexar ao caso clínico
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="text">
              <Clipboard className="h-4 w-4 mr-2" />
              Texto
            </TabsTrigger>
            <TabsTrigger value="audio">
              <Mic className="h-4 w-4 mr-2" />
              Áudio
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <Label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-sm font-medium mb-2">
                      {file ? file.name : "Clique para selecionar ou arraste arquivos"}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PDF, PNG, JPG, DOCX (máx. 20MB)
                    </p>
                  </Label>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.docx,.txt"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0];
                      if (selectedFile) {
                        if (selectedFile.size > 20 * 1024 * 1024) {
                          toast({
                            variant: "destructive",
                            title: "Arquivo muito grande",
                            description: "O tamanho máximo é 20MB",
                          });
                          return;
                        }
                        setFile(selectedFile);
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Metadata fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título da Evidência *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Exame de gasometria arterial"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="origin">Origem</Label>
                  <Input
                    id="origin"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ex: Hospital XYZ"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Profissional</Label>
                  <Input
                    id="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Ex: Dr. João Silva"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-date">Data do Documento</Label>
                <Input
                  id="doc-date"
                  type="datetime-local"
                  value={documentDate}
                  onChange={(e) => setDocumentDate(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleFileUpload}
              disabled={loading || !file}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Arquivo"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="text-title">Título *</Label>
                <Input
                  id="text-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Evolução clínica"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text-content">Conteúdo *</Label>
                <Textarea
                  id="text-content"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Cole ou digite o conteúdo aqui..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {textContent.split(/\s+/).filter(Boolean).length} palavras
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="text-origin">Origem</Label>
                  <Input
                    id="text-origin"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Ex: Prontuário eletrônico"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="text-date">Data</Label>
                  <Input
                    id="text-date"
                    type="datetime-local"
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleTextSave}
              disabled={loading || !textContent.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Texto"
              )}
            </Button>
          </TabsContent>

          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  {!audioBlob ? (
                    <>
                      <Mic className="h-16 w-16 mx-auto text-muted-foreground" />
                      {isRecording ? (
                        <>
                          <div className="flex items-center justify-center gap-2">
                            <div className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                            <p className="text-sm font-medium">Gravando...</p>
                          </div>
                          <Button onClick={stopRecording} variant="destructive">
                            Parar Gravação
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">
                            Grave sua narrativa clínica ou observações
                          </p>
                          <Button onClick={startRecording}>
                            <Mic className="h-4 w-4 mr-2" />
                            Iniciar Gravação
                          </Button>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium mb-2">Áudio gravado</p>
                        <audio
                          controls
                          src={URL.createObjectURL(audioBlob)}
                          className="w-full"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAudioBlob(null);
                        }}
                      >
                        Gravar Novamente
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {audioBlob && (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="audio-title">Título *</Label>
                    <Input
                      id="audio-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Relato do plantão"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audio-origin">Origem</Label>
                    <Input
                      id="audio-origin"
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="Ex: Plantão noturno"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAudioSave}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Áudio"
                  )}
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

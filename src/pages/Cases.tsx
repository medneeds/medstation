import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FolderOpen, ChevronRight, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SearchDialog } from "@/components/SearchDialog";
import { TagInput } from "@/components/TagInput";
import { caseSchema } from "@/lib/validations";
import CaseVoiceRecorder from "@/components/CaseVoiceRecorder";
import { PatientCombobox } from "@/components/PatientCombobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Case {
  id: string;
  title: string;
  status: string;
  chief_complaint: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  patient_id: string;
}

interface Patient {
  id: string;
  name: string;
}

export default function Cases() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get("patient");
  
  const [cases, setCases] = useState<Case[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    patient_id: patientId || "",
    chief_complaint: "",
    notes: "",
    tags: [] as string[],
  });

  useEffect(() => {
    fetchPatients();
    if (patientId) {
      fetchCasesByPatient(patientId);
    } else {
      fetchAllCases();
    }
  }, [patientId]);

  const fetchPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("patients")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("name");

    if (!error && data) {
      setPatients(data);
      if (patientId) {
        const patient = data.find((p) => p.id === patientId);
        setSelectedPatient(patient || null);
      }
    }
  };

  const fetchAllCases = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.id)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar casos",
        description: error.message,
      });
    } else {
      setCases(data || []);
    }
    setLoading(false);
  };

  const fetchCasesByPatient = async (patId: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("user_id", user.id)
      .eq("patient_id", patId)
      .neq("status", "archived")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar casos",
        description: error.message,
      });
    } else {
      setCases(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      const validated = caseSchema.parse(formData);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Convert empty string to null for patient_id
      const caseData = {
        ...validated,
        patient_id: validated.patient_id || null,
        user_id: user.id
      };

      const { error } = await supabase
        .from("cases")
        .insert([caseData]);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao criar caso",
          description: error.message,
        });
      } else {
        toast({ title: "Caso criado!" });
        if (patientId) {
          fetchCasesByPatient(patientId);
        } else {
          fetchAllCases();
        }
        resetForm();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: error.errors?.[0]?.message || "Por favor, verifique os dados informados",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      patient_id: patientId || "",
      chief_complaint: "",
      notes: "",
      tags: [],
    });
    setDialogOpen(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await processDocumentFile(files[0]);
    }
  };

  const processDocumentFile = async (file: File) => {
    setProcessingFile(true);
    
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const supportedFormats = ['pdf', 'doc', 'docx', 'txt', 'md'];
      
      if (!supportedFormats.includes(fileExtension || '')) {
        toast({
          title: "Formato não suportado",
          description: `Use arquivos PDF, DOC, DOCX, TXT ou MD`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Processando documento",
        description: `Extraindo informações de ${file.name} com IA...`,
      });

      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let documentText = '';

      if (fileExtension === 'txt' || fileExtension === 'md') {
        documentText = await file.text();
      } else {
        // Process document
        const { data: processData, error: processError } = await supabase.functions.invoke('process-document', {
          body: {
            file: base64,
            fileName: file.name,
            mimeType: file.type
          }
        });

        if (processError || !processData?.text) {
          throw new Error('Erro ao processar documento');
        }

        documentText = processData.text;
      }

      // Extract case data from document text
      const { data: extractData, error: extractError } = await supabase.functions.invoke('extract-case-from-document', {
        body: { text: documentText }
      });

      if (extractError || !extractData?.success) {
        throw new Error(extractData?.error || 'Erro ao extrair dados do documento');
      }

      // Fill form with extracted data
      setFormData({
        ...formData,
        title: extractData.data.title || '',
        chief_complaint: extractData.data.chief_complaint || '',
        notes: extractData.data.notes || '',
        tags: extractData.data.tags || [],
      });

      // Open dialog
      setDialogOpen(true);

      toast({
        title: "✓ Documento processado!",
        description: "Informações extraídas com sucesso. Revise e complete os dados.",
      });

    } catch (error: any) {
      console.error('Error processing document:', error);
      toast({
        title: "Erro ao processar documento",
        description: error.message || "Não foi possível processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setProcessingFile(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "closed":
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo";
      case "closed":
        return "Fechado";
      case "archived":
        return "Arquivado";
      default:
        return status;
    }
  };

  return (
    <div 
      className="space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 bg-primary/10 border-4 border-dashed border-primary rounded-lg flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="text-center bg-background p-8 rounded-lg shadow-lg">
            <FolderOpen className="h-16 w-16 mx-auto mb-4 text-primary" />
            <p className="text-xl font-bold">Solte o documento aqui</p>
            <p className="text-sm text-muted-foreground mt-2">
              PDF, DOCX, TXT ou MD
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              A IA extrairá automaticamente as informações
            </p>
          </div>
        </div>
      )}
      
      {processingFile && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <div className="text-center">
                <p className="font-medium">Processando documento com IA...</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Extraindo informações do caso clínico
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
      
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            {selectedPatient ? `Casos de ${selectedPatient.name}` : "Casos Clínicos"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {selectedPatient 
              ? "Gerencie os casos deste paciente"
              : "Todos os seus casos clínicos"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setSearchDialogOpen(true)} className="md:size-default">
            <Search className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Buscar</span>
          </Button>
          {selectedPatient && (
            <Button variant="outline" size="sm" onClick={() => navigate("/patients")} className="md:size-default">
              <span className="hidden sm:inline">Voltar para Pacientes</span>
              <span className="sm:hidden">Voltar</span>
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm} size="sm" className="md:size-default">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Novo Caso</span>
                <span className="md:hidden">Novo</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Caso Clínico</DialogTitle>
                <DialogDescription>
                  Crie um novo caso para um paciente
                </DialogDescription>
              </DialogHeader>
              
              <CaseVoiceRecorder
                onTranscriptionComplete={(data) => {
                  setFormData({
                    ...formData,
                    title: data.title || formData.title,
                    chief_complaint: data.chief_complaint || formData.chief_complaint,
                    notes: data.notes || formData.notes,
                    tags: data.tags || formData.tags,
                  });
                }}
              />
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="patient">Paciente</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if ((window as any).openPatientDialog) {
                          (window as any).openPatientDialog();
                        }
                      }}
                      className="text-xs h-7"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Novo Paciente
                    </Button>
                  </div>
                  <PatientCombobox
                    value={formData.patient_id || "unidentified"}
                    onChange={(value) =>
                      setFormData({ ...formData, patient_id: value === "unidentified" ? "" : value })
                    }
                    onPatientCreated={fetchPatients}
                    onCreateClick={() => {}}
                  />
                  <p className="text-xs text-muted-foreground">
                    Busque, crie um novo paciente ou selecione "Não identificar"
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="title">Título do Caso *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!formData.chief_complaint && !formData.notes) {
                          toast({
                            title: "Campos vazios",
                            description: "Preencha a queixa principal ou observações primeiro",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        try {
                          const { data, error } = await supabase.functions.invoke('generate-case-title', {
                            body: {
                              chief_complaint: formData.chief_complaint,
                              notes: formData.notes
                            }
                          });
                          
                          if (error) throw error;
                          
                          if (data?.title) {
                            setFormData({ ...formData, title: data.title });
                            toast({
                              title: "✓ Título gerado!",
                              description: "Título criado automaticamente pela IA",
                            });
                          }
                        } catch (error: any) {
                          toast({
                            title: "Erro ao gerar título",
                            description: error.message,
                            variant: "destructive",
                          });
                        }
                      }}
                      className="text-xs"
                    >
                      🪄 Gerar com IA
                    </Button>
                  </div>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ex: Internação por pneumonia"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="complaint">Queixa Principal</Label>
                  <Input
                    id="complaint"
                    value={formData.chief_complaint}
                    onChange={(e) =>
                      setFormData({ ...formData, chief_complaint: e.target.value })
                    }
                    placeholder="Ex: Dispneia e febre há 3 dias"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Descrição do Caso</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={4}
                    placeholder="Descreva os detalhes do caso clínico..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  <TagInput
                    tags={formData.tags}
                    onChange={(tags) => setFormData({ ...formData, tags })}
                    placeholder="Adicionar tag (pressione Enter)..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">Criar Caso</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <SearchDialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum caso encontrado</p>
              <p className="text-sm mt-1">Crie um novo caso para começar</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cases.map((caseItem) => {
                const patient = patients.find((p) => p.id === caseItem.patient_id);
                return (
                  <Card
                    key={caseItem.id}
                    className="hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/case/${caseItem.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                           <div className="flex items-center gap-2 md:gap-3 mb-2">
                            <div className="rounded-full p-2 bg-primary/10 shrink-0">
                              <FolderOpen className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <h3 className="font-semibold text-base md:text-lg truncate">{caseItem.title}</h3>
                                <Badge className={`${getStatusColor(caseItem.status)} shrink-0 text-xs`}>
                                  {getStatusLabel(caseItem.status)}
                                </Badge>
                              </div>
                              <p className="text-xs md:text-sm text-muted-foreground truncate">
                                {patient ? `Paciente: ${patient.name}` : "🕶️ Paciente não identificado"}
                              </p>
                            </div>
                          </div>
                           {caseItem.chief_complaint && (
                            <p className="ml-8 md:ml-12 text-xs md:text-sm text-muted-foreground">
                              <strong>QP:</strong> {caseItem.chief_complaint}
                            </p>
                          )}
                          {caseItem.tags && caseItem.tags.length > 0 && (
                            <div className="ml-8 md:ml-12 flex gap-1 flex-wrap mt-2">
                              {caseItem.tags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="ml-8 md:ml-12 text-xs text-muted-foreground mt-2">
                            Atualizado em {new Date(caseItem.updated_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

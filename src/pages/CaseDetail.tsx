import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  FileText, 
  Calendar,
  User,
  FileIcon,
  Download,
  Trash2,
  ExternalLink,
  FileDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EvidenceDrawer } from "@/components/EvidenceDrawer";
import { exportCaseToPDF } from "@/utils/pdfExport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface CaseData {
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

interface Evidence {
  id: string;
  type: string;
  source_type: string;
  title: string;
  content: string | null;
  file_path: string | null;
  file_size: number | null;
  tags: string[] | null;
  origin: string | null;
  author: string | null;
  document_date: string | null;
  created_at: string;
  metadata?: any;
}

export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [caseData, setCaseData] = useState<CaseData | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (caseId) {
      fetchCaseData();
      fetchEvidences();
    }
  }, [caseId]);

  const fetchCaseData = async () => {
    const { data: caseData, error: caseError } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (caseError) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar caso",
        description: caseError.message,
      });
      return;
    }

    setCaseData(caseData);

    // Fetch patient data
    const { data: patientData } = await supabase
      .from("patients")
      .select("id, name")
      .eq("id", caseData.patient_id)
      .single();

    if (patientData) {
      setPatient(patientData);
    }

    setLoading(false);
  };

  const fetchEvidences = async () => {
    const { data, error } = await supabase
      .from("evidences")
      .select("*")
      .eq("case_id", caseId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar evidências",
        description: error.message,
      });
    } else {
      setEvidences(data || []);
    }
  };

  const handleDeleteEvidence = async (evidenceId: string, filePath: string | null) => {
    // Delete from storage if has file
    if (filePath) {
      await supabase.storage.from("evidences").remove([filePath]);
    }

    // Mark as inactive
    const { error } = await supabase
      .from("evidences")
      .update({ is_active: false })
      .eq("id", evidenceId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    } else {
      toast({ title: "Evidência excluída" });
      fetchEvidences();
    }
  };

  const handleDownload = async (filePath: string, title: string) => {
    const { data, error } = await supabase.storage
      .from("evidences")
      .download(filePath);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao baixar",
        description: error.message,
      });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = title;
    a.click();
  };

  const handleExportPDF = () => {
    if (!caseData || !patient) return;

    const caseForExport = {
      title: caseData.title,
      patient_name: patient.name,
      chief_complaint: caseData.chief_complaint || undefined,
      notes: caseData.notes || undefined,
      status: caseData.status,
      tags: caseData.tags || undefined,
      created_at: caseData.created_at,
      updated_at: caseData.updated_at,
    };

    const evidencesForExport = evidences.map((e) => ({
      title: e.title,
      type: e.type,
      content: e.content || undefined,
      origin: e.origin || undefined,
      created_at: e.created_at,
    }));

    exportCaseToPDF(caseForExport, evidencesForExport);

    toast({
      title: "PDF gerado!",
      description: "O relatório foi baixado com sucesso.",
    });
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return "📄";
      case "image":
        return "🖼️";
      case "audio":
        return "🎤";
      case "text":
        return "📝";
      default:
        return "📎";
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
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Caso não encontrado</p>
        <Button onClick={() => navigate("/cases")}>Voltar para Casos</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate("/cases")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{caseData.title}</h1>
              <Badge className={getStatusColor(caseData.status)}>
                {getStatusLabel(caseData.status)}
              </Badge>
            </div>
            {patient && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {patient.name}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Criado em {new Date(caseData.created_at).toLocaleDateString("pt-BR")}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPDF}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <EvidenceDrawer caseId={caseData.id} onEvidenceAdded={fetchEvidences} />
        </div>
      </div>

      {/* Case Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Caso</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {caseData.chief_complaint && (
            <div>
              <p className="text-sm font-medium mb-1">Queixa Principal</p>
              <p className="text-sm text-muted-foreground">{caseData.chief_complaint}</p>
            </div>
          )}
          {caseData.notes && (
            <div>
              <p className="text-sm font-medium mb-1">Observações</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {caseData.notes}
              </p>
            </div>
          )}
          {caseData.tags && caseData.tags.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Tags</p>
              <div className="flex gap-2 flex-wrap">
                {caseData.tags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="evidences" className="space-y-4">
        <TabsList>
          <TabsTrigger value="evidences">
            <FileText className="h-4 w-4 mr-2" />
            Evidências ({evidences.length})
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="analysis">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="evidences" className="space-y-4">
          {evidences.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma evidência anexada</p>
                <p className="text-sm mt-1">
                  Adicione documentos, textos ou áudios para começar
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {evidences.map((evidence) => (
                <Card key={evidence.id} className="hover:bg-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-3xl">{getEvidenceIcon(evidence.type)}</div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{evidence.title}</h3>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
                            <span className="capitalize">Tipo: {evidence.type}</span>
                            {evidence.source_type && (
                              <span className="capitalize">
                                Fonte: {evidence.source_type}
                              </span>
                            )}
                            {evidence.file_size && (
                              <span>
                                Tamanho: {(evidence.file_size / 1024).toFixed(1)} KB
                              </span>
                            )}
                            <span>
                              {new Date(evidence.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                          {evidence.origin && (
                            <p className="text-sm text-muted-foreground">
                              Origem: {evidence.origin}
                            </p>
                          )}
                          {evidence.author && (
                            <p className="text-sm text-muted-foreground">
                              Autor: {evidence.author}
                            </p>
                          )}
                          {evidence.content && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-3 bg-muted/50 p-2 rounded">
                              {evidence.content}
                            </p>
                          )}
                          {evidence.metadata?.processing_method && (
                            <p className="text-xs text-muted-foreground mt-1">
                              ✓ Processado por{" "}
                              {evidence.metadata.processing_method === "ocr_gemini_pro"
                                ? "OCR"
                                : "Transcrição"}
                            </p>
                          )}
                          {evidence.tags && evidence.tags.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {evidence.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {evidence.file_path && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownload(evidence.file_path!, evidence.title)
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {evidence.content && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // TODO: Open text viewer
                              toast({ title: "Visualizador em desenvolvimento" });
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir evidência?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. A evidência "{evidence.title}"
                                será excluída permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteEvidence(evidence.id, evidence.file_path)
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Timeline em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Análise por IA em desenvolvimento</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

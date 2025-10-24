import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import {
  ArrowLeft,
  Download,
  Trash2,
  FileText,
  User,
  Calendar,
  FileCheck,
  Stethoscope,
  ClipboardList,
  Heart,
} from "lucide-react";

interface MedicalDocument {
  id: string;
  document_number: string;
  document_type: string;
  title: string;
  content: string;
  diagnosis: string | null;
  cid_code: string | null;
  validity_days: number | null;
  observations: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  patient_id: string;
  patients: {
    name: string;
    cpf: string | null;
    date_of_birth: string | null;
  } | null;
}

export default function MedicalDocumentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [document, setDocument] = useState<MedicalDocument | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchDocument();
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("medical_documents")
        .select(`
          *,
          patients (name, cpf, date_of_birth)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setDocument(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar documento",
        description: error.message,
      });
      navigate("/documentos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("medical_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Documento excluído",
        description: "Documento removido com sucesso",
      });
      navigate("/documentos");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir documento",
        description: error.message,
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case "laudo":
        return "Laudo Médico";
      case "relatorio":
        return "Relatório Médico";
      case "atestado":
        return "Atestado Médico";
      default:
        return type;
    }
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case "laudo":
        return <Stethoscope className="h-5 w-5" />;
      case "relatorio":
        return <ClipboardList className="h-5 w-5" />;
      case "atestado":
        return <Heart className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "issued":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "draft":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "issued":
        return "Emitido";
      case "draft":
        return "Rascunho";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Documento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/documentos")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Download className="h-4 w-4 mr-2" />
            Imprimir/PDF
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O documento será
                  permanentemente excluído.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Informações do Documento */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-full p-2 bg-primary/10">
                {getDocTypeIcon(document.document_type)}
              </div>
              <div>
                <CardTitle className="text-xl mb-2">
                  {document.title}
                </CardTitle>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline">{document.document_number}</Badge>
                  <Badge className={getStatusColor(document.status)}>
                    {getStatusLabel(document.status)}
                  </Badge>
                  <Badge variant="outline">
                    {getDocTypeLabel(document.document_type)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />

          {/* Informações do Paciente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Paciente</p>
                <p className="text-sm text-muted-foreground">
                  {document.patients?.name || "Não identificado"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Data de Emissão</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(document.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Informações Clínicas */}
          {(document.diagnosis || document.cid_code || document.validity_days) && (
            <>
              <Separator />
              <div className="space-y-3">
                {document.diagnosis && (
                  <div>
                    <p className="text-sm font-medium mb-1">Diagnóstico</p>
                    <p className="text-sm text-muted-foreground">
                      {document.diagnosis}
                    </p>
                  </div>
                )}
                {document.cid_code && (
                  <div>
                    <p className="text-sm font-medium mb-1">CID-10</p>
                    <Badge variant="outline">{document.cid_code}</Badge>
                  </div>
                )}
                {document.validity_days && (
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Período de Afastamento
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {document.validity_days} dia(s)
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Conteúdo do Documento */}
          <Separator />
          <div>
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <FileCheck className="h-4 w-4" />
              Conteúdo do Documento
            </p>
            <div className="bg-muted/30 rounded-lg p-4 print:bg-white">
              <div
                className="text-sm whitespace-pre-wrap leading-relaxed"
                style={{ fontFamily: "serif" }}
              >
                {document.content}
              </div>
            </div>
          </div>

          {/* Observações */}
          {document.observations && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium mb-1">Observações</p>
                <p className="text-sm text-muted-foreground">
                  {document.observations}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .space-y-6, .space-y-6 * {
              visibility: visible;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}
      </style>
    </div>
  );
}

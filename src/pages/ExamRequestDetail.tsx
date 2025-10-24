import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  Calendar,
  User,
  FileText,
  Stethoscope,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TestTube,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface ExamRequest {
  id: string;
  request_number: string;
  patient_id: string;
  clinical_indication: string;
  cid_code: string | null;
  priority: string;
  status: string;
  exams: any[];
  observations: string | null;
  requested_date: string;
  scheduled_date: string | null;
  completed_date: string | null;
  created_at: string;
  patients: {
    name: string;
    cpf: string;
    date_of_birth: string;
  } | null;
  profiles: {
    full_name: string;
    crm: string;
    crm_state: string;
    specialty: string;
  } | null;
}

export default function ExamRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [examRequest, setExamRequest] = useState<ExamRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExamRequest();
    }
  }, [id]);

  const fetchExamRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("exam_requests")
        .select(`
          *,
          patients (name, cpf, date_of_birth),
          profiles (full_name, crm, crm_state, specialty)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setExamRequest(data as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar solicitação",
        description: error.message,
        variant: "destructive",
      });
      navigate("/exames");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", icon: Clock, variant: "secondary" as const },
      scheduled: { label: "Agendado", icon: Calendar, variant: "default" as const },
      completed: { label: "Concluído", icon: CheckCircle2, variant: "default" as const },
      cancelled: { label: "Cancelado", icon: XCircle, variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      routine: { label: "Rotina", variant: "secondary" as const },
      urgent: { label: "Urgente", variant: "default" as const },
      emergency: { label: "Emergência", variant: "destructive" as const },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig];
    if (!config) return null;

    return (
      <Badge variant={config.variant} className="gap-1">
        <AlertCircle className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const updateStatus = async (newStatus: string) => {
    if (!examRequest) return;

    setUpdating(true);
    try {
      const updates: any = { status: newStatus };

      if (newStatus === "completed" && !examRequest.completed_date) {
        updates.completed_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("exam_requests")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: "A solicitação foi atualizada com sucesso",
      });

      await fetchExamRequest();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = () => {
    toast({
      title: "Em desenvolvimento",
      description: "A funcionalidade de download em PDF será implementada em breve",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando solicitação...</p>
        </div>
      </div>
    );
  }

  if (!examRequest) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/exames")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {examRequest.request_number}
            </h1>
            <p className="text-muted-foreground">Detalhes da Solicitação</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {getStatusBadge(examRequest.status)}
          {getPriorityBadge(examRequest.priority)}
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="status">Atualizar Status</Label>
              <Select
                value={examRequest.status}
                onValueChange={updateStatus}
                disabled={updating}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="scheduled">Agendado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle>Médico Solicitante</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{examRequest.profiles?.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CRM</p>
              <p className="font-medium">
                {examRequest.profiles?.crm && examRequest.profiles?.crm_state
                  ? `${examRequest.profiles.crm} - ${examRequest.profiles.crm_state}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Especialidade</p>
              <p className="font-medium">{examRequest.profiles?.specialty || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Solicitação</p>
              <p className="font-medium">
                {new Date(examRequest.requested_date).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Paciente</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{examRequest.patients?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF</p>
              <p className="font-medium">{examRequest.patients?.cpf}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Nascimento</p>
              <p className="font-medium">
                {examRequest.patients?.date_of_birth
                  ? new Date(examRequest.patients.date_of_birth).toLocaleDateString("pt-BR")
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clinical Indication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Indicação Clínica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <p className="font-medium">{examRequest.clinical_indication}</p>
          </div>
          {examRequest.cid_code && (
            <div>
              <p className="text-sm text-muted-foreground">Código CID</p>
              <p className="font-medium">{examRequest.cid_code}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Exames Solicitados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {examRequest.exams && examRequest.exams.length > 0 ? (
            examRequest.exams.map((exam, index) => (
              <div key={index}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">{exam.name}</h3>
                      <Badge variant="outline" className="mt-1">
                        {exam.type === "laboratory" ? "Laboratório" : "Imagem"}
                      </Badge>
                    </div>
                  </div>
                  {exam.instructions && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Instruções</p>
                      <p className="font-medium">{exam.instructions}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">Nenhum exame solicitado</p>
          )}
        </CardContent>
      </Card>

      {/* Dates */}
      {(examRequest.scheduled_date || examRequest.completed_date) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datas Importantes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-2 gap-4">
              {examRequest.scheduled_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Data Agendada</p>
                  <p className="font-medium">
                    {new Date(examRequest.scheduled_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
              {examRequest.completed_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Data de Conclusão</p>
                  <p className="font-medium">
                    {new Date(examRequest.completed_date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observations */}
      {examRequest.observations && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{examRequest.observations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

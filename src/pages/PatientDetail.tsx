import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  Pill,
  TestTube,
  Clock,
  Download,
  Plus,
} from "lucide-react";
import jsPDF from "jspdf";

interface Patient {
  id: string;
  name: string;
  cpf: string;
  date_of_birth: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

interface TimelineItem {
  id: string;
  type: "case" | "prescription" | "exam";
  date: string;
  title: string;
  subtitle?: string;
  status?: string;
  data: any;
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCases: 0,
    totalPrescriptions: 0,
    totalExams: 0,
  });

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch patient
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      // Fetch cases
      const { data: cases, error: casesError } = await supabase
        .from("cases")
        .select("id, title, status, chief_complaint, created_at")
        .eq("patient_id", id)
        .eq("user_id", user.id);

      if (casesError) throw casesError;

      // Fetch prescriptions
      const { data: prescriptions, error: prescriptionsError } = await supabase
        .from("prescriptions")
        .select("id, prescription_number, diagnosis, status, created_at")
        .eq("patient_id", id)
        .eq("user_id", user.id);

      if (prescriptionsError) throw prescriptionsError;

      // Fetch exam requests
      const { data: exams, error: examsError } = await supabase
        .from("exam_requests")
        .select("id, request_number, clinical_indication, status, requested_date")
        .eq("patient_id", id)
        .eq("user_id", user.id);

      if (examsError) throw examsError;

      // Build timeline
      const timelineItems: TimelineItem[] = [
        ...(cases || []).map((c) => ({
          id: c.id,
          type: "case" as const,
          date: c.created_at,
          title: c.title,
          subtitle: c.chief_complaint,
          status: c.status,
          data: c,
        })),
        ...(prescriptions || []).map((p) => ({
          id: p.id,
          type: "prescription" as const,
          date: p.created_at,
          title: p.prescription_number,
          subtitle: p.diagnosis,
          status: p.status,
          data: p,
        })),
        ...(exams || []).map((e) => ({
          id: e.id,
          type: "exam" as const,
          date: e.requested_date,
          title: e.request_number,
          subtitle: e.clinical_indication,
          status: e.status,
          data: e,
        })),
      ];

      timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(timelineItems);

      // Set stats
      setStats({
        totalCases: cases?.length || 0,
        totalPrescriptions: prescriptions?.length || 0,
        totalExams: exams?.length || 0,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados do paciente",
        description: error.message,
        variant: "destructive",
      });
      navigate("/patients");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "case":
        return <FileText className="h-4 w-4" />;
      case "prescription":
        return <Pill className="h-4 w-4" />;
      case "exam":
        return <TestTube className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "case":
        return "Caso";
      case "prescription":
        return "Prescrição";
      case "exam":
        return "Exame";
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: string): "default" | "secondary" | "outline" => {
    switch (type) {
      case "case":
        return "default";
      case "prescription":
        return "secondary";
      case "exam":
        return "outline";
      default:
        return "outline";
    }
  };

  const handleNavigateToItem = (item: TimelineItem) => {
    switch (item.type) {
      case "case":
        navigate(`/case/${item.id}`);
        break;
      case "prescription":
        navigate(`/prescricoes/${item.id}`);
        break;
      case "exam":
        navigate(`/exames/${item.id}`);
        break;
    }
  };

  const handleNewPrescription = () => {
    navigate("/prescricoes/nova", {
      state: {
        preselectedPatient: patient?.id,
      },
    });
  };

  const handleNewExamRequest = () => {
    navigate("/exames/novo", {
      state: {
        preselectedPatient: patient?.id,
      },
    });
  };

  const exportHistoryToPDF = () => {
    if (!patient) return;

    const doc = new jsPDF();
    let yPos = 20;
    const lineHeight = 7;
    const marginLeft = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("HISTÓRICO DO PACIENTE", marginLeft, yPos);
    yPos += lineHeight * 2;

    // Patient info
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Dados do Paciente", marginLeft, yPos);
    yPos += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.text(`Nome: ${patient.name}`, marginLeft, yPos);
    yPos += lineHeight;
    doc.text(`CPF: ${patient.cpf}`, marginLeft, yPos);
    yPos += lineHeight;
    if (patient.date_of_birth) {
      doc.text(
        `Data de Nascimento: ${new Date(patient.date_of_birth).toLocaleDateString("pt-BR")}`,
        marginLeft,
        yPos
      );
      yPos += lineHeight;
    }
    yPos += lineHeight;

    // Stats
    doc.setFont("helvetica", "bold");
    doc.text("Resumo", marginLeft, yPos);
    yPos += lineHeight;

    doc.setFont("helvetica", "normal");
    doc.text(`Casos: ${stats.totalCases}`, marginLeft, yPos);
    yPos += lineHeight;
    doc.text(`Prescrições: ${stats.totalPrescriptions}`, marginLeft, yPos);
    yPos += lineHeight;
    doc.text(`Exames: ${stats.totalExams}`, marginLeft, yPos);
    yPos += lineHeight * 2;

    // Timeline
    doc.setFont("helvetica", "bold");
    doc.text("Histórico (Timeline)", marginLeft, yPos);
    yPos += lineHeight;

    timeline.forEach((item) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(
        `${new Date(item.date).toLocaleDateString("pt-BR")} - ${getTypeLabel(item.type)}`,
        marginLeft,
        yPos
      );
      yPos += lineHeight;

      doc.setFont("helvetica", "normal");
      doc.text(`${item.title}`, marginLeft + 5, yPos);
      yPos += lineHeight;

      if (item.subtitle) {
        const maxWidth = doc.internal.pageSize.width - 50;
        const lines = doc.splitTextToSize(item.subtitle, maxWidth);
        lines.forEach((line: string) => {
          if (yPos > 280) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, marginLeft + 5, yPos);
          yPos += lineHeight;
        });
      }

      yPos += lineHeight / 2;
    });

    // Footer
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(8);
    doc.text(
      `Gerado em: ${new Date().toLocaleString("pt-BR")} | MedStation AI`,
      doc.internal.pageSize.width / 2,
      footerY,
      { align: "center" }
    );

    doc.save(`historico_${patient.name.replace(/\s+/g, "_")}_${Date.now()}.pdf`);

    toast({
      title: "PDF gerado com sucesso",
      description: "O histórico foi exportado",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados do paciente...</p>
        </div>
      </div>
    );
  }

  if (!patient) {
    return null;
  }

  const age = patient.date_of_birth
    ? Math.floor(
        (new Date().getTime() - new Date(patient.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000)
      )
    : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
            <p className="text-muted-foreground">Histórico Completo do Paciente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportHistoryToPDF} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar Histórico
          </Button>
        </div>
      </div>

      {/* Patient Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">CPF</p>
              <p className="font-medium">{patient.cpf}</p>
            </div>
            {patient.date_of_birth && (
              <div>
                <p className="text-sm text-muted-foreground">Data de Nascimento</p>
                <p className="font-medium">
                  {new Date(patient.date_of_birth).toLocaleDateString("pt-BR")}
                  {age && ` (${age} anos)`}
                </p>
              </div>
            )}
            {patient.phone && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Telefone
                </p>
                <p className="font-medium">{patient.phone}</p>
              </div>
            )}
            {patient.email && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> Email
                </p>
                <p className="font-medium">{patient.email}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Cadastrado em
              </p>
              <p className="font-medium">
                {new Date(patient.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          {patient.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-2">Observações</p>
                <p className="text-sm whitespace-pre-wrap">{patient.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCases}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Prescrições</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPrescriptions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Exames</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExams}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleNewPrescription}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Prescrição
            </Button>
            <Button onClick={handleNewExamRequest} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Solicitar Exame
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico (Timeline)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhum registro encontrado para este paciente
            </p>
          ) : (
            <div className="space-y-4">
              {timeline.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="flex gap-4 p-4 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                  onClick={() => handleNavigateToItem(item)}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full p-2 bg-primary/10">
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="h-full w-px bg-border" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeBadgeVariant(item.type)}>
                            {getTypeLabel(item.type)}
                          </Badge>
                          <p className="text-sm text-muted-foreground">
                            {new Date(item.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <h3 className="font-semibold">{item.title}</h3>
                        {item.subtitle && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

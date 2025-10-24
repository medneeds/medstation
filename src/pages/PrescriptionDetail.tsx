import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { exportPrescriptionToPDF } from "@/utils/pdfExport";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Download,
  Copy,
  RefreshCw,
  Calendar,
  User,
  FileText,
  Stethoscope,
  Pill,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  diagnosis: string;
  cid_code: string | null;
  medications: Medication[];
  status: string;
  observations: string | null;
  validity_days: number;
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

export default function PrescriptionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPrescription();
    }
  }, [id]);

  const fetchPrescription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("prescriptions")
        .select(`
          *,
          patients (name, cpf, date_of_birth),
          profiles (full_name, crm, crm_state, specialty)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setPrescription(data as any);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar prescrição",
        description: error.message,
        variant: "destructive",
      });
      navigate("/prescricoes");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Rascunho", icon: FileText, variant: "secondary" as const },
      pending_signature: { label: "Aguardando Assinatura", icon: Clock, variant: "default" as const },
      signed: { label: "Assinada", icon: CheckCircle2, variant: "default" as const },
      cancelled: { label: "Cancelada", icon: AlertCircle, variant: "destructive" as const },
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

  const handleCopy = () => {
    if (!prescription) return;
    navigate("/prescricoes/nova", {
      state: {
        copyFrom: {
          patient_id: prescription.patient_id,
          diagnosis: prescription.diagnosis,
          cid_code: prescription.cid_code,
          medications: prescription.medications,
          observations: prescription.observations,
        },
      },
    });
  };

  const handleRenew = async () => {
    if (!prescription) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: numberData, error: numberError } = await supabase
        .rpc("generate_prescription_number");

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: prescription.patient_id,
          prescription_number: numberData,
          diagnosis: prescription.diagnosis,
          cid_code: prescription.cid_code,
          validity_days: prescription.validity_days,
          observations: prescription.observations,
          medications: prescription.medications,
          status: "draft",
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Prescrição renovada",
        description: "Nova prescrição criada com sucesso",
      });

      navigate(`/prescricoes/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao renovar prescrição",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = () => {
    if (!prescription) return;

    try {
      exportPrescriptionToPDF({
        prescription_number: prescription.prescription_number,
        patient_name: prescription.patients?.name || "N/A",
        patient_cpf: prescription.patients?.cpf || "N/A",
        patient_dob: prescription.patients?.date_of_birth,
        doctor_name: prescription.profiles?.full_name || "N/A",
        doctor_crm: prescription.profiles?.crm || "N/A",
        doctor_crm_state: prescription.profiles?.crm_state || "N/A",
        doctor_specialty: prescription.profiles?.specialty,
        diagnosis: prescription.diagnosis,
        cid_code: prescription.cid_code || undefined,
        medications: prescription.medications,
        validity_days: prescription.validity_days,
        observations: prescription.observations || undefined,
        created_at: prescription.created_at,
      });

      toast({
        title: "PDF gerado com sucesso",
        description: "O arquivo foi baixado para seu computador",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao gerar PDF",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando prescrição...</p>
        </div>
      </div>
    );
  }

  if (!prescription) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/prescricoes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {prescription.prescription_number}
            </h1>
            <p className="text-muted-foreground">Detalhes da Prescrição</p>
          </div>
        </div>
        <div className="flex gap-2">
          {getStatusBadge(prescription.status)}
        </div>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleDownloadPDF} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button onClick={handleCopy} variant="outline">
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
            <Button onClick={handleRenew} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Renovar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle>Prescritor</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{prescription.profiles?.full_name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CRM</p>
              <p className="font-medium">
                {prescription.profiles?.crm && prescription.profiles?.crm_state
                  ? `${prescription.profiles.crm} - ${prescription.profiles.crm_state}`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Especialidade</p>
              <p className="font-medium">{prescription.profiles?.specialty || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Emissão</p>
              <p className="font-medium">
                {new Date(prescription.created_at).toLocaleDateString("pt-BR")}
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
              <p className="font-medium">{prescription.patients?.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">CPF</p>
              <p className="font-medium">{prescription.patients?.cpf}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data de Nascimento</p>
              <p className="font-medium">
                {prescription.patients?.date_of_birth
                  ? new Date(prescription.patients.date_of_birth).toLocaleDateString("pt-BR")
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Validade</p>
              <p className="font-medium">{prescription.validity_days} dias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Diagnóstico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <p className="text-sm text-muted-foreground">Descrição</p>
            <p className="font-medium">{prescription.diagnosis}</p>
          </div>
          {prescription.cid_code && (
            <div>
              <p className="text-sm text-muted-foreground">Código CID</p>
              <p className="font-medium">{prescription.cid_code}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            Medicamentos Prescritos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prescription.medications.map((med, index) => (
            <div key={index}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{med.name}</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Dosagem</p>
                    <p className="font-medium">{med.dosage}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Frequência</p>
                    <p className="font-medium">{med.frequency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duração</p>
                    <p className="font-medium">{med.duration}</p>
                  </div>
                </div>
                {med.instructions && (
                  <div>
                    <p className="text-muted-foreground text-sm">Instruções</p>
                    <p className="font-medium">{med.instructions}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Observations */}
      {prescription.observations && (
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{prescription.observations}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/contexts/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, FileText, AlertCircle, User, Stethoscope } from "lucide-react";
import { z } from "zod";

const examSchema = z.object({
  name: z.string().min(1, "Nome do exame é obrigatório").max(200),
  type: z.string().min(1, "Tipo é obrigatório"),
  instructions: z.string().max(500).optional(),
});

interface Patient {
  id: string;
  name: string;
  cpf: string;
  date_of_birth: string;
}

interface Exam {
  name: string;
  type: string;
  instructions: string;
}

const examTypes = [
  { value: "laboratorio", label: "Exame Laboratorial" },
  { value: "imagem", label: "Exame de Imagem" },
  { value: "cardiologico", label: "Exame Cardiológico" },
  { value: "endoscopico", label: "Exame Endoscópico" },
  { value: "outros", label: "Outros" },
];

export default function NewExamRequest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [clinicalIndication, setClinicalIndication] = useState("");
  const [cidCode, setCidCode] = useState("");
  const [priority, setPriority] = useState("routine");
  const [observations, setObservations] = useState("");
  const [exams, setExams] = useState<Exam[]>([
    { name: "", type: "", instructions: "" },
  ]);

  useEffect(() => {
    fetchPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      const patient = patients.find(p => p.id === selectedPatient);
      setSelectedPatientData(patient || null);
    } else {
      setSelectedPatientData(null);
    }
  }, [selectedPatient, patients]);

  const fetchPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("patients")
        .select("id, name, cpf, date_of_birth")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("name");

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar pacientes",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addExam = () => {
    setExams([
      ...exams,
      { name: "", type: "", instructions: "" },
    ]);
  };

  const removeExam = (index: number) => {
    if (exams.length > 1) {
      setExams(exams.filter((_, i) => i !== index));
    }
  };

  const updateExam = (index: number, field: keyof Exam, value: string) => {
    const updated = [...exams];
    updated[index] = { ...updated[index], [field]: value };
    setExams(updated);
  };

  const validateForm = () => {
    if (!profile?.crm || !profile?.crm_state) {
      toast({
        title: "Dados do médico incompletos",
        description: "É necessário ter CRM e Estado cadastrados. Complete seu perfil.",
        variant: "destructive",
      });
      return false;
    }

    if (!selectedPatient) {
      toast({
        title: "Erro de validação",
        description: "Selecione um paciente",
        variant: "destructive",
      });
      return false;
    }

    if (!clinicalIndication.trim()) {
      toast({
        title: "Erro de validação",
        description: "Digite a indicação clínica",
        variant: "destructive",
      });
      return false;
    }

    for (let i = 0; i < exams.length; i++) {
      const exam = exams[i];
      try {
        examSchema.parse(exam);
      } catch (error: any) {
        toast({
          title: `Erro no exame ${i + 1}`,
          description: error.errors[0]?.message || "Dados inválidos",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const saveExamRequest = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: numberData, error: numberError } = await supabase
        .rpc("generate_exam_request_number");

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from("exam_requests")
        .insert({
          user_id: user.id,
          patient_id: selectedPatient,
          request_number: numberData,
          clinical_indication: clinicalIndication.trim(),
          cid_code: cidCode.trim() || null,
          priority,
          observations: observations.trim() || null,
          exams: exams.filter(e => e.name.trim()) as any,
          status: "pending",
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Solicitação criada",
        description: "Exames solicitados com sucesso",
      });

      navigate(`/exames/${data.id}`);
    } catch (error: any) {
      console.error("Error saving exam request:", error);
      toast({
        title: "Erro ao salvar solicitação",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/exames")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação de Exames</h1>
          <p className="text-muted-foreground">
            Solicite exames laboratoriais, de imagem e outros
          </p>
        </div>
      </div>

      {/* Doctor Info Validation Alert */}
      {(!profile?.crm || !profile?.crm_state || !profile?.full_name) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Para criar solicitações válidas, complete seus dados profissionais em{" "}
            <Button
              variant="link"
              className="h-auto p-0 text-destructive underline"
              onClick={() => navigate("/settings")}
            >
              Configurações
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Doctor Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <CardTitle>Dados do Solicitante</CardTitle>
          </div>
          <CardDescription>Informações que constarão na solicitação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-sm">Nome Completo</Label>
              <p className="font-medium">{profile?.full_name || "Não cadastrado"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">CRM</Label>
              <p className="font-medium">
                {profile?.crm && profile?.crm_state
                  ? `${profile.crm} - ${profile.crm_state}`
                  : "Não cadastrado"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Patient Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Dados do Paciente</CardTitle>
          </div>
          <CardDescription>Selecione o paciente para esta solicitação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="patient">Paciente *</Label>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger id="patient">
                <SelectValue placeholder="Selecione o paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{patient.name}</span>
                      {patient.cpf && (
                        <span className="text-xs text-muted-foreground">
                          CPF: {patient.cpf}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedPatientData && (
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Label className="text-muted-foreground text-sm">CPF</Label>
                <p className="font-medium">{selectedPatientData.cpf || "Não informado"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-sm">Data de Nascimento</Label>
                <p className="font-medium">
                  {selectedPatientData.date_of_birth
                    ? new Date(selectedPatientData.date_of_birth).toLocaleDateString('pt-BR')
                    : "Não informada"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical Indication */}
      <Card>
        <CardHeader>
          <CardTitle>Indicação Clínica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="indication">Indicação Clínica *</Label>
            <Textarea
              id="indication"
              placeholder="Descreva a indicação clínica para os exames..."
              value={clinicalIndication}
              onChange={(e) => setClinicalIndication(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cid">Código CID (opcional)</Label>
              <Input
                id="cid"
                placeholder="Ex: J06.9"
                value={cidCode}
                onChange={(e) => setCidCode(e.target.value)}
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Rotina</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="emergency">Emergência</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exams */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Exames Solicitados</CardTitle>
              <CardDescription>Adicione os exames a serem realizados</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addExam}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {exams.map((exam, index) => (
            <Card key={index} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Exame {index + 1}</h4>
                  {exams.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExam(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Exame *</Label>
                    <Input
                      placeholder="Ex: Hemograma Completo"
                      value={exam.name}
                      onChange={(e) => updateExam(index, "name", e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo de Exame *</Label>
                    <Select
                      value={exam.type}
                      onValueChange={(value) => updateExam(index, "type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {examTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Instruções Adicionais</Label>
                  <Textarea
                    placeholder="Ex: Jejum de 12 horas, trazer exames anteriores..."
                    value={exam.instructions}
                    onChange={(e) =>
                      updateExam(index, "instructions", e.target.value)
                    }
                    rows={2}
                    maxLength={500}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Observations */}
      <Card>
        <CardHeader>
          <CardTitle>Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observações gerais sobre a solicitação..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            maxLength={1000}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pb-8">
        <Button
          variant="outline"
          onClick={() => navigate("/exames")}
          disabled={loading}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          onClick={saveExamRequest}
          disabled={loading}
          className="flex-1"
        >
          <FileText className="mr-2 h-4 w-4" />
          Criar Solicitação
        </Button>
      </div>
    </div>
  );
}

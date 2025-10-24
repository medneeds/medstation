import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, FileSignature, AlertCircle, User, Stethoscope, UserPlus } from "lucide-react";
import { z } from "zod";

const medicationSchema = z.object({
  name: z.string().min(1, "Nome do medicamento é obrigatório").max(200),
  dosage: z.string().min(1, "Dosagem é obrigatória").max(100),
  frequency: z.string().min(1, "Frequência é obrigatória").max(200),
  duration: z.string().min(1, "Duração é obrigatória").max(100),
  instructions: z.string().max(500).optional(),
});

interface Patient {
  id: string;
  name: string;
  cpf: string;
  date_of_birth: string;
}

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function NewPrescription() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedPatientData, setSelectedPatientData] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [cidCode, setCidCode] = useState("");
  const [validityDays, setValidityDays] = useState("30");
  const [observations, setObservations] = useState("");
  const [medications, setMedications] = useState<Medication[]>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);
  
  // New patient form state
  const [newPatientDialogOpen, setNewPatientDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    cpf: "",
    date_of_birth: "",
    phone: "",
    email: "",
    notes: "",
  });

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

  // Load data from copy/renew
  useEffect(() => {
    const state = location.state as any;
    if (state?.copyFrom) {
      const { patient_id, diagnosis, cid_code, medications, observations } = state.copyFrom;
      setSelectedPatient(patient_id || "");
      setDiagnosis(diagnosis || "");
      setCidCode(cid_code || "");
      setMedications(medications || [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
      setObservations(observations || "");
    }
  }, [location.state]);

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

  const createNewPatient = async () => {
    try {
      if (!newPatient.name.trim() || !newPatient.cpf.trim()) {
        toast({
          title: "Campos obrigatórios",
          description: "Nome e CPF são obrigatórios",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("patients")
        .insert({
          user_id: user.id,
          name: newPatient.name.trim(),
          cpf: newPatient.cpf.trim(),
          date_of_birth: newPatient.date_of_birth || null,
          phone: newPatient.phone.trim() || null,
          email: newPatient.email.trim() || null,
          notes: newPatient.notes.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Paciente criado",
        description: "Paciente adicionado com sucesso",
      });

      // Reset form and close dialog
      setNewPatient({
        name: "",
        cpf: "",
        date_of_birth: "",
        phone: "",
        email: "",
        notes: "",
      });
      setNewPatientDialogOpen(false);

      // Refresh patients list and select the new patient
      await fetchPatients();
      setSelectedPatient(data.id);
    } catch (error: any) {
      toast({
        title: "Erro ao criar paciente",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
  };

  const removeMedication = (index: number) => {
    if (medications.length > 1) {
      setMedications(medications.filter((_, i) => i !== index));
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const validateForm = () => {
    // Validate profile data for digital signature
    if (!profile?.crm || !profile?.crm_state) {
      toast({
        title: "Dados do médico incompletos",
        description: "É necessário ter CRM e Estado cadastrados para assinar prescrições. Complete seu perfil.",
        variant: "destructive",
      });
      return false;
    }

    if (!profile?.full_name) {
      toast({
        title: "Dados do médico incompletos",
        description: "É necessário ter nome completo cadastrado. Complete seu perfil.",
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

    if (!diagnosis.trim()) {
      toast({
        title: "Erro de validação",
        description: "Digite o diagnóstico",
        variant: "destructive",
      });
      return false;
    }

    // Validate medications
    for (let i = 0; i < medications.length; i++) {
      const med = medications[i];
      try {
        medicationSchema.parse(med);
      } catch (error: any) {
        toast({
          title: `Erro no medicamento ${i + 1}`,
          description: error.errors[0]?.message || "Dados inválidos",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const savePrescription = async (status: "draft" | "pending_signature") => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Generate prescription number
      const { data: numberData, error: numberError } = await supabase
        .rpc("generate_prescription_number");

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          patient_id: selectedPatient,
          prescription_number: numberData,
          diagnosis: diagnosis.trim(),
          cid_code: cidCode.trim() || null,
          validity_days: parseInt(validityDays),
          observations: observations.trim() || null,
          medications: medications.filter(m => m.name.trim()) as any,
          status,
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: status === "draft" ? "Rascunho salvo" : "Prescrição criada",
        description:
          status === "draft"
            ? "Você pode editá-la depois"
            : "Aguardando assinatura digital",
      });

      navigate(`/prescricoes/${data.id}`);
    } catch (error: any) {
      console.error("Error saving prescription:", error);
      toast({
        title: "Erro ao salvar prescrição",
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
        <Button variant="ghost" size="icon" onClick={() => navigate("/prescricoes")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Prescrição Médica</h1>
          <p className="text-muted-foreground">
            Prescrição válida com assinatura digital
          </p>
        </div>
      </div>

      {/* Doctor Info Validation Alert */}
      {(!profile?.crm || !profile?.crm_state || !profile?.full_name) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Atenção:</strong> Para criar prescrições válidas, complete seus dados profissionais (CRM, Estado, Nome Completo) em{" "}
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
            <CardTitle>Dados do Prescritor</CardTitle>
          </div>
          <CardDescription>Informações que constarão na prescrição</CardDescription>
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
            <div>
              <Label className="text-muted-foreground text-sm">Especialidade</Label>
              <p className="font-medium">{profile?.specialty || "Não informada"}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-sm">Localização</Label>
              <p className="font-medium text-sm">
                {profile?.city && profile?.state
                  ? `${profile.city} - ${profile.state}`
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
          <CardDescription>Selecione o paciente para esta prescrição</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="patient">Paciente *</Label>
              <Dialog open={newPatientDialogOpen} onOpenChange={setNewPatientDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Novo Paciente
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
                    <DialogDescription>
                      Preencha os dados do paciente para incluir na prescrição
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-name">Nome Completo *</Label>
                        <Input
                          id="new-name"
                          value={newPatient.name}
                          onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                          placeholder="Nome completo do paciente"
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-cpf">CPF *</Label>
                        <Input
                          id="new-cpf"
                          value={newPatient.cpf}
                          onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })}
                          placeholder="000.000.000-00"
                          maxLength={14}
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-dob">Data de Nascimento</Label>
                        <Input
                          id="new-dob"
                          type="date"
                          value={newPatient.date_of_birth}
                          onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-phone">Telefone</Label>
                        <Input
                          id="new-phone"
                          value={newPatient.phone}
                          onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                          placeholder="(00) 00000-0000"
                          maxLength={15}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-email">E-mail</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                        placeholder="email@exemplo.com"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-notes">Observações</Label>
                      <Textarea
                        id="new-notes"
                        value={newPatient.notes}
                        onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                        placeholder="Alergias, condições especiais, etc..."
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setNewPatientDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={createNewPatient}>
                        Cadastrar Paciente
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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

      {/* Diagnosis */}
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico e CID</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="diagnosis">Diagnóstico *</Label>
            <Textarea
              id="diagnosis"
              placeholder="Descreva o diagnóstico..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
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
              <Label htmlFor="validity">Validade (dias)</Label>
              <Input
                id="validity"
                type="number"
                min="1"
                max="365"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Medicamentos</CardTitle>
              <CardDescription>Adicione os medicamentos prescritos</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addMedication}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {medications.map((medication, index) => (
            <Card key={index} className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Medicamento {index + 1}</h4>
                  {medications.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMedication(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Nome do Medicamento *</Label>
                  <Input
                    placeholder="Ex: Dipirona Sódica 500mg"
                    value={medication.name}
                    onChange={(e) => updateMedication(index, "name", e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Dosagem *</Label>
                    <Input
                      placeholder="Ex: 500mg"
                      value={medication.dosage}
                      onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequência *</Label>
                    <Input
                      placeholder="Ex: 8 em 8 horas"
                      value={medication.frequency}
                      onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                      maxLength={200}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Duração do Tratamento *</Label>
                  <Input
                    placeholder="Ex: 7 dias"
                    value={medication.duration}
                    onChange={(e) => updateMedication(index, "duration", e.target.value)}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Instruções Adicionais</Label>
                  <Textarea
                    placeholder="Ex: Tomar com água, após as refeições..."
                    value={medication.instructions}
                    onChange={(e) =>
                      updateMedication(index, "instructions", e.target.value)
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
            placeholder="Adicione observações gerais para o paciente..."
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
          onClick={() => savePrescription("draft")}
          disabled={loading}
          className="flex-1"
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar Rascunho
        </Button>
        <Button
          onClick={() => savePrescription("pending_signature")}
          disabled={loading}
          className="flex-1"
        >
          <FileSignature className="mr-2 h-4 w-4" />
          Criar e Solicitar Assinatura
        </Button>
      </div>
    </div>
  );
}

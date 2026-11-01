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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Save, FileSignature, AlertCircle, User, Stethoscope, UserPlus, Mic } from "lucide-react";
import { z } from "zod";
import VoiceRecorder from "@/components/VoiceRecorder";
import { PrescriptionTemplatesBar } from "@/components/prescriptions/PrescriptionTemplatesBar";
import { allergyHits } from "@/lib/patientClinical";
import { patientSchema } from "@/lib/validations";
import {
  decideDictatedPatient,
  isMedicationFilled,
  matchDictatedPatient,
  mergeDictatedMedications,
  parseValidityDays,
} from "@/lib/prescriptionForm";

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
  allergies?: string | null;
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
  // Qual botão está salvando (null = nenhum): mostra "Salvando..." só nele e trava os dois.
  const [savingAs, setSavingAs] = useState<"draft" | "pending_signature" | null>(null);
  const loading = savingAs !== null;
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
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  // Medicamento a remover (índice + nome no momento do pedido) e se a confirmação está aberta.
  // O item fica guardado depois de fechar para o título não piscar vazio na animação de saída.
  const [medToRemove, setMedToRemove] = useState<{ index: number; name: string } | null>(null);
  const [medRemoveOpen, setMedRemoveOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newPatient, setNewPatient] = useState({
    name: "",
    cpf: "",
    date_of_birth: "",
    phone: "",
    email: "",
    allergies: "",
    notes: "",
  });

  // Filter patients based on search term
  const filteredPatients = patients.filter((patient) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      patient.name.toLowerCase().includes(searchLower) ||
      (patient.cpf && patient.cpf.includes(searchLower))
    );
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

  // Load data from copy/renew or preselected patient
  useEffect(() => {
    const state = location.state as any;
    if (state?.copyFrom) {
      const { patient_id, diagnosis, cid_code, medications, observations } = state.copyFrom;
      setSelectedPatient(patient_id || "");
      setDiagnosis(diagnosis || "");
      setCidCode(cid_code || "");
      setMedications(medications || [{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
      setObservations(observations || "");
    } else if (state?.preselectedPatient) {
      setSelectedPatient(state.preselectedPatient);
    }
  }, [location.state]);

  // Há conteúdo que se perderia ao sair da página?
  const isDirty =
    diagnosis.trim() !== "" ||
    cidCode.trim() !== "" ||
    observations.trim() !== "" ||
    medications.some(isMedicationFilled);

  // Aviso do navegador (recarregar/fechar aba) só enquanto houver conteúdo não salvo.
  useEffect(() => {
    if (!isDirty || loading) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty, loading]);

  const handleBack = () => {
    if (isDirty) setLeaveConfirmOpen(true);
    else navigate("/prescricoes");
  };

  const handleVoiceTranscription = (data: any) => {
    // Fill diagnosis
    if (data.diagnosis) {
      setDiagnosis(data.diagnosis);
    }

    // Fill CID code
    if (data.cid_code) {
      setCidCode(data.cid_code);
    }

    // Fill medications — o ditado entra depois do que já foi digitado (nunca apaga)
    if (data.medications && data.medications.length > 0) {
      const dictated: Medication[] = data.medications.map((med: any) => ({
        name: med.name || "",
        dosage: med.dosage || "",
        frequency: med.frequency || "",
        duration: med.duration || "",
        instructions: med.instructions || "",
      }));
      setMedications((current) => mergeDictatedMedications(current, dictated));
    }

    // Fill observations
    if (data.observations) {
      setObservations(data.observations);
    }

    // Fill validity
    if (data.validity_days) {
      setValidityDays(data.validity_days.toString());
    }

    // Paciente pelo nome ditado: só seleciona quando ninguém está selecionado e há um único
    // nome completo idêntico. Com paciente já selecionado, nunca troca — só avisa se divergir.
    if (data.patient_name) {
      const dictatedName = String(data.patient_name);
      const selectedName = selectedPatient
        ? selectedPatientData?.name ?? patients.find((pt) => pt.id === selectedPatient)?.name ?? ""
        : null;
      const decision = decideDictatedPatient(selectedName, matchDictatedPatient(patients, dictatedName), dictatedName);
      if (decision.action === "select") {
        setSelectedPatient(decision.patient.id);
        toast({
          title: "Paciente identificado",
          description: `${decision.patient.name} selecionado automaticamente. Confira antes de salvar.`,
        });
      } else if (decision.action === "warn") {
        toast({
          title: "Paciente diferente do ditado",
          description: `O paciente ditado (${dictatedName}) é diferente do selecionado (${selectedName}). Confira antes de salvar.`,
          variant: "destructive",
        });
      } else if (decision.action === "ask") {
        toast({
          title: "Selecione o paciente",
          description:
            decision.reason === "ambiguous"
              ? `Nome ditado: "${dictatedName}". Há ${decision.count} pacientes com esse nome; escolha na lista.`
              : `Nome ditado: "${dictatedName}". Nenhum paciente com esse nome completo; escolha na lista.`,
        });
      }
    }
  };

  const fetchPatients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("patients")
        .select("id, name, cpf, date_of_birth, allergies")
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
    // Mesma validação/normalização do cadastro de pacientes (CPF opcional).
    const parsed = patientSchema.safeParse({
      name: newPatient.name,
      cpf: newPatient.cpf,
      date_of_birth: newPatient.date_of_birth,
      phone: newPatient.phone,
      email: newPatient.email,
      notes: newPatient.notes,
    });
    if (!parsed.success) {
      toast({
        title: "Confira os dados do paciente",
        description: parsed.error.issues[0]?.message || "Dados inválidos",
        variant: "destructive",
      });
      return;
    }

    setCreatingPatient(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("patients")
        .insert({
          ...parsed.data,
          // Mesma regra de src/pages/Patients.tsx: é este campo que dispara o aviso de alergia.
          allergies: newPatient.allergies.trim().slice(0, 300) || null,
          user_id: user.id,
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
        allergies: "",
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
    } finally {
      setCreatingPatient(false);
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

  // Card com conteúdo pede confirmação; card vazio sai direto.
  const requestRemoveMedication = (index: number) => {
    if (isMedicationFilled(medications[index])) {
      setMedToRemove({ index, name: medications[index].name.trim() });
      setMedRemoveOpen(true);
    } else {
      removeMedication(index);
    }
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const applyTemplate = (meds: Medication[], templateObs: string | null) => {
    const current = medications.filter((m) => m.name.trim());
    setMedications(current.length ? [...current, ...meds] : meds);
    if (templateObs && !observations.trim()) setObservations(templateObs);
  };

  const allergyWarnings = medications
    .map((m, i) => ({ index: i, hits: allergyHits(m.name, selectedPatientData?.allergies) }))
    .filter((w) => w.hits.length > 0);

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

    if (allergyWarnings.length > 0) {
      const list = allergyWarnings.map((w) => `Medicamento ${w.index + 1}: ${w.hits.join(", ")}`).join("\n");
      const ok = window.confirm(
        `Atenção: o paciente tem alergia registrada que aparece nesta receita.\n\n${list}\n\nDeseja manter a prescrição mesmo assim?`
      );
      if (!ok) return false;
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

    setSavingAs(status);
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
          validity_days: parseValidityDays(validityDays),
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

      // "Criar e Solicitar Assinatura" já abre o assistente do PDF oficial no detalhe.
      navigate(
        `/prescricoes/${data.id}`,
        status === "pending_signature" ? { state: { openOfficialPdf: true } } : undefined,
      );
    } catch (error: any) {
      console.error("Error saving prescription:", error);
      toast({
        title: "Erro ao salvar prescrição",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingAs(null);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Voltar para prescrições">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Prescrição Médica</h1>
          <p className="text-muted-foreground">
            Prescrição válida com assinatura digital
          </p>
        </div>
      </div>

      {/* Voice Recorder */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Reconhecimento de Voz por IA
          </CardTitle>
          <CardDescription>
            Dite a prescrição completa e a IA preencherá os campos automaticamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VoiceRecorder onTranscriptionComplete={handleVoiceTranscription} />
        </CardContent>
      </Card>

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
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle>Dados do Paciente</CardTitle>
          </div>
          <CardDescription>Selecione ou pesquise o paciente para esta prescrição</CardDescription>
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
                        <Label htmlFor="new-cpf">CPF</Label>
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
                      <Label htmlFor="new-allergies">Alergias</Label>
                      <Input
                        id="new-allergies"
                        value={newPatient.allergies}
                        onChange={(e) => setNewPatient({ ...newPatient, allergies: e.target.value })}
                        placeholder="Ex: dipirona, penicilina (separe por vírgula)"
                        maxLength={300}
                      />
                      <p className="text-xs text-muted-foreground">Avisa você ao prescrever um medicamento listado aqui.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-notes">Observações</Label>
                      <Textarea
                        id="new-notes"
                        value={newPatient.notes}
                        onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                        placeholder="Condições especiais, preferências de contato, etc..."
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
                      <Button onClick={createNewPatient} disabled={creatingPatient}>
                        {creatingPatient ? "Salvando..." : "Cadastrar Paciente"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger id="patient">
                <SelectValue placeholder="Pesquise por nome ou CPF..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Buscar paciente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {filteredPatients.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    Nenhum paciente encontrado
                  </div>
                ) : (
                  filteredPatients.map((patient) => (
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
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedPatientData?.allergies && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Alergias do paciente:</strong> {selectedPatientData.allergies}
              </AlertDescription>
            </Alert>
          )}
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
                onBlur={() => setValidityDays(String(parseValidityDays(validityDays)))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Medications */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Medicamentos</CardTitle>
              <CardDescription>Adicione os medicamentos ou use um dos seus modelos</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <PrescriptionTemplatesBar
                medications={medications}
                observations={observations}
                onApply={applyTemplate}
              />
              <Button variant="outline" size="sm" onClick={addMedication}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </div>
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
                      onClick={() => requestRemoveMedication(index)}
                      aria-label={`Remover medicamento ${index + 1}`}
                      className="min-h-11 min-w-11 md:min-h-0 md:min-w-0 text-destructive hover:text-destructive"
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
                  {allergyHits(medication.name, selectedPatientData?.allergies).length > 0 && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      Possível alergia: {allergyHits(medication.name, selectedPatientData?.allergies).join(", ")}. Confira antes de prescrever.
                    </p>
                  )}
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
          {savingAs === "draft" ? "Salvando..." : "Salvar Rascunho"}
        </Button>
        <Button
          onClick={() => savePrescription("pending_signature")}
          disabled={loading}
          className="flex-1"
        >
          <FileSignature className="mr-2 h-4 w-4" />
          {savingAs === "pending_signature" ? "Salvando..." : "Criar e Solicitar Assinatura"}
        </Button>
      </div>

      {/* Confirmação ao sair com conteúdo não salvo */}
      <AlertDialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair sem salvar?</AlertDialogTitle>
            <AlertDialogDescription>
              O que você preencheu nesta prescrição será perdido. Para guardar, use "Salvar Rascunho".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/prescricoes")}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair sem salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação ao remover medicamento preenchido */}
      <AlertDialog open={medRemoveOpen} onOpenChange={setMedRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover medicamento {medToRemove ? medToRemove.index + 1 : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              {medToRemove?.name
                ? `${medToRemove.name} sairá desta prescrição.`
                : "Os dados deste medicamento sairão desta prescrição."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (medToRemove) removeMedication(medToRemove.index);
                setMedRemoveOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

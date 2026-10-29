import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, User, Calendar, Phone, Mail, MoreVertical, Folder, AlertTriangle, X } from "lucide-react";
import { PRESET_CLINICAL_TAGS, MAX_CLINICAL_TAGS, normalizeTags, foldText } from "@/lib/patientClinical";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { patientSchema } from "@/lib/validations";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface Patient {
  id: string;
  name: string;
  date_of_birth: string | null;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  archived: boolean | null;
  clinical_tags: string[] | null;
  allergies: string | null;
  created_at: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [caseStats, setCaseStats] = useState<Record<string, { count: number; last: string }>>({});
  const [casesThisMonth, setCasesThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [customTag, setCustomTag] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    date_of_birth: "",
    cpf: "",
    phone: "",
    email: "",
    notes: "",
    allergies: "",
    clinical_tags: [] as string[],
  });

  useEffect(() => {
    fetchPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showArchived]);

  const fetchPatients = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado",
      });
      return;
    }

    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("user_id", user.id)
      .eq("archived", showArchived)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pacientes",
        description: error.message,
      });
    } else {
      setPatients(data || []);
      const { data: cases } = await supabase
        .from("cases")
        .select("patient_id, consultation_date, created_at")
        .eq("user_id", user.id)
        .not("patient_id", "is", null);
      const stats: Record<string, { count: number; last: string }> = {};
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      let month = 0;
      (cases || []).forEach((c) => {
        if (!c.patient_id) return;
        const when = c.consultation_date || c.created_at;
        const cur = stats[c.patient_id] || { count: 0, last: when };
        cur.count += 1;
        if (when > cur.last) cur.last = when;
        stats[c.patient_id] = cur;
        if (new Date(c.created_at) >= monthStart) month += 1;
      });
      setCaseStats(stats);
      setCasesThisMonth(month);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      const base = patientSchema.parse(formData);
      const validated = {
        ...base,
        allergies: formData.allergies.trim().slice(0, 300) || null,
        clinical_tags: normalizeTags(formData.clinical_tags),
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingPatient) {
        const { error } = await supabase
          .from("patients")
          .update(validated)
          .eq("id", editingPatient.id);

        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao atualizar",
            description: error.message,
          });
        } else {
          toast({ title: "Paciente atualizado!" });
          fetchPatients();
          resetForm();
        }
      } else {
        const { error } = await supabase
          .from("patients")
          .insert([{ ...validated, user_id: user.id }]);

        if (error) {
          toast({
            variant: "destructive",
            title: "Erro ao criar paciente",
            description: error.message,
          });
        } else {
          toast({ title: "Paciente criado!" });
          fetchPatients();
          resetForm();
        }
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
      name: "",
      date_of_birth: "",
      cpf: "",
      phone: "",
      email: "",
      notes: "",
      allergies: "",
      clinical_tags: [],
    });
    setCustomTag("");
    setEditingPatient(null);
    setDialogOpen(false);
  };

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setFormData({
      name: patient.name,
      date_of_birth: patient.date_of_birth || "",
      cpf: patient.cpf || "",
      phone: patient.phone || "",
      email: patient.email || "",
      notes: patient.notes || "",
      allergies: patient.allergies || "",
      clinical_tags: patient.clinical_tags || [],
    });
    setCustomTag("");
    setDialogOpen(true);
  };

  const toggleFormTag = (tag: string) => {
    const has = formData.clinical_tags.some((t) => foldText(t) === foldText(tag));
    const next = has
      ? formData.clinical_tags.filter((t) => foldText(t) !== foldText(tag))
      : normalizeTags([...formData.clinical_tags, tag]);
    setFormData({ ...formData, clinical_tags: next });
  };

  const addCustomTag = () => {
    if (!customTag.trim()) return;
    setFormData({ ...formData, clinical_tags: normalizeTags([...formData.clinical_tags, customTag]) });
    setCustomTag("");
  };

  const handleArchive = async (patientId: string, archived = true) => {
    const { error } = await supabase
      .from("patients")
      .update({ archived })
      .eq("id", patientId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao arquivar",
        description: error.message,
      });
    } else {
      toast({ title: archived ? "Paciente arquivado" : "Paciente reativado" });
      fetchPatients();
    }
  };

  const q = foldText(searchQuery);
  const filteredPatients = patients.filter((p) => {
    if (tagFilter && !(p.clinical_tags || []).some((t) => foldText(t) === foldText(tagFilter))) return false;
    if (!q) return true;
    return (
      foldText(p.name).includes(q) ||
      !!p.cpf?.includes(searchQuery.trim()) ||
      foldText(p.email || "").includes(q) ||
      (p.clinical_tags || []).some((t) => foldText(t).includes(q))
    );
  });

  const usedTags = Array.from(
    new Map(patients.flatMap((p) => p.clinical_tags || []).map((t) => [foldText(t), t])).values()
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="label-mono text-primary mb-1 flex items-center gap-2">Acervo clínico<span className="rounded-full border border-primary/40 bg-primary/10 px-1.5 py-px text-[9px] font-semibold tracking-wider">BETA</span></p>
          <h1 className="text-2xl md:text-3xl font-bold">Meus Pacientes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Seu banco de pacientes, com os casos clínicos vinculados a cada um</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} size="sm" className="md:size-default w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
              <DialogDescription>
                Preencha os dados do paciente
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Data de Nascimento</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Input
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="Ex: dipirona, penicilina (separe por vírgula)"
                    maxLength={300}
                  />
                  <p className="text-xs text-muted-foreground">Aparece em destaque na ficha e avisa você ao prescrever.</p>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Etiquetas clínicas</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_CLINICAL_TAGS.map((tag) => {
                      const active = formData.clinical_tags.some((t) => foldText(t) === foldText(tag));
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleFormTag(tag)}
                          aria-pressed={active}
                          className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                            active ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  {formData.clinical_tags.filter((t) => !PRESET_CLINICAL_TAGS.some((p) => foldText(p) === foldText(t))).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {formData.clinical_tags
                        .filter((t) => !PRESET_CLINICAL_TAGS.some((p) => foldText(p) === foldText(t)))
                        .map((t) => (
                          <Badge key={t} variant="secondary" className="gap-1">
                            {t}
                            <button type="button" onClick={() => toggleFormTag(t)} aria-label={`Remover ${t}`}>
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
                      placeholder="Outra etiqueta (ex: Asmático)"
                      maxLength={30}
                      disabled={formData.clinical_tags.length >= MAX_CLINICAL_TAGS}
                    />
                    <Button type="button" variant="outline" onClick={addCustomTag} disabled={!customTag.trim() || formData.clinical_tags.length >= MAX_CLINICAL_TAGS}>
                      Adicionar
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPatient ? "Atualizar" : "Criar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {[
          { label: showArchived ? "Pacientes arquivados" : "Pacientes ativos", value: patients.length },
          { label: "Com casos vinculados", value: Object.keys(caseStats).length },
          { label: "Casos neste mês", value: casesThisMonth },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border bg-card px-3 py-2 md:px-4 md:py-3">
            <p className="text-xl md:text-2xl font-bold tabular-nums">{loading ? "–" : m.value}</p>
            <p className="text-2xs md:text-xs text-muted-foreground leading-tight">{m.label}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar por nome, CPF, email ou etiqueta..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
            <div className="inline-flex rounded-md border p-0.5 text-xs self-start sm:self-auto" role="tablist" aria-label="Filtrar pacientes">
              {[{ v: false, l: "Ativos" }, { v: true, l: "Arquivados" }].map((o) => (
                <button
                  key={o.l}
                  type="button"
                  role="tab"
                  aria-selected={showArchived === o.v}
                  onClick={() => { setShowArchived(o.v); setTagFilter(null); }}
                  className={`rounded px-3 py-1.5 transition-colors ${showArchived === o.v ? "bg-primary/15 text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          {usedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {usedTags.map((t) => {
                const active = tagFilter !== null && foldText(tagFilter) === foldText(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTagFilter(active ? null : t)}
                    aria-pressed={active}
                    className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                      active ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filteredPatients.length === 0 ? (
            <EmptyState
              icon={User}
              title={searchQuery || tagFilter ? "Nenhum paciente bate com a busca" : showArchived ? "Nenhum paciente arquivado" : "Nenhum paciente ainda"}
              description={
                searchQuery || tagFilter
                  ? "Tente outro nome, CPF, email ou etiqueta."
                  : showArchived
                  ? "Pacientes arquivados aparecem aqui e podem ser reativados."
                  : "Cadastre seu primeiro paciente — leva menos de 1 minuto."
              }
              actionLabel={searchQuery || tagFilter || showArchived ? undefined : "Cadastrar primeiro paciente"}
              actionIcon={searchQuery || tagFilter || showArchived ? undefined : Plus}
              onAction={searchQuery || tagFilter || showArchived ? undefined : () => { resetForm(); setDialogOpen(true); }}
            />
          ) : (
            <div className="grid gap-4">
              {filteredPatients.map((patient) => {
                const age = calculateAge(patient.date_of_birth);
                return (
                  <Card key={patient.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="p-3 md:p-4">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 md:gap-3 mb-2">
                            <div className="rounded-full p-2 bg-primary/10 shrink-0">
                              <User className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base md:text-lg truncate">{patient.name}</h3>
                              <p className="text-xs text-muted-foreground">
                                {caseStats[patient.id]
                                  ? `${caseStats[patient.id].count} caso(s) · último em ${new Date(caseStats[patient.id].last).toLocaleDateString("pt-BR")}`
                                  : "Nenhum caso vinculado"}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {age !== null && (
                                  <Badge variant="secondary" className="text-xs">
                                    {age} anos
                                  </Badge>
                                )}
                                {(patient.clinical_tags || []).map((t) => (
                                  <Badge key={t} variant="outline" className="text-xs font-normal">
                                    {t}
                                  </Badge>
                                ))}
                                {patient.allergies && (
                                  <Badge variant="outline" className="text-xs font-normal border-destructive/40 text-destructive gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Alergia: {patient.allergies.length > 40 ? `${patient.allergies.slice(0, 40)}…` : patient.allergies}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-8 md:ml-12 text-xs md:text-sm text-muted-foreground">
                            {patient.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                {patient.phone}
                              </div>
                            )}
                            {patient.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                {patient.email}
                              </div>
                            )}
                            {patient.date_of_birth && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {new Date(patient.date_of_birth).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-8 md:ml-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="flex-1 md:flex-none"
                          >
                            <Folder className="h-4 w-4 md:mr-2" />
                            <span className="hidden sm:inline">Ver Histórico</span>
                            <span className="sm:hidden">Histórico</span>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" aria-label="Mais ações do paciente">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(patient)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(patient.id, !patient.archived)}>
                                {patient.archived ? "Reativar" : "Arquivar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
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

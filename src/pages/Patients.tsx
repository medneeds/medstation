import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, User, Calendar, Phone, Mail, MoreVertical, Folder } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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
  archived: boolean;
  created_at: string;
}

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
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
  });

  useEffect(() => {
    fetchPatients();
  }, []);

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
      .eq("archived", false)
      .order("name");

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar pacientes",
        description: error.message,
      });
    } else {
      setPatients(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input
      const validated = patientSchema.parse(formData);

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
    });
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
    });
    setDialogOpen(true);
  };

  const handleArchive = async (patientId: string) => {
    const { error } = await supabase
      .from("patients")
      .update({ archived: true })
      .eq("id", patientId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao arquivar",
        description: error.message,
      });
    } else {
      toast({ title: "Paciente arquivado" });
      fetchPatients();
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.cpf?.includes(searchQuery) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie seus pacientes e históricos clínicos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPatient ? "Editar Paciente" : "Novo Paciente"}</DialogTitle>
              <DialogDescription>
                Preencha os dados do paciente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CPF ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum paciente encontrado</p>
              <p className="text-sm mt-1">Crie um novo paciente para começar</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredPatients.map((patient) => {
                const age = calculateAge(patient.date_of_birth);
                return (
                  <Card key={patient.id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="rounded-full p-2 bg-primary/10">
                              <User className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg">{patient.name}</h3>
                              {age && (
                                <Badge variant="secondary" className="text-xs">
                                  {age} anos
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 ml-12 text-sm text-muted-foreground">
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
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/patients/${patient.id}`)}
                          >
                            <Folder className="h-4 w-4 mr-2" />
                            Ver Histórico
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(patient)}>
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleArchive(patient.id)}>
                                Arquivar
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

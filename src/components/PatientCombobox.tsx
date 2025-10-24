import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Plus, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { patientSchema } from "@/lib/validations";

interface Patient {
  id: string;
  name: string;
  cpf?: string;
  phone?: string;
}

interface PatientComboboxProps {
  value: string;
  onChange: (value: string) => void;
  onPatientCreated?: () => void;
}

export function PatientCombobox({ value, onChange, onPatientCreated }: PatientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [newPatient, setNewPatient] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    date_of_birth: "",
    notes: "",
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("patients")
      .select("id, name, cpf, phone")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("name");

    if (!error && data) {
      setPatients(data);
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validated = patientSchema.parse(newPatient);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("patients")
        .insert([{ ...validated, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "✓ Paciente criado!",
        description: `${data.name} foi adicionado com sucesso.`,
      });

      await fetchPatients();
      onChange(data.id);
      setDialogOpen(false);
      setNewPatient({
        name: "",
        cpf: "",
        phone: "",
        email: "",
        date_of_birth: "",
        notes: "",
      });
      
      if (onPatientCreated) {
        onPatientCreated();
      }
    } catch (error: any) {
      toast({
        title: "Erro ao criar paciente",
        description: error.errors?.[0]?.message || error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedPatient = patients.find((p) => p.id === value);
  
  const filteredPatients = patients.filter((patient) => {
    const search = searchQuery.toLowerCase();
    return (
      patient.name.toLowerCase().includes(search) ||
      patient.cpf?.toLowerCase().includes(search) ||
      patient.phone?.toLowerCase().includes(search)
    );
  });

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            {value === "unidentified" ? (
              <span className="flex items-center gap-2">
                <span>🕶️</span>
                <span>Não identificar paciente</span>
              </span>
            ) : selectedPatient ? (
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {selectedPatient.name}
              </span>
            ) : (
              <span className="text-muted-foreground">Selecione um paciente...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <div className="flex items-center border-b px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                placeholder="Buscar paciente por nome, CPF ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <CommandList>
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-muted-foreground mb-3">Nenhum paciente encontrado</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar novo paciente
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="unidentified"
                  onSelect={() => {
                    onChange("unidentified");
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "unidentified" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span>🕶️</span>
                    <div>
                      <p className="font-medium">Não identificar paciente</p>
                      <p className="text-xs text-muted-foreground">Caso sem identificação</p>
                    </div>
                  </div>
                </CommandItem>
                
                {filteredPatients.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === patient.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div>
                      <p className="font-medium">{patient.name}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {patient.cpf && <span>CPF: {patient.cpf}</span>}
                        {patient.phone && <span>{patient.phone}</span>}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              
              {filteredPatients.length > 0 && (
                <div className="border-t p-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setOpen(false);
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Criar novo paciente
                  </Button>
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>
              Crie um novo paciente para vincular ao caso
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleCreatePatient} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-patient-name">Nome Completo *</Label>
              <Input
                id="new-patient-name"
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                placeholder="Nome do paciente"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-patient-cpf">CPF</Label>
                <Input
                  id="new-patient-cpf"
                  value={newPatient.cpf}
                  onChange={(e) => setNewPatient({ ...newPatient, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-patient-phone">Telefone</Label>
                <Input
                  id="new-patient-phone"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-patient-email">Email</Label>
                <Input
                  id="new-patient-email"
                  type="email"
                  value={newPatient.email}
                  onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-patient-dob">Data de Nascimento</Label>
                <Input
                  id="new-patient-dob"
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={(e) => setNewPatient({ ...newPatient, date_of_birth: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-patient-notes">Observações</Label>
              <Input
                id="new-patient-notes"
                value={newPatient.notes}
                onChange={(e) => setNewPatient({ ...newPatient, notes: e.target.value })}
                placeholder="Observações adicionais..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Paciente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

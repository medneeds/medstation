import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Building2, MapPin, Calendar, Stethoscope, Award } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { profileSchema } from "@/lib/validations";
import { z } from "zod";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const MEDICAL_SPECIALTIES = [
  "Clínica Geral", "Cardiologia", "Dermatologia", "Endocrinologia", "Gastroenterologia",
  "Geriatria", "Ginecologia", "Hematologia", "Infectologia", "Nefrologia",
  "Neurologia", "Oftalmologia", "Oncologia", "Ortopedia", "Otorrinolaringologia",
  "Pediatria", "Pneumologia", "Psiquiatria", "Reumatologia", "Urologia", "Cirurgia Geral",
  "Medicina de Família", "Outra"
];

export default function Settings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: "",
    date_of_birth: "",
    crm: "",
    crm_state: "",
    specialty: "",
    graduation_year: null as number | null,
    phone: "",
    cpf: "",
    rqe: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    postal_code: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          date_of_birth: data.date_of_birth || "",
          crm: data.crm || "",
          crm_state: data.crm_state || "",
          specialty: data.specialty || "",
          graduation_year: data.graduation_year || null,
          phone: data.phone || "",
          cpf: data.cpf || "",
          rqe: data.rqe || "",
          bio: data.bio || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          postal_code: data.postal_code || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o perfil.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validação com Zod
      const validatedData = profileSchema.parse(profile);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("profiles")
        .update(validatedData)
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: "Erro de validação",
          description: "Por favor, corrija os campos destacados.",
          variant: "destructive",
        });
      } else {
        console.error("Erro ao salvar perfil:", error);
        toast({
          title: "Erro",
          description: "Não foi possível salvar o perfil.",
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return value;
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 8) {
      return numbers.replace(/(\d{5})(\d)/, "$1-$2");
    }
    return value;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl pb-8">
      <div>
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações profissionais</p>
      </div>

      {/* Informações Pessoais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>Dados básicos do profissional</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo *</Label>
              <Input
                id="full_name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className={errors.full_name ? "border-destructive" : ""}
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_of_birth">Data de Nascimento</Label>
              <Input
                id="date_of_birth"
                type="date"
                value={profile.date_of_birth}
                onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                className={errors.date_of_birth ? "border-destructive" : ""}
              />
              {errors.date_of_birth && (
                <p className="text-sm text-destructive">{errors.date_of_birth}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                value={profile.cpf}
                onChange={(e) => setProfile({ ...profile, cpf: formatCPF(e.target.value) })}
                placeholder="000.000.000-00"
                maxLength={14}
                className={errors.cpf ? "border-destructive" : ""}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive">{errors.cpf}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: formatPhone(e.target.value) })}
                placeholder="(00) 00000-0000"
                maxLength={15}
                className={errors.phone ? "border-destructive" : ""}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Biografia / Apresentação</Label>
            <Textarea
              id="bio"
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Breve apresentação profissional..."
              rows={3}
              maxLength={500}
              className={errors.bio ? "border-destructive" : ""}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              {errors.bio ? (
                <p className="text-destructive">{errors.bio}</p>
              ) : (
                <span></span>
              )}
              <span>{profile.bio.length}/500</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credenciais Profissionais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Credenciais Profissionais
          </CardTitle>
          <CardDescription>Registros e qualificações médicas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="crm">CRM</Label>
              <Input
                id="crm"
                value={profile.crm}
                onChange={(e) => setProfile({ ...profile, crm: e.target.value })}
                placeholder="123456"
                className={errors.crm ? "border-destructive" : ""}
              />
              {errors.crm && (
                <p className="text-sm text-destructive">{errors.crm}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm_state">UF do CRM</Label>
              <Select
                value={profile.crm_state}
                onValueChange={(value) => setProfile({ ...profile, crm_state: value })}
              >
                <SelectTrigger className={errors.crm_state ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.crm_state && (
                <p className="text-sm text-destructive">{errors.crm_state}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="rqe">RQE (Opcional)</Label>
              <Input
                id="rqe"
                value={profile.rqe}
                onChange={(e) => setProfile({ ...profile, rqe: e.target.value })}
                placeholder="RQE número"
                className={errors.rqe ? "border-destructive" : ""}
              />
              {errors.rqe && (
                <p className="text-sm text-destructive">{errors.rqe}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="specialty">Especialidade</Label>
              <Select
                value={profile.specialty}
                onValueChange={(value) => setProfile({ ...profile, specialty: value })}
              >
                <SelectTrigger className={errors.specialty ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione sua especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {MEDICAL_SPECIALTIES.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {spec}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty && (
                <p className="text-sm text-destructive">{errors.specialty}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="graduation_year">Ano de Formatura</Label>
              <Input
                id="graduation_year"
                type="number"
                value={profile.graduation_year || ""}
                onChange={(e) => setProfile({ ...profile, graduation_year: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="2015"
                min={1950}
                max={new Date().getFullYear()}
                className={errors.graduation_year ? "border-destructive" : ""}
              />
              {errors.graduation_year && (
                <p className="text-sm text-destructive">{errors.graduation_year}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Endereço
          </CardTitle>
          <CardDescription>Localização do consultório ou residência</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Rua, número, complemento"
                className={errors.address ? "border-destructive" : ""}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address}</p>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  placeholder="São Luís"
                  className={errors.city ? "border-destructive" : ""}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Select
                  value={profile.state}
                  onValueChange={(value) => setProfile({ ...profile, state: value })}
                >
                  <SelectTrigger className={errors.state ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {BRAZILIAN_STATES.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.state && (
                  <p className="text-sm text-destructive">{errors.state}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">CEP</Label>
                <Input
                  id="postal_code"
                  value={profile.postal_code}
                  onChange={(e) => setProfile({ ...profile, postal_code: formatCEP(e.target.value) })}
                  placeholder="00000-000"
                  maxLength={9}
                  className={errors.postal_code ? "border-destructive" : ""}
                />
                {errors.postal_code && (
                  <p className="text-sm text-destructive">{errors.postal_code}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}

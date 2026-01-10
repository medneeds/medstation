import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, Stethoscope, Upload, X, CreditCard, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { profileSchema } from "@/lib/validations";
import { z } from "zod";
import { useProfile } from "@/contexts/ProfileContext";
import { ImageCropDialog } from "@/components/ImageCropDialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const { refreshProfile } = useProfile();
  const { subscribed, productId, subscriptionEnd, loading: subscriptionLoading, checkSubscription } = useSubscription();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const [profile, setProfile] = useState({
    full_name: "",
    gender: "" as "M" | "F" | "Outro" | "",
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

      setUserId(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || "",
          gender: (data.gender as "M" | "F" | "Outro") || "",
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

        if (data.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
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

  const handleAvatarSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validação do tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erro",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    // Validação do tipo
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast({
        title: "Erro",
        description: "Formato de imagem inválido. Use JPG, PNG ou WEBP.",
        variant: "destructive",
      });
      return;
    }

    // Criar URL temporária para preview
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImageSrc(e.target.result as string);
        setCropDialogOpen(true);
      }
    };
    reader.readAsDataURL(file);

    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = "";
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    try {
      setUploading(true);

      // Upload para o bucket
      const fileName = `${userId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, croppedImage, { upsert: true });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      // Atualizar perfil com a nova URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      await refreshProfile();
      toast({
        title: "Sucesso",
        description: "Foto de perfil atualizada!",
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setUploading(true);

      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

      if (error) throw error;

      setAvatarUrl("");
      await refreshProfile();
      toast({
        title: "Sucesso",
        description: "Foto de perfil removida!",
      });
    } catch (error) {
      console.error("Erro ao remover foto:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validação com Zod
      const validatedData = profileSchema.parse(profile);

      // Converter strings vazias em null para campos opcionais
      const cleanedData = {
        ...validatedData,
        date_of_birth: validatedData.date_of_birth || null,
        crm: validatedData.crm || null,
        crm_state: validatedData.crm_state || null,
        specialty: validatedData.specialty || null,
        graduation_year: validatedData.graduation_year || null,
        phone: validatedData.phone || null,
        cpf: validatedData.cpf || null,
        rqe: validatedData.rqe || null,
        bio: validatedData.bio || null,
        address: validatedData.address || null,
        city: validatedData.city || null,
        state: validatedData.state || null,
        postal_code: validatedData.postal_code || null,
        gender: validatedData.gender || null,
      };

      const { error } = await supabase
        .from("profiles")
        .update(cleanedData)
        .eq("id", userId);

      if (error) throw error;

      await refreshProfile();
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

  const getInitials = () => {
    if (!profile.full_name) return "?";
    const names = profile.full_name.split(" ");
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getTitle = () => {
    if (!profile.gender) return "Dr(a)";
    return profile.gender === "M" ? "Dr." : profile.gender === "F" ? "Dra." : "Dr(a)";
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      console.error("Portal error:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível abrir o portal de assinatura.",
        variant: "destructive",
      });
    } finally {
      setPortalLoading(false);
    }
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
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie seu perfil e assinatura</p>
      </div>

      {/* Assinatura */}
      <Card className={subscribed ? "border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Assinatura
            {subscribed && (
              <Badge className="ml-2 bg-primary/20 text-primary border-primary/30">
                <Sparkles className="w-3 h-3 mr-1" />
                Pro
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {subscribed ? "Você tem acesso a todos os recursos" : "Gerencie sua assinatura"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Verificando assinatura...
            </div>
          ) : subscribed ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">Plano MedStation AI Pro</p>
                  {subscriptionEnd && (
                    <p className="text-sm text-muted-foreground">
                      Próxima cobrança: {format(new Date(subscriptionEnd), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  {portalLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Abrindo...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Gerenciar Assinatura
                    </>
                  )}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Altere método de pagamento, cancele ou gerencie sua assinatura pelo portal seguro.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="font-medium text-foreground">Plano Gratuito</p>
                  <p className="text-sm text-muted-foreground">
                    Acesso limitado ao Examinus
                  </p>
                </div>
                <Button onClick={() => navigate("/pricing")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Assinar Pro
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Desbloqueie todos os 10 assistentes de IA por apenas R$ 29,90/mês.
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Foto de Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Foto de Perfil
          </CardTitle>
          <CardDescription>Sua imagem profissional</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={avatarUrl} alt={profile.full_name} />
            <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              {getTitle()} {profile.full_name || "Seu Nome"}
            </p>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? "Enviando..." : "Alterar Foto"}
              </Button>
              {avatarUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={uploading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WEBP. Máximo 5MB.
            </p>
          </div>
        </CardContent>
      </Card>

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
              <Label htmlFor="gender">Sexo</Label>
              <Select
                value={profile.gender}
                onValueChange={(value: "M" | "F" | "Outro") => setProfile({ ...profile, gender: value })}
              >
                <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino (Dr.)</SelectItem>
                  <SelectItem value="F">Feminino (Dra.)</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-sm text-destructive">{errors.gender}</p>
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
                <SelectContent className="max-h-[200px] overflow-y-auto">
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
                <SelectContent className="max-h-[200px] overflow-y-auto">
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
                  <SelectContent className="max-h-[200px] overflow-y-auto">
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

      <ImageCropDialog
        open={cropDialogOpen}
        onClose={() => setCropDialogOpen(false)}
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}

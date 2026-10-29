import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileSignature, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  userId: string;
  fullName: string;
  gender: string;
  crm: string;
  crmState: string;
  rqe: string;
  specialty: string;
  address: string;
  city: string;
  state: string;
}

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export function LetterheadCard(p: Props) {
  const { toast } = useToast();
  const [clinicName, setClinicName] = useState("");
  const [clinicPhone, setClinicPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!p.userId) return;
    supabase
      .from("profiles")
      .select("clinic_name, clinic_phone, letterhead_logo_url")
      .eq("id", p.userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setClinicName(data.clinic_name || "");
        setClinicPhone(data.clinic_phone || "");
        setLogoUrl(data.letterhead_logo_url || null);
      });
  }, [p.userId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        clinic_name: clinicName.trim().slice(0, 120) || null,
        clinic_phone: clinicPhone.trim().slice(0, 30) || null,
      })
      .eq("id", p.userId);
    setSaving(false);
    toast(
      error
        ? { variant: "destructive", title: "Não foi possível salvar", description: "Tente novamente em instantes." }
        : { title: "Cabeçalho salvo", description: "Suas receitas e requisições usarão estes dados." },
    );
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_LOGO_BYTES) {
      toast({ variant: "destructive", title: "Imagem inválida", description: "Envie uma imagem PNG ou JPG de até 2 MB." });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${p.userId}/logo-${Date.now()}.${ext}`;
    const up = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setUploading(false);
      toast({ variant: "destructive", title: "Não foi possível enviar o logotipo" });
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ letterhead_logo_url: publicUrl }).eq("id", p.userId);
    setLogoUrl(publicUrl);
    setUploading(false);
    toast({ title: "Logotipo atualizado" });
  };

  const removeLogo = async () => {
    await supabase.from("profiles").update({ letterhead_logo_url: null }).eq("id", p.userId);
    setLogoUrl(null);
  };

  const title = p.gender === "F" ? "Dra." : p.gender === "M" ? "Dr." : "Dr(a).";
  const registry = [p.crm && `CRM ${p.crm}${p.crmState ? `/${p.crmState}` : ""}`, p.rqe && `RQE ${p.rqe}`]
    .filter(Boolean)
    .join(" · ");
  const place = [p.address, [p.city, p.state].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  const missing = [!p.crm && "CRM", !p.address && "endereço"].filter(Boolean) as string[];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSignature className="h-5 w-5" />
          Cabeçalho de receitas e requisições
        </CardTitle>
        <CardDescription>
          Estes dados aparecem no topo das suas receitas, atestados e pedidos de exame. Nome, CRM, RQE e endereço vêm do seu perfil acima.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clinic_name">Nome do consultório ou clínica</Label>
            <Input id="clinic_name" value={clinicName} maxLength={120} onChange={(e) => setClinicName(e.target.value)} placeholder="Ex.: Consultório Dr. Silva" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinic_phone">Telefone do consultório</Label>
            <Input id="clinic_phone" value={clinicPhone} maxLength={30} onChange={(e) => setClinicPhone(e.target.value)} placeholder="(00) 0000-0000" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onLogo} />
          <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {logoUrl ? "Trocar logotipo" : "Enviar logotipo"}
          </Button>
          {logoUrl && (
            <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
              <X className="h-4 w-4 mr-2" />
              Remover
            </Button>
          )}
          <span className="text-xs text-muted-foreground">PNG ou JPG, até 2 MB</span>
        </div>

        <div>
          <p className="label-mono mb-2 text-muted-foreground">Prévia do cabeçalho</p>
          <div className="rounded-md border bg-background p-4 md:p-5">
            <div className="flex items-center gap-4 border-b pb-3">
              {logoUrl && <img src={logoUrl} alt="Logotipo" className="h-12 w-auto max-w-[120px] object-contain" />}
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold leading-tight">{title} {p.fullName || "Seu nome"}</p>
                <p className="text-xs text-muted-foreground">{[p.specialty, registry].filter(Boolean).join(" · ") || "Especialidade · CRM"}</p>
              </div>
              {clinicName && <p className="hidden text-right text-xs font-medium sm:block">{clinicName}</p>}
            </div>
            <p className="pt-2 text-2xs text-muted-foreground">
              {[place, clinicPhone].filter(Boolean).join(" · ") || "Endereço · Telefone"}
            </p>
          </div>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Para um cabeçalho completo, preencha também: {missing.join(" e ")}.</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando..." : "Salvar cabeçalho"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

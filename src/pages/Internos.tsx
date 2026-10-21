import { useEffect, useState } from "react";
import { z } from "zod";
import { ArrowRight, Check, Loader2, MessageCircle } from "lucide-react";
import { Seo } from "@/components/Seo";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { maskPhoneBr } from "@/pages/Onboarding";
import { trackLifecycleEvent } from "@/lib/analytics";
import {
  INTERN_CAMPAIGN, BR_STATES, MEDICAL_PERIODS, graduationYearOptions, isGuaranteedSpot,
  spotsLeft, isCampaignFull, waitlistPosition,
} from "@/lib/internCampaign";

const schema = z.object({
  full_name: z.string().trim().min(3, "Informe seu nome completo").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "WhatsApp inválido"),
  medical_school: z.string().trim().min(2, "Informe a faculdade").max(160),
  current_period: z.string().min(1, "Selecione o período"),
  city: z.string().trim().min(2, "Informe a cidade").max(100),
  state: z.string().regex(/^[A-Z]{2}$/, "Selecione o estado"),
  graduation_year: z.string().min(4, "Selecione o ano"),
});
type Form = z.infer<typeof schema>;
const empty: Form = { full_name: "", email: "", phone: "", medical_school: "", current_period: "", city: "", state: "", graduation_year: "" };

const benefits = [
  "Anamneses, evoluções e sumários prontos para revisar",
  "Copiloto para discutir casos e condutas no plantão",
  "Professor clínico para estudar diagnósticos e síndromes",
];

function utm() {
  const p = new URLSearchParams(window.location.search);
  const out: Record<string, string> = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => { const v = p.get(k); if (v) out[k] = v.slice(0, 100); });
  return out;
}

export default function Internos() {
  const { toast } = useToast();
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [loading, setLoading] = useState(false);
  const [taken, setTaken] = useState<number | null>(null);
  const [result, setResult] = useState<{ position: number } | null>(null);

  useEffect(() => {
    const refresh = () =>
      supabase.rpc("intern_spots_taken").then(({ data }) => typeof data === "number" && setTaken(data));
    refresh();
    // Atualiza o contador enquanto a página está aberta, para encerrar as vagas sozinha.
    const t = window.setInterval(refresh, 30000);
    return () => window.clearInterval(t);
  }, []);

  const left = taken === null ? null : spotsLeft(taken);
  const full = taken !== null && isCampaignFull(taken);
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Partial<Record<keyof Form, string>> = {};
      parsed.error.issues.forEach((i) => { errs[i.path[0] as keyof Form] = i.message; });
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    const d = parsed.data;
    const { data, error } = await supabase.rpc("submit_intern_signup", {
      p_full_name: d.full_name, p_email: d.email.toLowerCase(), p_phone: d.phone,
      p_medical_school: d.medical_school, p_current_period: d.current_period,
      p_city: d.city, p_state: d.state, p_graduation_year: Number(d.graduation_year), p_utm: utm(),
    });
    if (error || !data?.[0]) {
      setLoading(false);
      toast({ variant: "destructive", title: "Não foi possível concluir", description: "Confira os dados e tente novamente." });
      return;
    }
    const position = Number(data[0].queue_position);
    trackLifecycleEvent("lead_created", { source: "internos" });
    // Link de acesso para criar a conta com o mesmo e-mail (não bloqueia o fluxo).
    supabase.auth.signInWithOtp({
      email: d.email.toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/auth?confirmed=1` },
    }).catch(() => {});
    setLoading(false);
    setTaken((t) => Math.max(t ?? 0, position));
    setResult({ position });
  };

  const field = (k: keyof Form) => errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title="Internos de medicina, vocês foram convocados | MedStation"
        description="30 acessos de cortesia por 30 dias para internos de medicina. IA treinada em medicina para o internato e os primeiros plantões."
        path="/internos"
      />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo />
        <span className="text-xs text-muted-foreground">Campanha de cortesia</span>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-4 md:grid-cols-[1.1fr_1fr] md:gap-14 md:pt-10">
        <section>
          {full ? (
            <span className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
              Vagas encerradas · lista de espera aberta
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {left === null ? `Acesso gratuito · ${INTERN_CAMPAIGN.spots} vagas` : `Acesso gratuito · restam ${left} de ${INTERN_CAMPAIGN.spots} vagas`}
            </span>
          )}
          <h1 className="mt-5 font-display text-[2.4rem] leading-[1.05] md:text-6xl font-semibold tracking-tight">
            Internos de medicina,{" "}
            <em className="text-primary">vocês foram convocados.</em>
          </h1>
          <p className="mt-6 text-base md:text-xl leading-relaxed text-muted-foreground">
            Sobreviva ao internato e aos seus primeiros plantões com segurança. Produza mais, digite menos e tenha um
            copiloto de IA treinado em medicina, com{" "}
            <strong className="text-foreground">liberação para os {INTERN_CAMPAIGN.spots} primeiros</strong>, por{" "}
            {INTERN_CAMPAIGN.courtesyDays} dias.
          </p>
          <p className="mt-4 text-base md:text-lg font-semibold">
            <span className="text-primary">Digite menos. Raciocine mais</span> e destaque-se na sua rotina no internato!
          </p>
          <ul className="mt-8 space-y-3">
            {benefits.map((b) => (
              <li key={b} className="flex gap-3 text-sm md:text-base">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /> {b}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">
            {full
              ? `As ${INTERN_CAMPAIGN.spots} vagas já foram preenchidas. Quem entra na lista de espera é chamado pela ordem de inscrição se uma vaga for liberada.`
              : `Sem cartão de crédito. A ordem de inscrição define as ${INTERN_CAMPAIGN.spots} vagas.`}
          </p>
        </section>

        <section className="rounded-3xl border border-border/70 bg-card p-5 md:p-7 shadow-sm">
          {result ? (
            <div className="space-y-4 text-center py-6">
              <MessageCircle className="mx-auto h-10 w-10 text-primary" />
              <h2 className="text-2xl font-semibold">
                {isGuaranteedSpot(result.position)
                  ? `Você é o nº ${result.position}. Vaga garantida!`
                  : `Você é o nº ${waitlistPosition(result.position)} da lista de espera.`}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isGuaranteedSpot(result.position)
                  ? "Enviamos um link para o seu e-mail para criar sua conta. Toque no botão abaixo para entrar no grupo de internos no WhatsApp."
                  : "As vagas desta turma foram preenchidas, mas seus dados estão guardados. Se uma vaga for liberada, chamamos pela ordem da lista. Enviamos um link para o seu e-mail para você já deixar sua conta criada."}
              </p>
              <Button asChild size="lg" className="w-full">
                <a href={INTERN_CAMPAIGN.whatsappGroupUrl}>Entrar no grupo do WhatsApp <ArrowRight className="ml-1 h-4 w-4" /></a>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4" noValidate>
              {full ? (
                <div className="rounded-xl border border-border bg-muted p-4 text-center">
                  <p className="text-2xl font-bold">Vagas encerradas</p>
                  <p className="text-sm text-muted-foreground">
                    As {INTERN_CAMPAIGN.spots} vagas gratuitas foram preenchidas. Deixe seus dados na lista de espera e chamamos pela ordem de inscrição.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4 text-center">
                  <p className="text-2xl font-bold text-primary">100% gratuito</p>
                  <p className="text-sm text-muted-foreground">{INTERN_CAMPAIGN.courtesyDays} dias de acesso completo, sem pagar nada e sem cartão</p>
                </div>
              )}
              <h2 className="text-xl font-semibold">{full ? "Entre na lista de espera" : "Garanta seu acesso gratuito"}</h2>
              <div className="space-y-1.5">
                <Label htmlFor="in-name">Nome completo</Label>
                <Input id="in-name" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} maxLength={120} />
                {field("full_name")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="in-email">E-mail</Label>
                  <Input id="in-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={255} />
                  {field("email")}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="in-phone">WhatsApp</Label>
                  <Input id="in-phone" inputMode="tel" value={form.phone} onChange={(e) => set("phone", maskPhoneBr(e.target.value))} placeholder="(00) 00000-0000" />
                  {field("phone")}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="in-school">Faculdade de medicina</Label>
                <Input id="in-school" value={form.medical_school} onChange={(e) => set("medical_school", e.target.value)} maxLength={160} />
                {field("medical_school")}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Período atual</Label>
                  <Select value={form.current_period} onValueChange={(v) => set("current_period", v)}>
                    <SelectTrigger aria-label="Período atual"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{MEDICAL_PERIODS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                  {field("current_period")}
                </div>
                <div className="space-y-1.5">
                  <Label>Ano de formatura</Label>
                  <Select value={form.graduation_year} onValueChange={(v) => set("graduation_year", v)}>
                    <SelectTrigger aria-label="Ano de formatura"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{graduationYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                  {field("graduation_year")}
                </div>
              </div>
              <div className="grid gap-4 grid-cols-[1fr_7rem]">
                <div className="space-y-1.5">
                  <Label htmlFor="in-city">Cidade</Label>
                  <Input id="in-city" value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={100} />
                  {field("city")}
                </div>
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select value={form.state} onValueChange={(v) => set("state", v)}>
                    <SelectTrigger aria-label="Estado"><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>{BR_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  {field("state")}
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Quero meu acesso gratuito <ArrowRight className="ml-1 h-4 w-4" /></>}
              </Button>
              <p className="text-center text-xs text-muted-foreground">Depois da inscrição você entra no grupo de internos no WhatsApp.</p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { DISCOVERY_PATHS, ALL_ASSISTANTS, storeDiscoveryPath, type DiscoveryPathId } from "@/lib/discoveryPaths";
import {
  PRIMARY_GOAL_OPTIONS,
  ROUTINE_PAIN_OPTIONS,
  WORK_SETTING_OPTIONS,
  explainRecommendation,
  recommendFromAnswers,
  type PrimaryGoal,
  type RoutinePain,
  type WorkSetting,
} from "@/lib/onboardingRecommendations";

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/** Máscara BR simples: (00) 00000-0000 — mesmo padrão já usado no projeto. */
export function maskPhoneBr(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhoneBr(value: string): boolean {
  return /^\(\d{2}\) \d{4,5}-\d{4}$/.test(value);
}

export function isValidBirthDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 1900 && d.getTime() < Date.now();
}

const TOOL_LABELS: Record<string, { title: string; description: string; url: string }> = (() => {
  const map: Record<string, { title: string; description: string; url: string }> = {};
  for (const tool of ALL_ASSISTANTS) {
    map[tool.slug] = { title: tool.title, description: tool.description, url: tool.url };
  }
  for (const path of DISCOVERY_PATHS) {
    for (const tool of path.tools) {
      if (!map[tool.slug]) {
        map[tool.slug] = { title: tool.title, description: tool.description, url: tool.url };
      }
    }
  }
  return map;
})();

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { markCompleted } = useOnboarding();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [crm, setCrm] = useState("");
  const [crmState, setCrmState] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const [routinePain, setRoutinePain] = useState<RoutinePain | "">("");
  const [workSetting, setWorkSetting] = useState<WorkSetting | "">("");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      if (!active) return;
      setUserId(session.user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone, date_of_birth, gender, crm, crm_state")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active || !profile) return;
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ? maskPhoneBr(profile.phone) : "");
      setBirthDate(profile.date_of_birth ?? "");
      setGender(profile.gender ?? "");
      setCrm(profile.crm ?? "");
      setCrmState(profile.crm_state ?? "");
    })();
    trackEvent("onboarding_started", { source: "first_access" });
    return () => { active = false; };
  }, [navigate]);

  const recommendation = useMemo(() => {
    if (!routinePain || !workSetting || !primaryGoal) return null;
    return recommendFromAnswers({ routinePain, workSetting, primaryGoal });
  }, [routinePain, workSetting, primaryGoal]);

  const profileValid =
    fullName.trim().length >= 3 &&
    isValidPhoneBr(phone) &&
    isValidBirthDate(birthDate) &&
    !!gender &&
    (!crm.trim() || !!crmState);

  const saveProfile = async () => {
    if (!userId) return false;
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.replace(/\D/g, ""),
        date_of_birth: birthDate,
        gender,
        crm: crm.trim() || null,
        crm_state: crm.trim() ? crmState || null : null,
      })
      .eq("id", userId);

    if (error) {
      toast({ variant: "destructive", title: "Não foi possível salvar", description: "Tente novamente." });
      return false;
    }
    return true;
  };

  const handleProfileNext = async () => {
    setShowErrors(true);
    if (!profileValid) return;
    setSaving(true);
    const ok = await saveProfile();
    setSaving(false);
    if (!ok) return;
    trackEvent("onboarding_step_completed", { source: "first_access", feature: "profile" });
    setShowErrors(false);
    setStep(1);
  };

  const handleSurveyNext = () => {
    setShowErrors(true);
    if (!recommendation) return;
    trackEvent("onboarding_step_completed", { source: "first_access", feature: "survey" });
    setShowErrors(false);
    setStep(2);
  };

  const handleFinish = async (destination: "dashboard" | "explore") => {
    if (!userId || !recommendation || !routinePain || !workSetting || !primaryGoal) return;
    setSaving(true);
    const { error } = await supabase.from("user_onboarding").upsert(
      {
        user_id: userId,
        completed_at: new Date().toISOString(),
        primary_path: recommendation.primaryPath,
        recommended_tools: recommendation.recommendedTools,
        routine_pain: routinePain,
        work_setting: workSetting,
        primary_goal: primaryGoal,
        answers: {
          routine_pain: routinePain,
          work_setting: workSetting,
          primary_goal: primaryGoal,
        },
      },
      { onConflict: "user_id" },
    );
    setSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Não foi possível concluir",
        description: "Verifique sua conexão e tente novamente.",
      });
      return;
    }

    trackEvent("onboarding_completed", { source: "first_access", feature: recommendation.primaryPath });
    markCompleted(recommendation.primaryPath as DiscoveryPathId, recommendation.recommendedTools);
    storeDiscoveryPath(recommendation.primaryPath);
    navigate(destination === "dashboard" ? "/dashboard" : "/dashboard#caminhos", { replace: true });
  };

  const pathLabel = recommendation
    ? DISCOVERY_PATHS.find((p) => p.id === recommendation.primaryPath)?.label ?? ""
    : "";

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground">
            {step + 1} de 3
          </p>
          <Progress value={((step + 1) / 3) * 100} className="h-1.5" />
        </div>

        <Card className="border border-border/60 bg-card/90 p-5 md:p-8">
          {step === 0 && (
            <div className="space-y-6">
              <header className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Vamos configurar sua MedStation.
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Leva menos de 2 minutos e ajuda a adaptar a experiência à sua rotina.
                </p>
              </header>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ob-name">Nome completo</Label>
                  <Input
                    id="ob-name"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-12"
                  />
                  {showErrors && fullName.trim().length < 3 && (
                    <p className="text-xs text-destructive">Informe seu nome completo.</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ob-phone">WhatsApp</Label>
                    <Input
                      id="ob-phone"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(maskPhoneBr(e.target.value))}
                      className="h-12"
                    />
                    {showErrors && !isValidPhoneBr(phone) && (
                      <p className="text-xs text-destructive">Informe um número válido.</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ob-birth">Data de nascimento</Label>
                    <Input
                      id="ob-birth"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-12"
                    />
                    {showErrors && !isValidBirthDate(birthDate) && (
                      <p className="text-xs text-destructive">Informe uma data válida.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sexo</Label>
                  <Select value={gender} onValueChange={setGender}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino (Dr.)</SelectItem>
                      <SelectItem value="F">Feminino (Dra.)</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                  {showErrors && !gender && (
                    <p className="text-xs text-destructive">Selecione uma opção.</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ob-crm">CRM (opcional)</Label>
                    <Input
                      id="ob-crm"
                      inputMode="numeric"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  {crm.trim() && (
                    <div className="space-y-2">
                      <Label>UF do CRM</Label>
                      <Select value={crmState} onValueChange={setCrmState}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="UF" />
                        </SelectTrigger>
                        <SelectContent>
                          {BRAZILIAN_STATES.map((uf) => (
                            <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {showErrors && !crmState && (
                        <p className="text-xs text-destructive">Selecione a UF do CRM.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Button onClick={handleProfileNext} disabled={saving} className="h-12 w-full sm:w-auto">
                {saving ? "Salvando..." : "Continuar"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <header className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Três perguntas rápidas.
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  As respostas definem o caminho e as ferramentas sugeridas na sua Home.
                </p>
              </header>

              <QuestionGroup
                legend="O que mais pesa na sua rotina hoje?"
                name="routine_pain"
                options={ROUTINE_PAIN_OPTIONS}
                value={routinePain}
                onChange={(v) => setRoutinePain(v as RoutinePain)}
                invalid={showErrors && !routinePain}
              />
              <QuestionGroup
                legend="Onde você atua com mais frequência?"
                name="work_setting"
                options={WORK_SETTING_OPTIONS}
                value={workSetting}
                onChange={(v) => setWorkSetting(v as WorkSetting)}
                invalid={showErrors && !workSetting}
              />
              <QuestionGroup
                legend="O que você mais quer ganhar com a MedStation?"
                name="primary_goal"
                options={PRIMARY_GOAL_OPTIONS}
                value={primaryGoal}
                onChange={(v) => setPrimaryGoal(v as PrimaryGoal)}
                invalid={showErrors && !primaryGoal}
              />

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <Button variant="outline" onClick={() => setStep(0)} className="h-12 sm:w-auto">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button onClick={handleSurveyNext} className="h-12 sm:w-auto">
                  Ver recomendação
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && recommendation && (
            <div className="space-y-6">
              <header className="space-y-2">
                <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">
                  Sua MedStation está pronta.
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  {explainRecommendation(recommendation.primaryPath)}
                </p>
              </header>

              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <p className="font-mono text-2xs uppercase tracking-[0.22em] text-muted-foreground">
                  Caminho principal
                </p>
                <p className="mt-1 font-display text-xl font-semibold tracking-tight">{pathLabel}</p>
              </div>

              <ul className="space-y-3">
                {recommendation.recommendedTools.slice(0, 3).map((slug) => {
                  const tool = TOOL_LABELS[slug];
                  if (!tool) return null;
                  return (
                    <li key={slug} className="flex items-start gap-3 rounded-xl border border-border/60 p-4">
                      <span className="mt-0.5 rounded-lg border border-primary/20 bg-primary/10 p-1.5 text-primary">
                        <Check className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block font-display text-base font-semibold tracking-tight">
                          {tool.title}
                        </span>
                        <span className="block text-sm text-muted-foreground">{tool.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button onClick={() => handleFinish("dashboard")} disabled={saving} className="h-12">
                  {saving ? "Concluindo..." : "Ir para minha MedStation"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleFinish("explore")}
                  disabled={saving}
                  className="h-12"
                >
                  Explorar todos os caminhos
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function QuestionGroup({
  legend,
  name,
  options,
  value,
  onChange,
  invalid,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="font-display text-base md:text-lg font-semibold tracking-tight">
        {legend}
      </legend>
      <div className="grid gap-2">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <label
              key={opt.value}
              className={[
                "flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                "focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none",
                active ? "border-primary/60 bg-primary/5" : "border-border/60 hover:border-primary/40",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                value={opt.value}
                checked={active}
                onChange={() => onChange(opt.value)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
      {invalid && <p className="text-xs text-destructive">Selecione uma opção.</p>}
    </fieldset>
  );
}

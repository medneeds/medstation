import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, ChevronLeft, ExternalLink, FileDown, Loader2, PenLine, ShieldCheck, Stethoscope, User } from "lucide-react";
import {
  allowedSignatureMethods,
  CATEGORY_LABEL,
  classifyMedication,
  classifyPrescription,
  doctorIssues,
  effectiveValidityDays,
  medicationIssues,
  patientIssues,
  printableCid,
  TALONARIO_LABEL,
  type Issue,
  type RxCategory,
  type SignatureMethod,
  type TalonarioKind,
} from "@/lib/officialDocument";
import { buildExamRequestPdf, buildPrescriptionPdf, loadImageDataUrl } from "@/lib/officialPdf";

interface Med {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

export type OfficialPdfRecord =
  | {
      kind: "prescription";
      id: string;
      number: string;
      patientId: string;
      medications: Med[];
      validityDays?: number | null;
      observations?: string | null;
    }
  | {
      kind: "exam";
      id: string;
      number: string;
      patientId: string;
      exams: { name: string; instructions?: string }[];
      clinicalIndication?: string | null;
      cid?: string | null;
      priority?: string | null;
      observations?: string | null;
    };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: OfficialPdfRecord;
}

const DOCTOR_EMPTY = { fullName: "", gender: "", crm: "", crmState: "", rqe: "", specialty: "", address: "", city: "", state: "", postalCode: "", clinicName: "", clinicPhone: "", phone: "", logoUrl: "" };
const PATIENT_EMPTY = { name: "", cpf: "", dateOfBirth: "", sex: "", address: "", city: "", state: "", postalCode: "" };

const STEPS = [
  { n: 1, label: "Seus dados", icon: Stethoscope },
  { n: 2, label: "Paciente", icon: User },
  { n: 3, label: "Documento", icon: PenLine },
];

const SIGNATURE_INFO: Record<SignatureMethod, { title: string; desc: string }> = {
  manual: { title: "Imprimir e assinar à caneta", desc: "Assinatura e carimbo no papel." },
  govbr: { title: "Assinar no gov.br", desc: "Gratuito, com sua conta gov.br prata ou ouro." },
  icp: { title: "Certificado digital ICP-Brasil", desc: "VIDaaS, BirdID, SafeID ou token. Exigido no controle especial e antimicrobiano digital." },
};

function IssueList({ issues }: { issues: Issue[] }) {
  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> Tudo certo nesta etapa.
      </div>
    );
  }
  return (
    <ul className="space-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
      {issues.map((i) => (
        <li key={i.field + i.message} className={cn("flex items-start gap-2", i.blocking ? "text-destructive" : "text-muted-foreground")}>
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{i.blocking ? "Falta: " : ""}{i.message}</span>
        </li>
      ))}
    </ul>
  );
}

function Field({ id, label, value, onChange, invalid, className, ...rest }: { id: string; label: string; value: string; onChange: (v: string) => void; invalid?: boolean; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className={cn(invalid && "text-destructive")}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} className={cn(invalid && "border-destructive focus-visible:ring-destructive")} {...rest} />
    </div>
  );
}

export function OfficialPdfWizard({ open, onOpenChange, record }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [doctor, setDoctor] = useState(DOCTOR_EMPTY);
  const [doctorOrig, setDoctorOrig] = useState(DOCTOR_EMPTY);
  const [patient, setPatient] = useState(PATIENT_EMPTY);
  const [patientOrig, setPatientOrig] = useState(PATIENT_EMPTY);
  const [categoryOverride, setCategoryOverride] = useState<RxCategory | null>(null);
  const [cidConsent, setCidConsent] = useState(false);
  const [signature, setSignature] = useState<SignatureMethod>("manual");
  const [done, setDone] = useState(false);

  const detected = useMemo(
    () => (record.kind === "prescription" ? classifyPrescription(record.medications.map((m) => m.name)) : { category: "simples" as RxCategory }),
    [record],
  );
  const category: RxCategory = categoryOverride ?? detected.category;
  const talonario: TalonarioKind | undefined = categoryOverride ? (categoryOverride === "talonario" ? detected.talonario ?? "B" : undefined) : detected.talonario;
  const allowedSig = allowedSignatureMethods(record.kind, category);

  useEffect(() => {
    if (!allowedSig.includes(signature)) setSignature("manual");
  }, [allowedSig, signature]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setDone(false);
    setCategoryOverride(null);
    setCidConsent(false);
    setLoading(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: prof }, { data: pat }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, gender, crm, crm_state, rqe, specialty, address, city, state, postal_code, phone, clinic_name, clinic_phone, letterhead_logo_url")
          .eq("id", user?.id ?? "")
          .maybeSingle(),
        supabase.from("patients").select("name, cpf, date_of_birth, sex, address, city, state, postal_code").eq("id", record.patientId).maybeSingle(),
      ]);
      const d = {
        fullName: prof?.full_name ?? "",
        gender: prof?.gender ?? "",
        crm: prof?.crm ?? "",
        crmState: prof?.crm_state ?? "",
        rqe: prof?.rqe ?? "",
        specialty: prof?.specialty ?? "",
        address: prof?.address ?? "",
        city: prof?.city ?? "",
        state: prof?.state ?? "",
        postalCode: prof?.postal_code ?? "",
        clinicName: prof?.clinic_name ?? "",
        clinicPhone: prof?.clinic_phone ?? "",
        phone: prof?.phone ?? "",
        logoUrl: prof?.letterhead_logo_url ?? "",
      };
      const p = {
        name: pat?.name ?? "",
        cpf: pat?.cpf ?? "",
        dateOfBirth: pat?.date_of_birth ?? "",
        sex: pat?.sex ?? "",
        address: pat?.address ?? "",
        city: pat?.city ?? "",
        state: pat?.state ?? "",
        postalCode: pat?.postal_code ?? "",
      };
      setDoctor(d);
      setDoctorOrig(d);
      setPatient(p);
      setPatientOrig(p);
      setLoading(false);
    })();
  }, [open, record.patientId]);

  const dIssues = doctorIssues(doctor);
  const pIssues = patientIssues(patient, record.kind, category);
  const mIssues = record.kind === "prescription" ? medicationIssues(record.medications) : [];
  const blocked = (list: Issue[]) => list.some((i) => i.blocking);
  const bad = (list: Issue[], f: string) => list.some((i) => i.blocking && i.field === f);

  const setD = (k: keyof typeof DOCTOR_EMPTY) => (v: string) => setDoctor((s) => ({ ...s, [k]: k === "crmState" || k === "state" ? v.toUpperCase().slice(0, 2) : v }));
  const setP = (k: keyof typeof PATIENT_EMPTY) => (v: string) => setPatient((s) => ({ ...s, [k]: k === "state" ? v.toUpperCase().slice(0, 2) : v }));

  const saveDoctor = async () => {
    if (JSON.stringify(doctor) === JSON.stringify(doctorOrig)) return true;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: doctor.fullName.trim(),
        crm: doctor.crm.trim() || null,
        crm_state: doctor.crmState.trim() || null,
        rqe: doctor.rqe.trim() || null,
        specialty: doctor.specialty.trim() || null,
        address: doctor.address.trim() || null,
        city: doctor.city.trim() || null,
        state: doctor.state.trim() || null,
        clinic_name: doctor.clinicName.trim() || null,
        clinic_phone: doctor.clinicPhone.trim() || null,
      })
      .eq("id", user?.id ?? "");
    if (error) {
      toast({ title: "Não foi possível salvar seus dados", description: "Tente novamente em instantes.", variant: "destructive" });
      return false;
    }
    setDoctorOrig(doctor);
    return true;
  };

  const savePatient = async () => {
    if (JSON.stringify(patient) === JSON.stringify(patientOrig)) return true;
    const { error } = await supabase
      .from("patients")
      .update({
        name: patient.name.trim(),
        cpf: patient.cpf.trim() || null,
        date_of_birth: patient.dateOfBirth || null,
        sex: patient.sex || null,
        address: patient.address.trim() || null,
        city: patient.city.trim() || null,
        state: patient.state.trim() || null,
      })
      .eq("id", record.patientId);
    if (error) {
      toast({ title: "Não foi possível salvar o paciente", description: "Tente novamente em instantes.", variant: "destructive" });
      return false;
    }
    setPatientOrig(patient);
    return true;
  };

  const next = async () => {
    setSaving(true);
    const ok = step === 1 ? await saveDoctor() : await savePatient();
    setSaving(false);
    if (ok) setStep((s) => s + 1);
  };

  const generate = async () => {
    if (category === "talonario") return;
    setSaving(true);
    try {
      const logoDataUrl = await loadImageDataUrl(doctor.logoUrl);
      const pdfDoctor = { ...doctor, logoDataUrl };
      const pdfPatient = { ...patient };
      const issuedAt = new Date();
      const pdf =
        record.kind === "prescription"
          ? buildPrescriptionPdf({
              id: record.id,
              number: record.number,
              issuedAt,
              category,
              validityDays: record.validityDays,
              doctor: pdfDoctor,
              patient: pdfPatient,
              medications: record.medications,
              observations: record.observations,
              signature,
            })
          : buildExamRequestPdf({
              id: record.id,
              number: record.number,
              issuedAt,
              doctor: pdfDoctor,
              patient: pdfPatient,
              exams: record.exams,
              clinicalIndication: record.clinicalIndication,
              cid: printableCid(record.cid, cidConsent),
              priority: record.priority,
              observations: record.observations,
              signature,
            });
      const prefix = record.kind === "prescription" ? "Receita" : "Requisicao";
      pdf.save(`${prefix}-${record.number}.pdf`);
      if (record.kind === "prescription") {
        await supabase
          .from("prescriptions")
          .update({ signature_metadata: { official_pdf_at: issuedAt.toISOString(), category, signature_method: signature } })
          .eq("id", record.id);
      }
      setDone(true);
    } catch {
      toast({ title: "Não foi possível gerar o PDF", description: "Tente novamente em instantes.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const validity = effectiveValidityDays(category, record.kind === "prescription" ? record.validityDays : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record.kind === "prescription" ? "PDF oficial da receita" : "PDF oficial da requisição"}</DialogTitle>
          <DialogDescription>
            Conferimos com você tudo o que o documento precisa ter antes de gerar o arquivo para assinatura.
          </DialogDescription>
        </DialogHeader>

        {!done && (
          <ol className="grid grid-cols-3 gap-2">
            {STEPS.map(({ n, label, icon: Icon }) => (
              <li
                key={n}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2.5 py-2 text-xs sm:text-sm",
                  step === n ? "border-primary bg-primary/10 text-foreground font-medium" : step > n ? "border-primary/30 text-primary" : "text-muted-foreground",
                )}
              >
                {step > n ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <Icon className="h-4 w-4 shrink-0" />}
                <span className="truncate">{n}. {label}</span>
              </li>
            ))}
          </ol>
        )}

        {record.kind === "prescription" && !done && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Tipo de documento:</span>
            <Badge variant={category === "talonario" ? "destructive" : "secondary"}>
              {category === "talonario" && talonario ? TALONARIO_LABEL[talonario] : CATEGORY_LABEL[category]}
            </Badge>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando seus dados...
          </div>
        ) : done ? (
          <DoneStep signature={signature} onClose={() => onOpenChange(false)} />
        ) : step === 1 ? (
          <div className="space-y-4">
            <IssueList issues={dIssues} />
            <div className="grid grid-cols-2 gap-3">
              <Field id="d-name" className="col-span-2" label="Nome completo *" value={doctor.fullName} onChange={setD("fullName")} invalid={bad(dIssues, "fullName")} />
              <Field id="d-crm" label="CRM *" value={doctor.crm} onChange={setD("crm")} invalid={bad(dIssues, "crm")} inputMode="numeric" />
              <Field id="d-crmuf" label="UF do CRM *" value={doctor.crmState} onChange={setD("crmState")} invalid={bad(dIssues, "crmState")} placeholder="SP" />
              <Field id="d-spec" label="Especialidade" value={doctor.specialty} onChange={setD("specialty")} />
              <Field id="d-rqe" label="RQE" value={doctor.rqe} onChange={setD("rqe")} />
              <Field id="d-addr" className="col-span-2" label="Endereço do consultório *" value={doctor.address} onChange={setD("address")} invalid={bad(dIssues, "address")} placeholder="Rua, número, sala" />
              <Field id="d-city" label="Cidade *" value={doctor.city} onChange={setD("city")} invalid={bad(dIssues, "city")} />
              <Field id="d-uf" label="UF *" value={doctor.state} onChange={setD("state")} invalid={bad(dIssues, "city")} placeholder="SP" />
              <Field id="d-clinic" label="Nome do consultório" value={doctor.clinicName} onChange={setD("clinicName")} />
              <Field id="d-phone" label="Telefone do consultório" value={doctor.clinicPhone} onChange={setD("clinicPhone")} />
            </div>
            <p className="text-xs text-muted-foreground">O que você completar aqui fica salvo no seu perfil para as próximas receitas.</p>
          </div>
        ) : step === 2 ? (
          <div className="space-y-4">
            <IssueList issues={pIssues} />
            <div className="grid grid-cols-2 gap-3">
              <Field id="p-name" className="col-span-2" label="Nome completo *" value={patient.name} onChange={setP("name")} invalid={bad(pIssues, "name")} />
              <Field id="p-cpf" label="CPF" value={patient.cpf} onChange={setP("cpf")} placeholder="000.000.000-00" />
              <Field id="p-dob" label="Data de nascimento" type="date" value={patient.dateOfBirth} onChange={setP("dateOfBirth")} invalid={bad(pIssues, "dateOfBirth")} />
              <div className="col-span-2 space-y-1.5">
                <Label className={cn(bad(pIssues, "sex") && "text-destructive")}>Sexo</Label>
                <div className="flex gap-2">
                  {[["F", "Feminino"], ["M", "Masculino"]].map(([v, l]) => (
                    <Button key={v} type="button" size="sm" variant={patient.sex === v ? "default" : "outline"} onClick={() => setP("sex")(patient.sex === v ? "" : v)}>
                      {l}
                    </Button>
                  ))}
                </div>
              </div>
              <Field id="p-addr" className="col-span-2" label="Endereço residencial" value={patient.address} onChange={setP("address")} invalid={bad(pIssues, "address")} placeholder="Rua, número, bairro" />
              <Field id="p-city" label="Cidade" value={patient.city} onChange={setP("city")} invalid={bad(pIssues, "city")} />
              <Field id="p-uf" label="UF" value={patient.state} onChange={setP("state")} invalid={bad(pIssues, "city")} placeholder="SP" />
            </div>
            <p className="text-xs text-muted-foreground">Fica salvo no cadastro do paciente em Meus Pacientes.</p>
          </div>
        ) : (
          <DocumentStep
            record={record}
            category={category}
            detected={detected.category}
            talonario={talonario}
            onCategory={(c) => setCategoryOverride(c === detected.category ? null : c)}
            validity={validity}
            mIssues={mIssues}
            pIssues={pIssues}
            cidConsent={cidConsent}
            onCidConsent={setCidConsent}
            signature={signature}
            allowedSig={allowedSig}
            onSignature={setSignature}
          />
        )}

        {!loading && !done && (
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <Button variant="ghost" onClick={() => (step === 1 ? onOpenChange(false) : setStep(step - 1))} disabled={saving}>
              {step === 1 ? "Cancelar" : (<><ChevronLeft className="h-4 w-4 mr-1" />Voltar</>)}
            </Button>
            {step < 3 ? (
              <Button onClick={next} disabled={saving || (step === 1 ? blocked(dIssues) : blocked(pIssues))}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Continuar
              </Button>
            ) : (
              <Button onClick={generate} disabled={saving || category === "talonario" || blocked(mIssues) || blocked(pIssues) || blocked(dIssues)}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}Gerar PDF
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DocumentStep(props: {
  record: OfficialPdfRecord;
  category: RxCategory;
  detected: RxCategory;
  talonario?: TalonarioKind;
  onCategory: (c: RxCategory) => void;
  validity: number | null;
  mIssues: Issue[];
  pIssues: Issue[];
  cidConsent: boolean;
  onCidConsent: (v: boolean) => void;
  signature: SignatureMethod;
  allowedSig: SignatureMethod[];
  onSignature: (s: SignatureMethod) => void;
}) {
  const { record, category, detected } = props;
  return (
    <div className="space-y-5">
      {record.kind === "prescription" ? (
        <>
          <div className="space-y-2">
            <Label>Medicamentos</Label>
            <ul className="space-y-1.5">
              {record.medications.filter((m) => m.name?.trim()).map((m, i) => {
                const c = classifyMedication(m.name);
                return (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                    <span className="truncate">{m.name}</span>
                    {c.category !== "simples" && (
                      <Badge variant={c.category === "talonario" ? "destructive" : "outline"} className="shrink-0">
                        {c.category === "talonario" && c.talonario ? `Notificação ${c.talonario === "especial" ? "especial" : c.talonario}` : CATEGORY_LABEL[c.category].replace("Receita de ", "")}
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2">
            <Label>Tipo de receita</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["simples", "antimicrobiano", "controle_especial"] as RxCategory[]).map((c) => (
                <Button key={c} type="button" variant={category === c ? "default" : "outline"} className="h-auto py-2 whitespace-normal text-left justify-start" onClick={() => props.onCategory(c)}>
                  {CATEGORY_LABEL[c]}
                </Button>
              ))}
            </div>
            {category !== detected && (
              <p className="text-xs text-destructive">Você alterou o tipo identificado pela MedStation ({CATEGORY_LABEL[detected]}). Confira antes de assinar.</p>
            )}
            {category === "antimicrobiano" && <p className="text-xs text-muted-foreground">2 vias (uma fica na farmácia), validade de 10 dias, com idade e sexo do paciente.</p>}
            {category === "controle_especial" && <p className="text-xs text-muted-foreground">2 vias com quadros do comprador e do fornecedor, validade de 30 dias e endereço do paciente. Quantidade para até 60 dias de tratamento (antiepilépticos até 6 meses).</p>}
            {category === "simples" && <p className="text-xs text-muted-foreground">1 via.{props.validity ? ` Validade de ${props.validity} dias.` : ""}</p>}
          </div>

          {category === "talonario" && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {props.talonario ? TALONARIO_LABEL[props.talonario] : "Notificação de receita"}: este medicamento só pode ser prescrito no talão oficial numerado da Vigilância Sanitária. Por isso a MedStation não gera este PDF. Se quiser, retire o medicamento desta receita e gere as demais em um documento separado.
              </AlertDescription>
            </Alert>
          )}
          {props.mIssues.length > 0 && <IssueList issues={props.mIssues} />}
        </>
      ) : (
        record.cid?.trim() && (
          <div className="rounded-md border p-3 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox id="cid-consent" checked={props.cidConsent} onCheckedChange={(v) => props.onCidConsent(v === true)} className="mt-0.5" />
              <Label htmlFor="cid-consent" className="font-normal leading-snug">
                O paciente autorizou incluir o CID <b>{record.cid}</b> na requisição.
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">Sem a autorização, o CID fica fora do papel para proteger o sigilo do paciente.</p>
          </div>
        )
      )}

      {props.pIssues.some((i) => i.blocking) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Para este tipo de receita faltam dados do paciente. Volte uma etapa e complete.</AlertDescription>
        </Alert>
      )}

      {category !== "talonario" && (
        <div className="space-y-2">
          <Label>Como você vai assinar?</Label>
          <div className="grid gap-2">
            {(Object.keys(SIGNATURE_INFO) as SignatureMethod[]).map((s) => {
              const allowed = props.allowedSig.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!allowed}
                  onClick={() => props.onSignature(s)}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                    props.signature === s ? "border-primary bg-primary/10" : "hover:bg-muted/50",
                    !allowed && "opacity-50 cursor-not-allowed",
                  )}
                >
                  {s === "manual" ? <PenLine className="h-4 w-4 mt-0.5 text-primary" /> : <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />}
                  <span>
                    <span className="block text-sm font-medium">{SIGNATURE_INFO[s].title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {allowed ? SIGNATURE_INFO[s].desc : "Não vale para este tipo de receita: a lei exige certificado ICP-Brasil."}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DoneStep({ signature, onClose }: { signature: SignatureMethod; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-3 text-sm">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> O PDF foi baixado no seu aparelho.
      </div>
      <div className="space-y-2 text-sm">
        <p className="font-medium">Próximo passo</p>
        {signature === "manual" && <p className="text-muted-foreground">Imprima, assine e carimbe. Nas receitas de 2 vias, assine as duas folhas.</p>}
        {signature === "govbr" && (
          <>
            <p className="text-muted-foreground">Abra o assinador do gov.br, envie o PDF, assine com sua conta e baixe o arquivo assinado para enviar ao paciente.</p>
            <a href="https://assinador.iti.br/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
              Abrir assinador gov.br <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </>
        )}
        {signature === "icp" && (
          <p className="text-muted-foreground">Abra o PDF no aplicativo do seu certificado digital (VIDaaS, BirdID, SafeID ou token) e assine. Depois envie o arquivo assinado ao paciente.</p>
        )}
        {signature !== "manual" && (
          <a href="https://validar.iti.gov.br/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline">
            Conferir a assinatura no validador oficial <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
      <div className="flex justify-end">
        <Button onClick={onClose}>Concluir</Button>
      </div>
    </div>
  );
}

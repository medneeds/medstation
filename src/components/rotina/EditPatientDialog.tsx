import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO, type WardAdmission } from "@/hooks/useWard";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  admission: WardAdmission | null;
  bedLabel?: string;
  unitName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (id: string, patch: Partial<WardAdmission>) => Promise<void>;
}

export function EditPatientDialog({ admission, bedLabel, unitName, open, onOpenChange, onSave }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    patient_name: "",
    date_of_birth: "",
    record_number: "",
    admitted_on: todayISO(),
    main_diagnosis: "",
    comorbidities: "",
    notes: "",
  });

  useEffect(() => {
    if (open && admission) {
      setForm({
        patient_name: admission.patient_name || "",
        date_of_birth: admission.date_of_birth || "",
        record_number: admission.record_number || "",
        admitted_on: admission.admitted_on || todayISO(),
        main_diagnosis: admission.main_diagnosis || "",
        comorbidities: admission.comorbidities || "",
        notes: admission.notes || "",
      });
    }
  }, [open, admission]);

  const submit = async () => {
    if (!admission) return;
    if (!form.patient_name.trim()) {
      toast({ title: "Informe o nome do paciente", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await onSave(admission.id, {
        patient_name: form.patient_name.trim(),
        date_of_birth: form.date_of_birth || null,
        record_number: form.record_number || null,
        admitted_on: form.admitted_on || todayISO(),
        main_diagnosis: form.main_diagnosis || null,
        comorbidities: form.comorbidities || null,
        notes: form.notes || null,
      });
      toast({ title: "Dados atualizados" });
      onOpenChange(false);
    } catch {
      toast({ title: "Não foi possível salvar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar dados do paciente</DialogTitle>
          <DialogDescription>
            {[unitName, bedLabel ? `Leito ${bedLabel}` : null].filter(Boolean).join(" · ")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="epn">Nome do paciente</Label>
            <Input id="epn" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edob">Nascimento</Label>
              <Input id="edob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="erec">Registro</Label>
              <Input id="erec" value={form.record_number} onChange={(e) => setForm({ ...form, record_number: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eadm">Data de admissão</Label>
            <Input id="eadm" type="date" value={form.admitted_on} onChange={(e) => setForm({ ...form, admitted_on: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edx">Diagnóstico principal</Label>
            <Input id="edx" value={form.main_diagnosis} onChange={(e) => setForm({ ...form, main_diagnosis: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ecom">Comorbidades</Label>
            <Input id="ecom" value={form.comorbidities} onChange={(e) => setForm({ ...form, comorbidities: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="eobs">Observações</Label>
            <Textarea id="eobs" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

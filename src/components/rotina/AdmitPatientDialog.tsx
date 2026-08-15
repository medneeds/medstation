import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { todayISO, type WardBed, type WardAdmission } from "@/hooks/useWard";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Props {
  bed: WardBed | null;
  unitName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdmit: (bed: WardBed, payload: Partial<WardAdmission>) => Promise<void>;
}

export function AdmitPatientDialog({ bed, unitName, open, onOpenChange, onAdmit }: Props) {
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
    if (open) {
      setForm({
        patient_name: "",
        date_of_birth: "",
        record_number: "",
        admitted_on: todayISO(),
        main_diagnosis: "",
        comorbidities: "",
        notes: "",
      });
    }
  }, [open]);

  const submit = async () => {
    if (!bed) return;
    if (!form.patient_name.trim()) {
      toast({ title: "Informe o nome do paciente", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await onAdmit(bed, form);
      toast({ title: "Paciente internado", description: `Leito ${bed.label}` });
      onOpenChange(false);
    } catch {
      toast({ title: "Não foi possível internar", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Internar no leito {bed?.label}</DialogTitle>
          <DialogDescription>{unitName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pn">Nome do paciente</Label>
            <Input id="pn" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dob">Nascimento</Label>
              <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec">Registro</Label>
              <Input id="rec" value={form.record_number} onChange={(e) => setForm({ ...form, record_number: e.target.value })} placeholder="Opcional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm">Data de admissão</Label>
            <Input id="adm" type="date" value={form.admitted_on} onChange={(e) => setForm({ ...form, admitted_on: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dx">Diagnóstico principal</Label>
            <Input id="dx" value={form.main_diagnosis} onChange={(e) => setForm({ ...form, main_diagnosis: e.target.value })} placeholder="Pneumonia comunitária grave" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="com">Comorbidades</Label>
            <Input id="com" value={form.comorbidities} onChange={(e) => setForm({ ...form, comorbidities: e.target.value })} placeholder="HAS, DM2" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="obs">Observações</Label>
            <Textarea id="obs" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Internar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

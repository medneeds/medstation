import { useEffect, useState } from "react";
import { Check, Search, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { vaultTitleFrom } from "@/lib/vault";
import { foldText } from "@/lib/patientClinical";

type PatientOption = { id: string; name: string; date_of_birth: string | null };

/** Saves an assistant reply into a patient's record (shown in the patient's history). */
export function SaveToPatientButton({ content, assistantLabel }: { content: string; assistantLabel?: string }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [patients, setPatients] = useState<PatientOption[] | null>(null);
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedTo, setSavedTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open || patients) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setPatients([]);
      const { data } = await supabase
        .from("patients")
        .select("id, name, date_of_birth")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("name");
      setPatients(data || []);
    })();
  }, [open, patients]);

  const save = async (p: PatientOption) => {
    setSavingId(p.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Entre na sua conta para salvar.");
      const { error } = await supabase.from("patient_records").insert({
        user_id: user.id,
        patient_id: p.id,
        title: vaultTitleFrom(content, assistantLabel).slice(0, 160),
        content: content.slice(0, 50000),
        source_assistant: assistantLabel ?? null,
      });
      if (error) throw error;
      setSavedTo(p.name);
      setOpen(false);
      toast({ description: `Salvo na ficha de ${p.name}.` });
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e.message, variant: "destructive" });
    } finally {
      setSavingId(null);
    }
  };

  const q = foldText(query.trim());
  const list = (patients || []).filter((p) => !q || foldText(p.name).includes(q));

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 px-2 gap-1.5 text-xs"
        title="Salvar na ficha de um paciente"
      >
        {savedTo ? <Check className="h-3 w-3 text-primary" /> : <UserRound className="h-3 w-3" />}
        <span className={savedTo ? "text-primary hidden md:inline" : "hidden md:inline"}>
          {savedTo ? "Na ficha" : "Salvar na ficha"}
        </span>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Salvar na ficha do paciente</DialogTitle>
            <DialogDescription>A resposta fica guardada no histórico do paciente escolhido.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar paciente pelo nome" className="pl-8" />
          </div>
          <div className="max-h-72 overflow-y-auto space-y-1">
            {patients === null ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Carregando pacientes...</p>
            ) : list.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {patients.length === 0 ? "Você ainda não tem pacientes. Cadastre em Meus Pacientes." : "Nenhum paciente com esse nome."}
              </p>
            ) : (
              list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={savingId !== null}
                  onClick={() => save(p)}
                  className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-60"
                >
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {savingId === p.id ? "Salvando..." : p.date_of_birth ? new Date(p.date_of_birth + "T12:00:00").toLocaleDateString("pt-BR") : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, BedDouble } from "lucide-react";
import type { WardBed, WardUnit } from "@/hooks/useWard";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  units: WardUnit[];
  beds: WardBed[];
  occupiedBedIds: Set<string>;
  onCreateUnit: (name: string, kind: string, bedCount: number) => Promise<void>;
  onDeleteUnit: (id: string) => Promise<void>;
  onAddBeds: (unitId: string, count: number) => Promise<void>;
  onRenameBed: (bedId: string, label: string) => Promise<void>;
  onDeleteBed: (bedId: string) => Promise<void>;
}

export function UnitsManagerDialog({
  open, onOpenChange, units, beds, occupiedBedIds,
  onCreateUnit, onDeleteUnit, onAddBeds, onRenameBed, onDeleteBed,
}: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [kind, setKind] = useState("enfermaria");
  const [count, setCount] = useState("10");
  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (!name.trim()) {
      toast({ title: "Dê um nome à unidade", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await onCreateUnit(name.trim(), kind, parseInt(count) || 0);
      setName("");
      setCount("10");
      toast({ title: "Unidade criada" });
    } catch {
      toast({ title: "Não foi possível criar a unidade", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar unidades e leitos</DialogTitle>
          <DialogDescription>
            Crie as unidades pelas quais você é responsável e defina os leitos de cada uma.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-hairline p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div className="space-y-1.5">
              <Label htmlFor="unit-name">Nome da unidade</Label>
              <Input id="unit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="UTI Adulto" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enfermaria">Enfermaria</SelectItem>
                  <SelectItem value="uti">UTI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="unit-beds">Leitos</Label>
              <Input id="unit-beds" className="w-24" type="number" min={0} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
          </div>
          <Button onClick={create} disabled={busy} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" /> Criar unidade
          </Button>
        </div>

        <div className="space-y-4">
          {units.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma unidade criada ainda.</p>
          )}
          {units.map((unit) => {
            const unitBeds = beds.filter((b) => b.unit_id === unit.id);
            return (
              <div key={unit.id} className="rounded-lg border border-hairline p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <BedDouble className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{unit.name}</span>
                    <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground">
                      {unit.kind} · {unitBeds.length} leitos
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => onAddBeds(unit.id, 1)}>
                      <Plus className="h-3.5 w-3.5 mr-1" /> Leito
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Excluir a unidade ${unit.name} e todos os seus leitos?`)) void onDeleteUnit(unit.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {unitBeds.map((bed) => (
                    <div key={bed.id} className="flex items-center gap-1 rounded-md border border-hairline px-1.5 py-1">
                      <Input
                        defaultValue={bed.label}
                        onBlur={(e) => {
                          const v = e.target.value.trim();
                          if (v && v !== bed.label) void onRenameBed(bed.id, v);
                        }}
                        className="h-7 w-16 text-center text-sm border-0 shadow-none focus-visible:ring-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (occupiedBedIds.has(bed.id)) {
                            toast({ title: "Leito ocupado", description: "Dê alta ou mova o paciente antes.", variant: "destructive" });
                            return;
                          }
                          void onDeleteBed(bed.id);
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

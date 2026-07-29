import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

export default function AdminFlags() {
  const [flags, setFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("feature_flags").select("*").order("key");
    setFlags(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (key: string, enabled: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("feature_flags")
      .update({ enabled_global: enabled, updated_by: user?.id, updated_at: new Date().toISOString() })
      .eq("key", key);
    if (error) toast.error(error.message);
    else { toast.success(`${key} ${enabled ? "ativada" : "desativada"}`); load(); }
  };

  const setRollout = async (key: string, pct: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("feature_flags").update({ rollout_pct: pct, updated_by: user?.id }).eq("key", key);
    load();
  };

  const create = async () => {
    if (!newKey.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("feature_flags").insert({
      key: newKey.trim(), description: newDesc.trim() || null, updated_by: user?.id,
    });
    if (error) toast.error(error.message);
    else { toast.success("Flag criada"); setNewKey(""); setNewDesc(""); setOpen(false); load(); }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Feature flags</h1>
          <p className="text-sm text-muted-foreground">Kill-switches e rollout gradual</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nova flag</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova feature flag</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Key</Label><Input value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="assistant.mediscuss" /></div>
              <div><Label>Descrição</Label><Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Liga/desliga o assistente Mediscuss" /></div>
              <Button onClick={create} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? <div className="text-center py-10"><Loader2 className="h-4 w-4 animate-spin inline" /></div> :
       flags.length === 0 ? <Card className="p-10 text-center text-muted-foreground text-sm">Nenhuma flag ainda.</Card> : (
        <div className="space-y-3">
          {flags.map((f) => (
            <Card key={f.key} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-mono text-sm font-medium">{f.key}</div>
                  {f.description && <div className="text-xs text-muted-foreground mt-1">{f.description}</div>}
                  <div className="mt-3 flex items-center gap-4">
                    <Label className="text-xs">Rollout %</Label>
                    <Input type="number" min={0} max={100} defaultValue={f.rollout_pct}
                      onBlur={(e) => setRollout(f.key, parseInt(e.target.value) || 0)}
                      className="w-24 h-8" />
                    <span className="text-xs text-muted-foreground">
                      {f.enabled_users?.length || 0} force on · {f.disabled_users?.length || 0} force off
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Global</Label>
                  <Switch checked={f.enabled_global} onCheckedChange={(v) => toggle(f.key, v)} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

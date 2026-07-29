import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Megaphone } from "lucide-react";

export default function AdminBroadcast() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", variant: "info", cta_label: "", cta_url: "", target: "all" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("announcements").insert({ ...form, created_by: user?.id });
    if (error) toast.error(error.message);
    else { toast.success("Anúncio publicado"); setOpen(false); load(); }
  };

  const toggle = async (id: string, active: boolean) => {
    await supabase.from("announcements").update({ active }).eq("id", id);
    load();
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Banners e anúncios globais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo anúncio</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo anúncio</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Mensagem</Label><Textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Estilo</Label>
                  <Select value={form.variant} onValueChange={(v) => setForm({ ...form, variant: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="warning">Aviso</SelectItem>
                      <SelectItem value="promo">Promoção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Público</Label>
                  <Select value={form.target} onValueChange={(v) => setForm({ ...form, target: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="subscribers">Assinantes</SelectItem>
                      <SelectItem value="free">Grátis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>CTA label</Label><Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} placeholder="Assinar agora" /></div>
              <div><Label>CTA URL</Label><Input value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} placeholder="/pricing" /></div>
              <Button onClick={create} className="w-full" disabled={!form.title}>Publicar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {loading ? <div className="text-center py-10"><Loader2 className="h-4 w-4 animate-spin inline" /></div> :
       items.length === 0 ? (
        <Card className="p-10 text-center border-dashed">
          <Megaphone className="h-8 w-8 mx-auto text-muted-foreground opacity-40" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum anúncio criado.</p>
        </Card>
       ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <Card key={a.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">{a.variant}</span>
                    <span className="font-medium">{a.title}</span>
                  </div>
                  {a.body && <p className="text-sm text-muted-foreground mt-1">{a.body}</p>}
                  <div className="text-xs text-muted-foreground mt-2">
                    Target: {a.target} · Criado {new Date(a.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
                <Switch checked={a.active} onCheckedChange={(v) => toggle(a.id, v)} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Laptop, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { deviceHashFor } from "@/lib/deviceGuard";
import { useToast } from "@/hooks/use-toast";

type Device = { id: string; device_hash: string; label: string | null; last_used_at: string; expires_at: string };

export function TrustedDevicesList() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<Device[]>([]);
  const [mine, setMine] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) setMine(await deviceHashFor(session.user.id));
    const { data } = await supabase
      .from("trusted_devices")
      .select("id, device_hash, label, last_used_at, expires_at")
      .gt("expires_at", new Date().toISOString())
      .order("last_used_at", { ascending: false });
    setDevices((data as Device[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    setRemoving(id);
    const { error } = await supabase.from("trusted_devices").delete().eq("id", id);
    setRemoving(null);
    if (error) {
      toast({ title: "Não foi possível remover", variant: "destructive" });
      return;
    }
    toast({ title: "Aparelho removido", description: "Ele vai pedir código no próximo acesso." });
    setDevices((d) => d.filter((x) => x.id !== id));
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div>
        <p className="font-medium">Aparelhos reconhecidos</p>
        <p className="text-sm text-muted-foreground">
          Nestes aparelhos você entra sem código por 30 dias. Em um aparelho novo, enviamos um código para o seu e-mail.
        </p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
        </div>
      ) : devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum aparelho reconhecido.</p>
      ) : (
        <ul className="divide-y">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex items-center gap-3 min-w-0">
                <Laptop className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-2">
                    {d.label || "Aparelho"}
                    {d.device_hash === mine && <Badge variant="secondary">Este aparelho</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Último uso em {new Date(d.last_used_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => remove(d.id)}
                disabled={removing === d.id}
                aria-label="Remover aparelho"
              >
                {removing === d.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="ml-1.5">Remover</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

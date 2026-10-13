import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { clearDeviceState, deviceHashFor } from "@/lib/deviceGuard";

const KEY = "ms_identity_ok:";

/** Uma vez por sessão do navegador: "Você é o Dr. Fulano?" */
export function IdentityConfirm({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [crm, setCrm] = useState("");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY + userId) === "1";
    } catch {
      seen = true;
    }
    if (seen) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, crm, crm_state")
        .eq("id", userId)
        .maybeSingle();
      setName(data?.full_name?.trim() || "");
      setCrm(data?.crm ? `CRM ${data.crm}${data.crm_state ? `/${data.crm_state}` : ""}` : "");
      setOpen(true);
    })().catch(() => {});
  }, [userId]);

  const confirm = () => {
    try {
      sessionStorage.setItem(KEY + userId, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  const notMe = async () => {
    try {
      const hash = await deviceHashFor(userId);
      await supabase.from("trusted_devices").delete().eq("user_id", userId).eq("device_hash", hash);
    } catch {
      /* ignore */
    }
    clearDeviceState();
    await supabase.auth.signOut({ scope: "local" });
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader className="items-center text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/15 border border-primary/30 grid place-items-center">
            <UserCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary/90">Bom te ver de novo</p>
            <DialogTitle className="text-xl">
              {name ? `Que bom te ver, ${name.split(/\s+/)[0]}!` : "Que bom ter você por aqui!"}
            </DialogTitle>
            {(name || crm) && (
              <p className="text-sm font-medium text-foreground pt-0.5">
                {name}
                {name && crm ? " · " : ""}
                {crm}
              </p>
            )}
          </div>
          <DialogDescription className="leading-relaxed">
            Só queremos confirmar se esta conta é sua mesmo. Seu acesso é pessoal e intransferível — assim
            cuidamos dos seus pacientes, do seu prontuário e da sua assinatura. Se não for você, saia agora e
            entre com o seu próprio login, sem nenhum problema.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button className="h-11" onClick={confirm}>Sou eu, continuar</Button>
          <Button variant="outline" className="h-11" onClick={notMe}>Não sou eu, sair</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

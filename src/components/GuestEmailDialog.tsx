import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, Loader2, ArrowRight, ShieldCheck, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GuestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planLabel: string;
  priceLabel: string;
  loading?: boolean;
  initialEmail?: string;
  onConfirm: (email: string) => void;
}

/**
 * Diálogo de email para visitantes antes do checkout.
 * Mostra contexto (qual plano + preço), pede só o email
 * e deixa explícito que a senha é criada na próxima etapa.
 */
export function GuestEmailDialog({
  open,
  onOpenChange,
  planLabel,
  priceLabel,
  loading = false,
  initialEmail = "",
  onConfirm,
}: GuestEmailDialogProps) {
  const [email, setEmail] = useState(initialEmail);
  const [touched, setTouched] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setTouched(false);
    }
  }, [open, initialEmail]);

  const valid = /\S+@\S+\.\S+/.test(email.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid || loading) return;
    onConfirm(email.trim().toLowerCase());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">
            Continuar para o pagamento
          </DialogTitle>
          <DialogDescription className="text-sm">
            <span className="text-foreground font-medium">{planLabel}</span>
            <span className="text-muted-foreground"> · {priceLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div>
            <label htmlFor="guest-email" className="text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
              Seu email
            </label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="guest-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched(true)}
                className="h-12 pl-10 text-base"
                disabled={loading}
                required
              />
            </div>
            {touched && !valid && (
              <p className="text-[11px] text-destructive mt-1.5">Digite um email válido para continuar.</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Você cria a senha logo após o pagamento.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base font-semibold"
            disabled={loading || !valid}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecionando...</>
            ) : (
              <>Ir para o pagamento <ArrowRight className="w-4 h-4 ml-2" /></>
            )}
          </Button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            Pagamento seguro · Garantia de 7 dias
          </div>

          <p className="text-[11px] text-center text-muted-foreground">
            Já tem conta?{" "}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => {
                onOpenChange(false);
                navigate("/auth");
              }}
            >
              Faça login
            </button>{" "}
            para destravar preços de upgrade.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

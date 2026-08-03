import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Check, Clock, Gift, ShieldCheck } from "lucide-react";

const MODAL_KEY = "ms_signup_prompt_modal";
const TOAST_KEY = "ms_signup_prompt_toast";
const TOAST_AT = 25_000;
const MODAL_AT = 70_000;

function seen(key: string) {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return true;
  }
}
function mark(key: string) {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    /* noop */
  }
}

/**
 * Pops de aquisição para visitantes da landing page: deixam claro que criar
 * conta libera o Examinus gratuito, sem espera e sem pop-ups, dentro da plataforma.
 */
export function SignupBenefitPrompt() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const openedRef = useRef(false);

  const openModal = () => {
    if (openedRef.current || seen(MODAL_KEY)) return;
    openedRef.current = true;
    mark(MODAL_KEY);
    setOpen(true);
  };

  // Toast inicial
  useEffect(() => {
    if (seen(TOAST_KEY)) return;
    const t = setTimeout(() => {
      mark(TOAST_KEY);
      toast("Examinus é grátis para quem tem conta", {
        description:
          "Criando sua conta você usa o Examinus dentro da plataforma — sem espera entre mensagens e sem pop-ups.",
        duration: 9000,
        icon: <Gift className="w-4 h-4 text-primary" />,
        action: {
          label: "Criar conta grátis",
          onClick: () => navigate("/auth"),
        },
      });
    }, TOAST_AT);
    return () => clearTimeout(t);
  }, [navigate]);

  // Modal por tempo + intenção de saída
  useEffect(() => {
    const t = setTimeout(openModal, MODAL_AT);
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) openModal();
    };
    document.addEventListener("mouseleave", onLeave);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mouseleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 w-fit">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">Conta grátis · sem cartão</span>
          </div>
          <DialogTitle className="text-2xl mt-3">
            Antes de sair: o Examinus é grátis com conta
          </DialogTitle>
          <DialogDescription className="text-base">
            Aqui na página inicial a demonstração tem limite de uso, espera entre mensagens e
            pop-ups. Dentro da plataforma, com sua conta criada, o Examinus fica liberado sem essas
            restrições.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 my-2">
          <div className="flex items-start gap-2.5 text-sm">
            <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Examinus completo, sem custo e sem cartão de crédito</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm">
            <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Sem espera entre mensagens e sem pop-ups interrompendo o plantão</span>
          </div>
          <div className="flex items-start gap-2.5 text-sm">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>Histórico salvo na sua conta e acesso aos outros 9 assistentes quando quiser</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            size="lg"
            className="flex-1 bg-gradient-primary hover:opacity-90"
            onClick={() => {
              setOpen(false);
              navigate("/auth");
            }}
          >
            Criar conta grátis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            Continuar na demonstração
          </Button>
        </div>

        <p className="text-[11px] text-center text-muted-foreground">
          Leva menos de 1 minuto. Você só precisa confirmar seu e-mail.
        </p>
      </DialogContent>
    </Dialog>
  );
}

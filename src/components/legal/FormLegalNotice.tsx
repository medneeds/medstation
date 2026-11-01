import { cn } from "@/lib/utils";

interface FormLegalNoticeProps {
  /** Texto do botão de envio, para a frase ficar exata ("Ao clicar em …"). */
  action?: string;
  /** Explica o uso do contato antes da compra (lembrete de checkout não concluído). */
  mentionsReminder?: boolean;
  /** Explica o uso do WhatsApp informado. */
  mentionsWhatsapp?: boolean;
  className?: string;
}

/**
 * Aviso de transparência junto a formulários que coletam dados pessoais
 * (LGPD art. 9º). Links abrem em nova aba para não perder o que foi digitado.
 */
export function FormLegalNotice({ action, mentionsReminder, mentionsWhatsapp, className }: FormLegalNoticeProps) {
  const linkClass = "underline underline-offset-2 hover:text-foreground";
  return (
    <p className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}>
      {action ? `Ao clicar em "${action}", você` : "Ao continuar, você"} concorda com os{" "}
      <a href="/termos" target="_blank" rel="noopener noreferrer" className={linkClass}>
        Termos de Uso
      </a>{" "}
      e declara ciência da{" "}
      <a href="/privacidade" target="_blank" rel="noopener noreferrer" className={linkClass}>
        Política de Privacidade
      </a>
      . Usamos seus dados para liberar e gerenciar seu acesso
      {mentionsReminder ? " e, se você não concluir, podemos enviar um lembrete por e-mail" : ""}
      {mentionsWhatsapp ? "; o WhatsApp, se informado, só para avisos desta oferta" : ""}.
    </p>
  );
}

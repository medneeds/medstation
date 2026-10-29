import { Hospital, Laptop, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SharedComputerToggleProps {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}

const SHARED_POINTS = [
  "Sai sozinho ao fechar o navegador",
  "Só pede o código de novo após 6 horas sem uso",
  "Não guarda este computador na sua conta",
];

const PERSONAL_POINTS = [
  "Continua conectado ao fechar o navegador",
  "Só pede o código de novo após 12 horas sem uso",
  "Use só no seu computador ou celular",
];

/**
 * Escolha do tipo de computador no login. Compartilhado é o padrão;
 * desligar significa que o médico está num aparelho de uso pessoal.
 */
export function SharedComputerToggle({ checked, onCheckedChange }: SharedComputerToggleProps) {
  const Icon = checked ? Hospital : Laptop;
  const points = checked ? SHARED_POINTS : PERSONAL_POINTS;

  return (
    <div
      className={cn(
        "rounded-2xl border p-3.5 transition-colors",
        checked ? "border-primary/35 bg-primary/[0.06]" : "border-hairline bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
            checked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <label htmlFor="shared-computer" className="min-w-0 flex-1 cursor-pointer select-none">
          <span className="block text-sm font-medium text-foreground leading-tight">
            Computador compartilhado
          </span>
          <span className="block text-xs text-muted-foreground leading-snug mt-0.5">
            {checked ? "Hospital, plantão ou consultório com mais pessoas" : "Desligado: este aparelho é de uso pessoal"}
          </span>
        </label>
        <Switch
          id="shared-computer"
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-describedby="shared-computer-rules"
        />
      </div>

      <ul id="shared-computer-rules" className="mt-3 space-y-1 border-t border-hairline pt-2.5" aria-live="polite">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2 text-xs text-muted-foreground leading-snug">
            <Check className={cn("h-3.5 w-3.5 mt-px shrink-0", checked ? "text-primary" : "text-muted-foreground")} aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[0.7rem] text-muted-foreground/80 leading-snug">
        {checked
          ? "Desligue só se este aparelho for seu. Em qualquer opção, saímos após 30 min sem uso."
          : "Em qualquer opção, saímos após 30 min sem uso."}
      </p>
    </div>
  );
}

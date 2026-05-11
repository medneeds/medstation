import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  secondary?: ReactNode;
  className?: string;
}

/**
 * Empty state que ensina, não que avisa.
 * Item 7 do plano "Simples, sexy e surpreendente".
 * Padrão: ilustração suave + título amigável + frase de ação + CTA direto.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        "py-12 md:py-16 px-6",
        className,
      )}
    >
      <div className="relative mb-5">
        {/* Halo */}
        <div className="absolute inset-0 -m-4 rounded-full bg-primary/10 blur-2xl" />
        <div className="relative rounded-2xl p-4 bg-primary/8 text-primary border border-primary/20">
          <Icon className="h-10 w-10" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="font-display text-lg md:text-xl font-semibold tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg" className="font-semibold">
          {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
          {actionLabel}
        </Button>
      )}

      {secondary && <div className="mt-3">{secondary}</div>}
    </div>
  );
}

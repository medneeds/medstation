import { useTheme } from "next-themes";
import { Expand, FolderOpen, HelpCircle, History, Monitor, Moon, MoreHorizontal, Shrink, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Evento global que abre o "Como usar a plataforma" do layout. */
export const OPEN_CONCIERGE_EVENT = "ms:open-concierge";

interface ChatMobileMenuProps {
  focusMode: boolean;
  onToggleFocus: () => void;
  onOpenHistory: () => void;
  cases: { id: string; title: string; patient_name: string }[];
  selectedCaseId?: string;
  onSelectCase: (id: string | undefined) => void;
}

/** Celular: ações secundárias do topo do chat reunidas num único botão "⋯". */
export function ChatMobileMenu({
  focusMode,
  onToggleFocus,
  onOpenHistory,
  cases,
  selectedCaseId,
  onSelectCase,
}: ChatMobileMenuProps) {
  const { theme, setTheme } = useTheme();
  const mode = (theme ?? "system") as "system" | "light" | "dark";
  const ThemeIcon = mode === "dark" ? Moon : mode === "light" ? Sun : Monitor;
  const themeLabel = mode === "system" ? "Tema do sistema" : mode === "light" ? "Modo claro" : "Modo escuro";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[80] w-56">
        <DropdownMenuItem onSelect={onOpenHistory}>
          <History className="mr-2 h-4 w-4" />
          Histórico de conversas
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleFocus}>
          {focusMode ? <Shrink className="mr-2 h-4 w-4" /> : <Expand className="mr-2 h-4 w-4" />}
          {focusMode ? "Sair da tela cheia" : "Tela cheia"}
        </DropdownMenuItem>
        {cases.length > 0 && (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderOpen className="mr-2 h-4 w-4" />
              Vincular a um caso
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="z-[90] max-h-72 w-60 overflow-y-auto">
              <DropdownMenuRadioGroup
                value={selectedCaseId ?? "none"}
                onValueChange={(v) => onSelectCase(v === "none" ? undefined : v)}
              >
                <DropdownMenuRadioItem value="none">Sem caso específico</DropdownMenuRadioItem>
                {cases.map((c) => (
                  <DropdownMenuRadioItem key={c.id} value={c.id}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{c.title}</span>
                      <span className="truncate text-xs text-muted-foreground">{c.patient_name}</span>
                    </span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setTheme(mode === "system" ? "light" : mode === "light" ? "dark" : "system");
          }}
        >
          <ThemeIcon className="mr-2 h-4 w-4" />
          {themeLabel}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.dispatchEvent(new Event(OPEN_CONCIERGE_EVENT))}>
          <HelpCircle className="mr-2 h-4 w-4" />
          Como usar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

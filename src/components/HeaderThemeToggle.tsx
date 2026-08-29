import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeaderThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const mode = (theme ?? "system") as "system" | "light" | "dark";
  const label =
    mode === "system" ? "Tema do sistema" : mode === "light" ? "Modo claro" : "Modo escuro";

  return (
    <button
      type="button"
      aria-label={`${label}. Alternar entre sistema, claro e escuro`}
      title={label}
      onClick={() => setTheme(mode === "system" ? "light" : mode === "light" ? "dark" : "system")}
      className={cn(
        "relative h-8 w-8 rounded-sm border border-hairline grid place-items-center overflow-hidden",
        "hover:bg-accent hover:border-foreground/40 transition-colors outline-none",
        "focus-visible:border-primary",
      )}
    >
      <Monitor
        className={cn(
          "absolute h-4 w-4 text-foreground transition-all duration-300 ease-precise",
          mode === "system"
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-3 scale-75",
        )}
      />
      <Sun
        className={cn(
          "absolute h-4 w-4 text-foreground transition-all duration-300 ease-precise",
          mode !== "light"
            ? "opacity-0 -translate-y-3 rotate-90 scale-75"
            : "opacity-100 translate-y-0 rotate-0 scale-100",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 text-foreground transition-all duration-300 ease-precise",
          mode === "dark"
            ? "opacity-100 translate-y-0 rotate-0 scale-100"
            : "opacity-0 translate-y-3 -rotate-90 scale-75",
        )}
      />
    </button>
  );
}

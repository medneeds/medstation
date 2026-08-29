import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function HeaderThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      title={isDark ? "Modo claro" : "Modo escuro"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "relative h-8 w-8 rounded-sm border border-hairline grid place-items-center overflow-hidden",
        "hover:bg-accent hover:border-foreground/40 transition-colors outline-none",
        "focus-visible:border-primary",
      )}
    >
      <Sun
        className={cn(
          "absolute h-4 w-4 text-foreground transition-all duration-300 ease-precise",
          isDark
            ? "opacity-0 -translate-y-3 rotate-90 scale-75"
            : "opacity-100 translate-y-0 rotate-0 scale-100",
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 text-foreground transition-all duration-300 ease-precise",
          isDark
            ? "opacity-100 translate-y-0 rotate-0 scale-100"
            : "opacity-0 translate-y-3 -rotate-90 scale-75",
        )}
      />
    </button>
  );
}

import { ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare, Activity,
  Star, Shield, ToggleLeft, Megaphone, ArrowLeft, LogOut, Gift,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, BarChart3,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/faturamento", label: "Faturamento", icon: CreditCard, adminOnly: true },
  { to: "/admin/indicacoes", label: "Indicações", icon: Gift, adminOnly: true },
  { to: "/admin/suporte", label: "Suporte", icon: MessageSquare },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/uso-ia", label: "Uso de IA", icon: Activity },
  { to: "/admin/feedback", label: "Feedback", icon: Star },
  { to: "/admin/auditoria", label: "Auditoria", icon: Shield },
  { to: "/admin/flags", label: "Feature Flags", icon: ToggleLeft, adminOnly: true },
  { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone, adminOnly: true },
];

const STORAGE_KEY = "admin-sidebar-collapsed";

export function AdminLayout({ children }: { children?: ReactNode }) {
  const { role, isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { theme, setTheme } = useTheme();
  const isDark = theme !== "light";
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // Keyboard shortcut: Ctrl/Cmd + B
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen flex bg-background">
        <aside
          className={`${collapsed ? "w-14" : "w-60"} shrink-0 border-r border-border/60 bg-card/50 flex flex-col transition-[width] duration-200 ease-out`}
        >
          <div className={`${collapsed ? "px-2 py-3" : "px-4 py-4"} border-b border-border/60 flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
            {!collapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-display text-sm font-semibold truncate">MedStation Admin</span>
                </div>
                <Badge variant="outline" className="mt-2 text-2xs">
                  {isAdmin ? "admin" : role}
                </Badge>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setCollapsed((c) => !c)}
                  aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
                >
                  {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{collapsed ? "Expandir (Ctrl+B)" : "Recolher (Ctrl+B)"}</TooltipContent>
            </Tooltip>
          </div>

          <nav className={`flex-1 ${collapsed ? "p-1.5" : "p-2"} space-y-0.5 overflow-y-auto`}>
            {items.map((n) => {
              const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
              const link = (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.exact}
                  className={`flex items-center gap-2 rounded-md text-sm transition-colors ${
                    collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                  } ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <n.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="truncate">{n.label}</span>}
                </NavLink>
              );
              return collapsed ? (
                <Tooltip key={n.to}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{n.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </nav>

          <div className={`${collapsed ? "p-1.5" : "p-2"} border-t border-border/60 space-y-1`}>
            {collapsed ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-full h-9"
                      onClick={() => setTheme(isDark ? "light" : "dark")}
                      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
                    >
                      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">{isDark ? "Modo claro" : "Modo escuro"}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full h-9" onClick={() => navigate("/dashboard")}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Voltar ao app</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-full h-9 text-destructive"
                      onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Sair</TooltipContent>
                </Tooltip>
              </>
            ) : (
              <>
                <div
                  role="tablist"
                  aria-label="Tema do painel"
                  className="grid grid-cols-2 gap-1 rounded-md border border-border/60 bg-muted/40 p-1"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!isDark}
                    onClick={() => setTheme("light")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-sm h-7 text-xs transition-colors",
                      !isDark
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Sun className="h-3.5 w-3.5" /> Claro
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isDark}
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "inline-flex items-center justify-center gap-1.5 rounded-sm h-7 text-xs transition-colors",
                      isDark
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Moon className="h-3.5 w-3.5" /> Escuro
                  </button>
                </div>
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate("/dashboard")}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao app
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive"
                  onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sair
                </Button>
              </>
            )}
          </div>
        </aside>
        <main className="flex-1 overflow-x-hidden min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 flex items-center justify-between gap-3 px-4 sm:px-6">
            <div className="min-w-0">
              <h1 className="text-sm font-semibold font-display truncate">{currentLabel}</h1>
              <p className="text-2xs text-muted-foreground truncate">Painel de gestão MedStation</p>
            </div>
            <div className="flex items-center gap-1">
              <AdminNotificationBell />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
              >
                {isDark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
              </Button>
            </div>
          </header>
          <div className="flex-1 min-w-0">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

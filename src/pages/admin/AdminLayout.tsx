import { ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Users, CreditCard, MessageSquare, Activity,
  Star, Shield, ToggleLeft, Megaphone, ArrowLeft, LogOut,
} from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/usuarios", label: "Usuários", icon: Users },
  { to: "/admin/faturamento", label: "Faturamento", icon: CreditCard, adminOnly: true },
  { to: "/admin/suporte", label: "Suporte", icon: MessageSquare },
  { to: "/admin/uso-ia", label: "Uso de IA", icon: Activity },
  { to: "/admin/feedback", label: "Feedback", icon: Star },
  { to: "/admin/auditoria", label: "Auditoria", icon: Shield },
  { to: "/admin/flags", label: "Feature Flags", icon: ToggleLeft, adminOnly: true },
  { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone, adminOnly: true },
];

export function AdminLayout({ children }: { children?: ReactNode }) {
  const { role, isAdmin } = useAdminRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-60 shrink-0 border-r border-border/60 bg-card/50 flex flex-col">
        <div className="px-4 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-display text-sm font-semibold">MedStation Admin</span>
          </div>
          <Badge variant="outline" className="mt-2 text-2xs">
            {isAdmin ? "admin" : role}
          </Badge>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => {
            const active = n.exact ? pathname === n.to : pathname.startsWith(n.to);
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.exact}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="p-2 border-t border-border/60 space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao app
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-destructive" onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

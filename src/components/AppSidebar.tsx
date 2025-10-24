import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Stethoscope,
  FlaskConical,
  Calculator,
  Pill,
  FileText,
  Users,
  Settings,
  LogOut,
  Activity,
  Folder,
  CreditCard,
  User,
  Home,
  Database,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/contexts/ProfileContext";

const homeModule = { title: "Início", url: "/dashboard", icon: Home };

const managementModules = [
  { title: "Pacientes", url: "/patients", icon: Users },
  { title: "Casos", url: "/cases", icon: Folder },
  { title: "Prescrições", url: "/prescricoes", icon: FileText },
  { title: "Exames", url: "/exames", icon: FlaskConical },
];

const agentModules = [
  { title: "Clínicus", url: "/clinicus", icon: Stethoscope },
  { title: "Examinus", url: "/examinus", icon: Activity },
  { title: "Scorius", url: "/scorius", icon: Calculator },
  { title: "Numerus", url: "/numerus", icon: Database },
  { title: "Prescriptus", url: "/prescriptus", icon: Pill },
  { title: "CODexus", url: "/codexus", icon: FileText },
];

const settings = [
  { title: "Meu Perfil", url: "/settings", icon: User },
  { title: "Assinatura", url: "/pricing", icon: CreditCard },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { profile } = useProfile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = () => {
    if (!profile?.full_name) return "?";
    const names = profile.full_name.split(" ");
    if (names.length === 1) return names[0][0].toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

  const getTitle = () => {
    if (!profile?.gender) return "Dr(a)";
    return profile.gender === "M" ? "Dr." : profile.gender === "F" ? "Dra." : "Dr(a)";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-background shadow-sm">
      <SidebarContent className="gap-0 bg-background">
        {/* User Profile */}
        <div className="flex items-center gap-3 px-4 py-6 border-b border-border bg-card">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20 shadow-sm transition-all hover:ring-primary/40 hover:scale-105">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-semibold text-foreground truncate">
                {getTitle()} {profile?.full_name || "Carregando..."}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {profile?.specialty || "Médico"}
              </p>
              {profile?.crm && profile?.crm_state && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  CRM-{profile.crm_state} {profile.crm}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Home */}
        <SidebarGroup className="py-3">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip={homeModule.title}>
                  <NavLink
                    to={homeModule.url}
                    className={({ isActive }) =>
                      isActive
                        ? "bg-muted text-foreground font-semibold"
                        : "hover:bg-muted/50 hover:translate-x-1 transition-all duration-200"
                    }
                  >
                    <homeModule.icon className="h-4 w-4" />
                    {!collapsed && <span className="animate-fade-in">{homeModule.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management modules */}
        <SidebarGroup className="py-3 border-t border-border">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
            Gestão
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {managementModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-muted text-foreground font-semibold"
                          : "hover:bg-muted/50 hover:translate-x-1 transition-all duration-200"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="animate-fade-in">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agent modules */}
        <SidebarGroup className="py-3 border-t border-border">
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-1">
            Agentes IA
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {agentModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-muted text-foreground font-semibold"
                          : "hover:bg-muted/50 hover:translate-x-1 transition-all duration-200"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="animate-fade-in">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto py-3 border-t border-border">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-muted text-foreground font-semibold"
                          : "hover:bg-muted/50 hover:translate-x-1 transition-all duration-200"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="animate-fade-in">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Sair" 
                  onClick={handleLogout}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive hover:translate-x-1 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span className="animate-fade-in">Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

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
];

const agentModules = [
  { title: "Clínicus", url: "/clinicus", icon: Stethoscope },
  { title: "Examinus", url: "/examinus", icon: FlaskConical },
  { title: "Scorius", url: "/scorius", icon: Activity },
  { title: "Numerus", url: "/numerus", icon: Calculator },
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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarContent className="gap-0">
        {/* User Profile */}
        <div className={`flex items-center gap-3 border-b border-border px-4 py-5 transition-all ${collapsed ? 'flex-col justify-center py-4' : ''}`}>
          <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-border transition-all hover:ring-primary">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground font-medium text-sm">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className={`flex-1 min-w-0 ${collapsed ? 'hidden' : ''}`}>
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {getTitle()} {profile?.full_name || "Carregando..."}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {profile?.specialty || "Médico"}
            </p>
            {profile?.crm && profile?.crm_state && (
              <p className="text-xs text-muted-foreground truncate mt-0.5 font-mono">
                CRM-{profile.crm_state} {profile.crm}
              </p>
            )}
          </div>
        </div>

        {/* Home */}
        <SidebarGroup className="py-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={homeModule.title}>
                  <NavLink
                    to={homeModule.url}
                    className={({ isActive }) =>
                      isActive
                        ? "bg-accent text-primary font-semibold border-l-2 border-primary [&_svg]:text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:font-semibold transition-all [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground"
                    }
                  >
                    <homeModule.icon className="h-4 w-4" />
                    <span className={collapsed ? 'hidden' : ''}>{homeModule.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management modules */}
        <SidebarGroup className="py-2 border-t border-border">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-1">
            Gestão
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {managementModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-primary font-semibold border-l-2 border-primary [&_svg]:text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:font-semibold transition-all [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={collapsed ? 'hidden' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agent modules */}
        <SidebarGroup className="py-2 border-t border-border">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-3 mb-1">
            Agentes IA
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {agentModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-primary font-semibold border-l-2 border-primary [&_svg]:text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:font-semibold transition-all [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={collapsed ? 'hidden' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto py-2 border-t border-border">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-accent text-primary font-semibold border-l-2 border-primary [&_svg]:text-primary"
                          : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground hover:font-semibold transition-all [&_svg]:text-muted-foreground hover:[&_svg]:text-foreground"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={collapsed ? 'hidden' : ''}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Sair" 
                  onClick={handleLogout}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:font-semibold transition-all [&_svg]:text-muted-foreground hover:[&_svg]:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  <span className={collapsed ? 'hidden' : ''}>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

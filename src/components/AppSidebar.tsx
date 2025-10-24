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
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-gradient-to-br from-primary/25 via-sidebar/85 to-primary/20 backdrop-blur-md shadow-2xl">
      <SidebarContent className="gap-0 bg-gradient-to-b from-transparent via-sidebar/50 to-primary/5">
        {/* User Profile */}
        <div className={`flex items-center gap-3 border-b border-primary/20 bg-gradient-to-r from-primary/30 via-primary/15 to-transparent shadow-lg backdrop-blur-sm transition-all ${collapsed ? 'px-2 py-4 justify-center flex-col' : 'px-4 py-6'}`}>
          <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/30 shadow-xl transition-all hover:ring-primary/50 hover:scale-110 hover:shadow-2xl">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className={`flex-1 min-w-0 ${collapsed ? 'hidden' : 'animate-fade-in'}`}>
            <p className="text-sm font-semibold text-sidebar-foreground truncate">
              {getTitle()} {profile?.full_name || "Carregando..."}
            </p>
            <p className="text-xs text-sidebar-foreground/70 truncate mt-0.5">
              {profile?.specialty || "Médico"}
            </p>
            {profile?.crm && profile?.crm_state && (
              <p className="text-xs text-sidebar-foreground/60 truncate mt-0.5 font-mono">
                CRM-{profile.crm_state} {profile.crm}
              </p>
            )}
          </div>
        </div>

        {/* Home */}
        <SidebarGroup className="py-3 bg-gradient-to-r from-primary/5 to-transparent">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={homeModule.title}>
                  <NavLink
                    to={homeModule.url}
                    className={({ isActive }) =>
                      isActive
                        ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold border-l-2 border-primary shadow-sm"
                        : "hover:bg-sidebar-accent/50 hover:translate-x-1 transition-all duration-200"
                    }
                  >
                    <homeModule.icon className="h-4 w-4" />
                    <span className={collapsed ? 'hidden' : 'animate-fade-in'}>{homeModule.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Management modules */}
        <SidebarGroup className="py-3 border-t border-primary/10 bg-gradient-to-r from-primary/8 to-transparent">
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider px-3 mb-1">
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
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold border-l-2 border-primary shadow-sm"
                          : "hover:bg-sidebar-accent/50 hover:translate-x-1 transition-all duration-200"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={collapsed ? 'hidden' : 'animate-fade-in'}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agent modules */}
        <SidebarGroup className="py-3 border-t border-primary/10 bg-gradient-to-r from-primary/10 to-transparent">
          <SidebarGroupLabel className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider px-3 mb-1">
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
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold border-l-2 border-primary shadow-sm"
                          : "hover:bg-sidebar-accent/50 hover:translate-x-1 transition-all duration-200"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={collapsed ? 'hidden' : 'animate-fade-in'}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto py-3 border-t border-primary/15 bg-gradient-to-r from-primary/12 to-transparent">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary font-semibold border-l-2 border-primary shadow-sm"
                          : "hover:bg-sidebar-accent/50 hover:translate-x-1 transition-all duration-200"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span className={collapsed ? 'hidden' : 'animate-fade-in'}>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton 
                  tooltip="Sair" 
                  onClick={handleLogout}
                  className="hover:bg-destructive/10 hover:text-destructive hover:translate-x-1 transition-all duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className={collapsed ? 'hidden' : 'animate-fade-in'}>Sair</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

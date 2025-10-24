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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Stethoscope className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">MedStation AI</h1>
              <p className="text-xs text-sidebar-foreground/60">AI Clinical Assistant</p>
            </div>
          )}
        </div>

        {/* Management modules */}
        <SidebarGroup>
          <SidebarGroupLabel>Gestão</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agent modules */}
        <SidebarGroup>
          <SidebarGroupLabel>Agentes IA</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) =>
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary font-medium"
                          : "hover:bg-sidebar-accent/50"
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Sair" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span>Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Stethoscope,
  FlaskConical,
  Sigma,
  Pill,
  FileText,
  LogOut,
  Activity,
  CreditCard,
  User,
  Home,
  Wind,
  FileCheck,
  BookOpen,
  Compass,
  Calculator,
  Moon,
  Sun,
  LifeBuoy,
} from "lucide-react";
import { SUPPORT_CHAT_EVENT } from "@/components/SupportChat";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile } from "@/contexts/ProfileContext";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const homeModule = { title: "Início", url: "/dashboard", icon: Home, code: "00" };

const agentModules = [
  { title: "Clínicus", url: "/clinicus", icon: Stethoscope, code: "01" },
  { title: "Examinus", url: "/examinus", icon: Activity, code: "02" },
  { title: "Gasometrus", url: "/gasometrus", icon: Wind, code: "03" },
  { title: "Scorius", url: "/scorius", icon: Calculator, code: "04" },
  { title: "Numerus", url: "/numerus", icon: Sigma, code: "05" },
  { title: "Prescriptus", url: "/prescriptus", icon: Pill, code: "06" },
  { title: "Atestus", url: "/atestus", icon: FileCheck, code: "07" },
  { title: "Protocolus", url: "/protocolus", icon: BookOpen, code: "08" },
  { title: "Orientus", url: "/orientus", icon: Compass, code: "09" },
  { title: "CODexus", url: "/codexus", icon: FileText, code: "10" },
];

const settings = [
  { title: "Perfil", url: "/settings", icon: User },
  { title: "Assinatura", url: "/pricing", icon: CreditCard },
];

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative flex items-center gap-3 rounded-sm px-3 h-9 text-sm font-medium transition-colors duration-150 ease-precise outline-none",
    "border-l-2 border-transparent",
    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    "focus-visible:bg-sidebar-accent focus-visible:text-sidebar-accent-foreground focus-visible:border-l-primary",
    isActive
      ? "bg-sidebar-accent text-foreground border-l-primary font-semibold"
      : "text-sidebar-foreground/80",
  );

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();

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
    <Sidebar collapsible="icon" className="border-r border-hairline bg-sidebar">
      <SidebarContent className="gap-0 bg-sidebar">
        {/* Brand mark */}
        <div className={cn("flex items-center gap-2.5 hairline-b px-4 h-16", collapsed && "px-2 justify-center")}>
          <LogoMark className={cn(collapsed ? "h-9 w-9" : "h-10 w-10", "shrink-0")} />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tightest text-foreground">
                MedStation
                <span className="font-mono uppercase tracking-[0.18em] text-primary ml-1 text-[0.6em] align-middle">AI</span>
              </span>
              <span className="font-mono text-2xs uppercase tracking-mono text-muted-foreground mt-1">Clinic OS</span>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className={cn("flex items-center gap-3 px-4 py-4 hairline-b", collapsed && "justify-center px-2")}>
          <Avatar className="h-9 w-9 rounded-sm border border-hairline">
            <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} className="rounded-sm" />
            <AvatarFallback className="rounded-sm bg-muted text-foreground font-medium text-xs">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate leading-tight">
                {getTitle()} {profile?.full_name?.split(" ")[0] || "—"}
              </p>
              <p className="font-mono text-2xs uppercase tracking-mono text-muted-foreground truncate mt-1">
                {profile?.crm && profile?.crm_state
                  ? `CRM-${profile.crm_state} ${profile.crm}`
                  : profile?.specialty || "Médico"}
              </p>
            </div>
          )}
        </div>

        {/* Início */}
        <SidebarGroup className="py-3">
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={homeModule.title} className="p-0 h-auto bg-transparent hover:bg-transparent">
                  <NavLink to={homeModule.url} className={navItemClass}>
                    <homeModule.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="flex-1">{homeModule.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Assistentes */}
        <SidebarGroup className="py-3 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto flex items-center justify-between">
              <span>Assistentes</span>
              <span className="font-mono text-2xs text-muted-foreground/60">{agentModules.length.toString().padStart(2, "0")}</span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {agentModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to={item.url} className={navItemClass}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          <span className="font-mono text-2xs text-muted-foreground/50 group-hover:text-muted-foreground">
                            {item.code}
                          </span>
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings + actions */}
        <SidebarGroup className="mt-auto py-3 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto">Conta</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {settings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className="p-0 h-auto bg-transparent hover:bg-transparent">
                    <NavLink to={item.url} className={navItemClass}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Suporte MedPocket"
                  onClick={() => window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_EVENT))}
                  className={cn(
                    "group flex items-center gap-3 rounded-sm px-3 h-9 text-sm font-medium",
                    "border-l-2 border-transparent text-sidebar-foreground/80",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "transition-colors duration-150 ease-precise",
                  )}
                >
                  <LifeBuoy className="h-4 w-4" />
                  {!collapsed && <span className="flex-1">Suporte</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={theme === "dark" ? "Modo claro" : "Modo escuro"}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={cn(
                    "group flex items-center gap-3 rounded-sm px-3 h-9 text-sm font-medium",
                    "border-l-2 border-transparent text-sidebar-foreground/80",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "transition-colors duration-150 ease-precise",
                  )}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {!collapsed && <span className="flex-1">{theme === "dark" ? "Modo claro" : "Modo escuro"}</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Sair"
                  onClick={handleLogout}
                  className={cn(
                    "group flex items-center gap-3 rounded-sm px-3 h-9 text-sm font-medium",
                    "border-l-2 border-transparent text-destructive/90",
                    "hover:bg-destructive/10 hover:text-destructive hover:border-l-destructive",
                    "transition-colors duration-150 ease-precise",
                  )}
                >
                  <LogOut className="h-4 w-4" />
                  {!collapsed && <span className="flex-1">Sair</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

const MODULES_KEY = "ms_sidebar_closed_modules";
const MODULE_HEADER = "w-full text-left flex items-center gap-3 rounded-md px-3 h-9 text-sm font-semibold text-foreground border-l-2 border-primary/60 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer";
import { supabase } from "@/integrations/supabase/client";
import { AssistantGlyph } from "@/components/AssistantGlyph";

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
  Mic,
  Gift,
  UsersRound,
  FolderOpen,
  NotebookPen,
  MessagesSquare,
  Scale,
  BedDouble,
  Archive,
  Workflow,
  Sparkles,
  ListChecks,
  FileCog,

  Play,
} from "lucide-react";
import { SUPPORT_CHAT_EVENT } from "@/components/SupportChat";
import { LogoMark } from "@/components/LogoMark";
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
  { title: "Mediscuss", url: "/mediscuss", icon: MessagesSquare, code: "11" },
  { title: "Legalis", url: "/legalis", icon: Scale, code: "12" },

];

const consultorioModule = { title: "Modo Escuta", url: "/consultorio", icon: Mic, code: "C" };

const consultorioSubItems = [
  { title: "Novo atendimento", url: "/consultorio", icon: Play },
  { title: "Histórico", url: "/consultorio/historico", icon: FolderOpen },
];

const rotinaModule = { title: "Modo Rotineiro", url: "/rotina", icon: Sun, code: "R" };

const rotinaSubItems = [
  { title: "Mapa de leitos", url: "/rotina", icon: BedDouble },
  { title: "Arquivo de altas", url: "/rotina/arquivo", icon: Archive },
];

const operadorModule = { title: "Modo Operador", url: "/operador", icon: Workflow, code: "OP" };

const operadorSubItems = [
  { title: "Central livre", url: "/operador", icon: Sparkles },
  { title: "Converter documento", url: "/operador/converter", icon: FileCog },
  { title: "Organizar exames", url: "/operador/exames", icon: ListChecks },
];

const recordsModules = [
  { title: "Cofre Inteligente", url: "/notes", icon: NotebookPen },
];

const COLLAPSED_ITEM = "justify-center gap-0 px-0 mx-auto border-l-0 hover:border-l-0 hover:translate-x-0 w-full";
const COLLAPSED_BTN = "group-data-[collapsible=icon]:!w-full group-data-[collapsible=icon]:!size-auto group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:justify-center";

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative flex items-center gap-3 rounded-md px-3 h-10 text-sm font-medium cursor-pointer outline-none",
    "border-l-2 border-transparent",
    "transition-all duration-200 ease-precise",
    "hover:bg-primary/10 hover:text-foreground hover:border-l-primary/70 hover:translate-x-0.5 hover:shadow-sm",
    "[&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110 hover:[&_svg]:text-primary",
    "focus-visible:bg-primary/10 focus-visible:text-foreground focus-visible:border-l-primary",
    isActive
      ? "bg-sidebar-accent text-foreground border-l-primary font-semibold [&_svg]:text-primary"
      : "text-sidebar-foreground/80",
  );

const subItemClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "group relative ml-6 flex items-center gap-2.5 rounded-md pl-3 pr-3 h-9 text-[0.8rem] cursor-pointer outline-none",
    "border-l border-border/70",
    "transition-all duration-200 ease-precise",
    "hover:bg-primary/10 hover:text-foreground hover:border-l-primary/70",
    "[&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110 hover:[&_svg]:text-primary",
    isActive
      ? "bg-sidebar-accent text-foreground border-l-primary font-semibold [&_svg]:text-primary"
      : "text-sidebar-foreground/70",
  );


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [closedModules, setClosedModules] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(MODULES_KEY) || "{}"); } catch { return {}; }
  });
  const toggleModule = (key: string) => {
    setClosedModules((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem(MODULES_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon" className="z-30 border-r border-hairline bg-sidebar shadow-[8px_0_24px_-12px_hsl(var(--foreground)/0.18)]">
      <SidebarContent className="gap-0 bg-sidebar">
        {/* Brand mark */}
        <div className={cn("flex items-center gap-3 hairline-b px-4 h-20", collapsed && "px-2 justify-center h-16")}>
          <LogoMark className={cn(collapsed ? "h-10 w-10" : "h-12 w-12", "shrink-0")} />
          {!collapsed && (
            <div className="flex flex-col leading-none">
              <span className="font-display text-xl font-semibold tracking-tightest text-foreground">
                MedStation
              </span>
            </div>

          )}
        </div>

        {/* Início */}
        <SidebarGroup className="py-3 group-data-[collapsible=icon]:px-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={homeModule.title} className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                  <NavLink to={homeModule.url} className={(p) => cn(navItemClass(p), collapsed && COLLAPSED_ITEM)}>
                    <homeModule.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="flex-1">{homeModule.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Assistentes */}
        <SidebarGroup className="py-3 group-data-[collapsible=icon]:px-1 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel asChild className="label-mono px-4 mb-2 h-auto">
              <button
                type="button"
                onClick={() => toggleModule("assistentes")}
                aria-expanded={!closedModules.assistentes}
                className="w-full flex items-center justify-between gap-2 hover:text-foreground transition-colors"
              >
                <span>Assistentes</span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-2xs text-muted-foreground/60">{agentModules.length.toString().padStart(2, "0")}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", closedModules.assistentes && "-rotate-90")} />
                </span>
              </button>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {(collapsed || !closedModules.assistentes) && agentModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                    <NavLink to={item.url} className={(p) => cn(navItemClass(p), collapsed && COLLAPSED_ITEM)}>
                      <AssistantGlyph size="xs" animate={false} interactive>
                        <item.icon className="h-4 w-4 shrink-0" />
                      </AssistantGlyph>

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

        {/* Modo Escuta - destaque */}
        <SidebarGroup className="py-3 group-data-[collapsible=icon]:px-1 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto">Tempo Real</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {!collapsed && (
                <SidebarMenuItem>
                  <button type="button" onClick={() => toggleModule("escuta")} aria-expanded={!closedModules.escuta} className={MODULE_HEADER}>
                    <AssistantGlyph size="xs" animate={false} interactive>
                      <consultorioModule.icon className="h-4 w-4 shrink-0" />
                    </AssistantGlyph>
                    <span className="flex-1">{consultorioModule.title}</span>
                    <span className="font-mono text-2xs text-primary/80">{consultorioModule.code}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", closedModules.escuta && "-rotate-90")} />
                  </button>
                </SidebarMenuItem>
              )}

              {/* Subitens hierarquizados */}
              {(collapsed || !closedModules.escuta) && consultorioSubItems.map((sub) => {
                const isActive = pathname === sub.url;
                return (
                <SidebarMenuItem key={sub.url}>
                  <SidebarMenuButton asChild tooltip={sub.title} isActive={isActive} className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                    <NavLink
                      to={sub.url}
                      end
                      className={cn(subItemClass({ isActive }), collapsed && cn("ml-0 pr-0", COLLAPSED_ITEM))}
                    >

                      {!collapsed && (
                        <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-border" aria-hidden />
                      )}
                      <sub.icon className="h-3.5 w-3.5 shrink-0" />
                      {!collapsed && <span className="flex-1">{sub.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                );
              })}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Modo Rotineiro */}
        <SidebarGroup className="py-3 group-data-[collapsible=icon]:px-1 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto">Rotina de leitos</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {!collapsed && (
                <SidebarMenuItem>
                  <button type="button" onClick={() => toggleModule("rotina")} aria-expanded={!closedModules.rotina} className={MODULE_HEADER}>
                    <AssistantGlyph size="xs" animate={false} interactive>
                      <rotinaModule.icon className="h-4 w-4 shrink-0" />
                    </AssistantGlyph>
                    <span className="flex-1">{rotinaModule.title}</span>
                    <span className="font-mono text-2xs text-primary/80">{rotinaModule.code}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", closedModules.rotina && "-rotate-90")} />
                  </button>
                </SidebarMenuItem>
              )}

              {(collapsed || !closedModules.rotina) && rotinaSubItems.map((sub) => {
                const isActive = pathname === sub.url;
                return (
                  <SidebarMenuItem key={sub.url}>
                    <SidebarMenuButton asChild tooltip={sub.title} isActive={isActive} className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                      <NavLink
                        to={sub.url}
                        end
                        className={cn(subItemClass({ isActive }), collapsed && cn("ml-0 pr-0", COLLAPSED_ITEM))}
                      >
                        {!collapsed && (
                          <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-border" aria-hidden />
                        )}
                        <sub.icon className="h-3.5 w-3.5 shrink-0" />
                        {!collapsed && <span className="flex-1">{sub.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


        {/* Modo Operador */}
        <SidebarGroup className="py-3 group-data-[collapsible=icon]:px-1 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto">Central de operações</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {!collapsed && (
                <SidebarMenuItem>
                  <button type="button" onClick={() => toggleModule("operador")} aria-expanded={!closedModules.operador} className={MODULE_HEADER}>
                    <AssistantGlyph size="xs" animate={false} interactive>
                      <operadorModule.icon className="h-4 w-4 shrink-0" />
                    </AssistantGlyph>
                    <span className="flex-1">{operadorModule.title}</span>
                    <span className="font-mono text-2xs text-primary/80">{operadorModule.code}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", closedModules.operador && "-rotate-90")} />
                  </button>
                </SidebarMenuItem>
              )}

              {(collapsed || !closedModules.operador) && operadorSubItems.map((sub) => {
                const isActive = pathname === sub.url;
                return (
                  <SidebarMenuItem key={sub.url}>
                    <SidebarMenuButton asChild tooltip={sub.title} isActive={isActive} className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                      <NavLink
                        to={sub.url}
                        end
                        className={cn(subItemClass({ isActive }), collapsed && cn("ml-0 pr-0", COLLAPSED_ITEM))}
                      >
                        {!collapsed && (
                          <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-border" aria-hidden />
                        )}
                        <sub.icon className="h-3.5 w-3.5 shrink-0" />
                        {!collapsed && <span className="flex-1">{sub.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Notas */}
        <SidebarGroup className="py-3 group-data-[collapsible=icon]:px-1 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto">
              <span>Acervo pessoal</span>
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {recordsModules.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                    <NavLink to={item.url} className={(p) => cn(navItemClass(p), collapsed && COLLAPSED_ITEM)}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="flex-1">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings + actions */}
        <SidebarGroup className="mt-auto py-3 group-data-[collapsible=icon]:px-1 hairline-t">
          {!collapsed && (
            <SidebarGroupLabel className="label-mono px-4 mb-2 h-auto">Conta</SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Indicar e ganhar" className={cn("p-0 h-auto bg-transparent hover:bg-transparent", COLLAPSED_BTN)}>
                  <NavLink to="/indicar" className={(p) => cn(navItemClass(p), collapsed && COLLAPSED_ITEM)}>
                    <Gift className="h-4 w-4 shrink-0 text-primary" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">Indicar e ganhar</span>
                        <span className="font-mono text-2xs text-primary/80">+30d</span>
                      </>
                    )}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Suporte MedPocket"
                  onClick={() => window.dispatchEvent(new CustomEvent(SUPPORT_CHAT_EVENT))}
                  className={cn(
                    "group flex items-center gap-3 rounded-sm px-3 h-9 text-sm font-medium",
                    "border-l-2 border-transparent text-sidebar-foreground/80",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "transition-colors duration-150 ease-precise",
                    collapsed && cn(COLLAPSED_ITEM, COLLAPSED_BTN),
                  )}
                >
                  <LifeBuoy className="h-4 w-4" />
                  {!collapsed && <span className="flex-1">Suporte</span>}
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
                    collapsed && cn(COLLAPSED_ITEM, COLLAPSED_BTN),
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

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Bot, Library, MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { createThread, deleteThread, timelineGroup, useStudioStore, type StudioAssistant } from "@/lib/studio";
import { NEW_STUDIO_ASSISTANT, StudioAssistantDialog } from "@/components/studio/StudioAssistantDialog";

const row = "group flex items-center gap-2 rounded-md px-3 h-9 text-sm text-sidebar-foreground/80 hover:bg-primary/10 hover:text-foreground";

export function StudioSidebarSection() {
  const { threads, assistants } = useStudioStore();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Partial<StudioAssistant> | null>(null);
  const startEditing = setEditing;

  const groups = ["Hoje", "Ontem", "Últimos 7 dias", "Anteriores"]
    .map((g) => ({ g, items: threads.filter((t) => timelineGroup(t.updatedAt) === g) }))
    .filter((x) => x.items.length);

  const open = (a?: StudioAssistant) => navigate(`/studio/${createThread(a).id}`);

  return (
    <div className="flex flex-col gap-4 px-2 py-3">
      <Button onClick={() => open()} className="w-full justify-start gap-2"><Plus className="h-4 w-4" /> Nova conversa</Button>
      <NavLink to="/prompteca" className={({ isActive }) => cn(row, "-mt-2", isActive && "bg-sidebar-accent font-semibold text-foreground")}>
        <Library className="h-4 w-4 shrink-0 text-primary" /> Prompteca
      </NavLink>

      <div>
        <div className="label-mono mb-1 flex items-center justify-between px-2">
          <span>Meus assistentes</span>
          <button type="button" aria-label="Criar assistente" className="text-muted-foreground hover:text-foreground"
            onClick={() => startEditing({ ...NEW_STUDIO_ASSISTANT })}><Plus className="h-3.5 w-3.5" /></button>
        </div>
        {assistants.length === 0 && (
          <button type="button" className={cn(row, "w-full text-muted-foreground")}
            onClick={() => startEditing({ ...NEW_STUDIO_ASSISTANT })}>
            <Plus className="h-4 w-4" /> Criar assistente
          </button>
        )}
        {assistants.map((a) => (
          <div key={a.id} className={row}>
            <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => open(a)}>
              <Bot className="h-4 w-4 shrink-0 text-primary" /><span className="truncate">{a.name}</span>
            </button>
            <button type="button" aria-label="Editar" className="opacity-0 group-hover:opacity-100" onClick={() => startEditing(a)}><Pencil className="h-3.5 w-3.5" /></button>
          </div>
        ))}
      </div>

      <div>
        <div className="label-mono mb-1 px-2">Conversas</div>
        {groups.length === 0 && <p className="px-3 text-2xs text-muted-foreground">Nenhuma conversa ainda.</p>}
        {groups.map(({ g, items }) => (
          <div key={g} className="mb-2">
            <div className="px-3 py-1 text-2xs text-muted-foreground">{g}</div>
            {items.map((t) => (
              <div key={t.id} className="group relative">
                <NavLink to={`/studio/${t.id}`} className={({ isActive }) => cn(row, "pr-8", isActive && "bg-sidebar-accent font-semibold text-foreground")}>
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{t.title}</span>
                </NavLink>
                <button type="button" aria-label="Excluir conversa"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100"
                  onClick={() => { deleteThread(t.id); if (location.pathname.endsWith(t.id)) navigate("/studio"); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>

      <StudioAssistantDialog value={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

const iconBtn = "group-data-[collapsible=icon]:!size-10 mx-auto justify-center rounded-md text-sidebar-foreground/80 hover:bg-primary/10 hover:text-foreground";

/** Menu recolhido do Studio: só os atalhos do Studio, sem os assistentes clínicos. */
export function StudioSidebarCollapsed() {
  const { threads, assistants } = useStudioStore();
  const navigate = useNavigate();
  const recent = threads[0];
  const items = [
    { label: "Nova conversa", icon: Plus, onClick: () => navigate(`/studio/${createThread().id}`), primary: true },
    { label: "Prompteca", icon: Library, to: "/prompteca" },
    ...(recent ? [{ label: `Última conversa: ${recent.title}`, icon: MessageSquare, to: `/studio/${recent.id}` }] : []),
    ...assistants.slice(0, 6).map((a) => ({ label: a.name, icon: Bot, onClick: () => navigate(`/studio/${createThread(a).id}`) })),
  ];
  return (
    <SidebarGroup className="py-3 px-1">
      <SidebarGroupContent>
        <SidebarMenu className="gap-1.5">
          {items.map((it, i) => (
            <SidebarMenuItem key={`${it.label}-${i}`}>
              {"to" in it && it.to ? (
                <SidebarMenuButton asChild tooltip={it.label} className={iconBtn}>
                  <NavLink to={it.to} aria-label={it.label} className={({ isActive }) => cn(isActive && "bg-sidebar-accent text-foreground")}>
                    <it.icon className="h-4 w-4 text-primary" />
                  </NavLink>
                </SidebarMenuButton>
              ) : (
                <SidebarMenuButton tooltip={it.label} aria-label={it.label} onClick={it.onClick}
                  className={cn(iconBtn, "primary" in it && it.primary && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground")}>
                  <it.icon className="h-4 w-4" />
                </SidebarMenuButton>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

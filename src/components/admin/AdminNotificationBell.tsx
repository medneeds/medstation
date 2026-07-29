import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Bell, CheckCheck, LifeBuoy, UserPlus, Trophy, CreditCard,
  Dot, Loader2, Inbox, ArrowRight, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAdminNotifications, type AdminNotification } from "@/hooks/useAdminNotifications";

const META: Record<string, { icon: typeof Bell; tone: string; label: string }> = {
  support_ticket: { icon: LifeBuoy, tone: "text-destructive bg-destructive/10", label: "Suporte" },
  new_user: { icon: UserPlus, tone: "text-primary bg-primary/10", label: "Usuário" },
  milestone: { icon: Trophy, tone: "text-amber-500 bg-amber-500/10", label: "Marco" },
  sale: { icon: CreditCard, tone: "text-emerald-500 bg-emerald-500/10", label: "Venda" },
};

function metaFor(type: string) {
  return META[type] ?? { icon: Bell, tone: "text-muted-foreground bg-muted", label: "Geral" };
}

export function AdminNotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "unread">("all");
  const navigate = useNavigate();
  const { items, loading, unreadCount, markAsRead, markAsUnread, markAllAsRead, refresh } =
    useAdminNotifications(true);

  const visible = useMemo(
    () => (tab === "unread" ? items.filter((n) => !n.read) : items),
    [items, tab],
  );

  const openNotification = (n: AdminNotification) => {
    if (!n.read) void markAsRead(n.id);
    if (n.link) {
      setOpen(false);
      navigate(n.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9"
          aria-label={unreadCount ? `${unreadCount} notificações não lidas` : "Notificações"}
        >
          <Bell className={cn("h-[18px] w-[18px] transition-transform", unreadCount > 0 && "animate-[wiggle_2.4s_ease-in-out_infinite]")} />
          {unreadCount > 0 && (
            <>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive animate-ping" />
              <span className="absolute -right-1 -top-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold leading-[18px] text-center shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={10} className="w-[380px] p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60">
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-none">Notificações</p>
            <p className="text-xs text-muted-foreground mt-1">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void refresh()}>
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={unreadCount === 0}
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Marcar todas
            </Button>
          </div>
        </div>

        <div className="px-3 pt-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "all" | "unread")}>
            <TabsList className="grid grid-cols-2 h-8 w-full">
              <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Não lidas {unreadCount > 0 && <span className="ml-1 text-[10px] opacity-70">({unreadCount})</span>}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[380px]">
          {loading ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[280px] gap-2 text-center px-6">
              <div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center">
                <Inbox className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">Nenhuma notificação</p>
              <p className="text-xs text-muted-foreground">
                Tickets de suporte, novos usuários e marcos de venda aparecem aqui.
              </p>
            </div>
          ) : (
            <ul className="p-2 space-y-1">
              {visible.map((n) => {
                const m = metaFor(n.type);
                const Icon = m.icon;
                return (
                  <li key={n.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => openNotification(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openNotification(n);
                        }
                      }}
                      className={cn(
                        "group relative flex gap-3 rounded-lg p-3 cursor-pointer transition-colors",
                        n.read ? "hover:bg-muted/60" : "bg-primary/[0.04] hover:bg-primary/[0.08]",
                      )}
                    >
                      {!n.read && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary" />
                      )}
                      <div className={cn("h-8 w-8 shrink-0 rounded-full flex items-center justify-center", m.tone)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className={cn("text-sm leading-snug flex-1", n.read ? "text-foreground/80" : "font-medium")}>
                            {n.title}
                          </p>
                          {n.link && (
                            <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                        {n.message && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5 text-[11px] text-muted-foreground">
                          <span>{m.label}</span>
                          <Dot className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void (n.read ? markAsUnread(n.id) : markAsRead(n.id));
                            }}
                            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground underline underline-offset-2"
                          >
                            {n.read ? "Marcar não lida" : "Marcar como lida"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  severity: string;
  reference_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  read: boolean;
};

const PAGE_SIZE = 40;

export type AdminNotificationPrefs = {
  support_ticket: boolean;
  new_user: boolean;
  sale: boolean;
  milestone: boolean;
};

export const DEFAULT_PREFS: AdminNotificationPrefs = {
  support_ticket: true,
  new_user: true,
  sale: true,
  milestone: true,
};

export const PREF_LABELS: { key: keyof AdminNotificationPrefs; label: string; hint: string }[] = [
  { key: "support_ticket", label: "Tickets de suporte", hint: "Novos chamados abertos por usuários" },
  { key: "new_user", label: "Novos usuários", hint: "Cada novo cadastro na plataforma" },
  { key: "sale", label: "Vendas", hint: "Assinaturas confirmadas e indicações convertidas" },
  { key: "milestone", label: "Marcos", hint: "Metas de crescimento alcançadas" },
];

function isEnabled(prefs: AdminNotificationPrefs, type: string) {
  if (type in prefs) return prefs[type as keyof AdminNotificationPrefs];
  return true;
}

export function useAdminNotifications(enabled: boolean) {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<AdminNotificationPrefs>(DEFAULT_PREFS);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const [{ data: notifs }, { data: reads }, { data: prefRow }] = await Promise.all([
      supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase.from("admin_notification_reads").select("notification_id").eq("user_id", uid),
      supabase
        .from("admin_notification_prefs")
        .select("support_ticket,new_user,sale,milestone")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    if (prefRow) setPrefs({ ...DEFAULT_PREFS, ...prefRow });

    const readSet = new Set((reads ?? []).map((r) => r.notification_id));
    setItems(
      (notifs ?? []).map((n) => ({
        ...(n as unknown as Omit<AdminNotification, "read">),
        read: readSet.has(n.id),
      })),
    );
    setLoading(false);
  }, []);

  const updatePrefs = useCallback(
    async (patch: Partial<AdminNotificationPrefs>) => {
      setPrefs((prev) => ({ ...prev, ...patch }));
      if (!userId) return;
      await supabase
        .from("admin_notification_prefs")
        .upsert({ user_id: userId, ...prefs, ...patch }, { onConflict: "user_id" });
    },
    [userId, prefs],
  );

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("admin-notifications-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const n = payload.new as unknown as Omit<AdminNotification, "read">;
          setItems((prev) => (prev.some((p) => p.id === n.id) ? prev : [{ ...n, read: false }, ...prev].slice(0, PAGE_SIZE)));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!userId) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      await supabase
        .from("admin_notification_reads")
        .upsert({ notification_id: id, user_id: userId }, { onConflict: "notification_id,user_id" });
    },
    [userId],
  );

  const markAsUnread = useCallback(
    async (id: string) => {
      if (!userId) return;
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: false } : n)));
      await supabase
        .from("admin_notification_reads")
        .delete()
        .eq("notification_id", id)
        .eq("user_id", userId);
    },
    [userId],
  );

  const visibleItems = useMemo(
    () => items.filter((n) => isEnabled(prefs, n.type)),
    [items, prefs],
  );

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const unread = visibleItems.filter((n) => !n.read);
    if (unread.length === 0) return;
    const ids = new Set(unread.map((n) => n.id));
    setItems((prev) => prev.map((n) => (ids.has(n.id) ? { ...n, read: true } : n)));
    await supabase
      .from("admin_notification_reads")
      .upsert(
        unread.map((n) => ({ notification_id: n.id, user_id: userId })),
        { onConflict: "notification_id,user_id" },
      );
  }, [visibleItems, userId]);

  const unreadCount = useMemo(() => visibleItems.filter((n) => !n.read).length, [visibleItems]);

  return {
    items: visibleItems,
    loading,
    unreadCount,
    prefs,
    updatePrefs,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    refresh: load,
  };
}

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

export function useAdminNotifications(enabled: boolean) {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id ?? null;
    setUserId(uid);
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const [{ data: notifs }, { data: reads }] = await Promise.all([
      supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase.from("admin_notification_reads").select("notification_id").eq("user_id", uid),
    ]);

    const readSet = new Set((reads ?? []).map((r) => r.notification_id));
    setItems(
      (notifs ?? []).map((n) => ({
        ...(n as unknown as Omit<AdminNotification, "read">),
        read: readSet.has(n.id),
      })),
    );
    setLoading(false);
  }, []);

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

  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const unread = items.filter((n) => !n.read);
    if (unread.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase
      .from("admin_notification_reads")
      .upsert(
        unread.map((n) => ({ notification_id: n.id, user_id: userId })),
        { onConflict: "notification_id,user_id" },
      );
  }, [items, userId]);

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  return { items, loading, unreadCount, markAsRead, markAsUnread, markAllAsRead, refresh: load };
}

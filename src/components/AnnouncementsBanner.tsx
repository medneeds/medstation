import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Info, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Announcement {
  id: string;
  title: string;
  body: string | null;
  variant: string;
  cta_label: string | null;
  cta_url: string | null;
}

const ICONS: Record<string, any> = {
  info: Info,
  warning: AlertTriangle,
  success: Sparkles,
  update: Sparkles,
};

const VARIANT_STYLES: Record<string, string> = {
  info: "bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300",
  warning: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300",
  success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  update: "bg-primary/10 border-primary/30 text-primary",
};

export function AnnouncementsBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem("dismissed-announcements");
    if (stored) {
      try { setDismissed(new Set(JSON.parse(stored))); } catch {}
    }
    (async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("announcements")
        .select("id,title,body,variant,cta_label,cta_url")
        .eq("active", true)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gt.${now}`)
        .order("starts_at", { ascending: false })
        .limit(3);
      setItems(data as any || []);
    })();
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    localStorage.setItem("dismissed-announcements", JSON.stringify(Array.from(next)));
  };

  const visible = items.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => {
        const Icon = ICONS[a.variant] || Info;
        return (
          <div
            key={a.id}
            className={`flex items-start gap-3 rounded-md border px-4 py-3 ${VARIANT_STYLES[a.variant] || VARIANT_STYLES.info}`}
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">{a.title}</div>
              {a.body && <div className="text-xs mt-0.5 opacity-90">{a.body}</div>}
              {a.cta_url && a.cta_label && (
                <a href={a.cta_url} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs font-medium underline">
                  {a.cta_label}
                </a>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => dismiss(a.id)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Star, Loader2, MessageSquareQuote, Users } from "lucide-react";
import type { AdminMetrics } from "./types";

async function fetchMetrics(): Promise<AdminMetrics> {
  const { data: { session } } = await supabase.auth.getSession();
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const res = await fetch(`https://${projectId}.supabase.co/functions/v1/admin-metrics`, {
    headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
  });
  if (!res.ok) throw new Error(`admin-metrics failed (${res.status})`);
  return res.json();
}

export default function AdminFeedback() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [m, { data }] = await Promise.all([
          fetchMetrics(),
          supabase
            .from("user_feedback")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(200),
        ]);
        setMetrics(m);
        setRecent(data || []);
      } catch (e) {
        console.error("[admin-feedback]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const fb = metrics?.feedback;

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">
          Avaliações dos assistentes — números globais (a lista abaixo mostra os 200 mais recentes)
        </p>
      </header>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Média geral</div>
          <div className="text-3xl font-display font-semibold mt-2 flex items-center gap-2">
            {loading ? "···" : fb ? fb.avg_rating.toFixed(2) : "—"}
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
            <MessageSquareQuote className="h-3 w-3" /> Total avaliações
          </div>
          <div className="text-3xl font-display font-semibold mt-2">
            {loading ? "···" : fb?.total ?? "—"}
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3 w-3" /> Assistentes avaliados
          </div>
          <div className="text-3xl font-display font-semibold mt-2">
            {loading ? "···" : fb?.by_assistant.length ?? "—"}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-medium text-sm mb-3">Por assistente (global)</h3>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : !fb || fb.by_assistant.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem avaliações ainda.</p>
        ) : (
          fb.by_assistant.map((a) => (
            <div
              key={a.assistant}
              className="flex justify-between py-2 border-b border-border/40 last:border-0 text-sm"
            >
              <span>{a.assistant}</span>
              <span className="text-muted-foreground">
                {a.avg.toFixed(2)} ({a.count} avaliações)
              </span>
            </div>
          ))
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-sm mb-3">Últimos comentários</h3>
        <div className="space-y-3">
          {recent
            .filter((r) => r.comment)
            .slice(0, 30)
            .map((r) => (
              <div key={r.id} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                <div className="text-xs text-muted-foreground flex gap-2 items-center">
                  <span className="font-mono">{r.assistant || "geral"}</span>
                  <span>·</span>
                  <span>{"★".repeat(r.rating)}</span>
                  <span>·</span>
                  <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                </div>
                <div className="mt-1">{r.comment}</div>
              </div>
            ))}
          {recent.filter((r) => r.comment).length === 0 && (
            <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

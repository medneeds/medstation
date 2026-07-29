import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Star, Loader2 } from "lucide-react";

export default function AdminFeedback() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("user_feedback").select("*").order("created_at", { ascending: false }).limit(200);
      setRows(data || []);
      setLoading(false);
    })();
  }, []);

  const avg = rows.length ? rows.reduce((a, r) => a + r.rating, 0) / rows.length : 0;
  const byAssistant = rows.reduce<Record<string, { sum: number; n: number }>>((acc, r) => {
    const k = r.assistant || "geral";
    if (!acc[k]) acc[k] = { sum: 0, n: 0 };
    acc[k].sum += r.rating; acc[k].n += 1;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-5">
      <header>
        <h1 className="text-2xl font-display font-semibold">Feedback</h1>
        <p className="text-sm text-muted-foreground">Avaliações dos assistentes</p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Média geral</div>
          <div className="text-3xl font-display font-semibold mt-2 flex items-center gap-2">
            {avg.toFixed(2)} <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-xs uppercase text-muted-foreground">Total avaliações</div>
          <div className="text-3xl font-display font-semibold mt-2">{rows.length}</div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-medium text-sm mb-3">Por assistente</h3>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Object.keys(byAssistant).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem avaliações ainda.</p>
        ) : Object.entries(byAssistant).map(([k, v]) => (
          <div key={k} className="flex justify-between py-2 border-b border-border/40 last:border-0 text-sm">
            <span>{k}</span>
            <span className="text-muted-foreground">{(v.sum / v.n).toFixed(2)} ({v.n} avaliações)</span>
          </div>
        ))}
      </Card>

      <Card className="p-5">
        <h3 className="font-medium text-sm mb-3">Últimos comentários</h3>
        <div className="space-y-3">
          {rows.filter((r) => r.comment).slice(0, 30).map((r) => (
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
          {rows.filter((r) => r.comment).length === 0 && <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>}
        </div>
      </Card>
    </div>
  );
}

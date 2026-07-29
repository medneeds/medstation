import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Star } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "nps-last-shown";
const COOLDOWN_DAYS = 30;
const TRIGGER_DELAY_MS = 45_000; // aparece 45s após entrar em rota IA

const AI_ROUTES = ["/clinicus","/examinus","/mediscuss","/gasometrus","/prescriptus","/consultorio","/atestus","/orientus","/protocolus","/scorius","/codexus","/numerus"];

export function NpsWidget() {
  const [visible, setVisible] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!AI_ROUTES.some((r) => window.location.pathname.startsWith(r))) return;
    const last = localStorage.getItem(STORAGE_KEY);
    if (last) {
      const diff = Date.now() - Number(last);
      if (diff < COOLDOWN_DAYS * 86_400_000) return;
    }
    const t = setTimeout(() => setVisible(true), TRIGGER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  };

  const submit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { close(); return; }
      const pathAssistant = window.location.pathname.replace("/", "");
      const { error } = await supabase.from("user_feedback").insert({
        user_id: user.id,
        assistant: pathAssistant,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast.success("Obrigado pelo feedback!");
      close();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally { setSubmitting(false); }
  };

  if (!visible) return null;

  return (
    <Card className="fixed bottom-6 right-6 z-40 w-[320px] p-4 shadow-xl border animate-in slide-in-from-bottom-4">
      <div className="flex items-start justify-between mb-2">
        <div className="text-sm font-medium">Como foi sua experiência?</div>
        <Button variant="ghost" size="icon" className="h-6 w-6 -mr-1 -mt-1" onClick={close}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mb-3">Sua avaliação nos ajuda a melhorar o assistente.</p>
      <div className="flex gap-1 mb-3">
        {[1,2,3,4,5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            className={`p-1.5 rounded-md transition-colors ${rating && n <= rating ? "text-amber-500" : "text-muted-foreground hover:text-foreground"}`}
            aria-label={`${n} estrelas`}
          >
            <Star className={`h-6 w-6 ${rating && n <= rating ? "fill-current" : ""}`} />
          </button>
        ))}
      </div>
      {rating !== null && (
        <>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário (opcional)"
            className="min-h-[60px] text-sm mb-2"
            maxLength={500}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={close}>Depois</Button>
            <Button size="sm" onClick={submit} disabled={submitting}>
              {submitting ? "Enviando..." : "Enviar"}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

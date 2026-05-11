import { motion } from "framer-motion";
import { Mic, FileText, Sparkles, ShieldCheck, Lock, PlayCircle } from "lucide-react";

type DemoKind = "consultorio" | "seguranca" | "teste";

interface FAQMiniDemoProps {
  kind: DemoKind;
}

/**
 * Mini-demonstrações visuais de ~3s em loop para acompanhar respostas do FAQ.
 * Substitui vídeos reais por animações leves (framer-motion) — mesma intenção:
 * mostrar o conceito em segundos, não em parágrafos.
 */
export function FAQMiniDemo({ kind }: FAQMiniDemoProps) {
  return (
    <div className="mt-3 rounded-lg border border-border/60 bg-card/40 p-3 md:p-4 overflow-hidden">
      <div className="flex items-center gap-2 mb-2 text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider">
        <PlayCircle className="h-3 w-3" />
        Veja em 3 segundos
      </div>
      {kind === "consultorio" && <ConsultorioDemo />}
      {kind === "seguranca" && <SegurancaDemo />}
      {kind === "teste" && <TesteDemo />}
    </div>
  );
}

function ConsultorioDemo() {
  return (
    <div className="relative h-24 md:h-28 flex items-center gap-3">
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        className="flex-shrink-0 h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center"
      >
        <Mic className="h-5 w-5 text-primary" />
      </motion.div>
      <div className="flex items-end gap-1 flex-shrink-0">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <motion.span
            key={i}
            className="block w-1 rounded-full bg-primary/70"
            animate={{ height: ["8px", "22px", "8px"] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              delay: i * 0.08,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: [0, 1, 1, 0], x: [10, 0, 0, -10] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.2, 0.85, 1] }}
        className="flex-1 rounded-md bg-background/60 border border-border/50 p-2 text-[11px] md:text-xs"
      >
        <div className="flex items-center gap-1 text-primary font-medium">
          <FileText className="h-3 w-3" /> Anamnese estruturada
        </div>
        <div className="text-muted-foreground truncate">
          QP, HDA, exame físico, conduta...
        </div>
      </motion.div>
    </div>
  );
}

function SegurancaDemo() {
  return (
    <div className="relative h-24 md:h-28 flex items-center justify-center gap-4">
      <motion.div
        animate={{ rotate: [0, 8, -8, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="h-14 w-14 rounded-xl bg-primary/15 flex items-center justify-center"
      >
        <ShieldCheck className="h-7 w-7 text-primary" />
      </motion.div>
      <div className="flex flex-col gap-1">
        {["Criptografia em trânsito", "Criptografia em repouso", "Conformidade LGPD"].map(
          (t, i) => (
            <motion.div
              key={t}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: [0, 1, 1], x: [-8, 0, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                times: [0, 0.3, 1],
              }}
              className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground"
            >
              <Lock className="h-3 w-3 text-primary" />
              {t}
            </motion.div>
          )
        )}
      </div>
    </div>
  );
}

function TesteDemo() {
  return (
    <div className="relative h-24 md:h-28 flex items-center justify-center gap-3">
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-lg bg-primary/15 px-3 py-2 text-xs font-medium text-primary flex items-center gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Teste grátis o Examinus
      </motion.div>
      <motion.div
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="text-xs text-muted-foreground"
      >
        →
      </motion.div>
      <div className="rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs">
        <div className="font-medium">7 dias de garantia</div>
        <div className="text-muted-foreground text-[10px]">Devolvemos 100%</div>
      </div>
    </div>
  );
}

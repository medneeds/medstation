import { useNavigate } from "react-router-dom";
import { ArrowUpRight, FileSignature } from "lucide-react";
import { ATESTUS_PATH, buildAtestusPrefill } from "@/lib/codexusAfastamento";

/** Atalho de 1 clique: leva o caso e a sugestão do D.A. prontos para o Atestus. */
export function AtestusShortcut({ caseText, content }: { caseText: string; content: string }) {
  const navigate = useNavigate();
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => {
          sessionStorage.setItem("agent-prefill", buildAtestusPrefill(caseText, content));
          navigate(ATESTUS_PATH);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15"
        title="Abre o Atestus com o caso, o CID e os dias já preenchidos para você revisar"
      >
        <FileSignature className="h-3.5 w-3.5" />
        Emitir no Atestus
        <ArrowUpRight className="h-3 w-3" />
      </button>
      <span className="text-[11px] text-muted-foreground">O texto chega pronto para você revisar.</span>
    </div>
  );
}

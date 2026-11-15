import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { lineDiff, type DiffLine } from "@/lib/studioCoach";

type Block = { kind: "line"; line: DiffLine } | { kind: "fold"; count: number };

/** Antes e depois por linha: verde entrou, vermelho saiu; trechos iguais longos ficam recolhidos. */
export function VersionDiff({ before, after }: { before: string; after: string }) {
  const blocks = useMemo(() => {
    const d = lineDiff(before, after);
    const out: Block[] = [];
    let i = 0;
    while (i < d.length) {
      if (d[i].type !== "same") { out.push({ kind: "line", line: d[i] }); i++; continue; }
      let j = i;
      while (j < d.length && d[j].type === "same") j++;
      const run = d.slice(i, j);
      const keepStart = i === 0 ? 0 : 2;
      const keepEnd = j === d.length ? 0 : 2;
      if (run.length > keepStart + keepEnd + 1) {
        run.slice(0, keepStart).forEach((line) => out.push({ kind: "line", line }));
        out.push({ kind: "fold", count: run.length - keepStart - keepEnd });
        run.slice(run.length - keepEnd).forEach((line) => out.push({ kind: "line", line }));
      } else run.forEach((line) => out.push({ kind: "line", line }));
      i = j;
    }
    return out;
  }, [before, after]);

  return (
    <div className="max-h-80 overflow-auto rounded-md border border-border bg-background font-mono text-[11px] leading-5">
      {blocks.map((b, k) => b.kind === "fold" ? (
        <div key={k} className="bg-muted/60 px-3 py-0.5 text-muted-foreground">··· {b.count} {b.count === 1 ? "linha igual" : "linhas iguais"}</div>
      ) : (
        <div key={k} className={cn("whitespace-pre-wrap break-words px-3",
          b.line.type === "add" && "bg-primary/10 text-foreground",
          b.line.type === "del" && "bg-destructive/10 text-muted-foreground line-through decoration-destructive/40")}>
          <span className="mr-2 select-none opacity-60">{b.line.type === "add" ? "+" : b.line.type === "del" ? "−" : " "}</span>
          {b.line.text || " "}
        </div>
      ))}
    </div>
  );
}

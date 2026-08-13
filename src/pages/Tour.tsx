import { Seo } from "@/components/Seo";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { trackCtaClick } from "@/lib/analytics";
import {
  ArrowRight,
  Check,
  Clock,
  ShieldCheck,
  TestTube2,
  Stethoscope,
  Calculator,
  Sigma,
  Pill,
  FileCode,
  Wind,
  FileCheck,
  BookOpen,
  Compass,
  MessagesSquare,
  Mic,
  Sparkles,
  Copy,
  Timer,
  HeartPulse,
} from "lucide-react";

const steps = [
  {
    n: "01",
    title: "Você cola, dita ou anexa",
    body:
      "Cole o resultado de um exame, dite a consulta pelo microfone ou anexe uma foto/PDF. Nada de formulários longos: a plataforma entende texto bruto, áudio e imagem.",
    bullets: ["Colar texto do laboratório", "Ditar em voz alta no Modo Escuta", "Anexar foto ou PDF do exame"],
    icon: Copy,
  },
  {
    n: "02",
    title: "O assistente certo organiza",
    body:
      "Cada assistente é especializado em uma tarefa da rotina médica. Você escolhe o assistente, ajusta o modo (discussão ou documento pronto) e a especialidade.",
    bullets: ["11 assistentes clínicos", "Modos configuráveis por caso", "Saída limpa, sem enfeite"],
    icon: Sparkles,
  },
  {
    n: "03",
    title: "Você revisa e copia",
    body:
      "O texto sai pronto para o prontuário, em segundos. Um clique no botão copiar e está no seu sistema. Você continua sendo o médico: a decisão é sua, o trabalho braçal é nosso.",
    bullets: ["Botão copiar em todo resultado", "Pronto para colar no prontuário", "Revisão em segundos, não minutos"],
    icon: Check,
  },
];

const assistants = [
  {
    name: "Examinus",
    icon: TestTube2,
    desc: "Resume exames laboratoriais e de imagem em um parágrafo limpo, destacando o que está alterado.",
    use: "Plantão com 12 exames abertos ao mesmo tempo.",
    free: true,
  },
  {
    name: "Clínicus",
    icon: Stethoscope,
    desc: "Transforma sua fala ou suas notas soltas em anamnese estruturada, no modelo do seu contexto.",
    use: "Consultório, enfermaria, emergência e UTI.",
  },
  {
    name: "Mediscuss",
    icon: MessagesSquare,
    desc: "Discute o caso com você: hipóteses, diagnósticos diferenciais e próximos passos.",
    use: "Aquele caso que não fecha e você quer pensar junto.",
  },
  {
    name: "Prescriptus",
    icon: Pill,
    desc: "Bula inteligente: dose, ajuste renal, interações e apresentações sem abrir cinco abas.",
    use: "Prescrição segura em paciente polimedicado.",
  },
  {
    name: "Gasometrus",
    icon: Wind,
    desc: "Lê a gasometria como um plantonista experiente à beira do leito, passo a passo.",
    use: "Distúrbio ácido-base misto às 3 da manhã.",
  },
  {
    name: "Scorius",
    icon: Calculator,
    desc: "Aplica scores e estratifica risco com a interpretação junto, não só o número.",
    use: "CURB-65, Wells, HEART e companhia.",
  },
  {
    name: "Numerus",
    icon: Sigma,
    desc: "Cálculos clínicos rápidos: clearance, correções, bombas de infusão e conversões.",
    use: "Conta de cabeça que não pode dar errado.",
  },
  {
    name: "CODexus",
    icon: FileCode,
    desc: "Encontra o CID-10 correto a partir da descrição clínica, sem chutar código.",
    use: "Fechamento de prontuário e faturamento.",
  },
  {
    name: "Atestus",
    icon: FileCheck,
    desc: "Gera atestados e declarações prontos, com CID quando autorizado pelo paciente.",
    use: "Fim de consulta, sem reescrever o mesmo texto.",
  },
  {
    name: "Protocolus",
    icon: BookOpen,
    desc: "Consulta protocolos e diretrizes atuais e responde de forma objetiva e aplicável.",
    use: "Conduta baseada em evidência na hora da decisão.",
  },
  {
    name: "Orientus",
    icon: Compass,
    desc: "Escreve orientações de alta em linguagem que o paciente realmente entende.",
    use: "Alta segura, menos retorno desnecessário.",
  },
];

const beforeAfter = [
  { before: "Digitar a evolução depois do plantão", after: "Ditar durante o atendimento" },
  { before: "Reler 3 páginas de exames", after: "Resumo destacando o alterado" },
  { before: "Procurar dose e ajuste renal em 4 abas", after: "Resposta única e conferível" },
  { before: "Levar prontuário para casa", after: "Sair do plantão com tudo fechado" },
];

const faqs = [
  {
    q: "A IA decide por mim?",
    a: "Não. Nenhum assistente prescreve ou diagnostica sozinho. Eles organizam, resumem e sugerem; a validação e a assinatura são sempre suas.",
  },
  {
    q: "Preciso instalar alguma coisa?",
    a: "Não. Funciona no navegador do computador e do celular. Você entra, escolhe o assistente e usa.",
  },
  {
    q: "E os dados do paciente?",
    a: "Recomendamos usar dados despersonalizados. O conteúdo trafega criptografado e o histórico fica restrito à sua conta.",
  },
  {
    q: "Posso testar antes de pagar?",
    a: "Sim. O Examinus é gratuito ao criar conta, e toda assinatura tem garantia incondicional de 7 dias.",
  },
];

export default function Tour() {
  const navigate = useNavigate();

  // Título e descrição desta rota são definidos pelo componente <Seo /> abaixo.


  const go = (to: string, label: string) => {
    trackCtaClick({ cta: label, section: "tour", destination: to });
    if (to.includes("#")) {
      const [path, hash] = to.split("#");
      navigate(path, { state: { scrollTo: hash } });
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 400);
      return;
    }
    navigate(to);
  };

  return (
    <div className="min-h-screen relative bg-background">
      <Seo path="/tour" title="Tour pela MedStation AI — como funciona" description="Conheça em detalhes os 11 assistentes clínicos, o Modo Escuta e como economizar horas de digitação por plantão." />
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_50%_at_20%_-10%,hsl(var(--primary)/0.12),transparent)]" />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
          <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <button onClick={() => go("/", "logo_tour")} className="flex items-center gap-3">
              <Logo size="sm" />
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={() => go("/auth", "entrar_tour")}>
                Entrar
              </Button>
              <Button size="sm" onClick={() => go("/auth", "criar_conta_tour_header")}>
                Criar conta grátis
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 md:px-8 pb-24">
          {/* Hero */}
          <section className="pt-14 md:pt-20 pb-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-[11px] font-semibold uppercase tracking-wider">
                Tour pela plataforma
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
              Veja exatamente o que muda no seu dia.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              A MedStation AI não é mais um chat genérico. São 11 assistentes clínicos e um Modo Escuta que
              escrevem por você enquanto você olha para o paciente. Este tour mostra, passo a passo, como isso
              acontece — em menos de 3 minutos de leitura.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => go("/auth", "criar_conta_tour_hero")}>
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => go("/landing#demo", "testar_tour_hero")}>
                Testar sem cadastro
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" /> Examinus gratuito
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Garantia de 7 dias
              </span>
              <span className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Pronto em segundos
              </span>
            </div>
          </section>

          {/* Dor */}
          <section className="py-10 border-t border-border/60">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              O problema não é a medicina. É a digitação.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Boa parte do tempo de consulta some em evolução, resumo de exame, atestado e busca de dose. É trabalho
              necessário — só não precisa ser feito por você, do zero, toda vez.
            </p>
            <div className="mt-7 grid gap-3 md:grid-cols-2">
              {beforeAfter.map((row) => (
                <div
                  key={row.before}
                  className="rounded-md border border-border bg-card p-4 flex items-center gap-4"
                >
                  <span className="flex-1 text-sm text-muted-foreground line-through decoration-destructive/50">
                    {row.before}
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                  <span className="flex-1 text-sm font-medium">{row.after}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Como funciona */}
          <section className="py-12 border-t border-border/60">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Como funciona, em 3 passos</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Sem treinamento, sem curva de aprendizado. Se você sabe usar WhatsApp, você já sabe usar a MedStation.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {steps.map((s) => (
                <article key={s.n} className="rounded-md border border-border bg-card p-6 shadow-[var(--shadow-medical)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs tracking-[0.2em] text-primary">{s.n}</span>
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                  <ul className="mt-4 space-y-2">
                    {s.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Modo Escuta */}
          <section className="py-12 border-t border-border/60">
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
                  <Mic className="h-4 w-4" /> Modo Escuta
                </div>
                <h2 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tight">
                  Olhe para o paciente. A consulta se escreve sozinha.
                </h2>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  Você aperta gravar e conduz a consulta normalmente. A fala vira transcrição em tempo real e, ao
                  final, uma anamnese estruturada no modelo que você escolher. Dá para salvar a consulta com um nome e
                  copiar tudo com um clique.
                </p>
                <ul className="mt-5 space-y-2.5">
                  {[
                    "Transcrição ao vivo durante o atendimento",
                    "Estruturação automática em anamnese",
                    "Modo unificado ou com separação de falas",
                    "Salvar a consulta e copiar em um clique",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md border border-border bg-card p-6 shadow-[var(--shadow-elevated)]">
                <div className="flex items-center gap-3 pb-4 border-b border-border/60">
                  <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Mic className="h-4 w-4" />
                    <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Gravando consulta</p>
                    <p className="text-xs text-muted-foreground font-mono">00:04:12</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    "Paciente refere dor torácica há dois dias, em aperto, sem irradiação..."
                  </p>
                  <div className="rounded-md bg-muted p-3">
                    <p className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">
                      Anamnese estruturada
                    </p>
                    <p className="leading-relaxed">
                      QP: dor torácica há 2 dias. HDA: dor em aperto, retroesternal, sem irradiação, sem dispneia
                      associada...
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Copy className="h-3.5 w-3.5 mr-2" /> Copiar para o prontuário
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Assistentes */}
          <section className="py-12 border-t border-border/60">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Os 11 assistentes, um por um</h2>
            <p className="mt-3 text-muted-foreground max-w-2xl">
              Cada um resolve uma tarefa específica da rotina. Você não precisa aprender todos: comece pelo Examinus,
              que é gratuito, e vá adicionando os outros conforme a necessidade aparecer.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {assistants.map((a) => (
                <article
                  key={a.name}
                  className="group rounded-md border border-border bg-card p-5 transition-shadow hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <a.icon className="h-4.5 w-4.5" />
                    </span>
                    {a.free && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        Grátis
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3.5 font-semibold">{a.name}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
                  <p className="mt-3 text-xs text-muted-foreground/80 border-t border-border/60 pt-3">
                    <span className="text-primary font-medium">Quando usar: </span>
                    {a.use}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* Ganho */}
          <section className="py-12 border-t border-border/60">
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { icon: Timer, t: "Minutos de volta por paciente", d: "O que você digitava em 6 minutos sai em segundos, já revisável." },
                { icon: HeartPulse, t: "Consulta mais presente", d: "Menos tela, mais paciente. A escuta melhora quando as mãos ficam livres." },
                { icon: ShieldCheck, t: "Registro mais consistente", d: "Documentos padronizados reduzem esquecimento e retrabalho no prontuário." },
              ].map((b) => (
                <div key={b.t} className="rounded-md border border-border bg-card p-6">
                  <b.icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-3 font-semibold">{b.t}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{b.d}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="py-12 border-t border-border/60">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Dúvidas honestas</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {faqs.map((f) => (
                <div key={f.q} className="rounded-md border border-border bg-card p-5">
                  <p className="font-medium">{f.q}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA final */}
          <section className="mt-6 rounded-lg border border-primary/25 bg-gradient-to-br from-primary/10 via-card to-card p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-4xl font-semibold tracking-tight">
              Comece hoje pelo assistente gratuito.
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Crie a conta, use o Examinus sem pagar nada e sinta a diferença já no próximo plantão. Se quiser os
              outros 10 assistentes e o Modo Escuta, a assinatura tem 7 dias de garantia incondicional.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => go("/auth", "criar_conta_tour_final")}>
                Criar conta grátis <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => go("/landing#planos", "ver_planos_tour")}>
                Ver planos
              </Button>
            </div>
          </section>
        </main>

        <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
          MedStation AI — Produza mais. Digite menos.
        </footer>
      </div>
    </div>
  );
}

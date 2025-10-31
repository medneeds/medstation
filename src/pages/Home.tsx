import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicExaminusChat from "@/components/PublicExaminusChat";

export default function Home() {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0f172a]/80 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-[#22c55e] flex items-center justify-center font-bold text-[#0f172a]">
              M
            </div>
            <div>
              <div className="font-bold text-white">MedStation AI</div>
              <div className="text-[0.7rem] text-white/50">Produza mais. Digite menos.</div>
            </div>
          </div>
          <nav className="flex gap-6 items-center">
            <button onClick={() => scrollToSection('demo')} className="text-white/70 text-sm hover:text-white transition-colors">
              Demo
            </button>
            <button onClick={() => scrollToSection('agentes')} className="text-white/70 text-sm hover:text-white transition-colors">
              Agentes
            </button>
            <button onClick={() => scrollToSection('planos')} className="text-white/70 text-sm hover:text-white transition-colors">
              Planos
            </button>
            <Button 
              variant="outline" 
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
              onClick={() => scrollToSection('cadastro')}
            >
              Criar conta gratuita
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <Badge className="mb-5 bg-[#22c55e]/15 text-[#bbf7d0] border-[#bbf7d0]/35 hover:bg-[#22c55e]/20">
              <span>🩺 Plataforma Austoriana</span>
              <span className="ml-2">IA médica real</span>
            </Badge>
            <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-white mb-5">
              MedStation AI — <span className="bg-gradient-to-r from-white via-[#a5b4fc] to-[#22c55e] bg-clip-text text-transparent">Produza mais. Digite menos.</span>
            </h1>
            <p className="text-lg text-white/70 max-w-xl mb-6">
              IA médica com agentes especializados para interpretar exames, estruturar anamneses, calcular scores, prescrever e codificar.{" "}
              <strong className="text-white">Examinus grátis para sempre.</strong> Use agora, sem login.
            </p>
            <div className="flex gap-3 flex-wrap mb-4">
              <Button 
                size="lg"
                className="bg-[#22c55e] text-[#0f172a] hover:bg-[#22c55e]/90 font-semibold"
                onClick={() => scrollToSection('demo')}
              >
                Testar Examinus agora <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={() => scrollToSection('cadastro')}
              >
                Criar conta gratuita
              </Button>
            </div>
            <p className="text-sm text-white/45">
              💡 Sem cartão. Sem login no primeiro uso. Cadastre-se depois para desbloquear exames ilimitados e demais agentes.
            </p>
          </div>

          {/* Demo Card */}
          <div id="demo">
            <PublicExaminusChat />
          </div>
        </div>
      </section>

      {/* Experiência sem login */}
      <section className="py-20 px-6 bg-[#020617]">
        <div className="container mx-auto">
          <div className="mb-10">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              Experiência sem login pensada para médico apressado.
            </h2>
            <p className="text-white/70 max-w-3xl">
              Você testa primeiro, sente o ganho de tempo e só então cria conta. O fluxo é simples:
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <p className="text-xs text-white/35 mb-2">PASSO 1</p>
              <h3 className="text-white font-semibold mb-2">Cole o exame</h3>
              <p className="text-sm text-white/70">Hemograma, gaso, imagem, bioquímica… sem cadastro.</p>
            </Card>
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <p className="text-xs text-white/35 mb-2">PASSO 2</p>
              <h3 className="text-white font-semibold mb-2">Veja a leitura da IA</h3>
              <p className="text-sm text-white/70">Explicação em linguagem médica, já estruturada para prontuário.</p>
            </Card>
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <p className="text-xs text-white/35 mb-2">PASSO 3</p>
              <h3 className="text-white font-semibold mb-2">Crie conta em 2 minutos</h3>
              <p className="text-sm text-white/70">Desbloqueie exames infinitos e histórico.</p>
            </Card>
            <Card className="bg-[#166534]/10 border-[#22c55e]/35 p-5">
              <p className="text-xs text-white/55 mb-2">PASSO 4 (opcional)</p>
              <h3 className="text-white font-semibold mb-2">Assine R$ 9,90/mês</h3>
              <p className="text-sm text-white/70">Acesso aos 6 agentes, gestão de pacientes e documentação profissional.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Agentes */}
      <section id="agentes" className="py-20 px-6 bg-[#0f172a]">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#22c55e]/15 text-[#bbf7d0] border-[#bbf7d0]/35">
              Suite de IA médica integrada
            </Badge>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
              6 agentes. Um só cérebro clínico.
            </h2>
            <p className="text-white/70">Agentes flexíveis, responsivos às conversas. Humanizados. Adaptados.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
            {/* Examinus */}
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-2xl">🩸</span>
                <h3 className="text-white font-semibold text-lg">Examinus</h3>
              </div>
              <p className="text-white font-medium text-sm mb-2">
                Reescrita produtiva de exames complementares para registro em prontuário.
              </p>
              <p className="text-white/70 text-xs mb-3">
                Cole o resultado → recebe versão limpa, técnica e pronta pra evolução. Zero digitação repetitiva.
              </p>
              <p className="text-xs text-[#bef264]">Grátis pra sempre.</p>
            </Card>

            {/* Clinicus */}
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-2xl">🧠</span>
                <h3 className="text-white font-semibold text-lg">Clínicus</h3>
              </div>
              <p className="text-white font-medium text-sm mb-2">
                Estruturação de uma anamnese impecável.
              </p>
              <p className="text-white/70 text-xs">
                Você descreve o caso → ele devolve HDA, antecedentes, ROS e impressão clínica organizados.
              </p>
            </Card>

            {/* Scorius */}
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-2xl">📊</span>
                <h3 className="text-white font-semibold text-lg">Scorius</h3>
              </div>
              <p className="text-white font-medium text-sm mb-2">
                Scores e classificações de risco clínico.
              </p>
              <p className="text-white/70 text-xs">
                Calcula, interpreta e já aponta a conduta. Sem abrir guideline.
              </p>
            </Card>

            {/* Prescriptus */}
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-2xl">💊</span>
                <h3 className="text-white font-semibold text-lg">Prescriptus</h3>
              </div>
              <p className="text-white font-medium text-sm mb-2">
                Guia de prescrições e condutas baseadas em evidências.
              </p>
              <p className="text-white/70 text-xs">
                Sugere esquemas, doses e cuidados. Agiliza sem perder segurança.
              </p>
            </Card>

            {/* Numerus */}
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-2xl">📈</span>
                <h3 className="text-white font-semibold text-lg">Numerus</h3>
              </div>
              <p className="text-white font-medium text-sm mb-2">
                Calculadoras médicas e conversor automático de medidas.
              </p>
              <p className="text-white/70 text-xs">
                IMC, clearance, gotejamento e muito mais num só lugar.
              </p>
            </Card>

            {/* CODexus */}
            <Card className="bg-[#0f172a] border-white/25 p-5">
              <div className="flex gap-2 items-center mb-3">
                <span className="text-2xl">🗂️</span>
                <h3 className="text-white font-semibold text-lg">CODexus</h3>
              </div>
              <p className="text-white font-medium text-sm mb-2">
                Codificação CID-10 e TISS automatizada.
              </p>
              <p className="text-white/70 text-xs">
                Escreve o diagnóstico → recebe o código certo pra registrar e faturar.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20 px-6 bg-[#020617]">
        <div className="container mx-auto text-center">
          <Badge className="mb-4 bg-[#22c55e]/15 text-[#bbf7d0] border-[#bbf7d0]/35">
            Plano justo para médico
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            Comece grátis. Evolua por R$ 9,90/mês.
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto mb-10">
            Use o Examinus gratuitamente para sempre. Crie conta para destravar exames ilimitados. Assine para liberar todo o ecossistema de IA médica.
          </p>

          <div className="flex flex-wrap gap-6 justify-center">
            {/* Plano Grátis */}
            <Card className="bg-[#0f172a]/30 border-white/25 w-full max-w-sm p-7">
              <h3 className="text-white text-xl font-semibold mb-2">Grátis</h3>
              <p className="text-white/70 text-sm mb-4">Examinus para sempre.</p>
              <p className="text-white text-4xl font-bold mb-4">R$ 0</p>
              <ul className="text-left text-white/75 text-sm space-y-2 mb-6">
                <li>• 1º exame sem login</li>
                <li>• Reescrita para prontuário</li>
                <li>• Valores de referência</li>
              </ul>
              <Button 
                variant="outline"
                className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10"
                onClick={() => scrollToSection('demo')}
              >
                Usar agora
              </Button>
            </Card>

            {/* Plano Pro */}
            <Card className="bg-gradient-to-b from-[#22c55e]/20 to-[#020617] border-[#bef264]/35 w-full max-w-sm p-8 transform -translate-y-2">
              <h3 className="text-white text-xl font-semibold mb-2">MedStation Pro</h3>
              <p className="text-white/70 text-sm mb-4">Todos os agentes. Fluxo completo.</p>
              <p className="text-white text-4xl font-bold mb-1">
                R$ 9,90<span className="text-base text-white/50">/mês</span>
              </p>
              <ul className="text-left text-white/85 text-sm space-y-2 mb-6 mt-4">
                <li>• Examinus ilimitado</li>
                <li>• Clínicus, Scorius, Prescriptus, Numerus e CODexus</li>
                <li>• Gestão de pacientes e documentos</li>
                <li>• PDFs prontos para impressão/envio</li>
              </ul>
              <Button 
                className="w-full bg-[#22c55e] text-[#0f172a] hover:bg-[#22c55e]/90 font-semibold"
                onClick={() => navigate("/pricing")}
              >
                Ativar por R$ 9,90
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Cadastro */}
      <section id="cadastro" className="py-20 px-6 bg-[#0f172a]">
        <div className="container mx-auto max-w-xl">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">Crie sua conta gratuita</h2>
          <p className="text-white/70 mb-6">
            2 minutos. Sem cartão. Depois você decide se quer liberar todos os agentes.
          </p>
          <Card className="bg-[#0f172a] border-white/25 p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-white/75 text-xs mb-2">E-mail profissional</label>
                <input 
                  type="email" 
                  placeholder="dr.joao@hospital.com"
                  className="w-full px-3 py-2.5 rounded-lg border border-white/35 bg-[#0f172a]/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50"
                />
              </div>
              <div>
                <label className="block text-white/75 text-xs mb-2">Senha</label>
                <input 
                  type="password" 
                  placeholder="mínimo 6 caracteres"
                  className="w-full px-3 py-2.5 rounded-lg border border-white/35 bg-[#0f172a]/30 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50"
                />
              </div>
              <Button 
                className="w-full bg-[#22c55e] text-[#0f172a] hover:bg-[#22c55e]/90 font-semibold"
                onClick={() => navigate("/auth")}
              >
                Criar conta gratuita
              </Button>
              <p className="text-xs text-white/40">
                Ao criar a conta, você destrava exames ilimitados no Examinus e pode testar os demais agentes.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#020617] py-6 px-6">
        <div className="container mx-auto flex flex-wrap justify-between gap-4 items-center">
          <p className="text-white/35 text-xs">
            © 2025 MedStation AI. Tecnologia médica que respeita o tempo do médico.
          </p>
          <p className="text-white/25 text-xs">
            Examinus grátis para sempre · Sem cartão · LGPD
          </p>
        </div>
      </footer>
    </div>
  );
}

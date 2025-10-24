import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Shield, User, Bell, Lock, Bot, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function Settings() {
  const [agents, setAgents] = useState([
    { id: "1", name: "VITA Clínicus", prompt: "Você é o VITA, assistente médico especializado em relatórios de transferência..." }
  ]);
  const [newAgent, setNewAgent] = useState({ name: "", prompt: "", apiKey: "" });

  const addAgent = () => {
    if (newAgent.name && newAgent.prompt) {
      setAgents([...agents, { ...newAgent, id: Date.now().toString() }]);
      setNewAgent({ name: "", prompt: "", apiKey: "" });
    }
  };

  const removeAgent = (id: string) => {
    setAgents(agents.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Perfil Profissional
          </CardTitle>
          <CardDescription>Informações do médico e credenciais</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" defaultValue="Dr. Usuário Exemplo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" defaultValue="usuario@medstation.app" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="crm">CRM</Label>
              <Input id="crm" defaultValue="CRM-MA 12345" disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rqe">RQE (opcional)</Label>
              <Input id="rqe" placeholder="RQE número" />
            </div>
          </div>
          <Button>Salvar Alterações</Button>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Segurança e Autenticação
          </CardTitle>
          <CardDescription>Configurações de acesso e 2FA</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Autenticação de Dois Fatores (2FA)</Label>
              <p className="text-sm text-muted-foreground">
                Adicione uma camada extra de segurança
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Alterar Senha</Label>
            <Button variant="outline" className="w-full md:w-auto">
              <Lock className="mr-2 h-4 w-4" />
              Redefinir Senha
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>Configure alertas e lembretes</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Exames Críticos</Label>
              <p className="text-sm text-muted-foreground">
                Alerta quando receber exame com valores críticos
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Relatórios Pendentes</Label>
              <p className="text-sm text-muted-foreground">
                Lembrete diário de documentos não assinados
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Atualizações do Sistema</Label>
              <p className="text-sm text-muted-foreground">
                Novidades e melhorias da plataforma
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* AI Agents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Agentes de IA
          </CardTitle>
          <CardDescription>Configure prompts e APIs dos seus agentes do ChatGPT</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lista de Agentes Salvos */}
          <div className="space-y-3">
            <Label>Agentes Configurados</Label>
            {agents.map((agent) => (
              <div key={agent.id} className="flex items-start justify-between p-4 border rounded-lg bg-card/50">
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{agent.name}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.prompt}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => removeAgent(agent.id)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Separator />

          {/* Adicionar Novo Agente */}
          <div className="space-y-4">
            <Label className="text-base">Adicionar Novo Agente</Label>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Nome do Agente</Label>
                <Input 
                  id="agent-name" 
                  placeholder="Ex: VITA Examinus, Assistente de Prescrição..."
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="agent-prompt">Prompt do Sistema</Label>
                <Textarea 
                  id="agent-prompt" 
                  placeholder="Cole aqui o prompt/instruções do seu agente do ChatGPT..."
                  className="min-h-[120px] font-mono text-sm"
                  value={newAgent.prompt}
                  onChange={(e) => setNewAgent({ ...newAgent, prompt: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-api">API Key (opcional)</Label>
                <Input 
                  id="agent-api" 
                  type="password"
                  placeholder="sk-..."
                  value={newAgent.apiKey}
                  onChange={(e) => setNewAgent({ ...newAgent, apiKey: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Se você usa uma API key personalizada do OpenAI
                </p>
              </div>

              <Button onClick={addAgent} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Agente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* LGPD */}
      <Card className="border-warning/20">
        <CardHeader>
          <CardTitle>Privacidade e LGPD</CardTitle>
          <CardDescription>
            Gestão de dados e consentimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Todos os dados são criptografados e seguem as normas da LGPD e CFM para prontuários
            eletrônicos. Você tem controle total sobre compartilhamento e exportação.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Ver Política de Privacidade</Button>
            <Button variant="outline" size="sm">Exportar Meus Dados</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

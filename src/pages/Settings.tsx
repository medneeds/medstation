import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Shield, User, Bell, Lock } from "lucide-react";

export default function Settings() {
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

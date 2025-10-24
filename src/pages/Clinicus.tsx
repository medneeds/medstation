import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Sparkles } from "lucide-react";

export default function Clinicus() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Clínicus
          </h1>
          <p className="text-muted-foreground">Relatórios de transferência e evolução clínica</p>
        </div>
        <Button size="lg" className="shadow-medical">
          <Plus className="mr-2 h-4 w-4" />
          Novo Relatório
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle>Relatório de Transferência</CardTitle>
            <CardDescription>
              Documento estruturado para transferência inter-hospitalar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Seções incluídas:</strong>
              <ul className="mt-2 space-y-1 text-muted-foreground ml-4 list-disc">
                <li>Identificação e dados clínicos</li>
                <li>Diagnósticos (CID-10)</li>
                <li>História da doença atual</li>
                <li>Tratamentos instituídos</li>
                <li>Motivo da transferência</li>
                <li>Última evolução</li>
              </ul>
            </div>
            <Button className="w-full">Iniciar Relatório</Button>
          </CardContent>
        </Card>

        <Card className="border-secondary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Geração Assistida por IA
            </CardTitle>
            <CardDescription>
              VITA pode ajudar a estruturar e revisar seus relatórios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Recursos de IA:</strong>
              <ul className="mt-2 space-y-1 text-muted-foreground ml-4 list-disc">
                <li>Sugestões de redação médica</li>
                <li>Codificação automática CID-10</li>
                <li>Análise de exames integrada</li>
                <li>Revisão de consistência clínica</li>
              </ul>
            </div>
            <Button variant="secondary" className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Experimentar IA
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum relatório encontrado</p>
            <p className="text-sm mt-1">Comece criando seu primeiro relatório</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

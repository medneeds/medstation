import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Upload, Sparkles } from "lucide-react";

export default function Examinus() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-secondary" />
            Examinus
          </h1>
          <p className="text-muted-foreground">Gestão e análise de exames laboratoriais</p>
        </div>
        <Button size="lg" className="shadow-medical bg-secondary hover:bg-secondary/90">
          <Upload className="mr-2 h-4 w-4" />
          Importar Exames
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Upload de Arquivos</CardTitle>
            <CardDescription>PDF, CSV, HL7</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Importe resultados em diversos formatos para análise estruturada
            </p>
            <Button variant="outline" className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Selecionar Arquivos
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise Automática</CardTitle>
            <CardDescription>Parser inteligente</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Extração automática de valores, unidades e referências
            </p>
            <Button variant="outline" className="w-full" disabled>
              Em breve
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-secondary" />
              Sumário IA
            </CardTitle>
            <CardDescription>Interpretação clínica</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Análise inteligente com identificação de valores críticos
            </p>
            <Button variant="secondary" className="w-full">
              Gerar Sumário
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exames Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum exame importado</p>
            <p className="text-sm mt-1">Faça upload de arquivos para começar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

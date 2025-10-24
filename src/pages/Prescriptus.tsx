import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pill, Plus, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Prescriptus() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Pill className="h-8 w-8 text-destructive" />
            Prescriptus
          </h1>
          <p className="text-muted-foreground">Prescrições estruturadas e validadas</p>
        </div>
        <Button size="lg" className="shadow-medical bg-destructive hover:bg-destructive/90">
          <Plus className="mr-2 h-4 w-4" />
          Nova Prescrição
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle>Prescrição Estruturada</CardTitle>
            <CardDescription>Adultos - vias EV/VO/SNE</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Recursos:</strong>
              <ul className="mt-2 space-y-1 text-muted-foreground ml-4 list-disc">
                <li>Sugestões de fármacos e doses</li>
                <li>Ajuste por função renal/hepática</li>
                <li>Validação de interações medicamentosas</li>
                <li>Geração de PDF assinado</li>
              </ul>
            </div>
            <Button className="w-full bg-destructive hover:bg-destructive/90">
              Iniciar Prescrição
            </Button>
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas de Segurança
            </CardTitle>
            <CardDescription>Verificações automáticas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <strong>Validações ativas:</strong>
              <ul className="mt-2 space-y-1 text-muted-foreground ml-4 list-disc">
                <li>Dose máxima e mínima</li>
                <li>Alergias conhecidas</li>
                <li>Interações medicamentosas (mock)</li>
                <li>Ajuste para função renal/hepática</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prescrições Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">Desmame Sedativo - João Silva</p>
                <p className="text-sm text-muted-foreground">22/10/2025 às 14:30</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">RASCUNHO</Badge>
                <Button variant="outline" size="sm">Editar</Button>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">Antibioticoterapia - Maria Santos</p>
                <p className="text-sm text-muted-foreground">21/10/2025 às 10:15</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge>ASSINADA</Badge>
                <Button variant="outline" size="sm">Ver PDF</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

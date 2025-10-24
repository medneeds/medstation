import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Plus } from "lucide-react";

export default function Numerus() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8 text-warning" />
            Numerus
          </h1>
          <p className="text-muted-foreground">Cálculos clínicos e conversões</p>
        </div>
        <Button size="lg" className="shadow-medical bg-warning hover:bg-warning/90">
          <Plus className="mr-2 h-4 w-4" />
          Novo Cálculo
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Anion Gap</CardTitle>
            <CardDescription>Hiato aniônico</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cálculo do hiato aniônico para avaliação de distúrbios ácido-base
            </p>
            <Button variant="outline" className="w-full">
              Calcular
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Osmolaridade</CardTitle>
            <CardDescription>Sérica calculada</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Osmolaridade sérica e gap osmolar
            </p>
            <Button variant="outline" className="w-full">
              Calcular
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ClCr (CKD-EPI)</CardTitle>
            <CardDescription>Clearance de creatinina</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Estimativa de taxa de filtração glomerular
            </p>
            <Button variant="outline" className="w-full">
              Calcular
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Déficit de Bicarbonato</CardTitle>
            <CardDescription>Correção acidose metabólica</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Cálculo da dose de bicarbonato para correção
            </p>
            <Button variant="outline" className="w-full">
              Calcular
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversão de Unidades</CardTitle>
            <CardDescription>mmol/L, mg/dL, mEq/L</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Conversor de unidades laboratoriais
            </p>
            <Button variant="outline" className="w-full">
              Converter
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Gotejamento</CardTitle>
            <CardDescription>ml/h para gotas/min</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Conversão de velocidade de infusão
            </p>
            <Button variant="outline" className="w-full">
              Calcular
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Cálculos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum cálculo realizado</p>
            <p className="text-sm mt-1">Selecione um cálculo acima para começar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

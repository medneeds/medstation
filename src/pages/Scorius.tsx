import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calculator, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const calculators = [
  { name: "qSOFA", category: "Sepse", description: "Quick SOFA Score" },
  { name: "SOFA", category: "Sepse", description: "Sequential Organ Failure Assessment" },
  { name: "CURB-65", category: "Pneumonia", description: "Prognóstico em pneumonia" },
  { name: "CHA2DS2-VASc", category: "Cardiologia", description: "Risco de AVC em FA" },
  { name: "HAS-BLED", category: "Cardiologia", description: "Risco de sangramento" },
  { name: "Wells (TEV)", category: "Trombose", description: "Probabilidade de TEV" },
  { name: "APACHE II", category: "UTI", description: "Mortalidade em UTI" },
  { name: "Anion Gap", category: "Metabólico", description: "Gap aniônico" },
  { name: "Osmolaridade", category: "Metabólico", description: "Osmolaridade sérica" },
  { name: "ClCr (CKD-EPI)", category: "Renal", description: "Clearance de creatinina" },
];

export default function Scorius() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-8 w-8 text-warning" />
            Scorius / Numerus
          </h1>
          <p className="text-muted-foreground">Cálculos clínicos e scores prognósticos</p>
        </div>
      </div>

      <Card className="border-warning/20 bg-warning/5">
        <CardHeader>
          <CardTitle>Engine Declarativo de Cálculos</CardTitle>
          <CardDescription>
            10 cálculos essenciais para prática clínica com validação de unidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {calculators.map((calc) => (
              <Card key={calc.name} className="hover:shadow-medical transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Activity className="h-5 w-5 text-warning" />
                    <Badge variant="outline">{calc.category}</Badge>
                  </div>
                  <CardTitle className="text-lg">{calc.name}</CardTitle>
                  <CardDescription className="text-xs">{calc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    Calcular
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cálculos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Calculator className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Nenhum cálculo realizado</p>
            <p className="text-sm mt-1">Selecione um score para começar</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

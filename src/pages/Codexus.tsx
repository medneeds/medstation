import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Mock results
const mockResults = [
  { system: "CID-10", code: "J96.0", display: "Insuficiência respiratória aguda", confidence: 0.95 },
  { system: "CID-10", code: "J96.1", display: "Insuficiência respiratória crônica", confidence: 0.72 },
  { system: "LOINC", code: "2160-0", display: "Creatinina sérica", confidence: 0.88 },
];

export default function Codexus() {
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      setShowResults(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            CODexus
          </h1>
          <p className="text-muted-foreground">Busca e codificação CID-10 e LOINC</p>
        </div>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Busca Semântica com IA
          </CardTitle>
          <CardDescription>
            Digite termos clínicos em linguagem natural para encontrar códigos precisos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: insuficiência respiratória aguda, troponina, infarto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="text-base"
            />
            <Button onClick={handleSearch} size="lg" className="shadow-medical">
              <Search className="mr-2 h-4 w-4" />
              Buscar
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">CID-10</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">LOINC</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">CIAP-2</Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-accent">TUSS</Badge>
          </div>
        </CardContent>
      </Card>

      {showResults && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Busca</CardTitle>
            <CardDescription>
              {mockResults.length} códigos encontrados para "{query}"
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sistema</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Confiança</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge>{result.system}</Badge>
                    </TableCell>
                    <TableCell className="font-mono font-medium">{result.code}</TableCell>
                    <TableCell>{result.display}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${result.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Aplicar no Clínicus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!showResults && (
        <Card>
          <CardContent className="pt-12 pb-12">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Digite um termo clínico para buscar códigos</p>
              <p className="text-sm mt-1">CID-10, LOINC, CIAP-2 e TUSS</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

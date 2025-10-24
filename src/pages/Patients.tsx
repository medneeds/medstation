import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Filter } from "lucide-react";

// Mock data
const mockPatients = [
  {
    id: "1",
    name: "João Silva",
    document: "123.456.789-00",
    birthDate: "1965-03-15",
    sex: "M",
    status: "Ativo",
    lastVisit: "2025-10-20",
  },
  {
    id: "2",
    name: "Maria Santos",
    document: "987.654.321-00",
    birthDate: "1978-07-22",
    sex: "F",
    status: "Ativo",
    lastVisit: "2025-10-22",
  },
  {
    id: "3",
    name: "Pedro Oliveira",
    document: "456.789.123-00",
    birthDate: "1990-11-08",
    sex: "M",
    status: "Inativo",
    lastVisit: "2025-09-15",
  },
];

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = mockPatients.filter((patient) =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.document.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pacientes</h1>
          <p className="text-muted-foreground">Gerencie seus pacientes e prontuários</p>
        </div>
        <Button size="lg" className="shadow-medical">
          <Plus className="mr-2 h-4 w-4" />
          Novo Paciente
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CPF..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Patients table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes ({filteredPatients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead>Data Nasc.</TableHead>
                <TableHead>Sexo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Consulta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell>{patient.document}</TableCell>
                  <TableCell>
                    {new Date(patient.birthDate).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>{patient.sex}</TableCell>
                  <TableCell>
                    <Badge variant={patient.status === "Ativo" ? "default" : "secondary"}>
                      {patient.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(patient.lastVisit).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm">
                      Ver Prontuário
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

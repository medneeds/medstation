import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  FileText,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  Download,
  Eye,
  Copy,
  RefreshCw,
  MoreVertical
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  medications: any;
  diagnosis: string;
  cid_code?: string;
  validity_days: number;
  observations?: string;
  status: string;
  created_at: string;
  patients: {
    name: string;
  } | null;
}

export default function Prescriptions() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchPrescriptions();
  }, [statusFilter]);

  const fetchPrescriptions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("prescriptions")
        .select(`
          id,
          prescription_number,
          patient_id,
          medications,
          diagnosis,
          cid_code,
          validity_days,
          observations,
          status,
          created_at,
          patients (name)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPrescriptions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar prescrições",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Rascunho", icon: Edit, variant: "secondary" as const },
      pending_signature: { label: "Aguardando Assinatura", icon: Clock, variant: "default" as const },
      signed: { label: "Assinada", icon: CheckCircle2, variant: "default" as const },
      cancelled: { label: "Cancelada", icon: XCircle, variant: "destructive" as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const copyPrescription = (prescription: Prescription) => {
    navigate("/prescricoes/nova", {
      state: {
        copyFrom: {
          patient_id: prescription.patient_id,
          diagnosis: prescription.diagnosis,
          cid_code: prescription.cid_code,
          medications: prescription.medications,
          observations: prescription.observations,
        },
      },
    });
  };

  const renewPrescription = async (prescription: Prescription) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: numberData, error: numberError } = await supabase
        .rpc("generate_prescription_number");

      if (numberError) throw numberError;

      const { data, error } = await supabase
        .from("prescriptions")
        .insert({
          user_id: user.id,
          patient_id: prescription.patient_id,
          prescription_number: numberData,
          diagnosis: prescription.diagnosis,
          cid_code: prescription.cid_code,
          validity_days: prescription.validity_days,
          observations: prescription.observations,
          medications: prescription.medications,
          status: "draft",
        } as any)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Prescrição renovada",
        description: "Nova prescrição criada com sucesso",
      });

      navigate(`/prescricoes/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao renovar prescrição",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredPrescriptions = prescriptions.filter(
    (p) =>
      p.prescription_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.patients?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prescrições Médicas</h1>
          <p className="text-muted-foreground">
            Gerencie e assine receitas digitalmente
          </p>
        </div>
        <Button onClick={() => navigate("/prescricoes/nova")} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Nova Prescrição
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, paciente ou diagnóstico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="pending_signature">Aguardando Assinatura</SelectItem>
                <SelectItem value="signed">Assinada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando prescrições...</p>
          </div>
        </div>
      ) : filteredPrescriptions.length === 0 ? (
        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={FileText}
              title={searchQuery ? "Nenhuma prescrição bate com a busca" : "Nenhuma prescrição ainda"}
              description={
                searchQuery
                  ? "Tente outro paciente, medicamento ou data."
                  : "Crie sua primeira prescrição médica em segundos."
              }
              actionLabel={searchQuery ? undefined : "Criar primeira prescrição"}
              actionIcon={searchQuery ? undefined : Plus}
              onAction={searchQuery ? undefined : () => navigate("/prescricoes/nova")}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPrescriptions.map((prescription) => (
            <Card
              key={prescription.id}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate(`/prescricoes/${prescription.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {prescription.prescription_number}
                      </CardTitle>
                      {getStatusBadge(prescription.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <span className="truncate">{prescription.patients?.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {new Date(prescription.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {prescription.diagnosis && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      <span className="font-medium">Diagnóstico:</span> {prescription.diagnosis}
                    </p>
                  )}
                  {prescription.medications && Array.isArray(prescription.medications) && prescription.medications.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Medicamentos:</span>{" "}
                      {prescription.medications.length} prescrito(s)
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/prescricoes/${prescription.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 md:mr-2" />
                    <span className="hidden sm:inline">Ver Detalhes</span>
                    <span className="sm:hidden">Ver</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        copyPrescription(prescription);
                      }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Prescrição
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        renewPrescription(prescription);
                      }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Renovar Prescrição
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {prescription.status === "signed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Implement download
                        toast({
                          title: "Download",
                          description: "Funcionalidade em desenvolvimento",
                        });
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar PDF
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

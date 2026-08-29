import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PatientCombobox } from "@/components/PatientCombobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  FileText, 
  Plus, 
  Search, 
  ClipboardList, 
  Stethoscope, 
  Heart,
  Calendar,
  Sparkles,
  Loader2
} from "lucide-react";

interface Patient {
  id: string;
  name: string;
}

interface MedicalDocument {
  id: string;
  document_number: string;
  document_type: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  patients: {
    name: string;
  } | null;
}

export default function MedicalDocuments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [formData, setFormData] = useState({
    patient_id: "",
    document_type: "",
    title: "",
    diagnosis: "",
    cid_code: "",
    observations: "",
    validity_days: 1,
  });

  useEffect(() => {
    fetchPatients();
    fetchDocuments();
  }, [typeFilter]);

  const fetchPatients = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("patients")
      .select("id, name")
      .eq("user_id", user.id)
      .eq("archived", false)
      .order("name");

    if (!error && data) {
      setPatients(data);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from("medical_documents")
      .select(`
        id,
        document_number,
        document_type,
        title,
        content,
        status,
        created_at,
        patients (name)
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (typeFilter !== "all") {
      query = query.eq("document_type", typeFilter);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message,
      });
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  const handleGenerateDocument = async () => {
    if (!formData.patient_id || !formData.document_type) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione um paciente e o tipo de documento",
      });
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Gerar conteúdo com IA
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "generate-medical-document",
        {
          body: {
            document_type: formData.document_type,
            diagnosis: formData.diagnosis,
            observations: formData.observations,
            cid_code: formData.cid_code,
            validity_days: formData.validity_days,
          },
        }
      );

      if (aiError) throw aiError;

      // Gerar número do documento
      const { data: numberData, error: numberError } = await supabase.rpc(
        "generate_document_number",
        { doc_type: formData.document_type }
      );

      if (numberError) throw numberError;

      // Criar documento
      const { error: insertError } = await supabase
        .from("medical_documents")
        .insert({
          user_id: user.id,
          patient_id: formData.patient_id,
          document_number: numberData,
          document_type: formData.document_type,
          title: formData.title || aiData.title,
          content: aiData.content,
          diagnosis: formData.diagnosis,
          cid_code: formData.cid_code,
          validity_days: formData.validity_days,
          observations: formData.observations,
          status: "issued",
        });

      if (insertError) throw insertError;

      toast({
        title: "Documento gerado!",
        description: "Documento médico criado com sucesso",
      });

      resetForm();
      fetchDocuments();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao gerar documento",
        description: error.message,
      });
    } finally {
      setGenerating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      patient_id: "",
      document_type: "",
      title: "",
      diagnosis: "",
      cid_code: "",
      observations: "",
      validity_days: 1,
    });
    setDialogOpen(false);
    setSelectedDocType("");
  };

  const openDialog = (docType: string) => {
    setSelectedDocType(docType);
    setFormData({ ...formData, document_type: docType });
    setDialogOpen(true);
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case "laudo":
        return "Laudo";
      case "relatorio":
        return "Relatório";
      case "atestado":
        return "Atestado";
      default:
        return type;
    }
  };

  const getDocTypeIcon = (type: string) => {
    switch (type) {
      case "laudo":
        return <Stethoscope className="h-5 w-5" />;
      case "relatorio":
        return <ClipboardList className="h-5 w-5" />;
      case "atestado":
        return <Heart className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "issued":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "draft":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "issued":
        return "Emitido";
      case "draft":
        return "Rascunho";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const filteredDocuments = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.patients?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.document_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Emitir Documentos</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gere laudos, relatórios e atestados com IA
          </p>
        </div>
      </div>

      {/* Botões de Tipos de Documentos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
          onClick={() => openDialog("laudo")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Stethoscope className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Laudo Médico</h3>
                <p className="text-sm text-muted-foreground">
                  Gerar laudo com IA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
          onClick={() => openDialog("relatorio")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <ClipboardList className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Relatório Médico</h3>
                <p className="text-sm text-muted-foreground">
                  Gerar relatório com IA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary/50"
          onClick={() => openDialog("atestado")}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Atestado Médico</h3>
                <p className="text-sm text-muted-foreground">
                  Gerar atestado com IA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="laudo">Laudos</SelectItem>
            <SelectItem value="relatorio">Relatórios</SelectItem>
            <SelectItem value="atestado">Atestados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Documentos */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando...
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum documento encontrado</p>
              <p className="text-sm mt-1">
                Clique em um dos botões acima para gerar um novo documento
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className="hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/documentos/${doc.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="rounded-full p-2 bg-primary/10 shrink-0">
                          {getDocTypeIcon(doc.document_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-semibold truncate">
                              {doc.title}
                            </h3>
                            <Badge variant="outline" className="text-xs">
                              {doc.document_number}
                            </Badge>
                            <Badge className={`${getStatusColor(doc.status)} text-xs`}>
                              {getStatusLabel(doc.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {doc.patients?.name || "Paciente não identificado"}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocType && getDocTypeIcon(selectedDocType)}
              Novo {getDocTypeLabel(selectedDocType)}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados e a IA gerará o documento automaticamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Paciente *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if ((window as any).openPatientDialog) {
                      (window as any).openPatientDialog();
                    }
                  }}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo Paciente
                </Button>
              </div>
              <PatientCombobox
                value={formData.patient_id}
                onChange={(value) =>
                  setFormData({ ...formData, patient_id: value })
                }
                onPatientCreated={fetchPatients}
                onCreateClick={() => {}}
              />
            </div>

            <div className="space-y-2">
              <Label>Título do Documento</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Ex: Laudo de Exame Radiológico"
              />
            </div>

            <div className="space-y-2">
              <Label>Diagnóstico / Motivo</Label>
              <Textarea
                value={formData.diagnosis}
                onChange={(e) =>
                  setFormData({ ...formData, diagnosis: e.target.value })
                }
                rows={3}
                placeholder="Descreva o diagnóstico ou motivo do documento..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CID-10</Label>
                <Input
                  value={formData.cid_code}
                  onChange={(e) =>
                    setFormData({ ...formData, cid_code: e.target.value })
                  }
                  placeholder="Ex: J18.9"
                />
              </div>

              {selectedDocType === "atestado" && (
                <div className="space-y-2">
                  <Label>Dias de Afastamento</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.validity_days}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        validity_days: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Observações Adicionais</Label>
              <Textarea
                value={formData.observations}
                onChange={(e) =>
                  setFormData({ ...formData, observations: e.target.value })
                }
                rows={2}
                placeholder="Informações complementares..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={resetForm} disabled={generating}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateDocument} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando com IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar com IA
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

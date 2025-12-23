import { useState } from "react";
import StudiusLayout from "@/components/studius/StudiusLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText, 
  Languages, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check,
  BookOpen,
  Globe,
  Lightbulb,
  Download,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface ArticleResult {
  type: "summary" | "translation" | "keypoints";
  title: string;
  content: string;
  originalLanguage?: string;
  targetLanguage?: string;
}

export default function StudiusArticles() {
  const [inputText, setInputText] = useState("");
  const [inputUrl, setInputUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ArticleResult[]>([]);
  const [activeTab, setActiveTab] = useState("summarize");
  const [targetLanguage, setTargetLanguage] = useState("pt-BR");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleProcess = async () => {
    const content = inputText.trim() || inputUrl.trim();
    if (!content) {
      toast.error("Insira um texto ou URL para processar");
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("process-article", {
        body: { 
          content, 
          action: activeTab, 
          targetLanguage,
          isUrl: !!inputUrl.trim() && !inputText.trim()
        }
      });

      if (error) throw error;

      if (data.success) {
        const newResult: ArticleResult = {
          type: activeTab as ArticleResult["type"],
          title: data.title || getActionTitle(activeTab),
          content: data.result,
          originalLanguage: data.originalLanguage,
          targetLanguage: activeTab === "translation" ? targetLanguage : undefined
        };
        setResults(prev => [newResult, ...prev]);
        toast.success("Processamento concluído!");
      } else {
        throw new Error(data.error || "Erro ao processar");
      }
    } catch (error) {
      console.error("Error processing:", error);
      toast.error(error instanceof Error ? error.message : "Erro ao processar artigo");
    } finally {
      setIsProcessing(false);
    }
  };

  const getActionTitle = (action: string) => {
    switch (action) {
      case "summarize": return "Resumo";
      case "translation": return "Tradução";
      case "keypoints": return "Pontos-chave";
      default: return "Resultado";
    }
  };

  const handleCopy = async (index: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    toast.success("Copiado para a área de transferência");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case "summary": return BookOpen;
      case "translation": return Globe;
      case "keypoints": return Lightbulb;
      default: return FileText;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case "summary": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "translation": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "keypoints": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default: return "bg-muted";
    }
  };

  return (
    <StudiusLayout>
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = "/studius"}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-7 w-7 text-studius-primary" />
              Artigos & Traduções
            </h1>
            <p className="text-muted-foreground mt-1">
              Resuma, traduza e extraia pontos-chave de artigos médicos
            </p>
          </div>
        </div>

        {/* Input Section */}
        <Card className="bg-studius-card border-studius-border">
          <CardContent className="pt-6 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full max-w-md">
                <TabsTrigger value="summarize" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Resumir
                </TabsTrigger>
                <TabsTrigger value="translation" className="gap-2">
                  <Languages className="h-4 w-4" />
                  Traduzir
                </TabsTrigger>
                <TabsTrigger value="keypoints" className="gap-2">
                  <Lightbulb className="h-4 w-4" />
                  Pontos-chave
                </TabsTrigger>
              </TabsList>

              <TabsContent value="summarize" className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Cole o texto ou URL de um artigo científico para obter um resumo conciso e estruturado.
                </p>
              </TabsContent>

              <TabsContent value="translation" className="mt-4">
                <div className="flex items-center gap-4 mb-3">
                  <p className="text-sm text-muted-foreground">Traduzir para:</p>
                  <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                      <SelectItem value="en">Inglês</SelectItem>
                      <SelectItem value="es">Espanhol</SelectItem>
                      <SelectItem value="fr">Francês</SelectItem>
                      <SelectItem value="de">Alemão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="keypoints" className="mt-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Extraia os principais pontos e descobertas do artigo em formato de tópicos.
                </p>
              </TabsContent>
            </Tabs>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">URL do artigo (opcional)</label>
                <Input
                  placeholder="https://pubmed.ncbi.nlm.nih.gov/..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="relative">
                <label className="text-sm font-medium text-foreground">Ou cole o texto do artigo</label>
                <Textarea
                  placeholder="Cole aqui o conteúdo do artigo científico..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="mt-1 min-h-[200px] resize-none"
                />
                <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                  {inputText.length} caracteres
                </div>
              </div>
            </div>

            <Button 
              onClick={handleProcess}
              disabled={isProcessing || (!inputText.trim() && !inputUrl.trim())}
              className="w-full bg-studius-primary hover:bg-studius-primary/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Processar com IA
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Section */}
        <AnimatePresence>
          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resultados
              </h2>

              {results.map((result, index) => {
                const Icon = getResultIcon(result.type);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="bg-studius-card border-studius-border">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getResultColor(result.type)}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{result.title}</CardTitle>
                              {result.targetLanguage && (
                                <CardDescription>
                                  Traduzido para {getLanguageName(result.targetLanguage)}
                                </CardDescription>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(index, result.content)}
                            className="h-8 w-8"
                          >
                            {copiedIndex === index ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                            {result.content}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {results.length === 0 && (
          <Card className="bg-studius-card border-studius-border">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum resultado ainda
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Cole um artigo científico acima e escolha uma ação para começar. 
                A IA irá processar o conteúdo e gerar um resultado estruturado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </StudiusLayout>
  );
}

function getLanguageName(code: string) {
  const languages: Record<string, string> = {
    "pt-BR": "Português",
    "en": "Inglês",
    "es": "Espanhol",
    "fr": "Francês",
    "de": "Alemão"
  };
  return languages[code] || code;
}

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, ArrowRight, Minimize2, Search, AlertTriangle, List, Copy, Check, FileUp, Upload, X, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PublicExaminusChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou o Examinus, seu assistente para extrair e formatar exames médicos.\n\nPode colar seus resultados aqui do jeito que vier - foto, PDF, texto bagunçado, tudo misturado. Eu organizo!\n\n✨ O que eu faço:\n• Extraio só o que importa (valores, achados, datas)\n• Formato em padrão limpo e padronizado\n• Pronto para você copiar e documentar\n\nExperimente um exemplo rápido abaixo ou cole qualquer resultado de exame. Literalmente qualquer um. Eu dou conta! 😎"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const convertFileToBase64 = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tamanho (máximo 20MB)
    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 20MB",
        variant: "destructive",
      });
      return;
    }

    // Verificar tipo
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Formato não suportado",
        description: "Use JPG, PNG, WEBP ou PDF",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    // Criar preview
    if (file.type.startsWith('image/')) {
      const preview = await convertFileToBase64(file);
      setFilePreview(preview);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMessage: Message = { 
      role: "user", 
      content: input || "Extraia e formate este exame:" 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      let fileContent: string | undefined;
      
      if (selectedFile) {
        fileContent = await convertFileToBase64(selectedFile);
        removeFile();
      }

      const { data, error } = await supabase.functions.invoke("public-examinus", {
        body: { 
          messages: [...messages, userMessage],
          fileContent 
        }
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "Limite atingido",
          description: data.error,
          variant: "destructive",
        });
        
        // Add CTA message when limit reached
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "🎯 Você atingiu o limite de mensagens gratuitas! Crie uma conta gratuita para continuar conversando e ter acesso a recursos exclusivos como histórico de conversas, upload de documentos e todos os 6 assistentes especializados."
        }]);
        
        return;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRemainingMessages(data.remainingMessages);

      // Show upgrade prompt after 3 messages
      if (data.remainingMessages <= 7 && data.remainingMessages > 0) {
        setTimeout(() => {
          toast({
            title: "💡 Gostando do Examinus?",
            description: `Você tem ${data.remainingMessages} mensagens restantes. Crie uma conta gratuita para uso ilimitado!`,
            action: (
              <Button size="sm" onClick={() => navigate("/pricing")} className="ml-2">
                Criar Conta
              </Button>
            ),
          });
        }, 1000);
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = async (content: string, index: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedIndex(index);
      toast({
        title: "Copiado!",
        description: "Resposta copiada para a área de transferência",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto",
        variant: "destructive",
      });
    }
  };

  const quickExamples = [
    { 
      label: "Compactar", 
      icon: Minimize2, 
      prompt: "Compacte este resultado de exame para registro em prontuário:\n\nHemograma Completo:\n• Hemoglobina: 10,2 g/dL (ref: 12-16)\n• Hematócrito: 32% (ref: 36-48)\n• VCM: 74 fL (ref: 80-100)\n• CHCM: 30 g/dL (ref: 32-36)\n• Leucócitos: 12.400/mm³ (ref: 4.000-11.000)\n• Neutrófilos: 78% (ref: 40-75)\n• Linfócitos: 15% (ref: 20-45)\n• Plaquetas: 180.000/mm³ (ref: 150.000-400.000)"
    },
    { 
      label: "Interpretar", 
      icon: Search, 
      prompt: "Interprete estes achados laboratoriais:\n\n• Glicemia de jejum: 126 mg/dL (ref: 70-100)\n• Hemoglobina glicada (HbA1c): 7,2% (ref: <5,7)\n• Colesterol total: 245 mg/dL (ref: <200)\n• LDL: 165 mg/dL (ref: <100)\n• Creatinina: 1,8 mg/dL (ref: 0,7-1,3)"
    },
    { 
      label: "Achados críticos", 
      icon: AlertTriangle, 
      prompt: "Identifique os achados críticos neste exame:\n\n• Potássio: 6,2 mEq/L (ref: 3,5-5,0)\n• Creatinina: 4,5 mg/dL (ref: 0,7-1,3)\n• Hemoglobina: 6,8 g/dL (ref: 12-16)\n• Plaquetas: 45.000/mm³ (ref: 150.000-400.000)\n• PCR: 180 mg/L (ref: <5)"
    },
    { 
      label: "Listar envios", 
      icon: List, 
      prompt: "Liste em formato de prontuário sequencial:\n\n1) Hemograma: anemia microcítica, leucocitose com desvio\n2) Função renal: creatinina elevada\n3) Glicemia: 126 mg/dL em jejum\n4) Lipidograma: dislipidemia mista"
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
  };

  const messagesHeight = Math.min(500, Math.max(280, messages.length * 70 + 80));

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-elevated border-border/50 backdrop-blur-xl bg-card/95 transition-all duration-300 hover:shadow-medical">
      {/* Header */}
      <div className="bg-gradient-primary p-5 rounded-t-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center ring-2 ring-primary-foreground/30">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-primary-foreground text-lg flex items-center gap-2">
                Examinus Demo
                <Badge variant="secondary" className="text-[0.65rem] bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30">
                  Grátis
                </Badge>
              </h3>
              <p className="text-primary-foreground/90 text-sm">Cole exames e veja a análise instantânea</p>
            </div>
          </div>
          {remainingMessages !== null && (
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 backdrop-blur-sm">
              {remainingMessages} restantes
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Examples */}
      {messages.length <= 1 && (
        <div className="p-5 border-b border-border/50">
          <div className="mb-3">
            <p className="text-foreground text-sm font-medium mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Exemplos prontos para testar
            </p>
            <p className="text-muted-foreground text-xs">Clique e veja a análise em segundos</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {quickExamples.map((example, idx) => {
              const Icon = example.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleQuickAction(example.prompt)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent border border-border/50 hover:border-primary/30 transition-all group hover:scale-105 hover:shadow-sm"
                >
                  <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-xs text-center text-muted-foreground group-hover:text-foreground font-medium">
                    {example.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <ScrollArea 
        className="p-5 transition-all duration-300 bg-gradient-to-b from-muted/20 to-transparent" 
        style={{ height: `${messagesHeight}px` }}
        ref={scrollRef}
      >
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-3 duration-300`}
            >
              <div
                className={`max-w-[85%] rounded-2xl shadow-sm transition-all hover:shadow-md relative group ${
                  message.role === "user"
                    ? "bg-gradient-primary text-primary-foreground ml-4 px-4 py-3.5"
                    : "bg-card text-card-foreground mr-4 border border-border/50 px-4 pt-3.5 pb-10"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
                {message.role === "assistant" && (
                  <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const upperText = message.content.toUpperCase();
                        navigator.clipboard.writeText(upperText);
                        toast({
                          description: "Texto em caixa alta copiado!",
                        });
                      }}
                      className="h-7 px-2 gap-1.5 text-xs"
                    >
                      <FileUp className="h-3 w-3" />
                      <span>Maiúscula</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(message.content, index)}
                      className="h-7 px-2 gap-1.5 text-xs"
                    >
                      {copiedIndex === index ? (
                        <>
                          <Check className="h-3 w-3 text-primary" />
                          <span className="text-primary">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-in fade-in duration-200">
              <div className="bg-card rounded-2xl px-4 py-3 border border-border/50">
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-muted-foreground text-sm">Analisando exame...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-5 border-t border-border/50 bg-muted/20 backdrop-blur rounded-b-2xl">
        {/* File Preview */}
        {selectedFile && (
          <div className="mb-3 flex items-center gap-3 bg-muted/50 border border-border rounded-lg p-3">
            {filePreview ? (
              <img src={filePreview} alt="Preview" className="w-12 h-12 object-cover rounded" />
            ) : (
              <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={removeFile}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="lg"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="self-end h-[80px] w-[80px] border-dashed hover:border-primary hover:bg-primary/5 transition-all"
            title="Fazer upload de imagem ou PDF"
          >
            <Upload className="w-6 h-6" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Cole resultados completos de exames aqui (hemograma, bioquímica, imagens, etc)..."
            className="min-h-[80px] max-h-[180px] resize-none text-sm bg-background border-border placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && !selectedFile)}
            size="lg"
            className="self-end h-[80px] w-[80px] shadow-medical hover:shadow-elevated hover:scale-105 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </Button>
        </div>
        
        {/* CTA Footer */}
        <div className="mt-3.5 flex items-center justify-between text-xs flex-wrap gap-3 bg-primary/5 border border-primary/20 rounded-xl px-3.5 py-2.5">
          <p className="text-muted-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            Teste grátis • Sem cadastro • Sem cartão
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/pricing")}
            className="text-primary hover:text-primary hover:bg-primary/10 h-8 text-xs font-semibold group"
          >
            Uso ilimitado
            <ArrowRight className="ml-1.5 h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

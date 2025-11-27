import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, ArrowRight, Copy, Check, FileUp, Upload, X, Image as ImageIcon, SeparatorVertical, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PublicExaminusChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showComingSoonDialog, setShowComingSoonDialog] = useState(false);
  const [usePipeSeparator, setUsePipeSeparator] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      // ScrollArea do shadcn tem um viewport interno que precisa ser acessado
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

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

    const messageContent = input || "Extraia e formate este exame:";

    const userMessage: Message = { 
      role: "user", 
      content: messageContent
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
          fileContent,
          usePipeSeparator,
          includeTime
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
              <Button size="sm" onClick={() => setShowComingSoonDialog(true)} className="ml-2">
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

  const hasMessages = messages.length > 0;
  const messagesHeight = hasMessages ? Math.min(500, Math.max(200, messages.length * 80)) : 0;

  return (
    <div className="w-full max-w-5xl mx-auto px-2 md:px-4">
      {/* Hero Section */}
      {!hasMessages && (
        <div className="text-center space-y-4 md:space-y-6 mb-6 md:mb-12 animate-in fade-in duration-700 slide-in-from-bottom-4">
          <div className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 md:w-4 h-3.5 md:h-4 text-primary" />
            <span className="text-xs md:text-sm font-medium text-primary">Examinus por MedStation AI</span>
          </div>
          
          <div className="space-y-1.5 md:space-y-2 px-2">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Produza Mais.{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Digite Menos.
              </span>
            </h1>
            <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Cole os resultados dos exames aqui e veja a mágica acontecer!
            </p>
          </div>

          <div className="hidden md:flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground pt-1">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Extraio só o que importa</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Formato em padrão limpo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span>Pronto para documentar</span>
            </div>
          </div>
        </div>
      )}

      {/* Chat Card */}
      <Card className={`shadow-elevated border-border/50 backdrop-blur-xl bg-card/95 transition-all duration-500 ${hasMessages ? 'hover:shadow-medical' : ''} mx-2 md:mx-0`}>
        {/* Compact Header (only shown when there are messages) */}
        {hasMessages && (
          <div className="bg-gradient-primary p-3 md:p-4 rounded-t-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjA1IiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 md:w-5 h-4 md:h-5 text-primary-foreground" />
                <span className="font-semibold text-sm md:text-base text-primary-foreground">Examinus</span>
              </div>
              {remainingMessages !== null && (
                <Badge variant="secondary" className="text-[10px] md:text-xs bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30 px-2 py-0.5">
                  {remainingMessages} restantes
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Messages Area */}
        {hasMessages && (
          <ScrollArea 
            className="p-3 md:p-5 transition-all duration-300 bg-gradient-to-b from-muted/20 to-transparent" 
            style={{ height: `${messagesHeight}px` }}
            ref={scrollRef}
          >
            <div className="space-y-2 md:space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-3 duration-300`}
                >
                  <div
                    className={`max-w-[90%] md:max-w-[85%] rounded-2xl md:rounded-2xl shadow-sm transition-all hover:shadow-md relative group ${
                      message.role === "user"
                        ? "bg-gradient-primary text-primary-foreground ml-2 md:ml-4 px-3 md:px-4 py-2.5 md:py-3.5 rounded-br-sm md:rounded-br-2xl"
                        : "bg-card text-card-foreground mr-2 md:mr-4 border border-border/50 px-3 md:px-4 pt-2.5 md:pt-3.5 pb-9 md:pb-10 rounded-bl-sm md:rounded-bl-2xl"
                    }`}
                  >
                    <p className="text-sm md:text-sm whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                    {message.role === "assistant" && (
                      <div className="absolute bottom-1.5 md:bottom-2 right-1.5 md:right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          className="h-6 md:h-7 px-1.5 md:px-2 gap-1 md:gap-1.5 text-[10px] md:text-xs"
                        >
                          <FileUp className="h-2.5 md:h-3 w-2.5 md:w-3" />
                          <span className="hidden md:inline">Maiúscula</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(message.content, index)}
                          className="h-6 md:h-7 px-1.5 md:px-2 gap-1 md:gap-1.5 text-[10px] md:text-xs"
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-2.5 md:h-3 w-2.5 md:w-3 text-primary" />
                              <span className="hidden md:inline text-primary">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 md:h-3 w-2.5 md:w-3" />
                              <span className="hidden md:inline">Copiar</span>
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
                  <div className="bg-card rounded-2xl rounded-bl-sm px-3 md:px-4 py-2 md:py-3 border border-border/50 ml-2 md:ml-0">
                    <div className="flex items-center gap-2 md:gap-2.5">
                      <Loader2 className="w-3.5 md:w-4 h-3.5 md:h-4 animate-spin text-primary" />
                      <span className="text-muted-foreground text-xs md:text-sm">Analisando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Input Area */}
        <div className={`p-3 md:p-5 bg-muted/20 backdrop-blur ${hasMessages ? 'border-t border-border/50 rounded-b-2xl' : 'rounded-2xl'}`}>
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

          {/* Mobile: Horizontal layout like WhatsApp */}
          <div className="flex md:hidden gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="h-10 w-10 shrink-0 rounded-full hover:bg-primary/10 transition-all group"
              title="Upload"
            >
              <Upload className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
            </Button>
            <Toggle
              pressed={usePipeSeparator}
              onPressedChange={setUsePipeSeparator}
              size="sm"
              className="h-9 w-9 shrink-0 rounded-full data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted transition-all"
              title="Separar exames com barra vertical (|)"
            >
              <SeparatorVertical className="w-4 h-4" />
            </Toggle>
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-all ${includeTime ? 'bg-primary/10' : 'bg-muted/30'}`} title="Incluir horário (HH:MM)">
              <Clock className={`w-5 h-5 transition-colors ${includeTime ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                id="include-time-mobile"
                checked={includeTime}
                onCheckedChange={setIncludeTime}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={hasMessages ? "Digite ou cole exames..." : "Cole exames aqui"}
              className="min-h-[36px] max-h-[90px] resize-none text-sm bg-background border-border placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-3xl px-3 py-2 self-center"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedFile)}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Desktop: Original layout */}
          <div className="hidden md:flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              size="default"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="self-end h-[55px] w-[55px] border-dashed hover:border-primary hover:bg-primary/5 transition-all group shrink-0"
              title="Fazer upload de imagem ou PDF"
            >
              <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Button>
            <Toggle
              pressed={usePipeSeparator}
              onPressedChange={setUsePipeSeparator}
              size="default"
              className="self-end h-[55px] w-[55px] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground hover:bg-muted transition-all"
              title="Separar exames com barra vertical (|)"
            >
              <SeparatorVertical className="w-5 h-5" />
            </Toggle>
            <div className={`self-end flex items-center gap-3 px-3 py-2 rounded-lg h-[55px] hover:bg-muted/50 transition-all cursor-pointer ${includeTime ? 'bg-primary/10' : 'bg-muted/30'}`} title="Incluir horário (HH:MM)">
              <Clock className={`w-6 h-6 transition-colors ${includeTime ? 'text-primary' : 'text-muted-foreground'}`} />
              <Switch
                id="include-time-desktop"
                checked={includeTime}
                onCheckedChange={setIncludeTime}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={hasMessages ? "Cole mais exames aqui..." : "Cole resultados de exames - hemograma, bioquímica, imagens, PDFs... Literalmente qualquer um! 😎"}
              className="min-h-[55px] max-h-[130px] resize-none text-sm bg-background border-border placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 transition-all flex-1"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedFile)}
              size="default"
              className="self-end h-[55px] w-[55px] shadow-medical hover:shadow-elevated hover:scale-105 transition-all shrink-0"
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </Button>
          </div>
          
          {/* CTA Footer */}
          {!hasMessages && (
            <div className="mt-3 md:mt-4 flex items-center justify-between text-xs flex-wrap gap-2 md:gap-3 bg-primary/5 border border-primary/20 rounded-xl px-3 md:px-4 py-2.5 md:py-3">
              <p className="text-muted-foreground flex items-center gap-2 text-[11px] md:text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Teste grátis • Sem cadastro
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowComingSoonDialog(true)}
                className="text-primary hover:text-primary hover:bg-primary/10 h-7 md:h-8 text-[11px] md:text-xs font-semibold group px-2 md:px-3"
              >
                Uso ilimitado
                <ArrowRight className="ml-1 md:ml-1.5 h-3 md:h-3.5 w-3 md:w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Coming Soon Dialog */}
      <Dialog open={showComingSoonDialog} onOpenChange={setShowComingSoonDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Assinatura em Breve! 🚀
            </DialogTitle>
            <DialogDescription className="text-base pt-4 space-y-4">
              <p className="text-foreground/90">
                A assinatura da plataforma MedStation AI estará disponível em breve!
              </p>
              <p className="text-foreground/90">
                Seja um dos primeiros a ter acesso exclusivo falando diretamente com{" "}
                <span className="font-semibold text-primary">Artur Batista</span>, 
                médico desenvolvedor da plataforma.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 mt-4">
            <Button
              onClick={() => window.open("https://w.app/medstationai", "_blank")}
              className="w-full h-12 text-base font-semibold"
            >
              💬 Falar com Artur no WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowComingSoonDialog(false)}
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

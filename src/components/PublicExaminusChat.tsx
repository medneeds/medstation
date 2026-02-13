import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, ArrowRight, Copy, Check, FileUp, Upload, X, Image as ImageIcon, SeparatorVertical, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Gera fingerprint do navegador (combinação de características únicas)
const generateFingerprint = (): string => {
  const components: string[] = [];
  
  // User Agent
  components.push(navigator.userAgent);
  
  // Língua
  components.push(navigator.language);
  
  // Timezone
  components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);
  
  // Resolução de tela
  components.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  
  // Plataforma
  components.push(navigator.platform);
  
  // Número de cores
  components.push(String(screen.colorDepth));
  
  // Memória do dispositivo (se disponível)
  if ('deviceMemory' in navigator) {
    components.push(String((navigator as any).deviceMemory));
  }
  
  // Número de núcleos (se disponível)
  if ('hardwareConcurrency' in navigator) {
    components.push(String(navigator.hardwareConcurrency));
  }
  
  // Canvas fingerprint (muito único)
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('MedStation AI', 2, 2);
      components.push(canvas.toDataURL().slice(-50));
    }
  } catch (e) {
    // Ignora se falhar
  }
  
  // Criar hash simples
  const fingerprint = components.join('|');
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
};

// Gerenciar fingerprint persistente
const getStoredFingerprint = (): string => {
  const storageKey = 'ms_fp';
  let stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    stored = generateFingerprint();
    try {
      localStorage.setItem(storageKey, stored);
    } catch (e) {
      // Ignora se localStorage não disponível
    }
  }
  
  // Também salvar em cookie como backup
  try {
    document.cookie = `${storageKey}=${stored};max-age=31536000;path=/;SameSite=Lax`;
  } catch (e) {
    // Ignora
  }
  
  return stored;
};

// Recuperar fingerprint de cookie se localStorage foi limpo
const recoverFingerprint = (): string => {
  const storageKey = 'ms_fp';
  
  // Tenta localStorage primeiro
  let stored = localStorage.getItem(storageKey);
  if (stored) return stored;
  
  // Tenta cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === storageKey && value) {
      // Restaura no localStorage
      try {
        localStorage.setItem(storageKey, value);
      } catch (e) {}
      return value;
    }
  }
  
  // Se não encontrou, gera novo
  return getStoredFingerprint();
};

export default function PublicExaminusChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingMessages, setRemainingMessages] = useState<number | null>(null);
  const [usedCount, setUsedCount] = useState<number>(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [usePipeSeparator, setUsePipeSeparator] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [onlyAltered, setOnlyAltered] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Inicializar fingerprint
  useEffect(() => {
    const fp = recoverFingerprint();
    setFingerprint(fp);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
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

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 20MB",
        variant: "destructive",
      });
      return;
    }

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
          includeTime,
          onlyAltered,
          fingerprint
        }
      });

      if (error) throw error;

      if (data.error || data.limitReached) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "🎯 Você usou suas extrações gratuitas!\n\n✨ Crie sua conta grátis agora e continue usando o Examinus sem limites — é rápido e sem cartão de crédito.\n\nAlém disso, você terá acesso aos outros 9 assistentes médicos especializados:\n\n• Clínicus — Anamneses estruturadas\n• Scorius — Cálculo de scores clínicos\n• Prescriptus — Prescrições inteligentes\n• E muito mais!"
        }]);
        
        toast({
          title: "Limite atingido",
          description: "Crie sua conta grátis para continuar!",
          action: (
            <Button size="sm" onClick={() => navigate('/auth')} className="ml-2">
              Criar Conta
            </Button>
          ),
        });
        return;
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRemainingMessages(data.remainingMessages);
      setUsedCount(data.usedCount || 0);

      // CTAs progressivos baseados no uso
      if (data.remainingMessages === 2) {
        setTimeout(() => {
          toast({
            title: "2 extrações restantes",
            description: "Está gostando? Crie sua conta grátis para uso ilimitado!",
          });
        }, 1500);
      } else if (data.remainingMessages === 1) {
        setTimeout(() => {
          toast({
            title: "Última extração!",
            description: "Crie sua conta grátis agora para não perder acesso.",
            action: (
              <Button size="sm" onClick={() => navigate('/auth')} className="ml-2">
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
  const LIMIT = 5;

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
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] md:text-xs px-2 py-0.5 ${
                    remainingMessages <= 1 
                      ? 'bg-red-500/30 text-red-100 border-red-400/50' 
                      : remainingMessages <= 2 
                        ? 'bg-yellow-500/30 text-yellow-100 border-yellow-400/50'
                        : 'bg-primary-foreground/20 text-primary-foreground border-primary-foreground/30'
                  }`}
                >
                  {remainingMessages} de {LIMIT} restantes
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

          {/* Mobile: Clean WhatsApp-style layout */}
          <div className="flex md:hidden flex-col gap-2">
            {/* Formatting options row - compact */}
            <div className="flex items-center gap-2 px-1">
              <Toggle
                pressed={usePipeSeparator}
                onPressedChange={setUsePipeSeparator}
                size="sm"
                className="h-7 px-2 text-xs rounded-full data-[state=on]:bg-primary/20"
                title="Separar exames com |"
              >
                <SeparatorVertical className="w-3 h-3 mr-1" />
                <span>Separar</span>
              </Toggle>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full h-7">
                <Switch
                  id="include-time-mobile"
                  checked={includeTime}
                  onCheckedChange={setIncludeTime}
                  className="data-[state=checked]:bg-primary scale-75"
                />
                <Label htmlFor="include-time-mobile" className="text-[10px] cursor-pointer flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Horário
                </Label>
              </div>
              <Toggle
                pressed={onlyAltered}
                onPressedChange={setOnlyAltered}
                size="sm"
                className="h-7 px-2 text-xs rounded-full data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
                title="Apenas alterados"
              >
                <AlertTriangle className="w-3 h-3 mr-1" />
                <span>Alterados</span>
              </Toggle>
            </div>
            {/* Input row */}
            <div className="flex gap-2 items-end">
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
                className="h-10 w-10 shrink-0 rounded-full hover:bg-primary/10 transition-all"
                title="Upload"
              >
                <Upload className="w-5 h-5 text-primary" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasMessages ? "Cole exames..." : "Cole exames aqui"}
                className="min-h-[44px] max-h-32 resize-none flex-1 rounded-2xl border-border/50 focus:border-primary/50 text-sm py-3"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedFile)}
                size="icon"
                className="h-10 w-10 rounded-full bg-gradient-primary hover:opacity-90 transition-all shrink-0 shadow-md"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Desktop: Original layout with all options */}
          <div className="hidden md:flex flex-col gap-4">
            {/* Formatting Options Row */}
            <div className="flex items-center gap-4 px-1">
              <Toggle
                pressed={usePipeSeparator}
                onPressedChange={setUsePipeSeparator}
                size="sm"
                className="h-8 px-3 rounded-full data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
                title="Separar exames com barra vertical |"
              >
                <SeparatorVertical className="w-4 h-4 mr-2" />
                <span className="text-xs">Separar com |</span>
              </Toggle>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                <Switch
                  id="include-time"
                  checked={includeTime}
                  onCheckedChange={setIncludeTime}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="include-time" className="text-xs cursor-pointer flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Incluir horário
                </Label>
              </div>
              <Toggle
                pressed={onlyAltered}
                onPressedChange={setOnlyAltered}
                size="sm"
                className="h-8 px-3 rounded-full data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
                title="Mostrar apenas resultados alterados/críticos"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                <span className="text-xs">Só alterados</span>
              </Toggle>
            </div>

            {/* Input Row */}
            <div className="flex gap-3 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="h-12 w-12 shrink-0 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                title="Upload de imagem ou PDF"
              >
                <Upload className="w-5 h-5 text-primary" />
              </Button>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasMessages ? "Cole mais exames aqui..." : "Cole os resultados de exames aqui (texto, imagem ou PDF)"}
                className="min-h-[48px] max-h-40 resize-none flex-1 rounded-xl border-border/50 focus:border-primary/50 transition-colors text-sm py-3"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !selectedFile)}
                size="lg"
                className="h-12 px-6 rounded-xl bg-gradient-primary hover:opacity-90 transition-all shadow-medical hover:shadow-elevated"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* CTA Banner - shown after first extraction */}
      {hasMessages && remainingMessages !== null && remainingMessages <= 3 && remainingMessages > 0 && (
        <div className="mt-4 mx-2 md:mx-0 p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 rounded-xl animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="text-center md:text-left">
              <p className="font-medium text-sm">
                Gostando do Examinus? 
                <span className="text-muted-foreground ml-1">
                  Você tem {remainingMessages} {remainingMessages === 1 ? 'extração restante' : 'extrações restantes'}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Crie sua conta grátis para uso ilimitado + acesso aos outros 9 agentes
              </p>
            </div>
            <Button 
              onClick={() => navigate('/auth')}
              className="shrink-0 bg-gradient-primary hover:opacity-90"
            >
              Criar Conta Grátis
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

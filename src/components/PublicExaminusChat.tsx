import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Sparkles, ArrowRight, Copy, Check, FileUp, Upload, X, Image as ImageIcon, SeparatorVertical, Clock, AlertTriangle, Stethoscope, Minimize2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { pdfToImages } from "@/utils/pdfToImages";
import { DemoPromoEngine } from "@/components/demo/DemoPromoEngine";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const COOLDOWN_SECONDS = 30;
const COOLDOWN_KEY = "ms_demo_cooldown_until";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [extractedText, setExtractedText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [usePipeSeparator, setUsePipeSeparator] = useState(false);
  const [includeTime, setIncludeTime] = useState(true);
  const [onlyAltered, setOnlyAltered] = useState(false);
  const [clinicalImpression, setClinicalImpression] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [fingerprint, setFingerprint] = useState<string>("");
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [validationAnnouncement, setValidationAnnouncement] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const truncateToastShownRef = useRef(false);

  const DEMO_MAX_CHARS = 8000;
  const handleInputChange = (value: string) => {
    if (value.length > DEMO_MAX_CHARS) {
      const truncated = value.slice(0, DEMO_MAX_CHARS);
      setInput(truncated);
      if (!truncateToastShownRef.current) {
        truncateToastShownRef.current = true;
        toast({
          title: "Limite de caracteres atingido",
          description: `O modo demonstração aceita até ${DEMO_MAX_CHARS.toLocaleString("pt-BR")} caracteres. Usuários da plataforma têm até 30.000.`,
          variant: "destructive",
        });
        setTimeout(() => { truncateToastShownRef.current = false; }, 4000);
      }
      return;
    }
    setInput(value);
  };

  // Inicializar fingerprint
  useEffect(() => {
    const fp = recoverFingerprint();
    setFingerprint(fp);
  }, []);

  // Restaurar cooldown ao montar (resiste a refresh)
  useEffect(() => {
    try {
      const until = Number(sessionStorage.getItem(COOLDOWN_KEY) || 0);
      const left = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      if (left > 0) setCooldownRemaining(left);
    } catch {}
  }, []);

  // Tick do cooldown
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const id = setInterval(() => {
      setCooldownRemaining((s) => {
        const next = s - 1;
        if (next <= 0) {
          try { sessionStorage.removeItem(COOLDOWN_KEY); } catch {}
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownRemaining]);

  const startCooldown = () => {
    const until = Date.now() + COOLDOWN_SECONDS * 1000;
    try { sessionStorage.setItem(COOLDOWN_KEY, String(until)); } catch {}
    setCooldownRemaining(COOLDOWN_SECONDS);
  };


  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const fileToBase64Raw = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const ocrPublic = async (
    base64: string,
    mimeType: string,
    fileName: string
  ): Promise<string> => {
    const { data, error } = await supabase.functions.invoke('public-extract-text', {
      body: { file: base64, fileName, mimeType, fingerprint },
    });
    if (error || !data?.text) {
      throw new Error(error?.message || `Erro ao extrair ${fileName}`);
    }
    return data.text as string;
  };

  const extractFromFiles = async (files: File[]): Promise<string> => {
    const sections: string[] = [];
    const imageFiles: File[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || ext === 'pdf';

      if (isImage) {
        imageFiles.push(file);
        continue;
      }

      if (isPdf) {
        toast({
          title: "Processando PDF",
          description: `Renderizando páginas de ${file.name}...`,
        });

        const pages = await pdfToImages(file, { scale: 2, maxPages: 30 });

        toast({
          title: "Lendo páginas",
          description: `OCR em ${pages.length} página${pages.length > 1 ? 's' : ''} de ${file.name}...`,
        });

        const results: string[] = new Array(pages.length).fill('');
        const concurrency = 3;
        let cursor = 0;
        const workers = Array.from({ length: Math.min(concurrency, pages.length) }, async () => {
          while (cursor < pages.length) {
            const idx = cursor++;
            const p = pages[idx];
            try {
              results[idx] = await ocrPublic(p.base64, p.mimeType, `${file.name}-p${p.pageNumber}.jpg`);
            } catch (err: any) {
              console.error(`OCR page ${p.pageNumber} failed:`, err);
              results[idx] = `[Erro ao processar página ${p.pageNumber}]`;
            }
          }
        });
        await Promise.all(workers);

        const pdfText = pages
          .map((p, i) => `===== PÁGINA ${p.pageNumber} =====\n${results[i].trim()}`)
          .join('\n\n');

        sections.push(`📎 ${file.name} (${pages.length} página${pages.length > 1 ? 's' : ''})\n\n${pdfText}`);
        continue;
      }

      toast({
        title: "Formato não suportado",
        description: `${file.name}: use imagens ou PDF.`,
        variant: "destructive",
      });
    }

    if (imageFiles.length > 0) {
      toast({
        title: "Lendo imagens",
        description: `OCR em ${imageFiles.length} imagem${imageFiles.length > 1 ? 'ns' : ''}...`,
      });
      const concurrency = 3;
      const results: string[] = new Array(imageFiles.length).fill('');
      let cursor = 0;
      const workers = Array.from({ length: Math.min(concurrency, imageFiles.length) }, async () => {
        while (cursor < imageFiles.length) {
          const idx = cursor++;
          const f = imageFiles[idx];
          try {
            const base64 = await fileToBase64Raw(f);
            results[idx] = await ocrPublic(base64, f.type || 'image/jpeg', f.name);
          } catch (err: any) {
            console.error(`OCR image ${f.name} failed:`, err);
            results[idx] = `[Erro ao processar ${f.name}]`;
          }
        }
      });
      await Promise.all(workers);

      imageFiles.forEach((f, i) => {
        const label = imageFiles.length > 1
          ? `===== IMAGEM ${i + 1}: ${f.name} =====`
          : `📎 ${f.name}`;
        sections.push(`${label}\n\n${results[i].trim()}`);
      });
    }

    const combined = sections.join('\n\n---\n\n');
    const MAX = 9500;
    return combined.length > MAX
      ? `${combined.slice(0, MAX)}\n\n[Conteúdo truncado]`
      : combined;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const tooBig = files.find(f => f.size > 20 * 1024 * 1024);
    if (tooBig) {
      toast({
        title: "Arquivo muito grande",
        description: `${tooBig.name} excede 20MB`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validTypes = ['image/', 'application/pdf'];
    const invalid = files.find(f => !validTypes.some(t => f.type.startsWith(t)));
    if (invalid) {
      toast({
        title: "Formato não suportado",
        description: `${invalid.name}: use JPG, PNG, WEBP, HEIC ou PDF`,
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFiles(files);

    // Generate previews for images
    const previews = await Promise.all(
      files.map(async (f) => (f.type.startsWith('image/') ? await fileToDataUrl(f) : ''))
    );
    setFilePreviews(previews);

    if (fileInputRef.current) fileInputRef.current.value = '';

    // Pre-extract immediately so the user can review/edit before sending
    setIsExtracting(true);
    try {
      const text = await extractFromFiles(files);
      setExtractedText(text);
      toast({
        title: "✓ Arquivos processados",
        description: `${files.length} arquivo${files.length > 1 ? 's' : ''} extraído${files.length > 1 ? 's' : ''}.`,
      });
    } catch (err: any) {
      console.error('extract failed', err);
      toast({
        title: "Erro ao extrair",
        description: err?.message || "Tente novamente",
        variant: "destructive",
      });
      setSelectedFiles([]);
      setFilePreviews([]);
      setExtractedText("");
    } finally {
      setIsExtracting(false);
    }
  };

  const removeFile = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
    setExtractedText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    const hasFiles = selectedFiles.length > 0 && extractedText.trim().length > 0;
    if (isLoading || isExtracting) return;
    if (!input.trim() && !hasFiles) {
      const msg = "Mensagem vazia. Digite algum texto ou anexe um arquivo antes de enviar.";
      setValidationAnnouncement("");
      setTimeout(() => setValidationAnnouncement(msg), 50);
      toast({
        title: "Mensagem vazia",
        description: "Digite algo ou anexe um arquivo antes de enviar.",
        variant: "destructive",
      });
      return;
    }
    setValidationAnnouncement("");
    if (cooldownRemaining > 0) {
      window.dispatchEvent(new CustomEvent("demo:cooldown-click"));
      return;
    }

    const userText = input.trim();
    const composed = hasFiles
      ? (userText ? `${userText}\n\n${extractedText}` : extractedText)
      : userText;

    const userMessage: Message = {
      role: "user",
      content: composed,
    };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    removeFile();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("public-examinus", {
        body: {
          messages: [...messages, userMessage],
          usePipeSeparator,
          includeTime,
          onlyAltered,
          clinicalImpression,
          compactMode,
          fingerprint
        }
      });

      if (error) throw error;

      if (data?.cooldown) {
        // Server pediu cooldown — sincroniza relógio local
        const secs = Number(data.cooldownRemaining) || COOLDOWN_SECONDS;
        const until = Date.now() + secs * 1000;
        try { sessionStorage.setItem(COOLDOWN_KEY, String(until)); } catch {}
        setCooldownRemaining(secs);
        setMessages(prev => prev.slice(0, -1)); // remove a mensagem do usuário
        toast({
          title: `Aguarde ${secs}s`,
          description: "Modo gratuito: 30s entre extrações. Crie sua conta para uso instantâneo.",
        });
        return;
      }

      if (data.error || data.limitReached) {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: "🎯 Você usou suas extrações gratuitas!\n\n✨ Crie sua conta grátis agora e continue sem limites — é rápido e sem cartão de crédito.\n\nAlém disso, você desbloqueia os outros 9 assistentes médicos especializados."
        }]);
        window.dispatchEvent(new CustomEvent("demo:limit-reached"));
        return;
      }


      const assistantMessage: Message = {
        role: "assistant",
        content: data.response
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRemainingMessages(data.remainingMessages);
      setUsedCount(data.usedCount || 0);

      // Inicia cooldown de 30s após cada extração bem-sucedida
      startCooldown();

      // Notifica engine de pop-ups
      const newCount = (data.usedCount as number) || 0;
      window.dispatchEvent(
        new CustomEvent("demo:extraction-completed", { detail: { count: newCount } })
      );

      // Última extração: aviso direto
      if (data.remainingMessages === 1) {
        setTimeout(() => {
          toast({
            title: "Última extração gratuita",
            description: "Crie sua conta agora para continuar.",
            action: (
              <Button size="sm" onClick={() => navigate('/auth')} className="ml-2">
                Criar Conta
              </Button>
            ),
          });
        }, 1200);
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
  const LIMIT = 3;
  const isCoolingDown = cooldownRemaining > 0;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Hero Section */}
      {!hasMessages && (
        <div className="text-center space-y-3 md:space-y-4 mb-4 md:mb-6 animate-in fade-in duration-700 slide-in-from-bottom-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[0.7rem] md:text-xs uppercase tracking-[0.18em] font-mono text-primary">Examinus · MedStation AI</span>
          </div>

          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
            Cole os resultados dos exames abaixo e veja a mágica acontecer.
          </p>

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
      <Card className={`shadow-elevated border-border/50 backdrop-blur-xl bg-card/95 transition-all duration-500 ${hasMessages ? 'hover:shadow-medical' : ''}`}>
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
                      <div className="absolute bottom-1.5 md:bottom-2 right-1.5 md:right-2 flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
          {/* SR-only live region for blocked send attempts */}
          <span role="status" aria-live="assertive" className="sr-only">
            {validationAnnouncement}
          </span>
          {/* Files Preview */}
          {(selectedFiles.length > 0 || isExtracting) && (
            <div className="mb-3 space-y-2">
              {isExtracting && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Extraindo texto dos arquivos…</span>
                </div>
              )}
              {selectedFiles.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap bg-muted/50 border border-border rounded-lg p-2">
                  {selectedFiles.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background/60 rounded-md px-2 py-1 max-w-[200px]">
                      {filePreviews[i] ? (
                        <img src={filePreviews[i]} alt={f.name} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <span className="text-xs truncate">{f.name}</span>
                    </div>
                  ))}
                  {selectedFiles.length > 6 && (
                    <span className="text-xs text-muted-foreground">+{selectedFiles.length - 6}</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                    className="h-7 w-7 p-0 ml-auto"
                    title="Remover todos"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Mobile: Clean WhatsApp-style layout */}
          <div className="flex md:hidden flex-col gap-2">
            {/* Formatting options row - scrollable pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              <Toggle
                pressed={usePipeSeparator}
                onPressedChange={setUsePipeSeparator}
                size="sm"
                className="h-7 px-2 text-[11px] rounded-full shrink-0 data-[state=on]:bg-primary/20"
                title="Separar com |"
              >
                <SeparatorVertical className="w-3 h-3 mr-0.5" />
                <span>|</span>
              </Toggle>
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-muted/50 rounded-full h-7 shrink-0">
                <Switch
                  id="include-time-mobile"
                  checked={includeTime}
                  onCheckedChange={setIncludeTime}
                  className="data-[state=checked]:bg-primary scale-[0.65]"
                />
                <Label htmlFor="include-time-mobile" className="text-[10px] cursor-pointer flex items-center gap-0.5 pr-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  Hora
                </Label>
              </div>
              <Toggle
                pressed={onlyAltered}
                onPressedChange={setOnlyAltered}
                size="sm"
                className="h-7 px-2 text-[11px] rounded-full shrink-0 data-[state=on]:bg-amber-500/20 data-[state=on]:text-amber-600 dark:data-[state=on]:text-amber-400"
                title="Apenas alterados"
              >
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                <span>Alterados</span>
              </Toggle>
              <Toggle
                pressed={clinicalImpression}
                onPressedChange={setClinicalImpression}
                size="sm"
                className="h-7 px-2 text-[11px] rounded-full shrink-0 data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400"
                title="Impressão clínica"
              >
                <Stethoscope className="w-3 h-3 mr-0.5" />
                <span>Impressão</span>
              </Toggle>
              <Toggle
                pressed={compactMode}
                onPressedChange={setCompactMode}
                size="sm"
                className="h-7 px-2 text-[11px] rounded-full shrink-0 data-[state=on]:bg-green-500/20 data-[state=on]:text-green-600 dark:data-[state=on]:text-green-400"
                title="Versão compacta: sem índices hematimétricos"
              >
                <Minimize2 className="w-3 h-3 mr-0.5" />
                <span>Compacto</span>
              </Toggle>
            </div>
            {/* Input row */}
            <div className="flex gap-2 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isExtracting}
                className="h-10 w-10 shrink-0 rounded-full hover:bg-primary/10 transition-all"
                title="Upload de imagens ou PDF"
              >
                {isExtracting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Upload className="w-5 h-5 text-primary" />
                )}
              </Button>
              <Textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasMessages ? "Cole exames..." : "Cole exames aqui"}
                maxLength={DEMO_MAX_CHARS}
                aria-invalid={(input.length > 0 && !input.trim() && selectedFiles.length === 0) || input.length >= DEMO_MAX_CHARS}
                className={`min-h-[44px] max-h-32 resize-none flex-1 rounded-2xl text-base py-3 ${
                  (input.length > 0 && !input.trim() && selectedFiles.length === 0) || input.length >= DEMO_MAX_CHARS
                    ? "border-destructive focus:border-destructive"
                    : "border-border/50 focus:border-primary/50"
                }`}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || isExtracting || (!input.trim() && selectedFiles.length === 0) || isCoolingDown || input.length > DEMO_MAX_CHARS}
                size={isCoolingDown ? "sm" : "icon"}
                className={`${isCoolingDown ? "h-10 px-3 text-[11px] rounded-full" : "h-10 w-10 rounded-full"} bg-gradient-primary hover:opacity-90 transition-all shrink-0 shadow-md`}
                title={isCoolingDown ? `Aguarde ${cooldownRemaining}s — modo gratuito` : undefined}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isCoolingDown ? (
                  <span>{cooldownRemaining}s</span>
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1 px-1">
              <span className="text-[10px] text-muted-foreground/80 truncate">
                Demo: até 8.000 caracteres • Plataforma: 30.000
              </span>
              <span
                className={`text-[10px] tabular-nums shrink-0 ${
                  input.length >= DEMO_MAX_CHARS
                    ? "text-destructive font-medium"
                    : input.length >= DEMO_MAX_CHARS * 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {input.length.toLocaleString("pt-BR")}/8.000
              </span>
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
              <Toggle
                pressed={clinicalImpression}
                onPressedChange={setClinicalImpression}
                size="sm"
                className="h-8 px-3 rounded-full data-[state=on]:bg-blue-500/20 data-[state=on]:text-blue-600 dark:data-[state=on]:text-blue-400"
                title="Impressão clínica: análise das alterações laboratoriais"
              >
                <Stethoscope className="w-4 h-4 mr-2" />
                <span className="text-xs">Impressão clínica</span>
              </Toggle>
              <Toggle
                pressed={compactMode}
                onPressedChange={setCompactMode}
                size="sm"
                className="h-8 px-3 rounded-full data-[state=on]:bg-green-500/20 data-[state=on]:text-green-600 dark:data-[state=on]:text-green-400"
                title="Versão compacta: omite índices hematimétricos (VCM, HCM, CHCM, RDW)"
              >
                <Minimize2 className="w-4 h-4 mr-2" />
                <span className="text-xs">Compacto</span>
              </Toggle>
            </div>

            {/* Input Row */}
            <div className="flex gap-3 items-end">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf,.pdf"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isExtracting}
                className="h-12 w-12 shrink-0 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
                title="Upload de imagens ou PDF"
              >
                {isExtracting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Upload className="w-5 h-5 text-primary" />
                )}
              </Button>
              <Textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={hasMessages ? "Cole mais exames aqui..." : "Cole os resultados de exames aqui (texto, imagem ou PDF)"}
                maxLength={DEMO_MAX_CHARS}
                aria-invalid={(input.length > 0 && !input.trim() && selectedFiles.length === 0) || input.length >= DEMO_MAX_CHARS}
                className={`min-h-[48px] max-h-40 resize-none flex-1 rounded-xl transition-colors text-sm py-3 ${
                  (input.length > 0 && !input.trim() && selectedFiles.length === 0) || input.length >= DEMO_MAX_CHARS
                    ? "border-destructive focus:border-destructive"
                    : "border-border/50 focus:border-primary/50"
                }`}
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || isExtracting || (!input.trim() && selectedFiles.length === 0) || isCoolingDown || input.length > DEMO_MAX_CHARS}
                size="lg"
                className="h-12 px-6 rounded-xl bg-gradient-primary hover:opacity-90 transition-all shadow-medical hover:shadow-elevated"
                title={isCoolingDown ? `Aguarde ${cooldownRemaining}s — modo gratuito` : undefined}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : isCoolingDown ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin opacity-60" />
                    Aguarde {cooldownRemaining}s
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-2 mt-1 px-1">
              <span className="text-xs text-muted-foreground/80">
                Modo demonstração: até 8.000 caracteres por mensagem • Usuários da plataforma: até 30.000
              </span>
              <span
                className={`text-xs tabular-nums shrink-0 ${
                  input.length >= DEMO_MAX_CHARS
                    ? "text-destructive font-medium"
                    : input.length >= DEMO_MAX_CHARS * 0.9
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-muted-foreground"
                }`}
                aria-live="polite"
              >
                {input.length.toLocaleString("pt-BR")}/8.000 caracteres
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Aviso de cooldown discreto */}
      {hasMessages && isCoolingDown && (
        <div className="mt-2 mx-2 md:mx-0 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/40 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="relative w-3 h-3">
              <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-primary" />
            </div>
            <span>
              Modo gratuito: aguarde {cooldownRemaining}s para a próxima extração.
            </span>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("demo:open-upgrade"))}
            className="text-primary hover:underline font-medium shrink-0"
          >
            Acelerar agora →
          </button>
        </div>
      )}

      {/* Engine de pop-ups promocionais (toasts/banners/modal rotativos) */}
      <DemoPromoEngine observeTargetId="demo" />
    </div>
  );
}

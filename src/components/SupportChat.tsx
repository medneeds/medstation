import { useState, useRef, useEffect } from "react";

export const SUPPORT_CHAT_EVENT = "open-support-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "Olá! Sou seu assistente de suporte do MedPocket. Como posso ajudar você hoje? Você pode me enviar mensagens de texto ou áudio.",
};

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [lastConversation, setLastConversation] = useState<Message[] | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  // Load last conversation from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("support-last-conversation");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.length > 1) { // Only save if there was actual conversation
          setLastConversation(parsed);
        }
      } catch (e) {
        console.error("Error loading last conversation:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen to global open event (triggered from sidebar)
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener(SUPPORT_CHAT_EVENT, handler);
    return () => window.removeEventListener(SUPPORT_CHAT_EVENT, handler);
  }, []);

  const handleClose = () => {
    // Save current conversation if it has more than just the initial message
    if (messages.length > 1) {
      localStorage.setItem("support-last-conversation", JSON.stringify(messages));
      setLastConversation(messages);
    }
    // Reset to initial state
    setMessages([INITIAL_MESSAGE]);
    setInput("");
    setIsOpen(false);
  };

  const restoreLastConversation = () => {
    if (lastConversation) {
      setMessages(lastConversation);
      setLastConversation(null);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: { message: text },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await processAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];

        if (!base64Audio) {
          throw new Error("Falha ao converter áudio");
        }

        const { data, error } = await supabase.functions.invoke(
          "transcribe-case",
          {
            body: { audio: base64Audio },
          }
        );

        if (error) throw error;

        if (data?.transcription) {
          await sendMessage(data.transcription);
        }
      };
    } catch (error) {
      console.error("Error processing audio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar o áudio.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[380px] h-[600px] shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <span className="font-semibold">Suporte MedPocket</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-primary-foreground/20"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {lastConversation && messages.length === 1 && (
                <div className="flex justify-center mb-4">
                  <Button
                    onClick={restoreLastConversation}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Continuar última conversa
                  </Button>
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {message.content}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t space-y-2">
            {isProcessing && (
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando áudio...
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Digite sua dúvida..."
                className="min-h-[60px] resize-none"
                disabled={isLoading || isRecording || isProcessing}
              />
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading || isRecording || isProcessing}
                  size="icon"
                >
                  <Send className="h-4 w-4" />
                </Button>
                <Button
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isLoading || isProcessing}
                  size="icon"
                  variant={isRecording ? "destructive" : "outline"}
                >
                  {isRecording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}

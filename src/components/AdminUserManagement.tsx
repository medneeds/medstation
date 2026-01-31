import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Mail, Loader2, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido");

export function AdminUserManagement() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    type: "success" | "error";
    message: string;
    userName?: string;
  } | null>(null);

  const handleResetPassword = async () => {
    // Validate email
    const validation = emailSchema.safeParse(email.trim());
    if (!validation.success) {
      setResult({
        type: "error",
        message: "Por favor, insira um email válido.",
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          userEmail: email.trim(),
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        throw new Error(error.message || "Erro ao processar requisição");
      }

      if (data?.error) {
        setResult({
          type: "error",
          message: data.error,
        });
        return;
      }

      setResult({
        type: "success",
        message: data.message || `Email de recuperação enviado para ${email}`,
        userName: data.userName,
      });

      toast({
        title: "Email enviado",
        description: `Link de recuperação enviado para ${email}`,
      });

      // Clear the input after success
      setEmail("");
    } catch (error: any) {
      console.error("Admin reset password error:", error);
      
      // Parse error message from edge function
      let errorMessage = "Erro ao enviar email de recuperação";
      try {
        const errorBody = JSON.parse(error.message);
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch {
        if (error.message) {
          errorMessage = error.message;
        }
      }

      setResult({
        type: "error",
        message: errorMessage,
      });

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading && email.trim()) {
      handleResetPassword();
    }
  };

  return (
    <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-600" />
          Administração de Usuários
          <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-600">
            Admin
          </Badge>
        </CardTitle>
        <CardDescription>
          Gerencie usuários da plataforma e envie emails de recuperação de senha
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email do usuário
          </Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="user-email"
                type="email"
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setResult(null);
                }}
                onKeyDown={handleKeyDown}
                className="pl-9"
                disabled={loading}
              />
            </div>
            <Button
              onClick={handleResetPassword}
              disabled={loading || !email.trim()}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Resetar Senha
                </>
              )}
            </Button>
          </div>
        </div>

        {result && (
          <div
            className={`flex items-start gap-3 p-3 rounded-lg ${
              result.type === "success"
                ? "bg-green-500/10 border border-green-500/30 text-green-700 dark:text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400"
            }`}
          >
            {result.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">{result.message}</p>
              {result.userName && (
                <p className="text-xs opacity-80">Usuário: {result.userName}</p>
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• O usuário receberá um email com link para redefinir a senha</p>
          <p>• O link expira em 1 hora</p>
          <p>• Esta ação é registrada nos logs do sistema</p>
        </div>
      </CardContent>
    </Card>
  );
}

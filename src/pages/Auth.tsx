import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Activity } from "lucide-react";
import { signUpSchema, signInSchema } from "@/lib/validations";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  
  // Sign in states
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  
  // Sign up states
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [gender, setGender] = useState<"M" | "F" | "Outro" | "">("");
  const [crm, setCrm] = useState("");
  const [crmState, setCrmState] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Check if already authenticated
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SignUp button clicked');
    setLoading(true);

    try {
      console.log('Validating signup data...');
      
      // Verificar se as senhas coincidem
      if (signUpPassword !== confirmPassword) {
        toast({
          variant: "destructive",
          title: "Senhas não coincidem",
          description: "Por favor, verifique se as senhas digitadas são iguais.",
        });
        setLoading(false);
        return;
      }

      // Validate input
      const validated = signUpSchema.parse({ 
        email: signUpEmail, 
        password: signUpPassword, 
        fullName 
      });
      console.log('Validation passed, calling Supabase...');

      const redirectUrl = `${window.location.origin}/dashboard`;

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: validated.fullName,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      console.log('Supabase response:', { data, error });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: error.message,
        });
        setLoading(false);
        return;
      }

      // Update profile with additional fields
      if (data.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            gender: gender || null,
            crm: crm || null,
            crm_state: crmState || null,
            specialty: specialty || null,
          })
          .eq("id", data.user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      toast({
        title: "Cadastro realizado!",
        description: "Você já pode fazer login.",
      });
      
      // Limpar formulário
      setFullName("");
      setSignUpEmail("");
      setSignUpPassword("");
      setConfirmPassword("");
      setDateOfBirth("");
      setGender("");
      setCrm("");
      setCrmState("");
      setSpecialty("");
    } catch (error: any) {
      console.error('SignUp error:', error);
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: error.errors?.[0]?.message || error.message || "Por favor, verifique os dados informados",
      });
    } finally {
      setLoading(false);
    }
  };


  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('SignIn button clicked');
    setLoading(true);

    try {
      console.log('Validating signin data...');
      
      // Validate input
      const validated = signInSchema.parse({ 
        email: signInEmail, 
        password: signInPassword 
      });
      console.log('Validation passed, calling Supabase...');

      const { error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      console.log('Supabase login response:', { error });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error.message,
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Login realizado!",
        description: "Redirecionando...",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error('SignIn error:', error);
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: error.errors?.[0]?.message || error.message || "Por favor, verifique os dados informados",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      toast({
        variant: "destructive",
        title: "Email necessário",
        description: "Por favor, digite seu email.",
      });
      return;
    }

    try {
      setResetLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      setResetEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível enviar o email de recuperação.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center relative z-10">
        {/* Left side - Brand presentation */}
        <div className="hidden md:flex flex-col justify-center space-y-8 p-8 animate-in fade-in slide-in-from-left duration-700">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 group cursor-pointer">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                <div className="relative w-16 h-16 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-medical transition-transform group-hover:scale-110 group-hover:rotate-3">
                  <Activity className="w-8 h-8 text-primary-foreground" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                  MedStation AI
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Produza mais.
                </span>
                <br />
                <span className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Digite menos.
                </span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Assistentes médicos especializados em IA para transformar sua prática clínica com eficiência e precisão.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="space-y-3 pt-4">
              {[
                "10 assistentes especializados",
                "Interpretação inteligente de exames",
                "Documentação automatizada",
                "Scores clínicos em segundos"
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="flex items-center gap-3 group/item hover:translate-x-2 transition-transform duration-300"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-primary group-hover/item:scale-150 transition-transform"></div>
                  <span className="text-sm text-muted-foreground group-hover/item:text-foreground transition-colors">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Auth card */}
        <div className="animate-in fade-in slide-in-from-right duration-700">
          <Card className="relative overflow-hidden border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-[0_20px_70px_-15px_rgba(168,85,247,0.3)] group">
            {/* Card glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            
            <CardHeader className="text-center pb-6 relative">
              {/* Mobile logo */}
              <div className="md:hidden flex justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-xl opacity-50"></div>
                  <div className="relative w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-medical">
                    <Activity className="h-7 w-7 text-primary-foreground" />
                  </div>
                </div>
              </div>
              
              <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Boas vindas!
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Entre ou crie sua conta para continuar
              </CardDescription>
            </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-5 mt-6">
                <div className="space-y-2 group/field">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    required
                  />
                </div>
                <div className="space-y-2 group/field">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password" className="text-sm font-medium">Senha</Label>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="link" className="h-auto p-0 text-xs hover:text-primary transition-colors">
                          Esqueci minha senha
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Recuperar Senha</AlertDialogTitle>
                          <AlertDialogDescription>
                            Digite seu email para receber um link de recuperação de senha.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            placeholder="seu@email.com"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handlePasswordReset} disabled={resetLoading}>
                            {resetLoading ? "Enviando..." : "Enviar Link"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={loading}
                  onClick={(e) => {
                    console.log('SignIn Button CLICKED');
                  }}
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-6">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Nome Completo *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Dr. João Silva"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-dob" className="text-sm font-medium">Data de Nascimento</Label>
                  <Input
                    id="signup-dob"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-gender" className="text-sm font-medium">Sexo</Label>
                    <Select value={gender} onValueChange={(value: "M" | "F" | "Outro") => setGender(value)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculino (Dr.)</SelectItem>
                        <SelectItem value="F">Feminino (Dra.)</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-crm" className="text-sm font-medium">CRM</Label>
                    <Input
                      id="signup-crm"
                      type="text"
                      placeholder="123456"
                      value={crm}
                      onChange={(e) => setCrm(e.target.value)}
                      className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="signup-crm-state" className="text-sm font-medium">UF do CRM</Label>
                    <Select value={crmState} onValueChange={setCrmState}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
                          "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"].map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-specialty" className="text-sm font-medium">Especialidade</Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[200px] overflow-y-auto">
                        {["Generalista", "Clínica Geral", "Cardiologia", "Dermatologia", "Endocrinologia", "Gastroenterologia",
                          "Geriatria", "Ginecologia", "Neurologia", "Pediatria", "Psiquiatria", "Outra"].map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Senha *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Mínimo 8 caracteres
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-sm font-medium">Confirmar Senha *</Label>
                  <Input
                    id="signup-confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 transition-all duration-300 focus:ring-2 focus:ring-primary/20 hover:border-primary/50"
                    required
                    minLength={8}
                  />
                  {confirmPassword && signUpPassword !== confirmPassword && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      As senhas não coincidem
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={loading}
                  onClick={(e) => {
                    console.log('SignUp Button CLICKED');
                  }}
                >
                  {loading ? "Cadastrando..." : "Cadastrar"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  * Campos obrigatórios. Dados adicionais podem ser preenchidos posteriormente.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}

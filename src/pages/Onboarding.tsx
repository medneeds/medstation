import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Stethoscope, User } from "lucide-react";
import { LogoMark } from "@/components/LogoMark";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [
  { id: "welcome", title: "Bem-vindo!", icon: Sparkles },
  { id: "profile", title: "Seu Perfil", icon: User },
  { id: "professional", title: "Dados Profissionais", icon: Stethoscope },
  { id: "complete", title: "Pronto!", icon: CheckCircle2 },
];

const SPECIALTIES = [
  "Clínico Geral", "Cardiologia", "Dermatologia", "Endocrinologia", 
  "Gastroenterologia", "Geriatria", "Ginecologia", "Hematologia",
  "Infectologia", "Medicina de Família", "Medicina do Trabalho",
  "Medicina Intensiva", "Nefrologia", "Neurologia", "Oftalmologia",
  "Oncologia", "Ortopedia", "Otorrinolaringologia", "Pediatria",
  "Pneumologia", "Psiquiatria", "Radiologia", "Reumatologia",
  "Urologia", "Outra"
];

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  
  // Profile fields
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState<string>("");
  const [crm, setCrm] = useState("");
  const [crmState, setCrmState] = useState("");
  const [specialty, setSpecialty] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    
    // Load existing profile data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    
    if (profile) {
      setFullName(profile.full_name || "");
      setGender(profile.gender || "");
      setCrm(profile.crm || "");
      setCrmState(profile.crm_state || "");
      setSpecialty(profile.specialty || "");
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName || null,
          gender: gender || null,
          crm: crm || null,
          crm_state: crmState || null,
          specialty: specialty || null,
        })
        .eq("id", user.id);

      if (error) throw error;
      
      handleNext();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = () => {
    toast({
      title: "Configuração completa",
      description: "Você está pronto para usar o MedStation AI.",
    });
    navigate("/dashboard");
  };

  const handleSkip = () => {
    navigate("/dashboard");
  };

  const CurrentIcon = STEPS[currentStep].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Subtle brand glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[28rem] h-[28rem] bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-accent/30 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Passo {currentStep + 1} de {STEPS.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSkip}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Pular configuração
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border ${
                  index === currentStep
                    ? "bg-primary text-primary-foreground border-primary scale-110"
                    : index < currentStep
                    ? "bg-primary/15 text-primary border-primary/40"
                    : "bg-muted text-muted-foreground border-hairline"
                }`}
              >
                {index < currentStep ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>
            );
          })}
        </div>

        <Card className="p-8 border border-hairline bg-card/80 backdrop-blur-sm relative overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {/* Step 0: Welcome */}
              {currentStep === 0 && (
                <div className="text-center space-y-6">
                  <div className="flex justify-center">
                    <LogoMark className="w-16 h-16" />
                  </div>
                  
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight">
                      Bem-vindo ao{" "}
                      <span className="text-primary">MedStation AI</span>
                    </h1>
                    <p className="text-muted-foreground">
                      Vamos configurar sua conta em poucos passos.
                      <br />
                      <span className="text-xs text-muted-foreground/70">Todos os campos são opcionais.</span>
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button 
                      size="lg" 
                      onClick={handleNext}
                      className="shadow-medical hover:shadow-elevated transition-all hover:scale-105"
                    >
                      Começar configuração
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 1: Profile */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <User className="w-12 h-12 mx-auto text-primary mb-3" />
                    <h2 className="text-2xl font-bold">Seu Perfil</h2>
                    <p className="text-muted-foreground mt-1">
                      Como devemos te chamar?
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome completo</Label>
                      <Input
                        placeholder="Dr. João Silva"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Sexo</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Masculino (Dr.)</SelectItem>
                          <SelectItem value="F">Feminino (Dra.)</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button onClick={handleNext} className="flex-1">
                      Continuar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Professional */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="text-center">
                    <Stethoscope className="w-12 h-12 mx-auto text-primary mb-3" />
                    <h2 className="text-2xl font-bold">Dados Profissionais</h2>
                    <p className="text-muted-foreground mt-1">
                      Opcional - ajuda a personalizar sua experiência
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>CRM</Label>
                        <Input
                          placeholder="123456"
                          value={crm}
                          onChange={(e) => setCrm(e.target.value)}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UF do CRM</Label>
                        <Select value={crmState} onValueChange={setCrmState}>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {BRAZILIAN_STATES.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Especialidade</Label>
                      <Select value={specialty} onValueChange={setSpecialty}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Selecione sua especialidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {SPECIALTIES.map(spec => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" onClick={handleBack} className="flex-1">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Voltar
                    </Button>
                    <Button onClick={handleSaveProfile} disabled={loading} className="flex-1">
                      {loading ? "Salvando..." : "Continuar"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Complete */}
              {currentStep === 3 && (
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-pulse"></div>
                      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-12 h-12 text-white" />
                      </div>
                    </div>
                  </motion.div>
                  
                  <div className="space-y-3">
                    <h1 className="text-3xl font-bold text-green-600">
                      Tudo pronto! 🎉
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Sua conta está configurada e pronta para usar.
                    </p>
                  </div>

                  <div className="p-4 bg-muted/50 rounded-xl space-y-2">
                    <p className="text-sm font-medium">O que você pode fazer agora:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Usar o Examinus para interpretar exames</li>
                      <li>• Explorar os 10 assistentes médicos</li>
                      <li>• Gerenciar seus casos e pacientes</li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <Button 
                      size="lg" 
                      onClick={handleComplete}
                      className="shadow-medical hover:shadow-elevated transition-all hover:scale-105 w-full"
                    >
                      Ir para o Dashboard
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}

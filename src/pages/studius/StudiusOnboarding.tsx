import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  GraduationCap, 
  Target, 
  ArrowRight, 
  Check,
  BookOpen,
  Brain,
  Stethoscope,
  Heart,
  Activity,
  Pill
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OnboardingProps {
  onComplete: (data: { specialty: string; goals: string[] }) => void;
}

const specialties = [
  { id: "clinica-medica", name: "Clínica Médica", icon: Stethoscope },
  { id: "cardiologia", name: "Cardiologia", icon: Heart },
  { id: "emergencia", name: "Emergência", icon: Activity },
  { id: "pediatria", name: "Pediatria", icon: GraduationCap },
  { id: "cirurgia", name: "Cirurgia", icon: Pill },
  { id: "neurologia", name: "Neurologia", icon: Brain },
  { id: "outra", name: "Outra especialidade", icon: BookOpen },
];

const studyGoals = [
  "Preparar para residência",
  "Atualização profissional",
  "Revisar conceitos básicos",
  "Aprender temas avançados",
  "Praticar casos clínicos",
  "Memorizar medicações",
];

export default function StudiusOnboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  const handleGoalToggle = (goal: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goal)
        ? prev.filter((g) => g !== goal)
        : [...prev, goal]
    );
  };

  const handleComplete = () => {
    onComplete({
      specialty: selectedSpecialty,
      goals: selectedGoals,
    });
  };

  const canProceed = () => {
    if (step === 1) return selectedSpecialty !== "";
    if (step === 2) return selectedGoals.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-studius-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex p-6 rounded-3xl bg-gradient-to-br from-studius-primary via-studius-secondary to-studius-accent shadow-2xl"
              >
                <Sparkles className="h-16 w-16 text-white" />
              </motion.div>
              
              <div className="space-y-4">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-4xl font-bold bg-gradient-to-r from-studius-primary to-studius-accent bg-clip-text text-transparent"
                >
                  Bem-vindo ao Studius
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-lg text-muted-foreground max-w-md mx-auto"
                >
                  Seu assistente de estudos médicos com inteligência artificial. 
                  Vamos personalizar sua experiência.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-wrap justify-center gap-3"
              >
                <Badge variant="outline" className="border-studius-primary/30 text-studius-primary bg-studius-primary/5 py-1.5 px-3">
                  <BookOpen className="h-3.5 w-3.5 mr-1.5" />
                  Chat IA Médico
                </Badge>
                <Badge variant="outline" className="border-studius-secondary/30 text-studius-secondary bg-studius-secondary/5 py-1.5 px-3">
                  <Brain className="h-3.5 w-3.5 mr-1.5" />
                  Flashcards Inteligentes
                </Badge>
                <Badge variant="outline" className="border-studius-accent/30 text-studius-accent bg-studius-accent/5 py-1.5 px-3">
                  <Target className="h-3.5 w-3.5 mr-1.5" />
                  Quizzes Adaptativos
                </Badge>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <Button
                  size="lg"
                  onClick={() => setStep(1)}
                  className="bg-gradient-to-r from-studius-primary to-studius-secondary hover:opacity-90 transition-opacity text-white px-8 py-6 text-lg rounded-xl shadow-lg"
                >
                  Começar
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 1: Specialty Selection */}
          {step === 1 && (
            <motion.div
              key="specialty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-studius-primary to-studius-secondary mb-4">
                  <GraduationCap className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Qual sua área de interesse?</h2>
                <p className="text-muted-foreground">Vamos adaptar o conteúdo para você</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {specialties.map((specialty) => (
                  <button
                    key={specialty.id}
                    onClick={() => setSelectedSpecialty(specialty.name)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 ${
                      selectedSpecialty === specialty.name
                        ? "border-studius-primary bg-studius-primary/10 shadow-lg"
                        : "border-studius-border bg-card hover:border-studius-primary/50"
                    }`}
                  >
                    <specialty.icon className={`h-6 w-6 ${
                      selectedSpecialty === specialty.name ? "text-studius-primary" : "text-muted-foreground"
                    }`} />
                    <span className={`text-sm font-medium ${
                      selectedSpecialty === specialty.name ? "text-studius-primary" : "text-foreground"
                    }`}>
                      {specialty.name}
                    </span>
                    {selectedSpecialty === specialty.name && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 p-1 rounded-full bg-studius-primary"
                      >
                        <Check className="h-3 w-3 text-white" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  Voltar
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceed()}
                  className="bg-gradient-to-r from-studius-primary to-studius-secondary hover:opacity-90"
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Goals Selection */}
          {step === 2 && (
            <motion.div
              key="goals"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-studius-secondary to-studius-accent mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Quais são seus objetivos?</h2>
                <p className="text-muted-foreground">Selecione um ou mais objetivos</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {studyGoals.map((goal) => (
                  <button
                    key={goal}
                    onClick={() => handleGoalToggle(goal)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      selectedGoals.includes(goal)
                        ? "border-studius-primary bg-studius-primary/10 shadow-lg"
                        : "border-studius-border bg-card hover:border-studius-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        selectedGoals.includes(goal) ? "text-studius-primary" : "text-foreground"
                      }`}>
                        {goal}
                      </span>
                      {selectedGoals.includes(goal) && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="p-1 rounded-full bg-studius-primary"
                        >
                          <Check className="h-3 w-3 text-white" />
                        </motion.div>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed()}
                  className="bg-gradient-to-r from-studius-primary to-studius-secondary hover:opacity-90"
                >
                  Finalizar
                  <Sparkles className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-8 bg-gradient-to-r from-studius-primary to-studius-secondary"
                  : i < step
                  ? "w-2 bg-studius-primary"
                  : "w-2 bg-studius-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

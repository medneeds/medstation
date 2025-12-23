import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flashcard } from "@/hooks/useFlashcards";
import { Button } from "@/components/ui/button";
import { RotateCcw, ThumbsDown, ThumbsUp, Zap, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface FlashcardReviewProps {
  cards: Flashcard[];
  onReview: (id: string, quality: number) => Promise<void>;
  onComplete: () => void;
}

const qualityButtons = [
  { quality: 0, label: "Não lembrei", icon: X, color: "bg-red-500 hover:bg-red-600" },
  { quality: 3, label: "Difícil", icon: ThumbsDown, color: "bg-orange-500 hover:bg-orange-600" },
  { quality: 4, label: "Bom", icon: ThumbsUp, color: "bg-blue-500 hover:bg-blue-600" },
  { quality: 5, label: "Fácil", icon: Zap, color: "bg-green-500 hover:bg-green-600" },
];

export function FlashcardReview({ cards, onReview, onComplete }: FlashcardReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [results, setResults] = useState<{ correct: number; incorrect: number }>({
    correct: 0,
    incorrect: 0,
  });

  const currentCard = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReview = async (quality: number) => {
    if (isReviewing || !currentCard) return;
    
    setIsReviewing(true);
    try {
      await onReview(currentCard.id, quality);
      
      setResults((prev) => ({
        correct: quality >= 3 ? prev.correct + 1 : prev.correct,
        incorrect: quality < 3 ? prev.incorrect + 1 : prev.incorrect,
      }));

      if (currentIndex < cards.length - 1) {
        setIsFlipped(false);
        setTimeout(() => setCurrentIndex((prev) => prev + 1), 200);
      } else {
        onComplete();
      }
    } finally {
      setIsReviewing(false);
    }
  };

  if (!currentCard) {
    return (
      <div className="text-center py-12">
        <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Revisão Completa!</h2>
        <p className="text-muted-foreground mb-4">
          Você revisou {results.correct + results.incorrect} cards
        </p>
        <div className="flex justify-center gap-4 mb-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-500">{results.correct}</p>
            <p className="text-sm text-muted-foreground">Corretos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{results.incorrect}</p>
            <p className="text-sm text-muted-foreground">Para revisar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Card {currentIndex + 1} de {cards.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="perspective-1000 mb-6">
        <motion.div
          className="relative w-full h-64 cursor-pointer"
          onClick={handleFlip}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Front */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2",
              "bg-gradient-to-br from-studius-primary/10 to-studius-secondary/10 border-studius-primary/30",
              "backface-hidden"
            )}
          >
            <p className="text-lg font-medium">{currentCard.front}</p>
            <p className="text-xs text-muted-foreground mt-4">Toque para ver a resposta</p>
          </div>

          {/* Back */}
          <div
            className={cn(
              "absolute inset-0 rounded-2xl p-6 flex flex-col items-center justify-center text-center border-2",
              "bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/30",
              "backface-hidden"
            )}
            style={{ transform: "rotateY(180deg)" }}
          >
            <p className="text-lg">{currentCard.back}</p>
          </div>
        </motion.div>
      </div>

      {/* Flip Button (when not flipped) */}
      <AnimatePresence>
        {!isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-center mb-4"
          >
            <Button variant="outline" onClick={handleFlip} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Mostrar Resposta
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quality Buttons (when flipped) */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <p className="text-center text-sm text-muted-foreground mb-3">
              Como foi sua lembrança?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {qualityButtons.map((btn) => (
                <Button
                  key={btn.quality}
                  onClick={() => handleReview(btn.quality)}
                  disabled={isReviewing}
                  className={cn(
                    "h-12 text-white transition-all",
                    btn.color
                  )}
                >
                  <btn.icon className="h-4 w-4 mr-2" />
                  {btn.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, Plus, Layers, Sparkles, MoreVertical, Trash2, 
  PlayCircle, BookOpen, Loader2
} from "lucide-react";
import StudiusLayout from "@/components/studius/StudiusLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFlashcardDecks, useFlashcards, useAllCardsToReview } from "@/hooks/useFlashcards";
import { FlashcardReview } from "@/components/studius/FlashcardReview";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function StudiusFlashcards() {
  const [searchParams, setSearchParams] = useSearchParams();
  const deckId = searchParams.get("deck");
  const mode = searchParams.get("mode"); // "review" | "create" | null

  const { decks, loading: loadingDecks, createDeck, deleteDeck } = useFlashcardDecks();
  const { flashcards, loading: loadingCards, createFlashcard, deleteFlashcard, reviewFlashcard } = useFlashcards(deckId);
  const { cards: allCardsToReview, refetch: refetchAllCards } = useAllCardsToReview();

  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");

  const [newCardOpen, setNewCardOpen] = useState(false);
  const [newCardFront, setNewCardFront] = useState("");
  const [newCardBack, setNewCardBack] = useState("");

  const [aiGenerateOpen, setAiGenerateOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);

  const [isCreating, setIsCreating] = useState(false);

  const currentDeck = decks.find((d) => d.id === deckId);
  const cardsToReview = flashcards.filter(
    (f) => f.next_review_date <= new Date().toISOString().split("T")[0]
  );

  const handleCreateDeck = async () => {
    if (!newDeckTitle.trim()) return;
    setIsCreating(true);
    try {
      const deck = await createDeck(newDeckTitle, newDeckDescription);
      setNewDeckOpen(false);
      setNewDeckTitle("");
      setNewDeckDescription("");
      setSearchParams({ deck: deck.id });
      toast.success("Baralho criado!");
    } catch (error) {
      toast.error("Erro ao criar baralho");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateCard = async () => {
    if (!newCardFront.trim() || !newCardBack.trim()) return;
    setIsCreating(true);
    try {
      await createFlashcard(newCardFront, newCardBack);
      setNewCardOpen(false);
      setNewCardFront("");
      setNewCardBack("");
      toast.success("Flashcard criado!");
    } catch (error) {
      toast.error("Erro ao criar flashcard");
    } finally {
      setIsCreating(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim() || !deckId) return;
    setAiGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flashcards", {
        body: { topic: aiTopic, count: aiCount },
      });

      if (error) throw error;

      const generatedCards = data.flashcards;
      for (const card of generatedCards) {
        await createFlashcard(card.front, card.back);
      }

      setAiGenerateOpen(false);
      setAiTopic("");
      toast.success(`${generatedCards.length} flashcards gerados!`);
    } catch (error) {
      console.error("Error generating flashcards:", error);
      toast.error("Erro ao gerar flashcards");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleDeleteDeck = async (id: string) => {
    try {
      await deleteDeck(id);
      if (deckId === id) {
        setSearchParams({});
      }
      toast.success("Baralho excluído");
    } catch (error) {
      toast.error("Erro ao excluir baralho");
    }
  };

  const handleReviewComplete = () => {
    setSearchParams({ deck: deckId! });
    refetchAllCards();
    toast.success("Sessão de revisão completa!");
  };

  // Review mode
  if (mode === "review" && deckId && cardsToReview.length > 0) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setSearchParams({ deck: deckId })}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao baralho
          </Button>

          <h1 className="text-2xl font-bold mb-6 text-center">Revisão: {currentDeck?.title}</h1>

          <FlashcardReview
            cards={cardsToReview}
            onReview={reviewFlashcard}
            onComplete={handleReviewComplete}
          />
        </div>
      </div>
    );
  }

  // Deck detail view
  if (deckId && currentDeck) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSearchParams({})}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{currentDeck.title}</h1>
              {currentDeck.description && (
                <p className="text-muted-foreground">{currentDeck.description}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Dialog open={aiGenerateOpen} onOpenChange={setAiGenerateOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Gerar com IA
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Flashcards com IA</DialogTitle>
                  <DialogDescription>
                    Informe o tema e a quantidade de flashcards que deseja gerar
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Tema</label>
                    <Input
                      placeholder="Ex: Farmacologia dos antibióticos"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantidade</label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={aiCount}
                      onChange={(e) => setAiCount(parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleAiGenerate} disabled={aiGenerating || !aiTopic.trim()}>
                    {aiGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Gerar
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={newCardOpen} onOpenChange={setNewCardOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Novo Card
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo Flashcard</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Frente (Pergunta)</label>
                    <Textarea
                      placeholder="Digite a pergunta..."
                      value={newCardFront}
                      onChange={(e) => setNewCardFront(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Verso (Resposta)</label>
                    <Textarea
                      placeholder="Digite a resposta..."
                      value={newCardBack}
                      onChange={(e) => setNewCardBack(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCreateCard} disabled={isCreating || !newCardFront.trim() || !newCardBack.trim()}>
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Review Button */}
        {cardsToReview.length > 0 && (
          <Card className="bg-gradient-to-br from-studius-primary/10 to-studius-secondary/10 border-studius-primary/30">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {cardsToReview.length} cards para revisar
                </h3>
                <p className="text-sm text-muted-foreground">
                  Continue sua sessão de revisão espaçada
                </p>
              </div>
              <Button
                onClick={() => setSearchParams({ deck: deckId, mode: "review" })}
                className="gap-2 bg-studius-primary hover:bg-studius-primary/90"
              >
                <PlayCircle className="h-4 w-4" />
                Revisar Agora
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Flashcards Grid */}
        {loadingCards ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-studius-primary" />
          </div>
        ) : flashcards.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Nenhum flashcard ainda</h3>
            <p className="text-muted-foreground mb-4">
              Crie manualmente ou use a IA para gerar cards
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {flashcards.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group hover:border-studius-primary/50 transition-all">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline" className="text-xs">
                        {card.next_review_date <= new Date().toISOString().split("T")[0]
                          ? "Para revisar"
                          : `Próxima: ${new Date(card.next_review_date).toLocaleDateString("pt-BR")}`}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem
                            onClick={() => deleteFlashcard(card.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Frente</p>
                        <p className="text-sm font-medium line-clamp-2">{card.front}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Verso</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{card.back}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Decks list view
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = "/studius"}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Flashcards</h1>
            <p className="text-muted-foreground">
              Crie e revise flashcards com repetição espaçada
            </p>
          </div>
        </div>

        <Dialog open={newDeckOpen} onOpenChange={setNewDeckOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Baralho
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Baralho</DialogTitle>
              <DialogDescription>
                Crie um baralho para organizar seus flashcards
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Nome do Baralho</label>
                <Input
                  placeholder="Ex: Cardiologia"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Descrição (opcional)</label>
                <Textarea
                  placeholder="Descreva o conteúdo do baralho..."
                  value={newDeckDescription}
                  onChange={(e) => setNewDeckDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateDeck} disabled={isCreating || !newDeckTitle.trim()}>
                {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Baralho"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards to Review Today */}
      {allCardsToReview.length > 0 && (
        <Card className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border-orange-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-orange-500/20">
                <BookOpen className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold">
                  {allCardsToReview.length} cards para revisar hoje
                </h3>
                <p className="text-sm text-muted-foreground">
                  Mantenha seu conhecimento em dia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decks Grid */}
      {loadingDecks ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-studius-primary" />
        </div>
      ) : decks.length === 0 ? (
        <div className="text-center py-12">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold mb-2">Nenhum baralho ainda</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro baralho para começar a estudar
          </p>
          <Button onClick={() => setNewDeckOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Baralho
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck, index) => (
            <motion.div
              key={deck.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="group cursor-pointer hover:border-studius-primary/50 hover:shadow-studius transition-all"
                onClick={() => setSearchParams({ deck: deck.id })}
              >
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="p-2 rounded-lg bg-studius-primary/10">
                      <Layers className="h-5 w-5 text-studius-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDeck(deck.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold mb-1">{deck.title}</h3>
                  {deck.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {deck.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Badge variant="secondary">{deck.card_count} cards</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

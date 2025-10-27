import { useState } from "react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export default function StudyMaterials() {
  const [activeTab, setActiveTab] = useState<"flashcards" | "quizzes">("flashcards");
  const [showGenerator, setShowGenerator] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loggedInUser = useQuery(api.auth.loggedInUser);
  const flashcardSets = useQuery(
    api.study.getFlashcardSets,
    loggedInUser ? { userId: loggedInUser._id } : "skip"
  );
  const quizzes = useQuery(
    api.study.getQuizzes,
    loggedInUser ? { userId: loggedInUser._id } : "skip"
  );
  const subjects = useQuery(api.notes.getSubjects);

  const generateFlashcards = useAction(api.study.generateFlashcards);
  const generateQuiz = useAction(api.study.generateQuiz);

  const handleGenerate = async (data: any) => {
    setIsGenerating(true);
    try {
      if (activeTab === "flashcards") {
        await generateFlashcards(data);
        toast.success("Flashcards genereret!");
      } else {
        await generateQuiz(data);
        toast.success("Quiz genereret!");
      }
      setShowGenerator(false);
    } catch (error: any) {
      toast.error(error.message || "Kunne ikke generere studiemateriale");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!loggedInUser) {
    return <div>Indlæser...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Studiematerialer</h2>
          <p className="text-gray-600">AI-genererede flashcards og quizzer</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          🪄 Generer nyt
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
        {[
          { key: "flashcards", label: "🃏 Flashcards", count: flashcardSets?.length || 0 },
          { key: "quizzes", label: "❓ Quizzer", count: quizzes?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-purple-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Generator Modal */}
      {showGenerator && (
        <GeneratorModal
          type={activeTab}
          subjects={subjects || []}
          onGenerate={handleGenerate}
          onClose={() => setShowGenerator(false)}
          isGenerating={isGenerating}
        />
      )}

      {/* Content */}
      {activeTab === "flashcards" ? (
        <FlashcardsView sets={flashcardSets || []} />
      ) : (
        <QuizzesView quizzes={quizzes || []} />
      )}
    </div>
  );
}

function GeneratorModal({ type, subjects, onGenerate, onClose, isGenerating }: {
  type: "flashcards" | "quizzes";
  subjects: string[];
  onGenerate: (data: any) => void;
  onClose: () => void;
  isGenerating: boolean;
}) {
  const [source, setSource] = useState<"subject" | "note">("subject");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [count, setCount] = useState(type === "flashcards" ? 10 : 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: any = { count };
    
    if (source === "subject") {
      data.subject = selectedSubject;
    } else {
      data.subject = selectedSubject;
    }
    
    onGenerate(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🪄 Generer {type === "flashcards" ? "Flashcards" : "Quiz"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kilde</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="subject">Alle noter i fag</option>
              <option value="note">Specifik note</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {source === "subject" ? "Vælg fag" : "Vælg note"}
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="">Vælg...</option>
              {subjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Antal {type === "flashcards" ? "kort" : "spørgsmål"}
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              min={1}
              max={type === "flashcards" ? 20 : 10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isGenerating || !selectedSubject}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {isGenerating ? "Genererer..." : "Generer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FlashcardsView({ sets }: { sets: any[] }) {
  const [selectedSet, setSelectedSet] = useState<any>(null);

  if (selectedSet) {
    return <FlashcardSession set={selectedSet} onBack={() => setSelectedSet(null)} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {sets.length > 0 ? (
        sets.map((set) => (
          <div key={set._id} className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{set.subject}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {set.cards.length} kort • {new Date(set.createdAt).toLocaleDateString('da-DK')}
            </p>
            <button
              onClick={() => setSelectedSet(set)}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            >
              Start session
            </button>
          </div>
        ))
      ) : (
        <div className="col-span-full text-center py-12">
          <div className="text-6xl mb-4">🃏</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen flashcards endnu</h3>
          <p className="text-gray-600">Generer dine første flashcards fra dine noter</p>
        </div>
      )}
    </div>
  );
}

function FlashcardSession({ set, onBack }: { set: any; onBack: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, total: 0 });

  const recordSession = useMutation(api.study.recordFlashcardSession);

  const currentCard = set.cards[currentIndex];

  const handleResponse = async (response: "again" | "hard" | "good" | "easy") => {
    await recordSession({
      setId: set._id,
      cardIndex: currentIndex,
      response,
    });

    const isCorrect = response === "good" || response === "easy";
    setSessionStats(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Move to next card
    if (currentIndex < set.cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowBack(false);
    } else {
      // Session complete
      toast.success(`Session færdig! ${sessionStats.correct + (isCorrect ? 1 : 0)}/${sessionStats.total + 1} korrekte`);
      onBack();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Tilbage
        </button>
        <div className="text-sm text-gray-600">
          {currentIndex + 1} / {set.cards.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8 min-h-[300px] flex flex-col justify-center">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900 mb-6">
            {showBack ? currentCard.back : currentCard.front}
          </div>
          
          {!showBack ? (
            <button
              onClick={() => setShowBack(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Vis svar
            </button>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">Hvor godt kendte du svaret?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button
                  onClick={() => handleResponse("again")}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Igen
                </button>
                <button
                  onClick={() => handleResponse("hard")}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                >
                  Svært
                </button>
                <button
                  onClick={() => handleResponse("good")}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Godt
                </button>
                <button
                  onClick={() => handleResponse("easy")}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Nemt
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuizzesView({ quizzes }: { quizzes: any[] }) {
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);

  if (selectedQuiz) {
    return <QuizSession quiz={selectedQuiz} onBack={() => setSelectedQuiz(null)} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {quizzes.length > 0 ? (
        quizzes.map((quiz) => (
          <div key={quiz._id} className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="font-semibold text-gray-900 mb-2">{quiz.subject}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {quiz.questions.length} spørgsmål • {new Date(quiz.createdAt).toLocaleDateString('da-DK')}
            </p>
            <button
              onClick={() => setSelectedQuiz(quiz)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Start quiz
            </button>
          </div>
        ))
      ) : (
        <div className="col-span-full text-center py-12">
          <div className="text-6xl mb-4">❓</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ingen quizzer endnu</h3>
          <p className="text-gray-600">Generer din første quiz fra dine noter</p>
        </div>
      )}
    </div>
  );
}

function QuizSession({ quiz, onBack }: { quiz: any; onBack: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(quiz.questions.length).fill(""));
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);

  const recordSession = useMutation(api.study.recordQuizSession);

  const currentQuestion = quiz.questions[currentIndex];

  const handleAnswer = (answer: string) => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      finishQuiz();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const finishQuiz = async () => {
    const sessionAnswers = quiz.questions.map((q: any, index: number) => ({
      questionIndex: index,
      answer: answers[index],
      correct: answers[index].toLowerCase().trim() === q.correct.toLowerCase().trim(),
    }));

    const result = await recordSession({
      quizId: quiz._id,
      answers: sessionAnswers,
    });

    setResults(result);
    setShowResults(true);
  };

  if (showResults && results) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="text-4xl mb-4">
              {results.percentage >= 80 ? "🎉" : results.percentage >= 60 ? "👍" : "📚"}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz færdig!</h2>
            <p className="text-lg text-gray-600">
              Du fik {results.score} ud af {results.total} korrekte ({results.percentage}%)
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {quiz.questions.map((question: any, index: number) => {
              const userAnswer = answers[index];
              const isCorrect = userAnswer.toLowerCase().trim() === question.correct.toLowerCase().trim();
              
              return (
                <div key={index} className={`p-4 rounded-lg border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className="font-medium mb-2">{question.question}</p>
                  <p className="text-sm">
                    <span className="font-medium">Dit svar:</span> {userAnswer || "Ikke besvaret"}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Korrekt svar:</span> {question.correct}
                  </p>
                  {question.explanation && (
                    <p className="text-sm text-gray-600 mt-2">
                      <span className="font-medium">Forklaring:</span> {question.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button
            onClick={onBack}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Tilbage til quizzer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="text-gray-600 hover:text-gray-900"
        >
          ← Tilbage
        </button>
        <div className="text-sm text-gray-600">
          Spørgsmål {currentIndex + 1} / {quiz.questions.length}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <h3 className="text-lg font-medium text-gray-900 mb-6">
          {currentQuestion.question}
        </h3>

        {currentQuestion.type === "multiple_choice" ? (
          <div className="space-y-3 mb-6">
            {currentQuestion.options.map((option: string, index: number) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={answers[currentIndex] === option}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="text-indigo-600"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="mb-6">
            <textarea
              value={answers[currentIndex]}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder="Skriv dit svar her..."
            />
          </div>
        )}

        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Forrige
          </button>
          <button
            onClick={handleNext}
            disabled={!answers[currentIndex]}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {currentIndex === quiz.questions.length - 1 ? "Afslut quiz" : "Næste"}
          </button>
        </div>
      </div>
    </div>
  );
}

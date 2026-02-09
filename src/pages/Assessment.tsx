import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, Brain, Loader2 } from 'lucide-react';

interface Question {
  id: number;
  question: string;
  code?: string;
  options: string[];
  correct: number;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
}

const questions: Question[] = [
  {
    id: 1, difficulty: 'easy', topic: 'JavaScript Basics',
    question: 'What is the output of typeof null?',
    options: ['"null"', '"object"', '"undefined"', '"boolean"'],
    correct: 1,
  },
  {
    id: 2, difficulty: 'easy', topic: 'Arrays',
    question: 'Which method adds an element to the end of an array?',
    options: ['unshift()', 'push()', 'shift()', 'pop()'],
    correct: 1,
  },
  {
    id: 3, difficulty: 'medium', topic: 'Closures',
    question: 'What does the following code log?',
    code: 'for (var i = 0; i < 3; i++) {\n  setTimeout(() => console.log(i), 0);\n}',
    options: ['0, 1, 2', '3, 3, 3', 'undefined x3', 'Error'],
    correct: 1,
  },
  {
    id: 4, difficulty: 'medium', topic: 'Promises',
    question: 'What is the correct way to handle errors in async/await?',
    options: ['try/catch block', '.catch() only', 'if/else', 'Error callback'],
    correct: 0,
  },
  {
    id: 5, difficulty: 'hard', topic: 'Algorithms',
    question: 'What is the time complexity of binary search?',
    options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'],
    correct: 2,
  },
  {
    id: 6, difficulty: 'hard', topic: 'Data Structures',
    question: 'Which data structure uses LIFO ordering?',
    options: ['Queue', 'Stack', 'Linked List', 'Tree'],
    correct: 1,
  },
  {
    id: 7, difficulty: 'hard', topic: 'System Design',
    question: 'What pattern decouples event producers from consumers?',
    options: ['Singleton', 'Observer', 'Factory', 'Pub/Sub'],
    correct: 3,
  },
];

const calculateElo = (correct: number, total: number, difficulties: string[]): number => {
  const base = 800;
  const diffMultiplier = difficulties.reduce((sum, d) => {
    if (d === 'easy') return sum + 1;
    if (d === 'medium') return sum + 2;
    return sum + 3;
  }, 0);
  const accuracy = correct / total;
  return Math.round(base + accuracy * diffMultiplier * 80);
};

const Assessment = () => {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(questions.length).fill(null));
  const [showResult, setShowResult] = useState(false);
  const [submittedAnswer, setSubmittedAnswer] = useState<number | null>(null);
  const [calculating, setCalculating] = useState(false);
  const { completeAssessment } = useUser();
  const navigate = useNavigate();

  const q = questions[currentQ];

  const handleAnswer = (idx: number) => {
    if (submittedAnswer !== null) return;
    setSubmittedAnswer(idx);
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(currentQ + 1);
        setSubmittedAnswer(null);
      } else {
        setCalculating(true);
        const correct = newAnswers.filter((a, i) => a === questions[i].correct).length;
        const elo = calculateElo(correct, questions.length, questions.map(q => q.difficulty));
        setTimeout(() => {
          completeAssessment(elo);
          setShowResult(true);
          setCalculating(false);
        }, 2000);
      }
    }, 1000);
  };

  if (calculating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Calculating Your ELO</h2>
          <p className="text-muted-foreground">Analyzing your performance...</p>
        </motion.div>
      </div>
    );
  }

  if (showResult) {
    const correct = answers.filter((a, i) => a === questions[i].correct).length;
    const elo = calculateElo(correct, questions.length, questions.map(q => q.difficulty));

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card gradient-border p-10 max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 border border-primary/30">
            <Brain className="w-10 h-10 text-primary" />
          </div>
          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Assessment Complete</h2>
          <p className="text-muted-foreground mb-8">Your skill level has been evaluated</p>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-2">Your ELO Rating</p>
            <p className="stat-value text-6xl">{elo}</p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass-card p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Correct</p>
              <p className="text-2xl font-bold text-accent">{correct}/{questions.length}</p>
            </div>
            <div className="glass-card p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Level</p>
              <p className="text-2xl font-bold text-secondary">{Math.floor(elo / 200) + 1}</p>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard')}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
          >
            Enter Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Question {currentQ + 1} of {questions.length}</span>
            <span className={`font-mono text-xs px-2 py-0.5 rounded-full ${
              q.difficulty === 'easy' ? 'bg-accent/20 text-accent' :
              q.difficulty === 'medium' ? 'bg-secondary/20 text-secondary' :
              'bg-destructive/20 text-destructive'
            }`}>
              {q.difficulty.toUpperCase()}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="glass-card gradient-border p-8"
          >
            <span className="text-xs text-primary font-mono tracking-widest">{q.topic}</span>
            <h2 className="font-display text-xl font-bold text-foreground mt-3 mb-4">{q.question}</h2>

            {q.code && (
              <pre className="bg-muted p-4 rounded-lg text-sm font-mono text-foreground mb-6 overflow-x-auto border border-border">
                {q.code}
              </pre>
            )}

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const isSelected = submittedAnswer === idx;
                const isCorrect = idx === q.correct;
                const showFeedback = submittedAnswer !== null;

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={submittedAnswer !== null}
                    className={`w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${
                      showFeedback && isCorrect
                        ? 'border-accent bg-accent/10 text-accent'
                        : showFeedback && isSelected && !isCorrect
                        ? 'border-destructive bg-destructive/10 text-destructive'
                        : 'border-border bg-muted/50 text-foreground hover:border-primary/50 hover:bg-primary/5'
                    }`}
                  >
                    <span className="w-8 h-8 rounded-full border border-current flex items-center justify-center text-sm font-mono shrink-0">
                      {showFeedback && isCorrect ? <CheckCircle2 className="w-5 h-5" /> :
                       showFeedback && isSelected ? <XCircle className="w-5 h-5" /> :
                       String.fromCharCode(65 + idx)}
                    </span>
                    <span className="font-mono text-sm">{opt}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Assessment;

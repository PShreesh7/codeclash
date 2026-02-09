import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, RotateCcw, Lightbulb, Lock, ArrowRight } from 'lucide-react';

interface Topic {
  id: string;
  name: string;
  category: string;
  mastery: number; // 0-100
  status: 'locked' | 'available' | 'in-progress' | 'mastered';
  suggestedByAI: boolean;
}

const mockTopics: Topic[] = [
  { id: '1', name: 'Variables & Types', category: 'Fundamentals', mastery: 100, status: 'mastered', suggestedByAI: false },
  { id: '2', name: 'Functions & Scope', category: 'Fundamentals', mastery: 85, status: 'in-progress', suggestedByAI: false },
  { id: '3', name: 'Closures', category: 'Advanced JS', mastery: 40, status: 'in-progress', suggestedByAI: true },
  { id: '4', name: 'Promises & Async', category: 'Advanced JS', mastery: 20, status: 'available', suggestedByAI: true },
  { id: '5', name: 'Array Methods', category: 'Fundamentals', mastery: 60, status: 'in-progress', suggestedByAI: false },
  { id: '6', name: 'Recursion', category: 'Algorithms', mastery: 0, status: 'available', suggestedByAI: true },
  { id: '7', name: 'Binary Search', category: 'Algorithms', mastery: 0, status: 'locked', suggestedByAI: false },
  { id: '8', name: 'Graph Traversal', category: 'Data Structures', mastery: 0, status: 'locked', suggestedByAI: false },
];

const statusStyles = {
  mastered: 'border-accent/40 bg-accent/5',
  'in-progress': 'border-secondary/40 bg-secondary/5',
  available: 'border-primary/40 bg-primary/5',
  locked: 'border-border/30 bg-muted/20 opacity-60',
};

const Learning = () => {
  const { user } = useUser();
  const [topics] = useState(mockTopics);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  if (!user) return null;

  const weakAreas = topics.filter(t => t.mastery > 0 && t.mastery < 60);
  const suggested = topics.filter(t => t.suggestedByAI);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Learning Mode</h1>
        <p className="text-muted-foreground mt-1">AI-guided skill progression</p>
      </div>

      {/* AI Suggestions banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card gradient-border p-6"
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Lightbulb className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground mb-1">AI Recommendations</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Based on your ELO ({user.elo}) and recent performance, focus on:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggested.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTopic(t)}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weak areas */}
      {weakAreas.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-secondary" />
            Weak Areas — Practice Recommended
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {weakAreas.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTopic(t)}
                className="glass-card-hover p-4 text-left flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-secondary font-bold">{t.mastery}%</p>
                  <div className="w-20 h-1.5 bg-muted rounded-full mt-1">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${t.mastery}%` }} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All topics */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-3">All Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topics.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => t.status !== 'locked' && setSelectedTopic(t)}
              disabled={t.status === 'locked'}
              className={`p-4 rounded-xl border text-left transition-all ${statusStyles[t.status]} ${
                t.status !== 'locked' ? 'hover:scale-[1.02] cursor-pointer' : 'cursor-not-allowed'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-mono text-muted-foreground">{t.category}</span>
                {t.status === 'mastered' && <CheckCircle2 className="w-4 h-4 text-accent" />}
                {t.status === 'locked' && <Lock className="w-4 h-4 text-muted-foreground" />}
                {t.suggestedByAI && t.status !== 'locked' && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">AI Pick</span>
                )}
              </div>
              <p className="font-semibold text-foreground mb-2">{t.name}</p>
              <div className="h-1.5 bg-muted rounded-full">
                <div
                  className={`h-full rounded-full ${
                    t.mastery === 100 ? 'bg-accent' : t.mastery > 0 ? 'bg-secondary' : 'bg-muted'
                  }`}
                  style={{ width: `${t.mastery}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t.mastery}% mastery</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Topic detail modal */}
      {selectedTopic && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-8" onClick={() => setSelectedTopic(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
            className="glass-card gradient-border p-8 max-w-md w-full"
          >
            <span className="text-xs font-mono text-primary tracking-widest">{selectedTopic.category}</span>
            <h2 className="font-display text-2xl font-bold text-foreground mt-2 mb-2">{selectedTopic.name}</h2>
            <p className="text-muted-foreground text-sm mb-6">
              {selectedTopic.mastery === 0
                ? 'Start learning this topic with AI-generated exercises.'
                : `You've mastered ${selectedTopic.mastery}% of this topic. Keep practicing!`}
            </p>

            <div className="h-2 bg-muted rounded-full mb-6">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${selectedTopic.mastery}%` }} />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedTopic(null)}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold text-sm tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
              >
                {selectedTopic.mastery === 0 ? 'Start Learning' : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedTopic(null)}
                className="px-4 py-3 bg-muted text-muted-foreground rounded-lg text-sm hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Learning;

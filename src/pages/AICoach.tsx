import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, AlertTriangle, Lightbulb, CheckCircle2, Code2 } from 'lucide-react';

interface Feedback {
  type: 'mistake' | 'optimization' | 'tip';
  title: string;
  description: string;
}

const mockFeedback: Feedback[] = [
  { type: 'mistake', title: 'Unnecessary nested loop', description: 'The inner loop in your solution creates O(n²) complexity. Consider using a hash map for O(n) lookup.' },
  { type: 'optimization', title: 'Use Array.reduce()', description: 'Instead of a manual for-loop with accumulator, Array.reduce() is more idiomatic and concise.' },
  { type: 'tip', title: 'Edge case handling', description: 'Your solution doesn\'t handle empty arrays. Add an early return guard clause.' },
];

const feedbackIcons = {
  mistake: { icon: AlertTriangle, color: 'text-destructive bg-destructive/10 border-destructive/30' },
  optimization: { icon: Lightbulb, color: 'text-secondary bg-secondary/10 border-secondary/30' },
  tip: { icon: CheckCircle2, color: 'text-accent bg-accent/10 border-accent/30' },
};

const AICoach = () => {
  const [code, setCode] = useState(`function twoSum(nums, target) {\n  for (let i = 0; i < nums.length; i++) {\n    for (let j = i + 1; j < nums.length; j++) {\n      if (nums[i] + nums[j] === target) {\n        return [i, j];\n      }\n    }\n  }\n  return [];\n}`);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setFeedback(mockFeedback);
      setAnalyzing(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">AI Coach</h1>
        <p className="text-muted-foreground mt-1">Get personalized code analysis and improvement tips</p>
      </div>

      {/* Code input */}
      <div className="glass-card gradient-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Code2 className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Submit Your Code</h2>
        </div>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          rows={12}
          className="w-full bg-muted border border-border rounded-lg p-4 text-foreground font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
          placeholder="Paste your code here..."
        />
        <button
          onClick={handleAnalyze}
          disabled={analyzing || !code.trim()}
          className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          {analyzing ? (
            <>
              <Bot className="w-4 h-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Analyze Code
            </>
          )}
        </button>
      </div>

      {/* Feedback */}
      {feedback.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI Analysis Results
          </h2>
          {feedback.map((f, i) => {
            const config = feedbackIcons[f.type];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="glass-card-hover p-5 flex items-start gap-4"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center border shrink-0 ${config.color}`}>
                  <config.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{f.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
                      {f.type}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.description}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
};

export default AICoach;

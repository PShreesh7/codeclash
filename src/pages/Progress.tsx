import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { TrendingUp, BarChart3, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const mockEloHistory = [
  { date: 'Jan 1', elo: 800 },
  { date: 'Jan 8', elo: 850 },
  { date: 'Jan 15', elo: 920 },
  { date: 'Jan 22', elo: 880 },
  { date: 'Jan 29', elo: 1050 },
  { date: 'Feb 5', elo: 1100 },
  { date: 'Feb 12', elo: 1180 },
  { date: 'Feb 19', elo: 1250 },
];

const mockConceptProgress = [
  { concept: 'Arrays', mastery: 90 },
  { concept: 'Closures', mastery: 40 },
  { concept: 'Promises', mastery: 65 },
  { concept: 'Recursion', mastery: 30 },
  { concept: 'Trees', mastery: 55 },
  { concept: 'Graphs', mastery: 20 },
  { concept: 'DP', mastery: 10 },
];

const Progress = () => {
  const { user } = useUser();
  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">My Progress</h1>
        <p className="text-muted-foreground mt-1">Track your skill evolution over time</p>
      </div>

      {/* ELO Graph */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card gradient-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h2 className="font-display text-lg font-semibold text-foreground">ELO Rating History</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockEloHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis dataKey="date" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(222 41% 10%)',
                  border: '1px solid hsl(222 30% 18%)',
                  borderRadius: '8px',
                  color: 'hsl(210 40% 92%)',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
              />
              <Line type="monotone" dataKey="elo" stroke="hsl(187 100% 50%)" strokeWidth={2} dot={{ fill: 'hsl(187 100% 50%)', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Concept Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card gradient-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-secondary" />
          <h2 className="font-display text-lg font-semibold text-foreground">Concept Mastery</h2>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mockConceptProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
              <XAxis dataKey="concept" stroke="hsl(215 20% 55%)" fontSize={12} />
              <YAxis stroke="hsl(215 20% 55%)" fontSize={12} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(222 41% 10%)',
                  border: '1px solid hsl(222 30% 18%)',
                  borderRadius: '8px',
                  color: 'hsl(210 40% 92%)',
                  fontFamily: 'JetBrains Mono',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="mastery" fill="hsl(32 95% 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Topic breakdown */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-accent" />
          Detailed Breakdown
        </h2>
        <div className="space-y-3">
          {mockConceptProgress.map((c, i) => (
            <motion.div
              key={c.concept}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-4 flex items-center gap-4"
            >
              <p className="w-24 text-sm font-semibold text-foreground">{c.concept}</p>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${c.mastery}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={`h-full rounded-full ${
                    c.mastery >= 80 ? 'bg-accent' : c.mastery >= 50 ? 'bg-secondary' : 'bg-primary'
                  }`}
                />
              </div>
              <span className="text-sm font-mono text-muted-foreground w-12 text-right">{c.mastery}%</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Progress;

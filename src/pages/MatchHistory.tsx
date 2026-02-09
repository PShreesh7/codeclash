import { motion } from 'framer-motion';
import { Swords, Trophy, Clock, ChevronRight } from 'lucide-react';

interface Match {
  id: string;
  opponent: string;
  opponentElo: number;
  result: 'win' | 'loss' | 'draw';
  eloDelta: number;
  topic: string;
  duration: string;
  date: string;
}

const mockMatches: Match[] = [
  { id: '1', opponent: 'ByteStorm', opponentElo: 1320, result: 'win', eloDelta: 25, topic: 'Array Manipulation', duration: '8:42', date: '2026-02-08' },
  { id: '2', opponent: 'AlgoQueen', opponentElo: 1450, result: 'loss', eloDelta: -18, topic: 'Dynamic Programming', duration: '12:15', date: '2026-02-07' },
  { id: '3', opponent: 'NeonCoder', opponentElo: 1180, result: 'win', eloDelta: 15, topic: 'String Processing', duration: '6:30', date: '2026-02-06' },
  { id: '4', opponent: 'StackHero', opponentElo: 1290, result: 'win', eloDelta: 22, topic: 'Binary Search', duration: '9:55', date: '2026-02-05' },
  { id: '5', opponent: 'CodeNinja', opponentElo: 1500, result: 'loss', eloDelta: -12, topic: 'Graph Traversal', duration: '15:00', date: '2026-02-04' },
  { id: '6', opponent: 'DevWizard', opponentElo: 1250, result: 'draw', eloDelta: 0, topic: 'Recursion', duration: '10:00', date: '2026-02-03' },
];

const resultStyles = {
  win: 'text-accent bg-accent/10 border-accent/30',
  loss: 'text-destructive bg-destructive/10 border-destructive/30',
  draw: 'text-muted-foreground bg-muted border-border',
};

const MatchHistory = () => (
  <div className="space-y-8">
    <div>
      <h1 className="font-display text-3xl font-bold text-foreground">Match History</h1>
      <p className="text-muted-foreground mt-1">Review your past battles and results</p>
    </div>

    {/* Summary */}
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total Matches', value: mockMatches.length, color: 'text-primary' },
        { label: 'Wins', value: mockMatches.filter(m => m.result === 'win').length, color: 'text-accent' },
        { label: 'Net ELO', value: `+${mockMatches.reduce((s, m) => s + m.eloDelta, 0)}`, color: 'text-secondary' },
      ].map(s => (
        <div key={s.label} className="glass-card p-4 text-center">
          <p className="text-sm text-muted-foreground">{s.label}</p>
          <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>

    {/* Match list */}
    <div className="space-y-3">
      {mockMatches.map((m, i) => (
        <motion.div
          key={m.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card-hover p-5 flex items-center gap-4 cursor-pointer"
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${resultStyles[m.result]}`}>
            {m.result === 'win' ? <Trophy className="w-5 h-5" /> : <Swords className="w-5 h-5" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground">{m.opponent}</p>
              <span className="text-xs font-mono text-muted-foreground">({m.opponentElo})</span>
            </div>
            <p className="text-xs text-muted-foreground">{m.topic}</p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {m.duration}
          </div>

          <div className="text-right min-w-[60px]">
            <p className={`text-sm font-mono font-bold ${
              m.eloDelta > 0 ? 'text-accent' : m.eloDelta < 0 ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {m.eloDelta > 0 ? '+' : ''}{m.eloDelta}
            </p>
            <p className={`text-xs font-semibold uppercase ${
              m.result === 'win' ? 'text-accent' : m.result === 'loss' ? 'text-destructive' : 'text-muted-foreground'
            }`}>
              {m.result}
            </p>
          </div>

          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      ))}
    </div>
  </div>
);

export default MatchHistory;

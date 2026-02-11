import { useUser } from '@/contexts/UserContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import StatCard from '@/components/StatCard';
import { Trophy, Swords, BookOpen, TrendingUp, Target, Flame, Bot, Coins } from 'lucide-react';

const modeCards = [
  {
    title: 'Learning Mode',
    desc: 'AI-guided skill progression with adaptive topics',
    icon: BookOpen,
    path: '/learning',
    color: 'from-primary/20 to-glow-purple/10',
    borderColor: 'border-primary/30',
  },
  {
    title: 'Battle Mode',
    desc: 'Real-time coding battles with matchmaking',
    icon: Swords,
    path: '/battle',
    color: 'from-secondary/20 to-destructive/10',
    borderColor: 'border-secondary/30',
  },
  {
    title: 'AI Coach',
    desc: 'Get personalized code reviews and tips',
    icon: Bot,
    path: '/ai-coach',
    color: 'from-accent/20 to-primary/10',
    borderColor: 'border-accent/30',
  },
  {
    title: 'Token Shop',
    desc: 'Spend CC Tokens to unlock courses & expert content',
    icon: Coins,
    path: '/token-shop',
    color: 'from-glow-purple/20 to-secondary/10',
    borderColor: 'border-glow-purple/30',
  },
];

const Dashboard = () => {
  const { user } = useUser();
  if (!user) return null;

  return (
    <div className="space-y-8">
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl font-bold text-foreground"
        >
          Welcome, <span className="text-primary glow-text">{user.username}</span>
        </motion.h1>
        <p className="text-muted-foreground mt-1">Ready to level up your skills?</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="ELO Rating" value={user.elo} icon={Trophy} color="secondary" subtitle={`Level ${user.level}`} />
        <StatCard label="Total Battles" value={user.totalBattles} icon={Swords} color="primary" />
        <StatCard label="Win Rate" value={user.totalBattles > 0 ? `${Math.round((user.wins / user.totalBattles) * 100)}%` : 'N/A'} icon={Target} color="accent" />
        <StatCard label="Win Streak" value={user.streak} icon={Flame} color="purple" />
      </div>

      {/* Mode Selection */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Choose Your Path</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modeCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to={card.path}
                className={`block p-6 rounded-xl border bg-gradient-to-br ${card.color} ${card.borderColor} hover:scale-[1.02] transition-all duration-300 group`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-card/80 flex items-center justify-center border border-border/50">
                    <card.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/progress" className="glass-card-hover p-5 flex items-center gap-4">
          <TrendingUp className="w-6 h-6 text-primary" />
          <div>
            <h3 className="font-semibold text-foreground">My Progress</h3>
            <p className="text-sm text-muted-foreground">ELO graph & concept mastery</p>
          </div>
        </Link>
        <Link to="/history" className="glass-card-hover p-5 flex items-center gap-4">
          <Swords className="w-6 h-6 text-secondary" />
          <div>
            <h3 className="font-semibold text-foreground">Match History</h3>
            <p className="text-sm text-muted-foreground">Review past battles & replays</p>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;

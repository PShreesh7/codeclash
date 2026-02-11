import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { Coins, BookOpen, Brain, BarChart3, Cpu, Sparkles, Lock, CheckCircle, GraduationCap, Zap } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Course {
  id: string;
  name: string;
  description: string;
  icon: any;
  cost: number;
  category: 'course' | 'expert';
  unlocked: boolean;
}

const courses: Course[] = [
  { id: '1', name: 'Data Analyst Path', description: 'Master data cleaning, visualization & SQL queries', icon: BarChart3, cost: 500, category: 'course', unlocked: false },
  { id: '2', name: 'Spring Boot Mastery', description: 'Build production-grade Java microservices', icon: Cpu, cost: 750, category: 'course', unlocked: false },
  { id: '3', name: 'Machine Learning', description: 'Neural networks, NLP & computer vision fundamentals', icon: Brain, cost: 1000, category: 'course', unlocked: false },
  { id: '4', name: 'System Design', description: 'Scalable architecture & distributed systems', icon: Sparkles, cost: 800, category: 'course', unlocked: false },
  { id: '5', name: 'Expert DSA Questions', description: 'Unlock hard & expert level algorithm challenges', icon: Zap, cost: 300, category: 'expert', unlocked: false },
  { id: '6', name: 'Expert SQL Questions', description: 'Advanced window functions, CTEs & optimization', icon: GraduationCap, cost: 250, category: 'expert', unlocked: false },
];

const TokenShop = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);

  if (!user) return null;

  const tokenBalance = user.xp;

  const handleUnlock = (course: Course) => {
    if (unlockedIds.includes(course.id)) return;
    if (tokenBalance < course.cost) {
      toast({ title: 'Not enough tokens', description: `You need ${course.cost - tokenBalance} more CC Tokens.`, variant: 'destructive' });
      return;
    }
    // In a real implementation, deduct tokens via backend
    setUnlockedIds(prev => [...prev, course.id]);
    toast({ title: 'Unlocked!', description: `${course.name} is now available.` });
  };

  const isUnlocked = (id: string) => unlockedIds.includes(id);

  const expertItems = courses.filter(c => c.category === 'expert');
  const courseItems = courses.filter(c => c.category === 'course');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Token Shop</h1>
        <p className="text-muted-foreground mt-1">Spend CC Tokens to unlock courses & expert content</p>
      </div>

      {/* Token balance */}
      <div className="glass-card gradient-border p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20">
          <Coins className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Your CC Token Balance</p>
          <p className="stat-value text-4xl">{tokenBalance}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Earn tokens by</p>
          <p className="text-sm text-accent font-medium">Winning battles & completing lessons</p>
        </div>
      </div>

      {/* Expert content */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-secondary" />
          Expert Content
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {expertItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-xl border transition-all ${
                isUnlocked(item.id)
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-border/50 bg-card/40 hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                  <item.icon className="w-6 h-6 text-secondary" />
                </div>
                {isUnlocked(item.id) ? (
                  <span className="flex items-center gap-1 text-xs text-accent font-mono">
                    <CheckCircle className="w-3.5 h-3.5" /> Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-primary font-mono">
                    <Coins className="w-3.5 h-3.5" /> {item.cost} CC
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm">{item.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              {!isUnlocked(item.id) && (
                <button
                  onClick={() => handleUnlock(item)}
                  className="mt-4 w-full py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Unlock for {item.cost} CC
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Courses */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Premium Courses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courseItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-xl border transition-all ${
                isUnlocked(item.id)
                  ? 'border-accent/40 bg-accent/5'
                  : 'border-border/50 bg-card/40 hover:border-primary/30'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                {isUnlocked(item.id) ? (
                  <span className="flex items-center gap-1 text-xs text-accent font-mono">
                    <CheckCircle className="w-3.5 h-3.5" /> Unlocked
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-primary font-mono">
                    <Coins className="w-3.5 h-3.5" /> {item.cost} CC
                  </span>
                )}
              </div>
              <h3 className="font-display font-semibold text-foreground text-sm">{item.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
              {!isUnlocked(item.id) && (
                <button
                  onClick={() => handleUnlock(item)}
                  className="mt-4 w-full py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Unlock for {item.cost} CC
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenShop;

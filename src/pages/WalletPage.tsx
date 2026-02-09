import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, Award, Trophy, Coins, Shield, Zap, Star, Crown, Target } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: any;
  earned: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const badges: Badge[] = [
  { id: '1', name: 'First Blood', description: 'Win your first battle', icon: Zap, earned: true, rarity: 'common' },
  { id: '2', name: 'Rising Star', description: 'Reach ELO 1000', icon: Star, earned: true, rarity: 'common' },
  { id: '3', name: 'Streak Master', description: '5 wins in a row', icon: Trophy, earned: true, rarity: 'rare' },
  { id: '4', name: 'Algorithm King', description: 'Master all algorithm topics', icon: Crown, earned: false, rarity: 'epic' },
  { id: '5', name: 'Unbeatable', description: '10 wins in a row', icon: Shield, earned: false, rarity: 'legendary' },
  { id: '6', name: 'Sharpshooter', description: '100% accuracy in assessment', icon: Target, earned: false, rarity: 'epic' },
];

const rarityStyles = {
  common: 'border-muted-foreground/30 bg-muted/20',
  rare: 'border-primary/40 bg-primary/10',
  epic: 'border-glow-purple/40 bg-glow-purple/10',
  legendary: 'border-secondary/40 bg-secondary/10',
};

const rarityText = {
  common: 'text-muted-foreground',
  rare: 'text-primary',
  epic: 'text-glow-purple',
  legendary: 'text-secondary',
};

const WalletPage = () => {
  const { user } = useUser();
  if (!user) return null;

  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Web3 Wallet</h1>
        <p className="text-muted-foreground mt-1">Your badges, achievements, and prizes</p>
      </div>

      {/* Wallet overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card gradient-border p-6 text-center">
          <WalletIcon className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Wallet Balance</p>
          <p className="stat-value text-3xl">2,450 XP</p>
        </div>
        <div className="glass-card p-6 text-center">
          <Award className="w-8 h-8 text-secondary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Badges Earned</p>
          <p className="text-3xl font-bold font-display text-secondary">{earnedCount}/{badges.length}</p>
        </div>
        <div className="glass-card p-6 text-center">
          <Coins className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Prize Pool</p>
          <p className="text-3xl font-bold font-display text-accent">0.05 ETH</p>
        </div>
      </div>

      {/* Badges grid */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Achievement NFTs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-5 rounded-xl border transition-all ${rarityStyles[badge.rarity]} ${
                badge.earned ? 'opacity-100' : 'opacity-40 grayscale'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${rarityStyles[badge.rarity]}`}>
                  <badge.icon className={`w-6 h-6 ${rarityText[badge.rarity]}`} />
                </div>
                <span className={`text-xs font-mono uppercase tracking-widest ${rarityText[badge.rarity]}`}>
                  {badge.rarity}
                </span>
              </div>
              <h3 className="font-display font-semibold text-foreground">{badge.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
              {badge.earned && (
                <p className="text-xs text-accent mt-3 font-mono">✓ Earned</p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;

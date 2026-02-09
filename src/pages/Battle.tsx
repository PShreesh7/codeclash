import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { Search, Users, Plus, Trophy, Eye, Swords, Loader2, CheckCircle2 } from 'lucide-react';

type Tab = 'find' | 'invite' | 'custom' | 'tournament' | 'spectate';

const tabs: { id: Tab; label: string; icon: any }[] = [
  { id: 'find', label: 'Find Match', icon: Search },
  { id: 'invite', label: 'Invite Friend', icon: Users },
  { id: 'custom', label: 'Custom Room', icon: Plus },
  { id: 'tournament', label: 'Tournaments', icon: Trophy },
  { id: 'spectate', label: 'Spectate', icon: Eye },
];

const mockTournaments = [
  { id: 1, name: 'Weekly Sprint #42', players: 128, status: 'Open', prize: '500 XP', startIn: '2h 30m' },
  { id: 2, name: 'Algorithm Masters', players: 64, status: 'Open', prize: '1000 XP', startIn: '1d 5h' },
  { id: 3, name: 'Frontend Fury', players: 32, status: 'Full', prize: '750 XP', startIn: '45m' },
];

const mockLiveMatches = [
  { id: 1, p1: 'NeonCoder', p2: 'ByteStorm', elo1: 1450, elo2: 1520, topic: 'Dynamic Programming', viewers: 23 },
  { id: 2, p1: 'AlgoQueen', p2: 'StackOverflow', elo1: 1800, elo2: 1750, topic: 'System Design', viewers: 45 },
];

const Battle = () => {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('find');
  const [searching, setSearching] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [roomName, setRoomName] = useState('');

  if (!user) return null;

  const handleFindMatch = () => {
    setSearching(true);
    setTimeout(() => setSearching(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Battle Mode</h1>
        <p className="text-muted-foreground mt-1">Challenge opponents in real-time coding duels</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {activeTab === 'find' && (
          <div className="glass-card gradient-border p-8 text-center max-w-lg mx-auto">
            <Swords className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-bold text-foreground mb-2">Quick Match</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Find an opponent near your ELO rating ({user.elo})
            </p>
            {searching ? (
              <div className="space-y-4">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-sm text-primary font-mono animate-pulse-glow">Searching for opponent...</p>
                <button onClick={() => setSearching(false)} className="text-sm text-muted-foreground hover:text-foreground">
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleFindMatch}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all"
              >
                Find Match
              </button>
            )}
          </div>
        )}

        {activeTab === 'invite' && (
          <div className="glass-card gradient-border p-8 max-w-lg mx-auto">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Invite a Friend</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Friend's Code</label>
                <input
                  value={friendCode}
                  onChange={e => setFriendCode(e.target.value)}
                  placeholder="Enter friend code..."
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="glass-card p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Your Code</p>
                <p className="font-mono text-lg text-primary font-bold">{user.username.toUpperCase()}-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
              </div>
              <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all">
                Send Invite
              </button>
            </div>
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="glass-card gradient-border p-8 max-w-lg mx-auto">
            <h2 className="font-display text-xl font-bold text-foreground mb-4">Create Custom Room</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Room Name</label>
                <input
                  value={roomName}
                  onChange={e => setRoomName(e.target.value)}
                  placeholder="My Battle Room"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Difficulty</label>
                <div className="flex gap-2">
                  {['Easy', 'Medium', 'Hard'].map(d => (
                    <button key={d} className="flex-1 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all">
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all">
                Create Room
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tournament' && (
          <div className="space-y-4">
            {mockTournaments.map(t => (
              <div key={t.id} className="glass-card-hover p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{t.name}</h3>
                    <p className="text-xs text-muted-foreground">{t.players} players · {t.prize} · Starts in {t.startIn}</p>
                  </div>
                </div>
                <button
                  disabled={t.status === 'Full'}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    t.status === 'Full'
                      ? 'bg-muted text-muted-foreground cursor-not-allowed'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                  }`}
                >
                  {t.status === 'Full' ? 'Full' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'spectate' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Live matches you can watch:</p>
            {mockLiveMatches.map(m => (
              <div key={m.id} className="glass-card-hover p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                    <span className="text-xs font-mono text-destructive">LIVE</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    {m.viewers}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{m.p1}</p>
                    <p className="text-xs text-primary font-mono">{m.elo1}</p>
                  </div>
                  <div className="px-4">
                    <Swords className="w-6 h-6 text-secondary" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">{m.p2}</p>
                    <p className="text-xs text-primary font-mono">{m.elo2}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">{m.topic}</p>
                <button className="w-full mt-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-primary/10 hover:text-primary transition-all">
                  Watch
                </button>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Battle;

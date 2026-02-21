import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Plus, Trophy, Eye, Swords, Loader2,
  CheckCircle2, XCircle, ArrowRight, Timer, Zap, Shield, Brain,
  Copy, Check, Lock, X, Wifi
} from 'lucide-react';
import { toast } from 'sonner';

type Tab = 'find' | 'invite' | 'custom' | 'tournament' | 'spectate';
type BattlePhase = 'idle' | 'searching' | 'found' | 'battle' | 'result';
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface BattleQuestion {
  question: string;
  code?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options: string[];
  correctIndex: number;
}

interface Opponent {
  username: string;
  elo: number;
}

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

const QUESTION_TIME_LIMIT = 30;

const Battle = () => {
  const { user, updateElo } = useUser();

  // ── Tab & form state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('find');
  const [friendCode, setFriendCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDiff, setRoomDiff] = useState<Difficulty>('Medium');
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinedTournaments, setJoinedTournaments] = useState<number[]>([]);

  // In-page panel states
  const [invitePending, setInvitePending] = useState<string | null>(null);   // friend code we sent to
  const [createdRoom, setCreatedRoom] = useState<{ name: string; diff: Difficulty; code: string } | null>(null);
  const [spectatingMatch, setSpectatingMatch] = useState<typeof mockLiveMatches[0] | null>(null);

  // Stable friend code — generated once per mount
  const myFriendCode = useMemo(
    () => `${user?.username?.toUpperCase() ?? 'USER'}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    [user?.username]
  );

  // ── Battle state ────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<BattlePhase>('idle');
  const [questions, setQuestions] = useState<BattleQuestion[]>([]);
  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [difficulty, setDifficulty] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [submittedAnswer, setSubmittedAnswer] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [score, setScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [eloDelta, setEloDelta] = useState(0);
  const [battleStartTime, setBattleStartTime] = useState(0);

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || submittedAnswer !== null) return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft, submittedAnswer]);

  // ── Find Match ──────────────────────────────────────────────────────────────
  const handleFindMatch = useCallback(async () => {
    setPhase('searching');
    try {
      const { data, error } = await supabase.functions.invoke('battle-questions', {
        body: { elo: user?.elo || 0, questionCount: 5 },
      });
      if (error) throw new Error(error.message || 'Failed to fetch questions');
      if (data?.error) throw new Error(data.error);

      setQuestions(data.questions);
      setOpponent(data.opponent);
      setDifficulty(data.difficulty);
      setAnswers(Array(data.questions.length).fill(null));

      await new Promise(r => setTimeout(r, 2000));
      setPhase('found');

      setTimeout(() => {
        setPhase('battle');
        setCurrentQ(0);
        setScore(0);
        setOpponentScore(0);
        setTimeLeft(QUESTION_TIME_LIMIT);
        setSubmittedAnswer(null);
        setBattleStartTime(Date.now());
      }, 3000);
    } catch (err: any) {
      console.error('Battle error:', err);
      toast.error(err.message || 'Failed to start battle');
      setPhase('idle');
    }
  }, [user?.elo]);

  // ── Answer handling ─────────────────────────────────────────────────────────
  const handleAnswer = useCallback((idx: number) => {
    if (submittedAnswer !== null || phase !== 'battle') return;
    setSubmittedAnswer(idx);

    const isCorrect = idx === questions[currentQ]?.correctIndex;
    const newAnswers = [...answers];
    newAnswers[currentQ] = idx;
    setAnswers(newAnswers);

    if (isCorrect) {
      const points = 100 + Math.max(0, timeLeft) * 3;
      setScore(prev => prev + points);
    }

    const opponentCorrectChance = opponent ? Math.min(0.8, opponent.elo / 2500) : 0.5;
    if (Math.random() < opponentCorrectChance) {
      setOpponentScore(prev => prev + 100 + Math.floor(Math.random() * 20) * 3);
    }

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(prev => prev + 1);
        setSubmittedAnswer(null);
        setTimeLeft(QUESTION_TIME_LIMIT);
      } else {
        finishBattle(newAnswers);
      }
    }, 1500);
  }, [submittedAnswer, phase, currentQ, questions, answers, timeLeft, opponent]);

  const finishBattle = async (finalAnswers: (number | null)[]) => {
    const correct = finalAnswers.filter((a, i) => a === questions[i]?.correctIndex).length;
    const myFinalScore = score + (correct === questions.length ? 200 : 0);
    const oppFinalScore = opponentScore;
    const won = myFinalScore > oppFinalScore;
    const draw = myFinalScore === oppFinalScore;

    const K = 32;
    const expectedScore = 1 / (1 + Math.pow(10, ((opponent?.elo || (user?.elo ?? 0)) - (user?.elo ?? 0)) / 400));
    const actualScore = won ? 1 : draw ? 0.5 : 0;
    const delta = Math.round(K * (actualScore - expectedScore));

    setEloDelta(delta);
    setPhase('result');
    try { await updateElo(delta); } catch (err) { console.error('Failed to update ELO:', err); }
  };

  const resetBattle = () => {
    setPhase('idle');
    setQuestions([]);
    setOpponent(null);
    setCurrentQ(0);
    setAnswers([]);
    setSubmittedAnswer(null);
    setScore(0);
    setOpponentScore(0);
    setEloDelta(0);
    setTimeLeft(QUESTION_TIME_LIMIT);
  };

  // ── Invite Friend handlers ───────────────────────────────────────────────────
  const handleCopyCode = () => {
    navigator.clipboard.writeText(myFriendCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleSendInvite = () => {
    if (!friendCode.trim()) {
      toast.error('Please enter a friend code first.');
      return;
    }
    setInvitePending(friendCode.trim());
    setFriendCode('');
  };

  const handleCancelInvite = () => {
    setInvitePending(null);
    toast('Invite cancelled.');
  };

  // ── Custom Room handlers ─────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast.error('Please enter a room name.');
      return;
    }
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    setCreatedRoom({ name: roomName.trim(), diff: roomDiff, code: roomCode });
    setRoomName('');
  };

  const handleCloseRoom = () => {
    setCreatedRoom(null);
    toast('Room closed.');
  };

  // ── Tournament handlers ──────────────────────────────────────────────────────
  const handleJoinTournament = (id: number, name: string) => {
    setJoinedTournaments(prev => [...prev, id]);
    toast.success(`You've joined "${name}"!`);
  };

  const handleLeaveTournament = (id: number, name: string) => {
    setJoinedTournaments(prev => prev.filter(t => t !== id));
    toast(`Left "${name}".`);
  };

  // ── Spectate handlers ────────────────────────────────────────────────────────
  const handleWatch = (match: typeof mockLiveMatches[0]) => {
    setSpectatingMatch(match);
  };

  const handleStopSpectating = () => {
    setSpectatingMatch(null);
  };

  if (!user) return null;

  // ─── BATTLE PHASES ──────────────────────────────────────────────────────────
  if (phase === 'searching') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card gradient-border p-10 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Finding Opponent</h2>
          <p className="text-muted-foreground text-sm mb-4">Matching you with a player near ELO {user.elo}…</p>
          <p className="text-xs text-muted-foreground font-mono animate-pulse">Generating AI questions for your skill level…</p>
          <button onClick={resetBattle} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
            Cancel
          </button>
        </motion.div>
      </div>
    );
  }

  if (phase === 'found' && opponent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card gradient-border p-10 text-center max-w-lg w-full">
          <h2 className="font-display text-xl font-bold text-foreground mb-8">Opponent Found!</h2>
          <div className="flex items-center justify-center gap-8">
            <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <p className="font-semibold text-foreground">{user.username}</p>
              <p className="text-sm font-mono text-primary">{user.elo}</p>
            </motion.div>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5 }}>
              <Swords className="w-10 h-10 text-secondary" />
            </motion.div>
            <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto mb-3">
                <Brain className="w-8 h-8 text-destructive" />
              </div>
              <p className="font-semibold text-foreground">{opponent.username}</p>
              <p className="text-sm font-mono text-destructive">{opponent.elo}</p>
            </motion.div>
          </div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-6 text-sm text-muted-foreground font-mono animate-pulse">
            Battle starting…
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (phase === 'battle' && questions.length > 0) {
    const q = questions[currentQ];
    const timerColor = timeLeft > 15 ? 'text-accent' : timeLeft > 5 ? 'text-secondary' : 'text-destructive';

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Score bar */}
        <div className="glass-card p-4 flex items-center justify-between">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{user.username}</p>
            <p className="text-lg font-bold text-primary font-mono">{score}</p>
          </div>
          <div className="flex items-center gap-3">
            <Timer className={`w-5 h-5 ${timerColor}`} />
            <span className={`text-2xl font-bold font-mono ${timerColor}`}>{timeLeft}</span>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">{opponent?.username}</p>
            <p className="text-lg font-bold text-destructive font-mono">{opponentScore}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < currentQ ? (answers[i] === questions[i].correctIndex ? 'bg-accent' : 'bg-destructive')
              : i === currentQ ? 'bg-primary' : 'bg-muted'
              }`} />
          ))}
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQ}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="glass-card gradient-border p-8"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-primary font-mono tracking-widest">{q.topic}</span>
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${q.difficulty === 'easy' ? 'bg-accent/20 text-accent' :
                q.difficulty === 'medium' ? 'bg-secondary/20 text-secondary' :
                  'bg-destructive/20 text-destructive'
                }`}>
                {q.difficulty.toUpperCase()}
              </span>
            </div>

            <h2 className="font-display text-lg font-bold text-foreground mb-4">{q.question}</h2>

            {q.code && (
              <pre className="bg-muted p-4 rounded-lg text-sm font-mono text-foreground mb-6 overflow-x-auto border border-border whitespace-pre-wrap">
                {q.code}
              </pre>
            )}

            <div className="space-y-3">
              {q.options.map((opt, idx) => {
                const isSelected = submittedAnswer === idx;
                const isCorrect = idx === q.correctIndex;
                const showFeedback = submittedAnswer !== null;

                return (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    disabled={submittedAnswer !== null}
                    className={`w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3 ${showFeedback && isCorrect
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
    );
  }

  if (phase === 'result') {
    const correct = answers.filter((a, i) => a === questions[i]?.correctIndex).length;
    const won = eloDelta > 0;
    const draw = eloDelta === 0;

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card gradient-border p-10 text-center max-w-lg w-full">
          <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center border-2 ${won ? 'bg-accent/20 border-accent' : draw ? 'bg-muted border-border' : 'bg-destructive/20 border-destructive'
            }`}>
            {won ? <Trophy className="w-10 h-10 text-accent" /> : <Swords className="w-10 h-10 text-destructive" />}
          </div>

          <h2 className="font-display text-3xl font-bold text-foreground mb-2">
            {won ? 'Victory!' : draw ? 'Draw!' : 'Defeat'}
          </h2>
          <p className="text-muted-foreground mb-6">
            {won ? 'Well played, champion!' : draw ? 'An evenly matched battle.' : 'Better luck next time!'}
          </p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-card p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-xl font-bold text-primary font-mono">{score}</p>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">Correct</p>
              <p className="text-xl font-bold text-accent font-mono">{correct}/{questions.length}</p>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">ELO</p>
              <p className={`text-xl font-bold font-mono ${eloDelta > 0 ? 'text-accent' : eloDelta < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {eloDelta > 0 ? '+' : ''}{eloDelta}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6 text-sm">
            <div>
              <p className="text-muted-foreground">You</p>
              <p className="font-bold text-primary font-mono">{score}</p>
            </div>
            <span className="text-muted-foreground">vs</span>
            <div>
              <p className="text-muted-foreground">{opponent?.username}</p>
              <p className="font-bold text-destructive font-mono">{opponentScore}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={resetBattle}
              className="flex-1 py-3 bg-muted text-foreground rounded-lg font-display font-semibold hover:bg-muted/80 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => { resetBattle(); setTimeout(handleFindMatch, 50); }}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Rematch
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── DEFAULT TABS VIEW ──────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Battle Mode</h1>
        <p className="text-muted-foreground mt-1">Challenge opponents in real-time coding duels</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>

          {/* ── FIND MATCH ─────────────────────────────────────────────────────── */}
          {activeTab === 'find' && (
            <div className="glass-card gradient-border p-8 text-center max-w-lg mx-auto">
              <Swords className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">Quick Match</h2>
              <p className="text-muted-foreground text-sm mb-2">Find an opponent near your ELO rating</p>
              <p className="text-2xl font-bold text-primary font-mono mb-6">{user.elo}</p>
              <p className="text-xs text-muted-foreground mb-6">
                AI will generate {difficulty || 'skill-appropriate'} questions matched to your level — fair battles, no discrimination.
              </p>
              <button
                onClick={handleFindMatch}
                className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 active:scale-95 transition-all"
              >
                Find Match
              </button>
            </div>
          )}

          {/* ── INVITE FRIEND ───────────────────────────────────────────────────── */}
          {activeTab === 'invite' && (
            <AnimatePresence mode="wait">
              {invitePending ? (
                /* ── Waiting for friend ── */
                <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card gradient-border p-8 max-w-lg mx-auto text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground">Invite Sent!</h2>
                  <p className="text-muted-foreground text-sm">Waiting for <span className="text-primary font-mono font-bold">{invitePending}</span> to accept your challenge…</p>
                  <div className="glass-card p-3 rounded-lg text-xs text-muted-foreground font-mono animate-pulse">
                    Listening for response…
                  </div>
                  <button onClick={handleCancelInvite}
                    className="w-full py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center gap-2">
                    <X className="w-4 h-4" /> Cancel Invite
                  </button>
                </motion.div>
              ) : (
                /* ── Invite form ── */
                <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="glass-card gradient-border p-8 max-w-lg mx-auto space-y-5">
                  <h2 className="font-display text-xl font-bold text-foreground">Invite a Friend</h2>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Friend's Code</label>
                    <input value={friendCode} onChange={e => setFriendCode(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                      placeholder="Enter friend code…"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div className="glass-card p-4 rounded-lg flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Code</p>
                      <p className="font-mono text-lg text-primary font-bold tracking-widest">{myFriendCode}</p>
                    </div>
                    <button onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all text-xs font-medium">
                      {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {codeCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <button onClick={handleSendInvite}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <ArrowRight className="w-4 h-4" /> Send Invite
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ── CUSTOM ROOM ─────────────────────────────────────────────────────── */}
          {activeTab === 'custom' && (
            <AnimatePresence mode="wait">
              {createdRoom ? (
                /* ── Room lobby ── */
                <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="glass-card gradient-border p-8 max-w-lg mx-auto space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-foreground">Room Created!</h2>
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${createdRoom.diff === 'Easy' ? 'bg-accent/20 text-accent' :
                        createdRoom.diff === 'Medium' ? 'bg-secondary/20 text-secondary' :
                          'bg-destructive/20 text-destructive'}`}>{createdRoom.diff.toUpperCase()}</span>
                  </div>
                  <div className="glass-card p-5 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Room Name</span>
                      <span className="font-semibold text-foreground">{createdRoom.name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Room Code</span>
                      <span className="font-mono text-primary font-bold text-lg tracking-widest">{createdRoom.code}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Players</span>
                      <span className="text-foreground">1 / 2 <span className="text-muted-foreground text-xs">(waiting…)</span></span>
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded-lg text-center text-xs text-muted-foreground font-mono animate-pulse">
                    <Loader2 className="w-3 h-3 inline mr-1.5 animate-spin" />
                    Waiting for opponent to join with code <span className="text-primary">{createdRoom.code}</span>…
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => { navigator.clipboard.writeText(createdRoom.code); toast.success('Room code copied!'); }}
                      className="flex-1 py-2.5 bg-muted text-foreground rounded-lg text-sm font-semibold hover:bg-primary/10 hover:text-primary transition-all flex items-center justify-center gap-2">
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </button>
                    <button onClick={handleCloseRoom}
                      className="flex-1 py-2.5 bg-destructive/10 text-destructive rounded-lg text-sm font-semibold hover:bg-destructive/20 transition-all flex items-center justify-center gap-2">
                      <X className="w-3.5 h-3.5" /> Close Room
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ── Create form ── */
                <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="glass-card gradient-border p-8 max-w-lg mx-auto space-y-5">
                  <h2 className="font-display text-xl font-bold text-foreground">Create Custom Room</h2>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Room Name</label>
                    <input value={roomName} onChange={e => setRoomName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
                      placeholder="My Battle Room"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground mb-1.5 block">Difficulty</label>
                    <div className="flex gap-2">
                      {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(d => (
                        <button key={d} onClick={() => setRoomDiff(d)}
                          className={`flex-1 py-2.5 rounded-lg border text-sm font-semibold transition-all active:scale-95 ${roomDiff === d
                              ? d === 'Easy' ? 'border-accent    bg-accent/15    text-accent'
                                : d === 'Medium' ? 'border-secondary bg-secondary/15 text-secondary'
                                  : 'border-destructive bg-destructive/15 text-destructive'
                              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-primary'
                            }`}>{d}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleCreateRoom}
                    className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Create Room
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* ── TOURNAMENTS ─────────────────────────────────────────────────────── */}
          {activeTab === 'tournament' && (
            <div className="space-y-4">
              {joinedTournaments.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 border border-accent/30 bg-accent/5 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                  <p className="text-sm text-foreground">
                    You're registered in <span className="text-accent font-bold">{joinedTournaments.length}</span> tournament{joinedTournaments.length > 1 ? 's' : ''}. You'll be notified when they start.
                  </p>
                </motion.div>
              )}
              {mockTournaments.map(t => {
                const joined = joinedTournaments.includes(t.id);
                const full = t.status === 'Full' && !joined;
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`glass-card-hover p-5 flex items-center justify-between ${joined ? 'border-accent/30 bg-accent/5' : ''
                      }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${joined ? 'bg-accent/20' : 'bg-secondary/20'
                        }`}>
                        {full ? <Lock className="w-5 h-5 text-muted-foreground" /> :
                          joined ? <CheckCircle2 className="w-5 h-5 text-accent" /> :
                            <Trophy className="w-5 h-5 text-secondary" />}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{t.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {t.players} players · {t.prize} · Starts in {t.startIn}
                        </p>
                        {joined && <p className="text-xs text-accent mt-0.5">✓ You are registered</p>}
                      </div>
                    </div>
                    <button disabled={full}
                      onClick={() => joined ? handleLeaveTournament(t.id, t.name) : handleJoinTournament(t.id, t.name)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-95 ${full ? 'bg-muted text-muted-foreground cursor-not-allowed' :
                          joined ? 'bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20' :
                            'bg-secondary text-secondary-foreground hover:bg-secondary/90'
                        }`}>
                      {full ? 'Full' : joined ? 'Leave' : 'Join'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── SPECTATE ────────────────────────────────────────────────────────── */}
          {activeTab === 'spectate' && (
            <AnimatePresence mode="wait">
              {spectatingMatch ? (
                /* ── Live spectator view ── */
                <motion.div key="watching" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                  className="space-y-4">
                  <div className="glass-card gradient-border p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
                        <span className="text-sm font-mono text-destructive font-bold">LIVE · SPECTATING</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" /> {spectatingMatch.viewers + 1} watching
                        </span>
                        <button onClick={handleStopSpectating}
                          className="p-1.5 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-4">
                      <div className="text-center flex-1">
                        <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-2">
                          <Shield className="w-6 h-6 text-primary" />
                        </div>
                        <p className="font-semibold text-foreground">{spectatingMatch.p1}</p>
                        <p className="text-sm font-mono text-primary">{spectatingMatch.elo1}</p>
                      </div>
                      <div className="flex flex-col items-center gap-1 px-4">
                        <Swords className="w-8 h-8 text-secondary" />
                        <span className="text-xs text-muted-foreground">{spectatingMatch.topic}</span>
                      </div>
                      <div className="text-center flex-1">
                        <div className="w-12 h-12 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto mb-2">
                          <Brain className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="font-semibold text-foreground">{spectatingMatch.p2}</p>
                        <p className="text-sm font-mono text-destructive">{spectatingMatch.elo2}</p>
                      </div>
                    </div>
                    <div className="glass-card p-3 rounded-lg text-center text-xs text-muted-foreground font-mono animate-pulse">
                      <Wifi className="w-3 h-3 inline mr-1.5" />
                      Live feed active — watching in real-time
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ── Match list ── */
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <p className="text-sm text-muted-foreground">Live matches you can watch:</p>
                  {mockLiveMatches.map(m => (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card-hover p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                          <span className="text-xs font-mono text-destructive">LIVE</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" /> {m.viewers} watching
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{m.p1}</p>
                          <p className="text-xs text-primary font-mono">{m.elo1}</p>
                        </div>
                        <div className="px-4 flex flex-col items-center gap-1">
                          <Swords className="w-6 h-6 text-secondary" />
                          <p className="text-xs text-muted-foreground">{m.topic}</p>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-foreground">{m.p2}</p>
                          <p className="text-xs text-primary font-mono">{m.elo2}</p>
                        </div>
                      </div>
                      <button onClick={() => handleWatch(m)}
                        className="w-full mt-4 py-2.5 rounded-lg text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2 bg-muted text-foreground hover:bg-primary/10 hover:text-primary">
                        <Eye className="w-4 h-4" /> Watch
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Battle;

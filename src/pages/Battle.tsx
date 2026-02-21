import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Users, Plus, Trophy, Eye, Swords, Loader2,
  CheckCircle2, ArrowRight, Timer, Zap, Shield, Brain,
  Copy, Check, Lock, X, Wifi, Bell
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

interface IncomingInvite {
  id: string;
  fromUsername: string;
  fromElo: number;
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

  // ── Auth session (for real DB inserts) ─────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUserId(session?.user.id ?? null));
  }, []);

  // ── Tab & form state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('find');
  const [friendCode, setFriendCode] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomDiff, setRoomDiff] = useState<Difficulty>('Medium');
  const [codeCopied, setCodeCopied] = useState(false);
  const [joinedTournaments, setJoinedTournaments] = useState<number[]>([]);

  // ── In-page panel states ───────────────────────────────────────────────────
  const [invitePending, setInvitePending] = useState<{ code: string; inviteId: string } | null>(null);
  const [incomingInvite, setIncomingInvite] = useState<IncomingInvite | null>(null);
  const [createdRoom, setCreatedRoom] = useState<{ name: string; diff: Difficulty; code: string } | null>(null);
  const [spectatingMatch, setSpectatingMatch] = useState<typeof mockLiveMatches[0] | null>(null);

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

  // Ref to track active invite id for cleanup
  const activeInviteIdRef = useRef<string | null>(null);

  const myFriendCode = user?.friendCode ?? '';

  // ─── Supabase Realtime: incoming invites ────────────────────────────────────
  useEffect(() => {
    if (!myFriendCode) return;

    const ch = supabase.channel(`incoming-${myFriendCode}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_invites',
        filter: `to_friend_code=eq.${myFriendCode}`,
      }, (payload) => {
        const inv = payload.new as any;
        setIncomingInvite({ id: inv.id, fromUsername: inv.from_username, fromElo: inv.from_elo });
        toast(`⚔️ ${inv.from_username} challenged you to a battle!`, { duration: 10000 });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [myFriendCode]);

  // ─── Supabase Realtime: watch battle_rooms for me ──────────────────────────
  useEffect(() => {
    if (!userId) return;

    const ch = supabase.channel(`rooms-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_rooms',
        // Supabase realtime filter supports OR via comma-separated; watch all inserts and filter client-side
      }, (payload) => {
        const room = payload.new as any;
        if (room.player1_id !== userId && room.player2_id !== userId) return;

        const oppName = room.player1_id === userId ? room.player2_username : room.player1_username;
        const oppElo = room.player1_id === userId ? room.player2_elo : room.player1_elo;
        startBattleWithOpponent({ username: oppName, elo: oppElo });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // ─── Supabase Realtime: track sent invite status ───────────────────────────
  useEffect(() => {
    if (!invitePending?.inviteId) return;

    const ch = supabase.channel(`invite-status-${invitePending.inviteId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'battle_invites',
        filter: `id=eq.${invitePending.inviteId}`,
      }, (payload) => {
        const updated = payload.new as any;
        if (updated.status === 'declined') {
          toast.error(`${invitePending.code} declined your challenge.`);
          setInvitePending(null);
        } else if (updated.status === 'cancelled') {
          setInvitePending(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [invitePending?.inviteId]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'battle' || submittedAnswer !== null) return;
    if (timeLeft <= 0) { handleAnswer(-1); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft, submittedAnswer]);

  // ─── Start battle (shared between Find Match + Accept Invite) ──────────────
  const startBattleWithOpponent = useCallback(async (opp: Opponent) => {
    setPhase('searching');
    setOpponent(opp);
    try {
      const { data, error } = await supabase.functions.invoke('battle-questions', {
        body: { elo: user?.elo || 0, questionCount: 5 },
      });
      if (error) throw new Error(error.message || 'Failed to fetch questions');
      if (data?.error) throw new Error(data.error);

      setQuestions(data.questions);
      setDifficulty(data.difficulty);
      setAnswers(Array(data.questions.length).fill(null));

      await new Promise(r => setTimeout(r, 1500));
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
      toast.error(err.message || 'Failed to start battle');
      setPhase('idle');
      setOpponent(null);
    }
  }, [user?.elo]);

  // ── Find Match ──────────────────────────────────────────────────────────────
  const handleFindMatch = useCallback(async () => {
    if (!userId || !user) return;
    setPhase('searching');

    try {
      // Remove any stale entry first
      await supabase.from('matchmaking_queue').delete().eq('user_id', userId);

      // Check if someone is already waiting
      const { data: waiting } = await supabase
        .from('matchmaking_queue')
        .select('*')
        .neq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1);

      if (waiting && waiting.length > 0) {
        const opponent = waiting[0];

        // Create a battle room
        await supabase.from('battle_rooms').insert({
          player1_id: opponent.user_id,
          player1_username: opponent.username,
          player1_elo: opponent.elo,
          player2_id: userId,
          player2_username: user.username,
          player2_elo: user.elo,
        });

        // Remove opponent from queue
        await supabase.from('matchmaking_queue').delete().eq('user_id', opponent.user_id);

        // Start battle on this side immediately
        await startBattleWithOpponent({ username: opponent.username, elo: opponent.elo });
      } else {
        // Add ourselves to queue and wait for battle_rooms realtime
        await supabase.from('matchmaking_queue').insert({
          user_id: userId,
          username: user.username,
          elo: user.elo,
        });
        // Phase stays 'searching', battle_rooms realtime will trigger startBattleWithOpponent
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to find match');
      setPhase('idle');
    }
  }, [userId, user, startBattleWithOpponent]);

  const handleCancelSearch = async () => {
    if (userId) await supabase.from('matchmaking_queue').delete().eq('user_id', userId);
    setPhase('idle');
    toast('Search cancelled.');
  };

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

  const resetBattle = async () => {
    if (userId) await supabase.from('matchmaking_queue').delete().eq('user_id', userId);
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

  // ── Invite Friend handlers ──────────────────────────────────────────────────
  const handleCopyCode = () => {
    navigator.clipboard.writeText(myFriendCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleSendInvite = async () => {
    if (!friendCode.trim()) { toast.error('Please enter a friend code first.'); return; }
    if (!userId || !user) { toast.error('Not signed in.'); return; }
    if (friendCode.trim() === myFriendCode) { toast.error("That's your own code!"); return; }

    try {
      const { data, error } = await supabase.from('battle_invites').insert({
        from_user_id: userId,
        from_username: user.username,
        from_elo: user.elo,
        to_friend_code: friendCode.trim().toUpperCase(),
        status: 'pending',
      }).select().single();

      if (error) throw error;
      activeInviteIdRef.current = data.id;
      setInvitePending({ code: friendCode.trim().toUpperCase(), inviteId: data.id });
      setFriendCode('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send invite. Check the friend code and try again.');
    }
  };

  const handleCancelInvite = async () => {
    if (invitePending?.inviteId) {
      await supabase.from('battle_invites')
        .update({ status: 'cancelled' })
        .eq('id', invitePending.inviteId);
    }
    setInvitePending(null);
    toast('Invite cancelled.');
  };

  // ── Accept / Decline incoming invite ───────────────────────────────────────
  const handleAcceptInvite = async () => {
    if (!incomingInvite || !userId || !user) return;
    try {
      // Update invite status
      await supabase.from('battle_invites')
        .update({ status: 'accepted' })
        .eq('id', incomingInvite.id);

      // Get inviter's user_id from profiles
      const { data: inviterProfile } = await supabase
        .from('profiles')
        .select('user_id, elo')
        .eq('username', incomingInvite.fromUsername)
        .single();

      // Create battle room (invitee creates it)
      if (inviterProfile) {
        await supabase.from('battle_rooms').insert({
          player1_id: inviterProfile.user_id,
          player1_username: incomingInvite.fromUsername,
          player1_elo: incomingInvite.fromElo,
          player2_id: userId,
          player2_username: user.username,
          player2_elo: user.elo,
          invite_id: incomingInvite.id,
        });
      }

      setIncomingInvite(null);
      // battle_rooms realtime will trigger startBattleWithOpponent for both sides
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept. Try again.');
    }
  };

  const handleDeclineInvite = async () => {
    if (!incomingInvite) return;
    await supabase.from('battle_invites')
      .update({ status: 'declined' })
      .eq('id', incomingInvite.id);
    setIncomingInvite(null);
    toast('Invite declined.');
  };

  // ── Custom Room handlers ────────────────────────────────────────────────────
  const handleCreateRoom = () => {
    if (!roomName.trim()) { toast.error('Please enter a room name.'); return; }
    const roomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
    setCreatedRoom({ name: roomName.trim(), diff: roomDiff, code: roomCode });
    setRoomName('');
  };

  const handleCloseRoom = () => { setCreatedRoom(null); toast('Room closed.'); };

  // ── Tournament handlers ─────────────────────────────────────────────────────
  const handleJoinTournament = (id: number, name: string) => { setJoinedTournaments(p => [...p, id]); toast.success(`Joined "${name}"!`); };
  const handleLeaveTournament = (id: number, name: string) => { setJoinedTournaments(p => p.filter(t => t !== id)); toast(`Left "${name}".`); };

  // ── Spectate handlers ───────────────────────────────────────────────────────
  const handleWatch = (match: typeof mockLiveMatches[0]) => setSpectatingMatch(match);
  const handleStopSpectating = () => setSpectatingMatch(null);

  if (!user) return null;

  // ─── BATTLE PHASES ─────────────────────────────────────────────────────────
  if (phase === 'searching') {
    const inQueue = !opponent;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card gradient-border p-10 text-center max-w-md w-full">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-6" />
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {inQueue ? 'Finding Opponent' : 'Match Found!'}
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            {inQueue
              ? `Matching you with a player near ELO ${user.elo}…`
              : `Preparing battle vs ${opponent?.username}…`}
          </p>
          <p className="text-xs text-muted-foreground font-mono animate-pulse">
            {inQueue ? 'Waiting in queue…' : 'Loading questions…'}
          </p>
          {inQueue && (
            <button onClick={handleCancelSearch} className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
              Cancel
            </button>
          )}
        </motion.div>
      </div>
    );
  }

  if (phase === 'found' && opponent) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card gradient-border p-10 text-center max-w-lg w-full">
          <div className="flex items-center justify-between mb-8">
            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <p className="font-display font-bold text-foreground">{user.username}</p>
              <p className="text-sm text-primary font-mono">{user.elo} ELO</p>
            </div>
            <div className="flex flex-col items-center gap-2 px-6">
              <Swords className="w-10 h-10 text-secondary" />
              <span className="text-xs font-mono text-muted-foreground">{difficulty.toUpperCase()}</span>
            </div>
            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto mb-3">
                <Brain className="w-8 h-8 text-destructive" />
              </div>
              <p className="font-display font-bold text-foreground">{opponent.username}</p>
              <p className="text-sm text-destructive font-mono">{opponent.elo} ELO</p>
            </div>
          </div>
          <p className="font-mono text-sm text-secondary animate-pulse">Battle starting in 3 seconds…</p>
        </motion.div>
      </div>
    );
  }

  if (phase === 'battle') {
    const q = questions[currentQ];
    if (!q) return null;
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-muted-foreground">{user.username}</span>
            <span className="text-primary font-bold font-mono">{score}</span>
          </div>
          <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft <= 10 ? 'text-destructive' : 'text-foreground'}`}>
            <Timer className="w-5 h-5" />{timeLeft}s
          </div>
          <div className="flex items-center gap-3">
            <span className="text-destructive font-bold font-mono">{opponentScore}</span>
            <span className="font-mono text-sm text-muted-foreground">{opponent?.username}</span>
          </div>
        </div>
        {/* Progress */}
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < currentQ ? 'bg-primary' : i === currentQ ? 'bg-primary/50' : 'bg-muted'}`} />
          ))}
        </div>
        {/* Question */}
        <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card gradient-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-mono text-secondary uppercase">{q.topic}</span>
            <span className="text-xs text-muted-foreground">Q{currentQ + 1}/{questions.length}</span>
          </div>
          <p className="text-foreground font-semibold text-lg mb-4">{q.question}</p>
          {q.code && (
            <pre className="glass-card p-4 rounded-lg text-sm font-mono text-muted-foreground overflow-x-auto mb-4 whitespace-pre-wrap">{q.code}</pre>
          )}
        </motion.div>
        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {q.options.map((opt, i) => {
            const isSubmitted = submittedAnswer !== null;
            const isSelected = submittedAnswer === i;
            const isCorrect = i === q.correctIndex;
            return (
              <motion.button key={i} whileTap={{ scale: 0.98 }}
                onClick={() => handleAnswer(i)}
                disabled={isSubmitted}
                className={`p-4 rounded-xl border text-left transition-all text-sm font-medium ${!isSubmitted ? 'border-border bg-card hover:border-primary/50 hover:bg-primary/5' :
                    isCorrect ? 'border-accent bg-accent/10 text-accent' :
                      isSelected ? 'border-destructive bg-destructive/10 text-destructive' :
                        'border-border bg-muted/30 text-muted-foreground'
                  }`}>
                <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    const won = score > opponentScore;
    const draw = score === opponentScore;
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card gradient-border p-10 text-center max-w-md w-full space-y-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${won ? 'bg-accent/20 border-2 border-accent' : draw ? 'bg-secondary/20 border-2 border-secondary' : 'bg-muted border-2 border-border'}`}>
            {won ? <Trophy className="w-10 h-10 text-accent" /> : draw ? <Zap className="w-10 h-10 text-secondary" /> : <X className="w-10 h-10 text-muted-foreground" />}
          </div>
          <div>
            <h2 className="font-display text-3xl font-bold text-foreground">{won ? 'Victory!' : draw ? 'Draw!' : 'Defeat'}</h2>
            <p className="text-muted-foreground mt-1">vs {opponent?.username}</p>
          </div>
          <div className="flex justify-center gap-8">
            <div className="text-center"><p className="text-2xl font-bold text-foreground">{score}</p><p className="text-xs text-muted-foreground">Your Score</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-muted-foreground">{opponentScore}</p><p className="text-xs text-muted-foreground">Opponent</p></div>
          </div>
          <div className={`text-lg font-bold font-mono ${eloDelta >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {eloDelta >= 0 ? '+' : ''}{eloDelta} ELO
          </div>
          <button onClick={resetBattle} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold hover:bg-primary/90 transition-all">
            Play Again
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── MAIN TAB UI ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Incoming invite overlay */}
      <AnimatePresence>
        {incomingInvite && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="glass-card border border-secondary/40 bg-secondary/5 p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 border border-secondary flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">⚔️ Challenge Received!</p>
                <p className="text-sm text-muted-foreground">
                  <span className="text-secondary font-bold">{incomingInvite.fromUsername}</span>
                  {' '}({incomingInvite.fromElo} ELO) wants to battle you
                </p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleAcceptInvite}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-semibold hover:bg-accent/90 active:scale-95 transition-all flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Accept
              </button>
              <button onClick={handleDeclineInvite}
                className="px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-semibold hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all">
                Decline
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Battle Mode</h1>
        <p className="text-muted-foreground mt-1">Challenge opponents in real-time coding duels</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

        {/* ── FIND MATCH ──────────────────────────────────────────────────────── */}
        {activeTab === 'find' && (
          <div className="glass-card gradient-border p-8 max-w-lg mx-auto text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto">
              <Swords className="w-10 h-10 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">Ready to Battle?</h2>
              <p className="text-muted-foreground text-sm">We'll find you an opponent near your ELO</p>
            </div>
            <div className="glass-card p-4 rounded-xl flex justify-between text-sm">
              <div className="text-center"><p className="text-xl font-bold text-foreground">{user.elo}</p><p className="text-xs text-muted-foreground">Your ELO</p></div>
              <div className="text-center"><p className="text-xl font-bold text-foreground">{Math.max(0, user.elo - 100)}–{user.elo + 100}</p><p className="text-xs text-muted-foreground">Match Range</p></div>
              <div className="text-center"><p className="text-xl font-bold text-foreground">5</p><p className="text-xs text-muted-foreground">Questions</p></div>
            </div>
            <button onClick={handleFindMatch}
              className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-display font-bold text-lg tracking-wider hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-3">
              <Search className="w-5 h-5" /> Find Match
            </button>
          </div>
        )}

        {/* ── INVITE FRIEND ───────────────────────────────────────────────────── */}
        {activeTab === 'invite' && (
          <AnimatePresence mode="wait">
            {invitePending ? (
              <motion.div key="pending" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="glass-card gradient-border p-8 max-w-lg mx-auto text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
                <h2 className="font-display text-xl font-bold text-foreground">Invite Sent!</h2>
                <p className="text-muted-foreground text-sm">
                  Waiting for <span className="text-primary font-mono font-bold">{invitePending.code}</span> to accept…
                </p>
                <div className="glass-card p-3 rounded-lg text-xs text-muted-foreground font-mono animate-pulse">
                  Listening for response via Supabase Realtime…
                </div>
                <button onClick={handleCancelInvite}
                  className="w-full py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-destructive/10 hover:text-destructive transition-all flex items-center justify-center gap-2">
                  <X className="w-4 h-4" /> Cancel Invite
                </button>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-card gradient-border p-8 max-w-lg mx-auto space-y-5">
                <h2 className="font-display text-xl font-bold text-foreground">Invite a Friend</h2>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Friend's Code</label>
                  <input value={friendCode} onChange={e => setFriendCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
                    placeholder="e.g. ALEXCODER-AB12CD"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono" />
                </div>
                <div className="glass-card p-4 rounded-lg flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Your Code (share with friends)</p>
                    <p className="font-mono text-lg text-primary font-bold tracking-widest">
                      {myFriendCode || <span className="text-muted-foreground text-sm">Loading…</span>}
                    </p>
                  </div>
                  <button onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all text-xs font-medium shrink-0">
                    {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <button onClick={handleSendInvite}
                  className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <ArrowRight className="w-4 h-4" /> Send Challenge
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── CUSTOM ROOM ─────────────────────────────────────────────────────── */}
        {activeTab === 'custom' && (
          <AnimatePresence mode="wait">
            {createdRoom ? (
              <motion.div key="lobby" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="glass-card gradient-border p-8 max-w-lg mx-auto space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-bold text-foreground">Room Created!</h2>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${createdRoom.diff === 'Easy' ? 'bg-accent/20 text-accent' :
                      createdRoom.diff === 'Medium' ? 'bg-secondary/20 text-secondary' :
                        'bg-destructive/20 text-destructive'}`}>
                    {createdRoom.diff.toUpperCase()}
                  </span>
                </div>
                <div className="glass-card p-5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Room Name</span><span className="font-semibold text-foreground">{createdRoom.name}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Room Code</span><span className="font-mono text-primary font-bold text-lg tracking-widest">{createdRoom.code}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Players</span><span className="text-foreground">1 / 2 <span className="text-muted-foreground text-xs">(waiting…)</span></span></div>
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
              <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass-card gradient-border p-8 max-w-lg mx-auto space-y-5">
                <h2 className="font-display text-xl font-bold text-foreground">Create Custom Room</h2>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Room Name</label>
                  <input value={roomName} onChange={e => setRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateRoom()}
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
                  className={`glass-card-hover p-5 flex items-center justify-between ${joined ? 'border-accent/30 bg-accent/5' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${joined ? 'bg-accent/20' : 'bg-secondary/20'}`}>
                      {full ? <Lock className="w-5 h-5 text-muted-foreground" /> :
                        joined ? <CheckCircle2 className="w-5 h-5 text-accent" /> :
                          <Trophy className="w-5 h-5 text-secondary" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{t.name}</h3>
                      <p className="text-xs text-muted-foreground">{t.players} players · {t.prize} · Starts in {t.startIn}</p>
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
              <motion.div key="watching" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
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
                      <button onClick={handleStopSpectating} className="p-1.5 rounded-lg bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-4">
                    <div className="text-center flex-1">
                      <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mx-auto mb-2"><Shield className="w-6 h-6 text-primary" /></div>
                      <p className="font-semibold text-foreground">{spectatingMatch.p1}</p>
                      <p className="text-sm font-mono text-primary">{spectatingMatch.elo1}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 px-4">
                      <Swords className="w-8 h-8 text-secondary" />
                      <span className="text-xs text-muted-foreground">{spectatingMatch.topic}</span>
                    </div>
                    <div className="text-center flex-1">
                      <div className="w-12 h-12 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center mx-auto mb-2"><Brain className="w-6 h-6 text-destructive" /></div>
                      <p className="font-semibold text-foreground">{spectatingMatch.p2}</p>
                      <p className="text-sm font-mono text-destructive">{spectatingMatch.elo2}</p>
                    </div>
                  </div>
                  <div className="glass-card p-3 rounded-lg text-center text-xs text-muted-foreground font-mono animate-pulse">
                    <Wifi className="w-3 h-3 inline mr-1.5" />Live feed active — watching in real-time
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <p className="text-sm text-muted-foreground">Live matches you can watch:</p>
                {mockLiveMatches.map(m => (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card-hover p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3"><div className="w-2 h-2 rounded-full bg-destructive animate-pulse" /><span className="text-xs font-mono text-destructive">LIVE</span></div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" /> {m.viewers} watching</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-center"><p className="font-semibold text-foreground">{m.p1}</p><p className="text-xs text-primary font-mono">{m.elo1}</p></div>
                      <div className="px-4 flex flex-col items-center gap-1"><Swords className="w-6 h-6 text-secondary" /><p className="text-xs text-muted-foreground">{m.topic}</p></div>
                      <div className="text-center"><p className="font-semibold text-foreground">{m.p2}</p><p className="text-xs text-primary font-mono">{m.elo2}</p></div>
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
    </div>
  );
};

export default Battle;

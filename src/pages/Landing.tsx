import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { motion } from 'framer-motion';
import { Swords, Zap, Trophy, ArrowRight, Loader2, Mail, KeyRound } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
const Landing = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'resend'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const {
    login,
    signup
  } = useUser();
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    if (mode === 'forgot') {
      const {
        error
      } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "http://localhost:8080"
      });
      setSubmitting(false);
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Reset link sent',
          description: 'Check your email for a password reset link.'
        });
        setMode('login');
      }
      return;
    }
    if (mode === 'resend') {
      const {
        error
      } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      setSubmitting(false);
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Verification email sent',
          description: 'Check your inbox for the confirmation link.'
        });
        setMode('login');
      }
      return;
    }
    let error: string | null;
    if (mode === 'login') {
      error = await login(email, password);
    } else {
      error = await signup(username, email, password);
    }
    setSubmitting(false);
   if (error) {
  toast({
    title: 'Error',
    description: error,
    variant: 'destructive'
  });
} else if (mode === 'login') {
  navigate("/assessment");
} else if (mode === 'signup') {
  toast({
    title: 'Check your email',
    description: 'We sent you a confirmation link. Please verify your email to continue.'
  });
}
  };
  const titles: Record<string, {
    heading: string;
    sub: string;
  }> = {
    login: {
      heading: 'Welcome Back',
      sub: 'Enter the battlefield'
    },
    signup: {
      heading: 'Join the Arena',
      sub: 'Create your warrior profile'
    },
    forgot: {
      heading: 'Reset Password',
      sub: 'We\'ll send you a reset link'
    },
    resend: {
      heading: 'Resend Verification',
      sub: 'Get a new confirmation email'
    }
  };
  const buttonLabels: Record<string, string> = {
    login: 'Enter Arena',
    signup: 'Create Account',
    forgot: 'Send Reset Link',
    resend: 'Resend Email'
  };
  return <div className="min-h-screen bg-background flex">
      {/* Left side - branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-glow-purple/5" />
        
        <motion.div initial={{
        opacity: 0,
        y: 30
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.8
      }} className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Swords className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-wider glow-text font-sans">Skill Arena </h1>
              <p className="text-muted-foreground">AI Powered Skill Evolution</p>
            </div>
          </div>

          <div className="space-y-6 mt-12">
            {[{
            icon: Zap,
            title: 'AI Assessment',
            desc: 'Get your ELO rating through adaptive coding challenges'
          }, {
            icon: Swords,
            title: 'Real-time Battles',
            desc: 'Compete head-to-head with developers worldwide'
          }, {
            icon: Trophy,
            title: 'Earn Achievements',
            desc: 'Unlock badges, climb leaderboards, grow your skills'
          }].map((item, i) => <motion.div key={item.title} initial={{
            opacity: 0,
            x: -20
          }} animate={{
            opacity: 1,
            x: 0
          }} transition={{
            delay: 0.3 + i * 0.15
          }} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0 mt-0.5">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>)}
          </div>
        </motion.div>
      </div>

      {/* Right side - auth form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }} className="w-full max-w-md">
          <div className="glass-card p-8 gradient-border">
            <div className="lg:hidden flex items-center gap-3 mb-8">
              <Swords className="w-8 h-8 text-primary" />
              <h1 className="font-display text-2xl font-bold text-foreground">CodeClash</h1>
            </div>

            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              {titles[mode].heading}
            </h2>
            <p className="text-muted-foreground text-sm mb-8">
              {titles[mode].sub}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" placeholder="cyberwarrior" required />
                </div>}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" placeholder="you@example.com" required />
              </div>
              {(mode === 'login' || mode === 'signup') && <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all" placeholder="••••••••" required minLength={6} />
                </div>}

              <button type="submit" disabled={submitting} className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>
                    {buttonLabels[mode]}
                    <ArrowRight className="w-4 h-4" />
                  </>}
              </button>
            </form>

            {/* Contextual links */}
            {mode === 'login' && <div className="mt-4 flex items-center justify-between text-sm">
                <button onClick={() => setMode('forgot')} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  Forgot password?
                </button>
                <button onClick={() => setMode('resend')} className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  Resend verification
                </button>
              </div>}

            {(mode === 'forgot' || mode === 'resend') && <div className="mt-4 text-center">
                <button onClick={() => setMode('login')} className="text-sm text-primary hover:underline font-medium">
                  ← Back to login
                </button>
              </div>}

            <p className="text-center text-sm text-muted-foreground mt-6">
              {mode === 'login' || mode === 'forgot' || mode === 'resend' ? "Don't have an account?" : 'Already have an account?'}{' '}
              <button onClick={() => setMode(mode === 'signup' ? 'login' : mode === 'login' ? 'signup' : 'signup')} className="text-primary hover:underline font-medium">
                {mode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>;
};
export default Landing;
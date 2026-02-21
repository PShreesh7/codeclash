import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Send, Code2, MessageSquare, Sparkles } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ReactMarkdown from 'react-markdown';
import { toast } from '@/hooks/use-toast';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coach`;

async function streamChat({
  messages,
  mode,
  onDelta,
  onDone,
}: {
  messages: Msg[];
  mode: string;
  onDelta: (t: string) => void;
  onDone: () => void;
}) {
  // Get real user JWT — anon key alone causes 401 on authenticated edge functions
  const { data: { session } } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
  const token = session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, mode }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `AI service error (${resp.status})`);
  }
  if (!resp.body) throw new Error('No response body');

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let done = false;

  while (!done) {
    const { done: d, value } = await reader.read();
    if (d) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf('\n')) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.startsWith(':') || line.trim() === '') continue;
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch {
        buf = line + '\n' + buf;
        break;
      }
    }
  }
  onDone();
}

const AICoach = () => {
  const [tab, setTab] = useState('chat');

  // Chat state
  const [chatMessages, setChatMessages] = useState<Msg[]>([
    { role: 'assistant', content: "Hello! I'm your AI Coach. I can help you with DSA, System Design, code reviews, or career guidance. What are you working on today?" },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Code analysis state
  const [code, setCode] = useState('');
  const [analysisResult, setAnalysisResult] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg: Msg = { role: 'user', content: chatInput.trim() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    let soFar = '';
    const upsert = (chunk: string) => {
      soFar += chunk;
      setChatMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: soFar } : m);
        }
        return [...prev, { role: 'assistant', content: soFar }];
      });
    };

    try {
      await streamChat({
        messages: [...chatMessages, userMsg],
        mode: 'chat',
        onDelta: upsert,
        onDone: () => setChatLoading(false),
      });
    } catch (e: any) {
      setChatLoading(false);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const analyzeCode = async () => {
    if (!code.trim() || analyzing) return;
    setAnalyzing(true);
    setAnalysisResult('');

    let soFar = '';
    try {
      await streamChat({
        messages: [{ role: 'user', content: `Analyze this code:\n\`\`\`\n${code}\n\`\`\`` }],
        mode: 'code-analysis',
        onDelta: (chunk) => {
          soFar += chunk;
          setAnalysisResult(soFar);
        },
        onDone: () => setAnalyzing(false),
      });
    } catch (e: any) {
      setAnalyzing(false);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Bot className="w-8 h-8 text-primary" />
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">AI Coach</h1>
            <p className="text-muted-foreground text-sm">Personalized guidance & Code Analysis</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/40 rounded-full px-3 py-1">
          <Sparkles className="w-3.5 h-3.5" /> Pro Mode Active
        </span>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="chat" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <MessageSquare className="w-4 h-4" /> Chat
          </TabsTrigger>
          <TabsTrigger value="code" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Code2 className="w-4 h-4" /> Code Analysis
          </TabsTrigger>
        </TabsList>

        {/* CHAT TAB */}
        <TabsContent value="chat" className="mt-4">
          <div className="glass-card gradient-border flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: 400 }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                    {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <span className="text-xs font-bold">U</span>}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-accent/20 text-foreground' : 'bg-muted border border-border text-foreground'}`}>
                    <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-primary">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  </div>
                </motion.div>
              ))}
              {chatLoading && chatMessages[chatMessages.length - 1]?.role === 'user' && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-muted border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4 flex gap-3">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask about your code, algorithms, or career path..."
                className="flex-1 bg-muted border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={chatLoading}
              />
              <button
                onClick={sendChat}
                disabled={chatLoading || !chatInput.trim()}
                className="px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </TabsContent>

        {/* CODE ANALYSIS TAB */}
        <TabsContent value="code" className="mt-4 space-y-4">
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
              placeholder="Paste your code here for AI analysis..."
            />
            <button
              onClick={analyzeCode}
              disabled={analyzing || !code.trim()}
              className="mt-4 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-display font-semibold tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <><Bot className="w-4 h-4 animate-spin" /> Analyzing...</>
              ) : (
                <><Send className="w-4 h-4" /> Analyze Code</>
              )}
            </button>
          </div>

          {analysisResult && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card gradient-border p-6">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-primary" /> AI Analysis Results
              </h2>
              <div className="prose prose-sm prose-invert max-w-none [&_pre]:bg-background [&_pre]:border [&_pre]:border-border [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-primary">
                <ReactMarkdown>{analysisResult}</ReactMarkdown>
              </div>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AICoach;

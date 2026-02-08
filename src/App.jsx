import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, AreaChart, Area
} from 'recharts';
import { 
  MessageSquare, Upload, Zap, Activity, Users, Eye, 
  ShieldAlert, Heart, Brain, ChevronRight, Search, Menu, X, ArrowUpRight, Sparkles, Send,
  MessageCircle, Instagram, Ghost, Facebook, CheckCircle2, ChevronDown, Flame, Fingerprint, CalendarClock, Trophy, Lock, HeartHandshake, History, UserMinus, Monitor, Cpu, MessageCircleHeart, Ear
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* CONFIGURATION & MOCKS                          */
/* -------------------------------------------------------------------------- */

const apiKey = ""; // The execution environment provides the key at runtime.

const DEFAULT_CHAT_TEXT = `[10:00 AM] Alex: We need to talk about the project deadline.
[10:05 AM] Jordan: Again? I thought we settled this yesterday.
[10:07 AM] Alex: I'm not trying to argue. I'm just worried we're falling behind.
[10:15 AM] Jordan: It feels like you don't trust my process.
[10:16 AM] Alex: It's not about trust. It's about the client's expectations.
[10:45 AM] Jordan: Fine. What do you need me to do?
[10:46 AM] Alex: Just a quick timeline update by EOD. That's all.
[11:00 AM] Jordan: Okay, I can do that. Sorry for snapping.`;

const MOCK_MESSAGES = [
  { id: 1, sender: 'Alex', text: "We need to talk about the project deadline.", timestamp: "10:00 AM", sentiment: -0.2, subtext: "Serious tone detected." },
  { id: 2, sender: 'Jordan', text: "Again? I thought we settled this yesterday.", timestamp: "10:05 AM", sentiment: -0.6, subtext: "Defensive. Detecting frustration." },
  { id: 3, sender: 'Alex', text: "I'm not trying to argue. I'm just worried we're falling behind.", timestamp: "10:07 AM", sentiment: -0.1, subtext: "Attempting de-escalation." },
  { id: 4, sender: 'Jordan', text: "It feels like you don't trust my process.", timestamp: "10:15 AM", sentiment: -0.8, subtext: "Vulnerability masked as accusation." },
  { id: 5, sender: 'Alex', text: "It's not about trust. It's about the client's expectations.", timestamp: "10:16 AM", sentiment: 0.1, subtext: "Shifting focus to external factors." },
  { id: 6, sender: 'Jordan', text: "Fine. What do you need me to do?", timestamp: "10:45 AM", sentiment: -0.3, subtext: "Reluctant compliance." },
  { id: 7, sender: 'Alex', text: "Just a quick timeline update by EOD. That's all.", timestamp: "10:46 AM", sentiment: 0.4, subtext: "Reassurance offered." },
  { id: 8, sender: 'Jordan', text: "Okay, I can do that. Sorry for snapping.", timestamp: "11:00 AM", sentiment: 0.7, subtext: "Genuine repair attempt." },
];

const EMOTIONAL_ARC_DATA = [
  { time: 'Start', Alex: 40, Jordan: 30, Tension: 20 },
  { time: '10:05', Alex: 35, Jordan: 10, Tension: 70 },
  { time: '10:15', Alex: 45, Jordan: 5, Tension: 85 },
  { time: '10:30', Alex: 50, Jordan: 20, Tension: 60 },
  { time: '10:45', Alex: 60, Jordan: 40, Tension: 40 },
  { time: 'End', Alex: 80, Jordan: 75, Tension: 10 },
];

const PERSONALITY_DATA = [
  { subject: 'Empathy', A: 120, B: 110, fullMark: 150 },
  { subject: 'Logic', A: 98, B: 130, fullMark: 150 },
  { subject: 'Aggression', A: 40, B: 90, fullMark: 150 },
  { subject: 'Patience', A: 110, B: 60, fullMark: 150 },
  { subject: 'Clarity', A: 130, B: 100, fullMark: 150 },
];

const FAQ_DATA = [
  { q: "Can AI predict if a breakup is coming?", a: "AI analyzes patterns like contempt and stonewalling to provide probability-based insights. It identifies risk factors early, though it cannot predict the future with certainty." },
  { q: "What kind of relationship advice can I get?", a: "You get objective feedback on communication styles, hidden subtext, conflict triggers, and personalized suggestions for improvement." },
  { q: "Is this reliable?", a: "The AI acts as an unbiased third party using NLP. It's accurate at decoding tone and intent, but should be used as a guidance tool rather than a replacement for professional therapy." },
  { q: "Can it tell if someone is interested in me?", a: "AI chat analysis can identify patterns often associated with romantic interest, such as frequent initiation, quick response times, longer messages, positive sentiment, use of personal questions, and mirroring language. However, these are only potential indicators, not definitive proof. Someone might be naturally engaging, friendly, or context could influence their behavior. AI provides clues based on communication style, but interpreting true romantic interest requires human understanding and context." },
  { q: "Can it understand our inside jokes?", a: "It detects the positive sentiment and intimacy markers associated with inside jokes, even if it doesn't get the specific reference." },
];

/* -------------------------------------------------------------------------- */
/* API HELPERS                                  */
/* -------------------------------------------------------------------------- */

const callGemini = async (prompt, systemInstruction = "") => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      }
    );
    
    if (!response.ok) {
       throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

const callGeminiChat = async (history, newQuestion, context) => {
  try {
    const prompt = `
      Context: You are "The Third Person", an objective, wise, and analytical relationship mediator. 
      You are analyzing the following chat transcript: "${context}".
      
      User Question: "${newQuestion}"
      
      Answer the user's question based strictly on the transcript provided. Be helpful, concise, and objective.
      Avoid slang. Use professional, empathetic language.
      Do not return JSON, just return plain text formatted with Markdown if needed.
    `;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );
     if (!response.ok) throw new Error("API Error");
     const data = await response.json();
     return data.candidates[0].content.parts[0].text;
  } catch (e) {
    console.error(e);
    return "I'm having trouble connecting to the intuitive plane right now. Please try again.";
  }
}

/* -------------------------------------------------------------------------- */
/* VISUAL COMPONENTS                              */
/* -------------------------------------------------------------------------- */

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const particleCount = 60; // Minimal count for cleaner look

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${p.alpha})`; // Cyan tint
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-40" />;
};

/* -------------------------------------------------------------------------- */
/* UI COMPONENTS                                  */
/* -------------------------------------------------------------------------- */

const Sidebar = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: Eye },
    { id: 'oracle', label: 'AI Assistant', icon: Sparkles },
    { id: 'subtext', label: 'Subtext Analysis', icon: Brain },
    { id: 'dynamics', label: 'Power Dynamics', icon: Zap },
    { id: 'timeline', label: 'Narrative Arc', icon: Activity },
    { id: 'health', label: 'Relationship Health', icon: Heart },
  ];

  return (
    <>
      <div 
        className={`fixed inset-0 z-20 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsOpen(false)}
      />
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#0B0F19] border-r border-slate-800/60 transform transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center">
            <Cpu className="text-cyan-400 w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight font-sans">
            Third Person
          </span>
        </div>
        <nav className="mt-6 px-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 px-2">Analytics</div>
          <ul className="space-y-1">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                    ${activeTab === item.id 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};

const MetricCard = ({ title, value, subtext, trend, color = "cyan" }) => {
  const colors = {
    cyan: "border-cyan-500/20 shadow-[0_0_30px_-10px_rgba(34,211,238,0.1)]",
    blue: "border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.1)]",
    rose: "border-rose-500/20 shadow-[0_0_30px_-10px_rgba(244,63,94,0.1)]",
    amber: "border-amber-500/20 shadow-[0_0_30px_-10px_rgba(245,158,11,0.1)]",
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border bg-[#0F172A]/40 backdrop-blur-md p-6 transition-all hover:bg-[#0F172A]/60 duration-300 ${colors[color]}`}>
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight font-sans">{value}</h3>
        </div>
        {trend && (
          <div className={`px-2 py-1 rounded text-xs font-medium border border-white/5 ${trend > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-3 font-medium">{subtext}</p>
    </div>
  );
};

const ChatBubble = ({ msg }) => {
  const isMe = msg.sender === 'Jordan'; 
  return (
    <div className={`flex w-full mb-6 ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] lg:max-w-[65%] group relative transition-transform hover:translate-y-[-2px]`}>
        <div className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover:opacity-100 transition-all duration-300 z-10`}>
          <span className="bg-[#0B0F19] border border-cyan-500/30 text-cyan-400 text-xs font-medium px-3 py-1.5 rounded shadow-xl whitespace-nowrap flex items-center gap-1">
             <Monitor className="w-3 h-3" />
             Analysis: {msg.subtext}
          </span>
        </div>
        <div className={`p-5 rounded-lg text-sm font-normal leading-relaxed shadow-lg border
          ${isMe 
            ? 'bg-blue-600/10 border-blue-500/20 text-blue-50 rounded-br-none' 
            : 'bg-[#1E293B]/50 border-slate-700/50 text-slate-300 rounded-bl-none'
          }`}>
          <div className="flex justify-between items-center mb-2 opacity-50 text-[10px] font-bold uppercase tracking-wider">
            <span>{msg.sender}</span>
            <span className="ml-4">{msg.timestamp}</span>
          </div>
          {msg.text}
        </div>
      </div>
    </div>
  );
};

const OverviewView = ({ data }) => {
  const healthScore = data?.healthScore || 78;
  const conflictLevel = data?.conflictLevel || "Low";
  const dominantTone = data?.dominantTone || "Analytical";
  const verdict = data?.verdict || {
    coreConflict: "Misalignment on trust vs. competence.",
    resolutionStrategy: "Alex effectively de-escalated by validating the timeline.",
    hiddenPattern: "Jordan tends to use apologies to end conflicts quickly."
  };

  return (
  <div className="space-y-6 animate-fadeIn pb-10 relative z-10">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard 
        title="Health Score" 
        value={`${healthScore}/100`} 
        subtext="Algorithmic assessment" 
        trend={healthScore > 70 ? 12 : -5} 
        color={healthScore > 75 ? "cyan" : healthScore > 50 ? "amber" : "rose"} 
      />
      <MetricCard title="Conflict Risk" value={conflictLevel} subtext="Sentiment volatility" color="rose" />
      <MetricCard title="Dominant Tone" value={dominantTone} subtext="Semantic analysis" color="blue" />
      <MetricCard title="Engagement" value="Mid" subtext="Interaction velocity" color="amber" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-[#0F172A]/40 border border-slate-700/50 backdrop-blur-md rounded-xl p-6 shadow-xl">
        <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2 uppercase tracking-wider">
          <Activity className="w-4 h-4 text-cyan-400" />
          Emotional Velocity
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={EMOTIONAL_ARC_DATA}>
              <defs>
                <linearGradient id="colorTension" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAlex" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
              <YAxis stroke="#64748b" tick={{fill: '#64748b', fontSize: 11}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '4px', color: '#f8fafc' }}
                itemStyle={{ color: '#cbd5e1' }}
              />
              <Area type="monotone" dataKey="Tension" stroke="#f43f5e" fillOpacity={1} fill="url(#colorTension)" strokeWidth={2} />
              <Area type="monotone" dataKey="Alex" stroke="#22d3ee" fillOpacity={1} fill="url(#colorAlex)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-[#0F172A]/40 border border-slate-700/50 backdrop-blur-md rounded-xl p-6 shadow-xl flex flex-col">
        <h3 className="text-sm font-bold text-slate-300 mb-6 flex items-center gap-2 uppercase tracking-wider">
          <Eye className="w-4 h-4 text-cyan-400" />
          AI Diagnosis
        </h3>
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/30 transition-colors">
            <h4 className="text-blue-400 font-bold text-xs uppercase tracking-wide mb-2">Primary Friction</h4>
            <p className="text-slate-400 text-sm leading-relaxed">{verdict.coreConflict}</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/30 transition-colors">
            <h4 className="text-emerald-400 font-bold text-xs uppercase tracking-wide mb-2">Strategy</h4>
            <p className="text-slate-400 text-sm leading-relaxed">{verdict.resolutionStrategy}</p>
          </div>
          <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10 hover:border-rose-500/30 transition-colors">
            <h4 className="text-rose-400 font-bold text-xs uppercase tracking-wide mb-2">Pattern Recognition</h4>
            <p className="text-slate-400 text-sm leading-relaxed">{verdict.hiddenPattern}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
)};

const SubtextDecoder = () => (
  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full animate-fadeIn pb-10 relative z-10">
    <div className="lg:col-span-3 bg-[#0F172A]/40 border border-slate-700/50 backdrop-blur-md rounded-xl shadow-xl flex flex-col h-[calc(100vh-140px)]">
      <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-slate-900/30 rounded-t-xl">
        <h3 className="font-bold text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          Processed Log
        </h3>
        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/30 px-2 py-1 rounded border border-cyan-500/20">INTERACTIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-2">
        {MOCK_MESSAGES.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
      </div>
    </div>

    <div className="lg:col-span-2 space-y-6">
       <div className="bg-[#0F172A]/40 border border-slate-700/50 backdrop-blur-md rounded-xl p-6">
        <h3 className="text-sm font-bold text-slate-300 mb-6 uppercase tracking-wider">Communication Vector</h3>
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
            <RadarChart outerRadius={90} data={PERSONALITY_DATA}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar name="Alex" dataKey="A" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
              <Radar name="Jordan" dataKey="B" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} />
              <Legend wrapperStyle={{ color: '#cbd5e1', fontSize: '11px' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
       </div>

       <div className="bg-[#0F172A]/40 border border-slate-700/50 backdrop-blur-md rounded-xl p-6">
          <h3 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Key Events</h3>
          <ul className="space-y-3">
            <li className="flex gap-4 items-start p-3 hover:bg-white/5 rounded-lg transition-all cursor-pointer border border-transparent hover:border-slate-700">
              <div className="w-8 h-8 rounded bg-rose-500/10 flex items-center justify-center shrink-0 border border-rose-500/20">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <div className="flex justify-between w-full">
                  <h5 className="text-slate-200 font-semibold text-sm">Defensiveness Spike</h5>
                  <span className="text-[10px] text-slate-500 font-mono">10:15 AM</span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">Insecurity projected onto a logistical request.</p>
              </div>
            </li>
          </ul>
       </div>
    </div>
  </div>
);

const OracleView = ({ chatContext }) => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'I am the Third Person. I have analyzed the transcript. How can I help you understand the dynamics?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    const answer = await callGeminiChat(messages, userMsg, chatContext);
    
    setLoading(false);
    setMessages(prev => [...prev, { role: 'ai', text: answer }]);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#0F172A]/40 border border-slate-700/50 backdrop-blur-md rounded-xl overflow-hidden animate-fadeIn shadow-2xl relative z-10">
      <div className="p-6 bg-slate-900/30 border-b border-slate-700/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <h3 className="font-bold text-slate-200 text-sm uppercase tracking-wider">AI Assistant</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-bold text-emerald-500 tracking-wider">ONLINE</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-lg text-sm font-medium leading-relaxed shadow-lg ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : 'bg-[#1E293B] border border-slate-700 text-slate-300 rounded-bl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-[#1E293B] px-4 py-3 rounded-lg rounded-bl-none text-xs flex gap-2 items-center border border-slate-700">
               <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" />
               <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-75" />
               <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce delay-150" />
             </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="p-4 bg-slate-900/30 border-t border-slate-700/50">
        <div className="flex gap-3 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Query the model..."
            className="flex-1 bg-slate-950 border border-slate-700 text-white text-sm rounded-lg px-6 py-3 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600 font-mono"
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-400 text-black p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-slate-800 rounded-lg bg-[#0F172A]/30 backdrop-blur-sm overflow-hidden transition-all hover:bg-[#0F172A]/50 group">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-5 text-left"
      >
        <span className="font-semibold text-slate-300 text-sm group-hover:text-white transition-colors">{question}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
      </button>
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="p-5 pt-0 text-slate-400 text-sm leading-relaxed border-t border-slate-800/50 mt-2">
          {answer}
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, color = "cyan" }) => {
  const colors = {
    cyan: "text-cyan-400 bg-cyan-950/30 border-cyan-500/20",
    blue: "text-blue-400 bg-blue-950/30 border-blue-500/20",
    emerald: "text-emerald-400 bg-emerald-950/30 border-emerald-500/20",
    purple: "text-purple-400 bg-purple-950/30 border-purple-500/20",
    amber: "text-amber-400 bg-amber-950/30 border-amber-500/20",
    rose: "text-rose-400 bg-rose-950/30 border-rose-500/20"
  };

  return (
    <div className="group relative p-6 rounded-xl bg-[#0F172A]/30 border border-slate-800 backdrop-blur-sm hover:border-slate-600 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl h-full flex flex-col">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colors[color]} border transition-transform group-hover:scale-105`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-base font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed flex-1">{desc}</p>
    </div>
  );
};

const Header = () => {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="w-full z-50 border-b border-slate-800 bg-[#020617]/80 backdrop-blur-md sticky top-0">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/20 flex items-center justify-center">
            <Cpu className="text-cyan-400 w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Third Person</span>
        </div>
        
        <div className="flex items-center gap-8">
          <button onClick={() => scrollTo('how-it-works')} className="text-slate-400 hover:text-cyan-400 text-xs font-semibold uppercase tracking-wider transition-colors hidden md:block">
            Process
          </button>
          <button onClick={() => scrollTo('when-to-use')} className="text-slate-400 hover:text-cyan-400 text-xs font-semibold uppercase tracking-wider transition-colors hidden md:block">
            Use Cases
          </button>
          <button onClick={() => scrollTo('features')} className="text-slate-400 hover:text-cyan-400 text-xs font-semibold uppercase tracking-wider transition-colors hidden md:block">
            Intelligence
          </button>
          <button onClick={() => scrollTo('upload-section')} className="bg-cyan-500 hover:bg-cyan-400 text-black px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)]">
            Start Analysis
          </button>
        </div>
      </div>
    </nav>
  );
};

const LandingView = ({ onAnalyze, textInput, setTextInput, loading }) => {
  const scrollToUpload = () => {
    document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="animate-fadeIn relative z-10">
      <Header />

      {/* Hero / Upload Section */}
      <div id="upload-section" className="min-h-[85vh] flex flex-col justify-center items-center py-24 relative">
        <div className="w-full max-w-5xl px-6 text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/10 backdrop-blur-sm mb-4">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">AI-Powered Relationship Intelligence</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tight leading-tight">
              Decode the <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Relationship</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Advanced natural language processing to reveal hidden dynamics, emotional velocity, and compatibility vectors in your conversations.
            </p>
          </div>

          {/* Upload Interface */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch mt-12 p-1.5 rounded-2xl bg-gradient-to-b from-slate-700/50 to-slate-800/50 backdrop-blur-sm max-w-4xl mx-auto border border-slate-700/50">
            <div className="flex-1 bg-[#020617] rounded-xl flex flex-col text-left relative group border border-slate-800">
              <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent rounded-t-xl opacity-50 pointer-events-none" />
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Paste chat export..."
                className="flex-1 bg-transparent border-none rounded-xl p-6 text-sm text-slate-300 font-mono focus:outline-none resize-none min-h-[200px] placeholder:text-slate-600"
              />
              <div className="p-3 flex justify-between items-center border-t border-slate-800 bg-[#050B14] rounded-b-xl">
                <button 
                  onClick={() => setTextInput(DEFAULT_CHAT_TEXT)}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-wider flex items-center gap-2 hover:bg-cyan-950/30 px-2 py-1 rounded transition-colors"
                >
                  <Upload className="w-3 h-3" />
                  Load Sample Data
                </button>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <Lock className="w-3 h-3" />
                  E2E Encrypted
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center min-w-[220px]">
              <button 
                onClick={onAnalyze}
                disabled={loading}
                className="h-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold transition-all shadow-[0_0_40px_-10px_rgba(6,182,212,0.3)] flex flex-col items-center justify-center gap-3 group disabled:opacity-70 disabled:cursor-wait relative overflow-hidden border border-white/10"
              >
                {loading ? (
                   <div className="flex flex-col items-center gap-2">
                     <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                     <span className="text-xs font-bold uppercase tracking-widest">Processing...</span>
                   </div>
                ) : (
                  <>
                    <Sparkles className="w-8 h-8 text-cyan-100" />
                    <div className="text-center">
                      <span className="text-lg block tracking-tight">Run Analysis</span>
                      <span className="text-[10px] font-bold text-cyan-100/70 uppercase tracking-widest">POWERED BY AI</span>
                    </div>
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Platform Support */}
          <div className="pt-8 flex flex-wrap justify-center gap-6 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
             <MessageCircle className="w-5 h-5 text-[#25D366]" />
             <MessageSquare className="w-5 h-5 text-[#007AFF]" />
             <Instagram className="w-5 h-5 text-[#E1306C]" />
             <Send className="w-5 h-5 text-[#0088cc]" />
             <Ghost className="w-5 h-5 text-[#FFFC00]" />
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div id="how-it-works" className="py-24 border-t border-slate-800 bg-[#050B14]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">Three simple steps to unlock insights.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 text-slate-400 group-hover:text-cyan-400 group-hover:bg-cyan-950/30 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">1. Export Chats</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Securely upload chat exports from any major messaging platform. We handle various formats.</p>
             </div>

             <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-blue-500/30 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-950/30 transition-colors">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">2. Get Analysis</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Our AI analyzes communication patterns, sentiment, and personality insights in under 60 seconds.</p>
             </div>

             <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-emerald-500/30 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center mb-6 text-slate-400 group-hover:text-emerald-400 group-hover:bg-emerald-950/30 transition-colors">
                  <Monitor className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">3. Discover Insights</h3>
                <p className="text-slate-400 text-sm leading-relaxed">Interactive dashboards with sentiment timelines, compatibility breakdowns, and real advice.</p>
             </div>
          </div>
        </div>
      </div>

      {/* When to Use */}
      <div id="when-to-use" className="py-24 border-t border-slate-800 bg-[#020617]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
            <div>
              <div className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-2">Use Cases</div>
              <h2 className="text-3xl font-bold text-white">When to Use AI Relationship Analysis</h2>
            </div>
            <p className="text-slate-400 text-sm max-w-md text-right">From dating to breakups, it provides insights at every stage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-800/30 to-transparent border border-slate-800 hover:border-cyan-500/30 transition-all">
              <HeartHandshake className="w-8 h-8 text-cyan-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Dating & New Relationships</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Analyze early communication patterns to understand compatibility before getting too invested.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-800/30 to-transparent border border-slate-800 hover:border-blue-500/30 transition-all">
              <History className="w-8 h-8 text-blue-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Long-Term Relationships</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Understand how your relationship dynamics have evolved over time.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-800/30 to-transparent border border-slate-800 hover:border-rose-500/30 transition-all">
              <UserMinus className="w-8 h-8 text-rose-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Post-Breakup Clarity</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Get objective insights into what went wrong through AI-powered relationship analysis.</p>
            </div>
            
            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-800/30 to-transparent border border-slate-800 hover:border-blue-500/30 transition-all">
              <Brain className="w-8 h-8 text-cyan-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Mental Clarity</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Untangle complex thoughts and emotions to uncover repeating patterns, cut through mental noise, and regain focus, direction, and momentum.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-800/30 to-transparent border border-slate-800 hover:border-rose-500/30 transition-all">
              <MessageCircleHeart className="w-8 h-8 text-blue-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Relationship Clarity</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Decode conversations from both perspectives to uncover emotional gaps and hidden misunderstandings.</p>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-to-b from-slate-800/30 to-transparent border border-slate-800 hover:border-rose-500/30 transition-all">
              <Ear className="w-8 h-8 text-rose-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">A Space That Listens</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Speak freely in a private, judgment-free space that’s always available, and feel heard, understood, and supported.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="py-24 border-t border-slate-800 bg-[#050B14]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Relationship Analysis</h2>
            <p className="text-slate-400 text-sm">Analyzes millions of data points to reveal communication patterns, emotional dynamics, and compatibility factors.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Zap}
              title="Compatibility Score"
              desc="Analyzes conversation patterns to reveal true compatibility."
              color="cyan"
            />
            <FeatureCard 
              icon={Fingerprint}
              title="MBTI Analysis"
              desc="Discover personality types from actual conversation data."
              color="emerald"
            />
            <FeatureCard 
              icon={Activity}
              title="Sentiment Timeline"
              desc="Track emotional patterns throughout your relationship."
              color="rose"
            />
            <FeatureCard 
              icon={MessageSquare}
              title="Response Patterns"
              desc="Understand communication dynamics and engagement levels"
              color="amber"
            />
            <FeatureCard 
              icon={CalendarClock}
              title="Activity Heatmap"
              desc="Visualize when you connect most with each other"
              color="blue"
            />
             <FeatureCard 
              icon={Trophy}
              title="Viral Moments"
              desc="Rediscover your funniest and most memorable exchanges."
              color="purple"
            />
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-24 border-t border-slate-800 bg-[#020617]">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-8 text-center">Relationship Analysis FAQs</h2>
          <div className="space-y-3">
            {FAQ_DATA.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-12 border-t border-slate-800 bg-[#020617] text-center">
        <h2 className="text-2xl font-bold text-white mb-6">Ready to decode?</h2>
        <div className="flex flex-col items-center gap-6">
          <button 
            onClick={scrollToUpload}
            className="bg-slate-100 hover:bg-white text-black px-8 py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-all shadow-lg hover:shadow-xl hover:scale-105"
          >
            Launch Analysis
          </button>
          <div className="flex gap-8 text-slate-500 text-xs font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">API</a>
          </div>
          <p className="text-slate-700 text-xs mt-4">© 2026 Third Person AI. Enterprise Grade Analysis.</p>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN APP                                    */
/* -------------------------------------------------------------------------- */

export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);

  const handleAnalyze = async () => {
    if (!textInput.trim()) return;
    setIsAnalyzing(true);
    
    // Simulate API delay for dramatic effect if needed, or just call Gemini
    const prompt = `
      You are an expert relationship mediator and communication analyst. 
      Analyze the following chat log and return a JSON object.
      
      CHAT LOG:
      ${textInput}

      JSON SCHEMA:
      {
        "healthScore": (number 0-100),
        "conflictLevel": (string, e.g. "Low", "Moderate", "High"),
        "dominantTone": (string, e.g. "Passive Aggressive", "Collaborative", "Direct"),
        "verdict": {
          "coreConflict": (string, 1 sentence summary),
          "resolutionStrategy": (string, 1 sentence advice),
          "hiddenPattern": (string, observation of a behavioral pattern)
        }
      }
      
      Ensure the JSON is valid and contains no other text.
    `;

    const result = await callGemini(prompt, "You are a JSON-only response bot.");
    
    if (result) {
      setAnalysisData(result);
      setIsAnalyzed(true);
      setActiveTab('overview');
    } else {
      alert("Analysis failed. Please try again.");
    }
    
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      <ParticleBackground />
      
      {/* Top Navigation Mobile */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-[#020617]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center">
             <Cpu className="text-cyan-400 w-4 h-4" />
          </div>
          <span className="font-bold text-white tracking-tight">Third Person</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        {isAnalyzed && (
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
        )}

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto transition-all duration-300 ${isAnalyzed ? 'lg:ml-64' : ''} custom-scrollbar relative z-10`}>
          <div className={!isAnalyzed ? "w-full" : "max-w-7xl mx-auto p-4 lg:p-8"}>
            
            {!isAnalyzed ? (
              <LandingView 
                onAnalyze={handleAnalyze} 
                textInput={textInput} 
                setTextInput={setTextInput}
                loading={isAnalyzing}
              />
            ) : (
              <>
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-2xl font-bold text-white tracking-tight">
                        {activeTab === 'overview' && 'Mission Control'}
                        {activeTab === 'oracle' && 'AI Assistant'}
                        {activeTab === 'subtext' && 'Subtext Analysis'}
                        {activeTab === 'dynamics' && 'Power Dynamics'}
                        {activeTab === 'timeline' && 'Narrative Arc'}
                        {activeTab === 'health' && 'Health Statistics'}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/20">LIVE</span>
                    </div>
                    <p className="text-slate-500 text-xs font-mono">
                      SESSION ID: {Math.random().toString(36).substr(2, 9).toUpperCase()} • {new Date().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsAnalyzed(false)}
                      className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-all uppercase tracking-wider"
                    >
                      New Scan
                    </button>
                    <button className="px-4 py-2 text-xs font-bold text-black bg-cyan-500 hover:bg-cyan-400 rounded-lg shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2 uppercase tracking-wider">
                      <ArrowUpRight className="w-3 h-3" />
                      Export
                    </button>
                  </div>
                </header>

                {/* Content Views */}
                {activeTab === 'overview' && <OverviewView data={analysisData} />}
                {activeTab === 'oracle' && <OracleView chatContext={textInput} />}
                {activeTab === 'subtext' && <SubtextDecoder />}
                
                {(activeTab !== 'overview' && activeTab !== 'oracle' && activeTab !== 'subtext') && (
                  <div className="flex flex-col items-center justify-center h-96 text-center space-y-6 border border-dashed border-slate-800 rounded-xl bg-[#0F172A]/30 backdrop-blur-md">
                    <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center animate-pulse">
                      <Zap className="w-8 h-8 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-300">Module Initializing...</h3>
                      <p className="text-slate-500 text-sm mt-2 max-w-sm">
                        This analytic vector is currently being trained on your data.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveTab('overview')}
                      className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-widest border-b border-cyan-500/30 pb-1"
                    >
                      Return to Dashboard
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* Global Styles for Animations and Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155; 
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
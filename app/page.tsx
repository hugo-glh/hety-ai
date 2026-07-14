"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, User, Paperclip, Plus, MessageSquare, X, LogOut, ShieldCheck, ArrowRight, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// --- TYPES POUR L'HISTORIQUE ---
interface Message { role: string; content: string; }
interface ChatSession { id: string; title: string; messages: Message[]; date: number; }

export default function HetyElitePro() {
  // ÉTATS DE CONNEXION
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('galmichehugo52@gmail.com');
  
  // ÉTATS DU CHAT
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CHARGEMENT DE L'HISTORIQUE
  useEffect(() => {
    const savedSessions = localStorage.getItem('hety_history');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        setCurrentSessionId(parsed[0].id);
      }
    }
  }, []);

  // SAUVEGARDE AUTOMATIQUE
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('hety_history', JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [currentSessionId, sessions, isTyping]);

  // ACTION : CRÉER UNE NOUVELLE DISCUSSION
  const createNewChat = () => {
    const newId = Date.now().toString();
    const newSession: ChatSession = {
      id: newId,
      title: "Nouvelle discussion",
      messages: [{ role: 'assistant', content: "Bonjour Hugo. Je suis Hety. Comment puis-je t'aider aujourd'hui ?" }],
      date: Date.now()
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
  };

  // NETTOYAGE DU TEXTE ET SÉPARATION DU CODE
  const formatIncomingText = (text: string) => {
    if (!text) return "";
    let cleaned = text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '  ')
      .replace(/&nbsp;/g, ' ');

    cleaned = cleaned.replace(/([^\n])```(\w*)/g, '$1\n```$2'); 
    cleaned = cleaned.replace(/```([^\n]*?)([^\n]+)/g, '```$1\n$2');
    return cleaned;
  };

  // COPIER LE TEXTE DU CODE
  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Échec de la copie : ", err);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedFile) return;
    
    let activeSession = sessions.find(s => s.id === currentSessionId);
    let currentId = currentSessionId;

    if (!activeSession) {
      const newId = Date.now().toString();
      const newSession: ChatSession = {
        id: newId,
        title: input.substring(0, 30) || "Nouvelle discussion",
        messages: [],
        date: Date.now()
      };
      sessions.unshift(newSession);
      activeSession = newSession;
      currentId = newId;
      setCurrentSessionId(newId);
    }

    const userMsg = { role: 'user', content: input.trim() || `Fichier : ${attachedFile?.name}` };
    const updatedMessages = [...activeSession.messages, userMsg];
    
    const updatedSessions = sessions.map(s => 
      s.id === currentId 
      ? { ...s, messages: updatedMessages, title: s.title === "Nouvelle discussion" ? input.substring(0, 30) : s.title } 
      : s
    );
    
    setSessions(updatedSessions);
    setInput('');
    setAttachedFile(null);
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const data = await response.json();
      
      const cleanedContent = formatIncomingText(data.content || "");
      
      setSessions(prev => prev.map(s => 
        s.id === currentId 
        ? { ...s, messages: [...updatedMessages, { role: 'assistant', content: cleanedContent }] } 
        : s
      ));
    } catch (err) {
      console.error(err);
    } finally {
      setIsTyping(false);
    }
  };

  // --- ÉCRAN DE CONNEXION ---
  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full bg-[#0A0A0B] flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-[#121214] border border-white/5 p-8 rounded-[2rem] shadow-2xl text-center">
          <div className="w-12 h-12 bg-[#00D1FF]/10 rounded-xl flex items-center justify-center mx-auto mb-4 border border-[#00D1FF]/20">
            <Zap className="text-[#00D1FF]" size={24} fill="#00D1FF" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tighter">CONNEXION REQUISE</h1>
          <p className="text-zinc-500 text-xs mb-6">Connecte-toi pour commencer à ddiscuter avec Hety.</p>
          
          <div className="space-y-3 text-left">
            <div>
              <label className="text-[9px] text-zinc-500 uppercase tracking-widest ml-3 mb-1.5 block">Adresse Email / Identifiant</label>
              <input 
                type="email" 
                placeholder="Ex: ton-adresse@mail.com" 
                className="w-full bg-black border border-white/5 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-[#00D1FF]/50 transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <button 
              onClick={() => email.length > 3 && setIsLoggedIn(true)}
              className="w-full bg-[#00D1FF] text-black font-bold p-3 rounded-xl flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all text-sm shadow-[0_0_15px_rgba(0,209,255,0.25)]"
            >
              Se connecter <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeSession = sessions.find(s => s.id === currentSessionId) || { messages: [] };

  return (
    <div className="flex h-screen w-full bg-[#09090B] text-[#E4E4E7] font-sans overflow-hidden antialiased">
      
      {/* SIDEBAR COMPACTE */}
      <aside className="w-[240px] bg-[#09090B] hidden md:flex flex-col border-r border-white/5">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-1.5 font-bold text-[#00D1FF] text-base tracking-tighter">
            <Zap size={16} fill="#00D1FF" /> HETY AI
          </div>
          <button onClick={() => setIsLoggedIn(false)} className="text-zinc-600 hover:text-red-400 transition-colors" title="Déconnexion">
            <LogOut size={15} />
          </button>
        </div>
        
        <div className="p-3">
          <button 
            onClick={createNewChat}
            className="w-full p-2.5 rounded-xl bg-[#00D1FF]/5 text-[#00D1FF] border border-[#00D1FF]/10 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[#00D1FF]/10 transition-all"
          >
            <Plus size={14} /> Nouvelle discussion
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
          <p className="text-[9px] text-zinc-600 uppercase tracking-widest px-2.5 my-2 font-bold">Historique</p>
          {sessions.map(s => (
            <div 
              key={s.id}
              onClick={() => setCurrentSessionId(s.id)}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all border text-xs ${currentSessionId === s.id ? 'bg-[#18181B] border-white/5 text-white shadow-md' : 'bg-transparent border-transparent text-zinc-500 hover:bg-[#121214] hover:text-zinc-300'}`}
            >
              <MessageSquare size={13} className={currentSessionId === s.id ? 'text-[#00D1FF]' : 'text-zinc-700'} />
              <div className="flex-1 truncate font-medium">{s.title}</div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-white/5 space-y-2">
           <div className="flex items-center gap-2 text-zinc-600 text-[11px] truncate">
              <ShieldCheck size={13} className="text-[#00D1FF]" />
              <span className="truncate">{email}</span>
           </div>
           <div className="text-[8px] text-zinc-700 uppercase tracking-[0.3em] font-medium">HUGO GALMICHE</div>
        </div>
      </aside>

      {/* ZONE DE CONVERSATION */}
      <main className="flex-1 flex flex-col h-full bg-[#09090B] relative">
        <div className="flex-1 overflow-y-auto w-full scroll-smooth">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
            
            {activeSession.messages.length === 0 && (
              <div className="h-[60vh] flex flex-col items-center justify-center text-center">
                <Zap size={44} className="text-[#00D1FF]/60 mb-4 animate-pulse" fill="#00D1FF" />
                <h2 className="text-xl font-medium tracking-tight mb-1 text-zinc-300">Comment puis-je t'aider aujourd'hui, Hugo ?</h2>
                <p className="text-zinc-600 text-xs max-w-xs">Sélectionne une ancienne conversation ou commence à écrire.</p>
              </div>
            )}

            {activeSession.messages.map((m, i) => (
              <div key={i} className={`flex gap-4 mb-8 relative group ${m.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow ${m.role === 'assistant' ? 'bg-[#111] border border-[#00D1FF]/30 text-[#00D1FF]' : 'bg-zinc-800 text-zinc-300'}`}>
                  {m.role === 'assistant' ? <Zap size={14} fill="#00D1FF" /> : <User size={14} />}
                </div>
                
                {/* Contenu du message */}
                <div className={`text-[14px] leading-relaxed pt-0.5 w-full max-w-[90%] whitespace-pre-wrap relative ${m.role === 'assistant' ? 'text-zinc-200' : 'bg-[#18181B]/60 px-4 py-2.5 rounded-2xl border border-white/5'}`}>
                  {m.role === 'assistant' ? (
                    <ReactMarkdown
                      components={{
                        // 1. Évite l'erreur d'hydration en transformant les paragraphes <p> en <div>
                        p({ children }) {
                          return <div className="mb-3 last:mb-0">{children}</div>;
                        },
                        // 2. Rendu et coloration propre du code
                        code({ node, inline, className, children, ...props }: any) {
                          const match = /language-(\w+)/.exec(className || '');
                          const codeContent = String(children).replace(/\n$/, '');
                          const blockId = `code-${i}-${match ? match[1] : 'text'}`;
                          
                          return !inline ? (
                            <div className="my-4 rounded-xl overflow-hidden border border-white/10 shadow-lg font-mono text-xs max-w-full">
                              <div className="bg-[#18181b] px-4 py-2 text-[10px] text-zinc-400 border-b border-white/5 uppercase tracking-wider flex justify-between items-center">
                                <span>{match ? match[1] : 'code'}</span>
                                <button
                                  onClick={() => handleCopy(codeContent, blockId)}
                                  className="flex items-center gap-1.5 hover:text-white transition-colors p-1"
                                >
                                  {copiedId === blockId ? (
                                    <>
                                      <Check size={11} className="text-emerald-400" />
                                      <span className="text-emerald-400">Copié !</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy size={11} />
                                      <span>Copier</span>
                                    </>
                                  )}
                                </button>
                              </div>
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match ? match[1] : 'javascript'}
                                PreTag="div"
                                customStyle={{ margin: 0, padding: '1rem', background: '#0D0D0F' }}
                                {...props}
                              >
                                {codeContent}
                              </SyntaxHighlighter>
                            </div>
                          ) : (
                            <code className="bg-zinc-800/40 px-1.5 py-0.5 rounded text-xs font-mono text-[#00D1FF]" {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {formatIncomingText(m.content)}
                    </ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-2 items-center px-12 py-2">
                <div className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full animate-bounce [animation-delay:-.3s]" />
                <div className="w-1.5 h-1.5 bg-[#00D1FF] rounded-full animate-bounce [animation-delay:-.5s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* COMPACT INPUT BAR */}
        <div className="w-full bg-gradient-to-t from-[#09090B] via-[#09090B] to-transparent p-4 sm:p-6">
          <div className="max-w-2xl mx-auto w-full">
            
            {attachedFile && (
              <div className="mb-2 flex items-center gap-2 bg-[#00D1FF]/10 border border-[#00D1FF]/20 px-2.5 py-1 rounded-lg w-fit">
                <span className="text-[10px] text-[#00D1FF]">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)} className="text-zinc-400"><X size={12}/></button>
              </div>
            )}

            <div className="bg-[#18181B]/85 border border-white/5 rounded-[2rem] flex items-center px-4 py-2 shadow-xl focus-within:border-white/10 transition-all">
              <button onClick={() => fileInputRef.current?.click()} className="text-zinc-500 hover:text-[#00D1FF] p-1.5 transition-colors">
                <Paperclip size={18} />
                <input type="file" ref={fileInputRef} onChange={(e) => e.target.files && setAttachedFile(e.target.files[0])} className="hidden" />
              </button>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder="Demander à Hety..."
                className="flex-1 bg-transparent border-none px-3 py-1.5 text-xs text-white placeholder-zinc-600 resize-none max-h-[120px] outline-none focus:outline-none focus:ring-0"
                rows={1}
              />
              
              <button 
                onClick={handleSend}
                disabled={!input.trim() && !attachedFile}
                className={`p-1.5 rounded-full transition-all ${input.trim() || attachedFile ? 'bg-white text-black hover:opacity-90' : 'bg-transparent text-zinc-700'}`}
              >
                <Send size={14} />
              </button>
            </div>
            <p className="text-center text-[8px] text-zinc-700 mt-3 tracking-[0.4em]">HETY AI SYSTEM · HUGO GALMICHE</p>
          </div>
        </div>

      </main>
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 0px; }`}</style>
    </div>
  );
}
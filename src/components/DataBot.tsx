import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Trash2, History, ArrowLeft, MessageCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { chatApi } from '../services/api';

interface Message {
    role: 'user' | 'bot';
    content: string;
    timestamp?: string;
}

interface Conversation {
    conversation_id: string;
    title: string;
    updated_at: string;
    messages: Message[];
}

// ─── Global event system to open DataBot from other components ───
export const openDataBot = (prefilledMessage?: string) => {
    window.dispatchEvent(new CustomEvent('open-databot', { detail: { message: prefilledMessage } }));
};

const DataBot = () => {
    const { isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<Conversation[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Listen for external open events
    useEffect(() => {
        const handler = (e: any) => {
            setIsOpen(true);
            setShowHistory(false);
            if (e.detail?.message) {
                setTimeout(() => {
                    setInput(e.detail.message);
                    inputRef.current?.focus();
                }, 300);
            }
        };
        window.addEventListener('open-databot', handler);
        return () => window.removeEventListener('open-databot', handler);
    }, []);

    // Welcome message
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                role: 'bot',
                content: "👋 Bonjour ! Je suis **DataBot**, l'assistant de DataPrep Pro.\n\nJe peux vous aider avec le pipeline, les tarifs, les méthodes, et les cas d'usage.\n\nQue souhaitez-vous savoir ?",
            }]);
        }
    }, [isOpen]);

    const sendMessage = useCallback(async () => {
        const msg = input.trim();
        if (!msg) return;

        setMessages(prev => [...prev, { role: 'user', content: msg }]);
        setInput('');
        setIsTyping(true);

        try {
            const res = await chatApi.sendMessage(msg, conversationId);
            const { answer, conversation_id } = res.data;
            if (conversation_id) setConversationId(conversation_id);
            setMessages(prev => [...prev, { role: 'bot', content: answer }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'bot',
                content: "⚠️ Désolé, une erreur s'est produite. Veuillez réessayer."
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [input, conversationId]);

    const loadHistory = useCallback(async () => {
        if (!isAuthenticated) return;
        setHistoryLoading(true);
        try {
            const res = await chatApi.getHistory();
            setHistory(res.data);
        } catch { /* ignore */ }
        finally { setHistoryLoading(false); }
    }, [isAuthenticated]);

    const deleteConversation = useCallback(async (id: string) => {
        try {
            await chatApi.deleteConversation(id);
            setHistory(prev => prev.filter(c => c.conversation_id !== id));
        } catch { /* ignore */ }
    }, []);

    const loadConversation = useCallback((conv: Conversation) => {
        setMessages(conv.messages || []);
        setConversationId(conv.conversation_id);
        setShowHistory(false);
    }, []);

    const startNewChat = useCallback(() => {
        setMessages([{
            role: 'bot',
            content: "👋 Nouvelle conversation ! Comment puis-je vous aider ?"
        }]);
        setConversationId(undefined);
        setShowHistory(false);
    }, []);

    // Render markdown-like bold
    const renderContent = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            // Handle newlines
            return part.split('\n').map((line, j) => (
                <span key={`${i}-${j}`}>
                    {j > 0 && <br />}
                    {line}
                </span>
            ));
        });
    };

    return (
        <>
            {/* Floating Icon */}
            <motion.button
                onClick={() => { setIsOpen(!isOpen); if (!isOpen) setShowHistory(false); }}
                className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300"
                style={{
                    background: 'linear-gradient(135deg, #1a2035, #232b45)',
                    boxShadow: '0 8px 30px rgba(26,32,53,0.5)',
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.5 }}
            >
                {isOpen ? <X className="text-white" size={24} /> : <Bot className="text-white" size={26} />}
            </motion.button>

            {/* Pulse effect when closed */}
            {!isOpen && (
                <motion.div
                    className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full"
                    style={{ background: 'linear-gradient(135deg, #1a2035, #232b45)' }}
                    animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            {/* Chat Panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="fixed bottom-24 right-6 z-50 w-[400px] max-h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-navy-950 px-5 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                {showHistory && (
                                    <button onClick={() => setShowHistory(false)} className="text-white/80 hover:text-white">
                                        <ArrowLeft size={18} />
                                    </button>
                                )}
                                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border border-white/10">
                                    <Bot className="text-white" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-sm tracking-tight">DataBot</h3>
                                    <p className="text-navy-300 text-[10px] font-bold uppercase tracking-widest">
                                        Assistant DataPrep Pro
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {isAuthenticated && !showHistory && (
                                    <button
                                        onClick={() => { setShowHistory(true); loadHistory(); }}
                                        className="text-white/70 hover:text-white transition-colors p-1"
                                        title="Historique"
                                    >
                                        <History size={18} />
                                    </button>
                                )}
                                {!showHistory && (
                                    <button
                                        onClick={startNewChat}
                                        className="text-white/70 hover:text-white transition-colors p-1"
                                        title="Nouvelle conversation"
                                    >
                                        <MessageCircle size={18} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* History View */}
                        {showHistory ? (
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                {historyLoading ? (
                                    <div className="text-center text-gray-400 py-8">Chargement...</div>
                                ) : history.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8">Aucun historique</div>
                                ) : (
                                    history.map((conv) => (
                                        <div
                                            key={conv.conversation_id}
                                            className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors group"
                                        >
                                            <div
                                                className="flex-1 min-w-0"
                                                onClick={() => loadConversation(conv)}
                                            >
                                                <p className="text-sm font-medium text-navy truncate">{conv.title}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(conv.updated_at).toLocaleDateString('fr-FR', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversation_id); }}
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1"
                                                title="Supprimer"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[380px]">
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.role === 'bot' && (
                                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mr-2 mt-1 shrink-0">
                                                    <Bot className="text-primary" size={14} />
                                                </div>
                                            )}
                                            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                                ? 'bg-primary text-white rounded-br-md'
                                                : 'bg-gray-100 text-navy-900 rounded-bl-md'
                                                }`}>
                                                {renderContent(msg.content)}
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && (
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <Bot className="text-primary" size={14} />
                                            </div>
                                            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1.5">
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <div className="p-3 border-t border-gray-100 shrink-0">
                                    <form
                                        onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                                        className="flex items-center gap-2"
                                    >
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Posez votre question..."
                                            className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-sm border-0 outline-none focus:bg-gray-100 transition-colors"
                                            disabled={isTyping}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!input.trim() || isTyping}
                                            className="p-3 rounded-xl bg-primary text-white hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                            <Send size={16} />
                                        </button>
                                    </form>
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default DataBot;

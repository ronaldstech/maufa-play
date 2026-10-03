import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { sendCompanionMessage, COMPANION_MODES, COMPANION_CONTEXT_LIMIT } from '../services/aiService';
import { Bot, Send, Sparkles, BookOpen, LogIn, Trash2, AlertCircle, Loader2, X } from 'lucide-react';
import Modal from '../components/Modal';
import RichText from '../components/RichText';
import './StudyCompanion.css';

const MAX_STORED_MESSAGES = 100;

const STARTERS = [
    'Give me an overview of the material',
    'Quiz me on the hardest parts',
    'Explain the key concepts simply',
    'Build me a study plan'
];

const CompanionChat = ({ seed, onClose }) => {
    const { currentUser, userProfile } = useAuth();
    const { openLogin, showAlert } = useUI();

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [activeMode, setActiveMode] = useState('chat');
    const [context, setContext] = useState(seed?.context || '');
    const [isContextOpen, setIsContextOpen] = useState(Boolean(seed?.context));
    const [isThinking, setIsThinking] = useState(false);
    const [error, setError] = useState(null);
    const [docId, setDocId] = useState(null);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        const node = scrollRef.current;
        if (node) {
            node.scrollTop = node.scrollHeight;
        }
    }, [messages, isThinking]);

    useEffect(() => {
        inputRef.current?.focus();
    }, [activeMode]);

    const persist = async (sessionMessages) => {
        if (!currentUser) return;

        const stored = sessionMessages.slice(-MAX_STORED_MESSAGES).map(m => ({
            role: m.role,
            content: m.content,
            mode: m.mode || 'chat',
            at: m.at
        }));
        const title = sessionMessages.find(m => m.role === 'user')?.content.slice(0, 70) || 'Study session';

        try {
            if (docId) {
                await updateDoc(doc(db, 'companion_sessions', docId), {
                    messages: stored,
                    title,
                    context: context.slice(0, COMPANION_CONTEXT_LIMIT),
                    updatedAt: serverTimestamp()
                });
            } else {
                const newRef = await addDoc(collection(db, 'companion_sessions'), {
                    userId: currentUser.uid,
                    studentName: userProfile?.displayName || null,
                    title,
                    context: context.slice(0, COMPANION_CONTEXT_LIMIT),
                    messages: stored,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                setDocId(newRef.id);
            }
        } catch (err) {
            console.error("Error saving companion session:", err);
            showAlert("Your conversation could not be saved.", 'error');
        }
    };

    const handleSend = async (preset) => {
        const text = (preset ?? input).trim();
        if (!text || isThinking) return;

        setError(null);
        setInput('');

        const userMessage = { id: `u-${Date.now()}`, role: 'user', content: text, mode: activeMode, at: Date.now() };
        const history = [...messages, userMessage];
        setMessages(history);
        setIsThinking(true);

        try {
            const reply = await sendCompanionMessage(
                history.map(m => ({ role: m.role, content: m.content })),
                {
                    mode: activeMode,
                    context,
                    studentName: userProfile?.displayName || ''
                }
            );

            const nextMessages = [
                ...history,
                { id: `a-${Date.now()}`, role: 'assistant', content: reply, mode: activeMode, at: Date.now() }
            ];
            setMessages(nextMessages);
            persist(nextMessages);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleClear = () => {
        setMessages([]);
        setError(null);
        setDocId(null);
    };

    const activeModeLabel = COMPANION_MODES.find(m => m.id === activeMode)?.label || 'Chat';
    const hasContext = context.trim().length > 0;

    return (
        <Modal isOpen={true} onClose={onClose} isFullScreen={true} title="AI Study Companion">
            <div className="companion-shell">
                <div className="companion-toolbar">
                    <div className="companion-identity">
                        <div className="companion-avatar">
                            <Bot size={22} />
                        </div>
                        <div className="companion-identity-text">
                            <strong>Study Companion</strong>
                            <span>{activeModeLabel} mode</span>
                        </div>
                    </div>

                    <div className="companion-toolbar-actions">
                        <button
                            className={`context-toggle ${hasContext ? 'is-active' : ''}`}
                            onClick={() => setIsContextOpen(prev => !prev)}
                        >
                            <BookOpen size={16} />
                            {hasContext ? 'Context attached' : 'Add context'}
                        </button>
                        {messages.length > 0 && (
                            <button className="icon-button" onClick={handleClear} aria-label="Clear conversation">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                </div>

                {isContextOpen && (
                    <div className="companion-context-panel animate-fade-in">
                        <div className="context-panel-header">
                            <span>Reference material</span>
                            <span className="context-hint">
                                {context.length} / {COMPANION_CONTEXT_LIMIT} characters
                            </span>
                        </div>
                        <textarea
                            value={context}
                            onChange={(e) => setContext(e.target.value.slice(0, COMPANION_CONTEXT_LIMIT))}
                            placeholder="Paste your lecture notes, syllabus or textbook excerpts. The tutor will ground its answers in this."
                            rows={4}
                        />
                    </div>
                )}

                <div className="mode-chips" role="tablist" aria-label="Tutor mode">
                    {COMPANION_MODES.map(mode => (
                        <button
                            key={mode.id}
                            role="tab"
                            aria-selected={activeMode === mode.id}
                            className={`mode-chip ${activeMode === mode.id ? 'is-active' : ''}`}
                            onClick={() => setActiveMode(mode.id)}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>

                <div className="companion-scroll" ref={scrollRef}>
                    {messages.length === 0 && (
                        <div className="companion-welcome animate-fade-in">
                            <div className="welcome-orb">
                                <Sparkles size={30} />
                            </div>
                            <h2>What are we studying today?</h2>
                            <p>
                                {hasContext
                                    ? 'I have read your reference material. Ask anything, or pick a mode to get started.'
                                    : 'Ask me anything, attach your notes for grounded answers, or start with one of these.'}
                            </p>
                            <div className="starter-grid">
                                {STARTERS.map(starter => (
                                    <button key={starter} className="starter-chip" onClick={() => handleSend(starter)}>
                                        {starter}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map(message => (
                        <div key={message.id} className={`companion-message ${message.role}`}>
                            {message.role === 'assistant' && (
                                <div className="message-avatar">
                                    <Bot size={16} />
                                </div>
                            )}
                            <div className="message-body">
                                <div className="message-bubble">
                                    {message.role === 'assistant'
                                        ? <RichText text={message.content} />
                                        : <p>{message.content}</p>}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isThinking && (
                        <div className="companion-message assistant">
                            <div className="message-avatar">
                                <Bot size={16} />
                            </div>
                            <div className="message-body">
                                <div className="message-bubble is-typing">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Thinking</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="companion-error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                            <button onClick={() => setError(null)} aria-label="Dismiss error">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {!currentUser && (
                    <div className="companion-signin-hint">
                        <span>You are chatting as a guest. Conversations are not being saved.</span>
                        <button onClick={openLogin}>
                            <LogIn size={14} /> Sign in
                        </button>
                    </div>
                )}

                <div className="companion-composer">
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask anything in ${activeModeLabel} mode...`}
                        rows={1}
                        disabled={isThinking}
                    />
                    <button
                        className="send-button"
                        onClick={() => handleSend()}
                        disabled={isThinking || !input.trim()}
                        aria-label="Send message"
                    >
                        {isThinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const StudyCompanion = () => {
    const { isCompanionModalOpen, closeCompanion, companionSessionId, companionSeed } = useUI();

    if (!isCompanionModalOpen) return null;

    return (
        <CompanionChat
            key={companionSessionId}
            seed={companionSeed}
            onClose={closeCompanion}
        />
    );
};

export default StudyCompanion;

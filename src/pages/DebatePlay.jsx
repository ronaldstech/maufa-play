import React, { useState, useRef, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import {
    createDebate,
    submitDebateArgument,
    concludeDebate,
    getDebateVerdict,
    DEBATE_DIFFICULTIES
} from '../services/aiService';
import {
    Swords,
    Scale,
    Send,
    Sparkles,
    Trophy,
    Loader2,
    AlertCircle,
    LogIn,
    Target,
    X,
    CheckCircle2
} from 'lucide-react';
import Modal from '../components/Modal';
import RichText from '../components/RichText';
import './DebatePlay.css';

const SCORE_LABELS = {
    logic: 'Logic',
    evidence: 'Evidence',
    rebuttal: 'Rebuttal',
    clarity: 'Clarity'
};

const MIN_ARGUMENT_LENGTH = 25;

const averageScore = (scores) => {
    const values = Object.values(scores || {});
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const scoreTone = (score) => {
    if (score >= 7.5) return 'strong';
    if (score >= 5) return 'fair';
    return 'weak';
};

const toHistory = (turns) => turns.map(turn => ({
    role: turn.role === 'user' ? 'user' : 'assistant',
    content: turn.content
}));

const DebateSetup = ({ data, studentName, onStarted }) => {
    const [difficulty, setDifficulty] = useState('medium');
    const [userSide, setUserSide] = useState('pro');
    const [rounds, setRounds] = useState(3);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const maxRounds = DEBATE_DIFFICULTIES[difficulty].maxRounds;

    const chooseDifficulty = (id) => {
        setDifficulty(id);
        setRounds(prev => Math.min(prev, DEBATE_DIFFICULTIES[id].maxRounds));
    };

    const handleStart = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const debate = await createDebate({
                topic: data.topic || '',
                context: data.context || '',
                userSide,
                difficulty,
                studentName: studentName || ''
            });

            onStarted({ ...debate, userSide, difficulty, rounds });
        } catch (err) {
            setError(err.message || 'Could not start the debate.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="debate-setup animate-fade-in">
            <div className="debate-setup-head">
                <div className="debate-setup-icon">
                    <Scale size={34} />
                </div>
                <div>
                    <span className="debate-setup-kicker">Step 2 · Set The Terms</span>
                    <h2>Choose your ground</h2>
                    <p>
                        The AI will propose a motion from your material, then argue the side you do not pick.
                    </p>
                </div>
            </div>

            {data.topic && (
                <div className="debate-topic-chip">
                    <Target size={15} />
                    <span>{data.topic}</span>
                </div>
            )}

            <div className="setup-block">
                <label className="setup-label">You argue</label>
                <div className="side-toggle">
                    {[
                        { id: 'pro', label: 'In favour', hint: 'Argue FOR the motion' },
                        { id: 'con', label: 'Opposed', hint: 'Argue AGAINST the motion' }
                    ].map(side => (
                        <button
                            key={side.id}
                            className={`side-option ${userSide === side.id ? 'is-active' : ''} ${side.id}`}
                            onClick={() => setUserSide(side.id)}
                            disabled={isLoading}
                        >
                            <strong>{side.label}</strong>
                            <span>{side.hint}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="setup-block">
                <label className="setup-label">Opponent calibre</label>
                <div className="difficulty-row">
                    {Object.values(DEBATE_DIFFICULTIES).map(level => (
                        <button
                            key={level.id}
                            className={`difficulty-option ${difficulty === level.id ? 'is-active' : ''}`}
                            onClick={() => chooseDifficulty(level.id)}
                            disabled={isLoading}
                        >
                            <strong>{level.label}</strong>
                            <span>{level.blurb}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="setup-block">
                <label className="setup-label">
                    Rounds
                    <span className="rounds-value">{rounds}</span>
                </label>
                <input
                    type="range"
                    min="1"
                    max={maxRounds}
                    value={rounds}
                    onChange={(e) => setRounds(Number(e.target.value))}
                    className="premium-slider"
                    disabled={isLoading}
                />
                <div className="slider-range">
                    <span>1</span>
                    <span>Max: {maxRounds}</span>
                </div>
            </div>

            {error && (
                <div className="debate-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <button className="btn-primary debate-start-btn" onClick={handleStart} disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" /> Drafting The Motion...
                    </>
                ) : (
                    <>
                        <Swords size={18} /> Open The Debate
                    </>
                )}
            </button>
        </div>
    );
};

const DebateSession = ({ data, studentName, onFinish, onClose, loginHint }) => {
    const [phase, setPhase] = useState('opening');
    const [transcript, setTranscript] = useState([
        { id: 1, role: 'ai', kind: 'opening', content: data.openingStatement, points: data.aiKeyPoints }
    ]);
    const [argument, setArgument] = useState('');
    const [round, setRound] = useState(1);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState(null);
    const [roundScores, setRoundScores] = useState([]);
    const [closing, setClosing] = useState(null);
    const scrollRef = useRef(null);
    const inputRef = useRef(null);

    const isLastRound = round >= data.rounds;
    const runningAverage = roundScores.length
        ? roundScores.reduce((sum, entry) => sum + entry.average, 0) / roundScores.length
        : 0;

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcript, closing]);

    useEffect(() => {
        if (phase === 'rebuttal') {
            inputRef.current?.focus();
        }
    }, [phase]);

    const handleSubmitArgument = async () => {
        if (argument.trim().length < MIN_ARGUMENT_LENGTH) {
            setError(`Give the AI something to work with — at least ${MIN_ARGUMENT_LENGTH} characters of actual argument.`);
            return;
        }

        setError(null);
        setIsBusy(true);

        const userTurn = { id: Date.now(), role: 'user', kind: 'argument', content: argument.trim() };
        const history = toHistory([...transcript, userTurn]);

        try {
            const response = await submitDebateArgument(history, {
                motion: data.motion,
                userSideLabel: data.userSideLabel,
                difficulty: data.difficulty,
                roundNumber: round,
                totalRounds: data.rounds,
                studentName: studentName || ''
            });

            const entry = { round, scores: response.scores, average: averageScore(response.scores) };

            setTranscript(prev => [
                ...prev,
                userTurn,
                {
                    id: Date.now() + 1,
                    role: 'ai',
                    kind: 'counter',
                    content: response.counterArgument,
                    points: response.aiKeyPoints,
                    scores: response.scores,
                    feedback: response.feedback,
                    strongestPoint: response.strongestPoint,
                    weakestPoint: response.weakestPoint
                }
            ]);
            setRoundScores(prev => [...prev, entry]);
            setArgument('');

            if (isLastRound) {
                setPhase('closing');
                await runClosing([
                    ...history,
                    { role: 'assistant', content: response.counterArgument }
                ]);
            } else {
                setRound(prev => prev + 1);
                setPhase('rebuttal');
            }
        } catch (err) {
            setError(err.message || 'The AI could not rebut that. Try again.');
            setTranscript(prev => [...prev, userTurn]);
            setArgument('');
        } finally {
            setIsBusy(false);
        }
    };

    const runClosing = async (history) => {
        setIsBusy(true);
        setError(null);

        try {
            const result = await concludeDebate(history, {
                motion: data.motion,
                userSideLabel: data.userSideLabel,
                difficulty: data.difficulty,
                roundCount: data.rounds,
                studentName: studentName || ''
            });

            setClosing(result);
            setPhase('verdict');
            onFinish(result, roundScores, [
                ...history,
                { role: 'assistant', content: result.closingStatement }
            ]);
        } catch (err) {
            setError(err.message || 'Could not close the debate. Try again.');
            setPhase('rebuttal');
        } finally {
            setIsBusy(false);
        }
    };

    const retryClosing = () => runClosing(toHistory(transcript));

    return (
        <div className="debate-shell">
            <div className="debate-stage">
                <div className="debate-sides">
                    <div className="side-card is-user">
                        <div className="side-card-head">
                            <span className="side-badge">You</span>
                            <span className="side-role">{data.userSideLabel}</span>
                        </div>
                        <div className="side-score">
                            <strong>{roundScores.length ? runningAverage.toFixed(1) : '—'}</strong>
                            <span>running score</span>
                        </div>
                    </div>

                    <div className="round-tracker">
                        <span className="round-label">Round</span>
                        <strong>{Math.min(round, data.rounds)} / {data.rounds}</strong>
                        <div className="round-dots">
                            {Array.from({ length: data.rounds }).map((_, index) => (
                                <span
                                    key={index}
                                    className={`round-dot ${index < roundScores.length ? 'is-done' : ''} ${index + 1 === round && phase !== 'verdict' ? 'is-current' : ''}`}
                                ></span>
                            ))}
                        </div>
                    </div>

                    <div className="side-card is-ai">
                        <div className="side-card-head">
                            <span className="side-badge">AI</span>
                            <span className="side-role">{data.aiSideLabel}</span>
                        </div>
                        <div className="side-score">
                            <strong>{closing ? closing.aiScore : '—'}</strong>
                            <span>{closing ? 'final score' : 'finals pending'}</span>
                        </div>
                    </div>
                </div>

                <div className="debate-motion">
                    <span className="motion-tag">Motion</span>
                    <p>{data.motion}</p>
                </div>
            </div>

            <div className="debate-scroll" ref={scrollRef}>
                {transcript.map(turn => (
                    <div key={turn.id} className={`debate-turn ${turn.role}`}>
                        <div className="turn-avatar">
                            {turn.role === 'user' ? 'You' : 'AI'}
                        </div>
                        <div className="turn-content">
                            <span className="turn-kind">
                                {turn.kind === 'opening' ? 'Opening statement' : (turn.kind === 'argument' ? `Your argument · round ${turn.round || ''}`.trim() : 'Counter-argument')}
                            </span>

                            {turn.role === 'user' ? (
                                <div className="turn-bubble is-user">
                                    <p>{turn.content}</p>
                                </div>
                            ) : (
                                <div className="turn-bubble">
                                    <RichText text={turn.content} />
                                </div>
                            )}

                            {turn.points && turn.points.length > 0 && (
                                <div className="turn-points">
                                    {turn.points.map((point, index) => (
                                        <div className="turn-point" key={index}>
                                            <CheckCircle2 size={14} />
                                            <span>{point}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {turn.scores && (
                                <div className="turn-scores">
                                    <div className="score-grid">
                                        {Object.entries(SCORE_LABELS).map(([key, label]) => (
                                            <div className="score-cell" key={key}>
                                                <span className="score-cell-label">{label}</span>
                                                <strong className={scoreTone(turn.scores[key])}>{turn.scores[key]}</strong>
                                                <div className="score-meter">
                                                    <div className={`score-meter-fill ${scoreTone(turn.scores[key])}`} style={{ width: `${turn.scores[key] * 10}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {turn.feedback && <p className="turn-feedback">{turn.feedback}</p>}

                                    {turn.strongestPoint && (
                                        <p className="turn-note is-good"><strong>Strongest point:</strong> {turn.strongestPoint}</p>
                                    )}
                                    {turn.weakestPoint && (
                                        <p className="turn-note is-bad"><strong>Most vulnerable:</strong> {turn.weakestPoint}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {phase === 'closing' && (
                    <div className="debate-turn ai">
                        <div className="turn-avatar">AI</div>
                        <div className="turn-content">
                            <span className="turn-kind">Closing statement</span>
                            {isBusy ? (
                                <div className="turn-bubble is-thinking">
                                    <Loader2 size={18} className="animate-spin" /> Summing up the debate...
                                </div>
                            ) : (
                                <div className="debate-error">
                                    <AlertCircle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}
                            {!isBusy && error && (
                                <button className="btn-secondary debate-retry" onClick={retryClosing}>
                                    <Loader2 size={16} /> Try Again
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {phase === 'rebuttal' && (
                <div className="debate-composer">
                    <div className="composer-label">
                        <Swords size={15} />
                        <span>
                            Round {round} of {data.rounds} — argue {data.userSideLabel.toLowerCase()}
                            {isLastRound ? ' · this is your last round' : ''}
                        </span>
                    </div>
                    <textarea
                        ref={inputRef}
                        value={argument}
                        onChange={(e) => setArgument(e.target.value)}
                        onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                e.preventDefault();
                                handleSubmitArgument();
                            }
                        }}
                        placeholder="Make your case. Name your strongest point, give a reason, and address the AI's last argument directly."
                        rows={4}
                        disabled={isBusy}
                    />
                    <div className="composer-footer">
                        <span className={`composer-count ${argument.trim().length < MIN_ARGUMENT_LENGTH ? 'is-low' : ''}`}>
                            {argument.trim().length} characters
                        </span>
                        <button className="btn-primary" onClick={handleSubmitArgument} disabled={isBusy || argument.trim().length < MIN_ARGUMENT_LENGTH}>
                            {isBusy ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" /> Rebutting...
                                </>
                            ) : (
                                <>
                                    <Send size={18} /> Submit Argument
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {phase === 'opening' && (
                <div className="debate-composer is-static">
                    <div className="composer-label">
                        <Sparkles size={15} />
                        <span>The AI has opened. Read it, then answer.</span>
                    </div>
                    <button className="btn-primary" onClick={() => setPhase('rebuttal')}>
                        <Swords size={18} /> Argue Your Case
                    </button>
                </div>
            )}

            {phase === 'verdict' && closing && (
                <DebateVerdict data={data} closing={closing} roundScores={roundScores} onClose={onClose} />
            )}

            {loginHint && phase !== 'verdict' && (
                <div className="debate-signin-hint">
                    <LogIn size={15} />
                    <span>Playing as a guest — this debate will not be saved to your history.</span>
                    <button onClick={loginHint.onLogin}>Sign in</button>
                </div>
            )}

            {error && phase === 'rebuttal' && (
                <div className="debate-error is-inline">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X size={16} /></button>
                </div>
            )}
        </div>
    );
};

const DebateVerdict = ({ data, closing, roundScores, onClose }) => {
    const verdict = getDebateVerdict(closing.userScore, closing.aiScore);

    const config = {
        you: {
            icon: <Trophy size={64} className="verdict-icon is-win" />,
            title: 'You won the debate',
            body: `${data.motion} — your side carried it on the strength of the argument.`
        },
        ai: {
            icon: <Scale size={64} className="verdict-icon is-loss" />,
            title: 'The AI took the round',
            body: `${data.motion} — the opposition argued it more convincingly.`
        },
        draw: {
            icon: <Scale size={64} className="verdict-icon is-draw" />,
            title: 'Honest draw',
            body: `${data.motion} — neither side landed a decisive blow.`
        }
    }[verdict];

    const categoryAverages = ['logic', 'evidence', 'rebuttal', 'clarity'].map(key => {
        const values = roundScores.map(entry => entry.scores?.[key]).filter(value => Number.isFinite(value));
        return {
            key,
            label: SCORE_LABELS[key],
            value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
        };
    });

    return (
        <div className="debate-verdict animate-fade-in">
            {config.icon}
            <h1>{config.title}</h1>
            <p className="verdict-body">{config.body}</p>

            <div className="verdict-scores">
                <div className="verdict-score-block is-user">
                    <span>Your final</span>
                    <strong>{closing.userScore}</strong>
                </div>
                <div className="verdict-vs">vs</div>
                <div className="verdict-score-block is-ai">
                    <span>AI final</span>
                    <strong>{closing.aiScore}</strong>
                </div>
            </div>

            <div className="verdict-averages">
                {categoryAverages.map(entry => (
                    <div className="average-cell" key={entry.key}>
                        <span>{entry.label}</span>
                        <strong className={scoreTone(entry.value)}>{entry.value.toFixed(1)}</strong>
                    </div>
                ))}
            </div>

            {closing.reasoning && (
                <div className="verdict-block">
                    <h3>Adjudicator's reasoning</h3>
                    <p>{closing.reasoning}</p>
                </div>
            )}

            {closing.yourStrengths.length > 0 && (
                <div className="verdict-block">
                    <h3>What you did well</h3>
                    <ul>
                        {closing.yourStrengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            )}

            {closing.yourImprovements.length > 0 && (
                <div className="verdict-block">
                    <h3>Sharpen this next time</h3>
                    <ul>
                        {closing.yourImprovements.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            )}

            {closing.coachingTip && (
                <div className="verdict-tip">
                    <Sparkles size={18} />
                    <p>{closing.coachingTip}</p>
                </div>
            )}

            <button className="btn-primary" onClick={onClose}>Back to Games Library</button>
        </div>
    );
};

const DebatePlay = () => {
    const { isDebateModalOpen, closeDebate, debateData, debateSessionId, openLogin } = useUI();
    const { currentUser, userProfile } = useAuth();

    const [liveDebate, setLiveDebate] = useState(null);
    const debateStartRef = useRef(null);
    const [lastSessionId, setLastSessionId] = useState(debateSessionId);

    if (lastSessionId !== debateSessionId) {
        setLastSessionId(debateSessionId);
        setLiveDebate(null);
    }

    const handleFinish = useCallback(async (closing, roundScores, transcript) => {
        if (!currentUser) return;

        try {
            const rounds = liveDebate?.rounds || 1;
            const verdict = getDebateVerdict(closing.userScore, closing.aiScore);

            await addDoc(collection(db, 'quiz_results'), {
                userId: currentUser.uid,
                quizId: debateData?.debateId || null,
                quizTitle: debateData?.topic ? `${debateData.topic} Debate` : 'AI Debate',
                gameType: 'AI Debate Game',
                score: Math.round((closing.userScore / 100) * rounds),
                totalQuestions: rounds,
                accuracy: closing.userScore,
                duration: Math.floor((Date.now() - (debateStartRef.current || Date.now())) / 1000),
                timestamp: serverTimestamp(),
                outcome: verdict,
                userScore: closing.userScore,
                aiScore: closing.aiScore,
                roundScores,
                verdictReasoning: closing.reasoning,
                coachingTip: closing.coachingTip,
                transcript
            });

            if (debateData?.debateId) {
                await updateDoc(doc(db, 'debates', debateData.debateId), { attempts: increment(1) });
            }
        } catch (error) {
            console.error('Error saving debate result:', error);
        }
    }, [currentUser, debateData, liveDebate]);

    const handleStarted = (debate) => {
        debateStartRef.current = Date.now();
        setLiveDebate(debate);
    };

    if (!isDebateModalOpen) return null;

    return (
        <Modal
            isOpen={isDebateModalOpen}
            onClose={closeDebate}
            isFullScreen={true}
            title={liveDebate ? liveDebate.topicLabel : (debateData?.topic || 'AI Debate Game')}
        >
            {!liveDebate ? (
                <DebateSetup
                    key={debateSessionId}
                    data={debateData || {}}
                    studentName={userProfile?.displayName || ''}
                    onStarted={handleStarted}
                />
            ) : (
                <DebateSession
                    key={debateSessionId}
                    data={liveDebate}
                    studentName={userProfile?.displayName || ''}
                    onFinish={handleFinish}
                    onClose={closeDebate}
                    loginHint={currentUser ? null : { onLogin: openLogin }}
                />
            )}
        </Modal>
    );
};

export default DebatePlay;
import React, { useState, useRef, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, updateDoc, doc, increment, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import {
    createScenario,
    resolveScenarioChoice,
    concludeScenario,
    getScenarioOutcome,
    averageCriteria,
    SCENARIO_CRITERIA,
    SCENARIO_DIFFICULTIES
} from '../services/aiService';
import {
    Globe,
    Compass,
    Loader2,
    AlertCircle,
    LogIn,
    Sparkles,
    ChevronRight,
    Target,
    TrendingUp,
    TrendingDown,
    Trophy,
    X,
    Lightbulb,
    RotateCcw
} from 'lucide-react';
import Modal from '../components/Modal';
import RichText from '../components/RichText';
import './ScenarioSimulatorPlay.css';

const scoreTone = (score) => {
    if (score >= 7.5) return 'strong';
    if (score >= 5) return 'fair';
    return 'weak';
};

const meterTone = (value) => {
    if (value >= 65) return 'good';
    if (value >= 40) return 'warn';
    return 'bad';
};

const ScenarioSetup = ({ data, studentName, onStarted }) => {
    const [difficulty, setDifficulty] = useState('medium');
    const [decisionCount, setDecisionCount] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const maxDecisions = SCENARIO_DIFFICULTIES[difficulty].decisions;

    const chooseDifficulty = (id) => {
        setDifficulty(id);
        setDecisionCount(SCENARIO_DIFFICULTIES[id].decisions);
    };

    const handleStart = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const scenario = await createScenario({
                topic: data.topic || '',
                context: data.context || '',
                difficulty,
                decisionCount,
                studentName: studentName || ''
            });

            onStarted({
                ...scenario,
                context: data.context || '',
                difficulty,
                totalDecisions: decisionCount
            });
        } catch (err) {
            setError(err.message || 'Could not build the scenario.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="scenario-setup animate-fade-in">
            <div className="scenario-setup-head">
                <div className="scenario-setup-icon">
                    <Globe size={34} />
                </div>
                <div>
                    <span className="scenario-setup-kicker">Step 2 · Deploy</span>
                    <h2>Configure your simulation</h2>
                    <p>
                        You will be dropped into a real situation and asked to make the calls yourself.
                        There is no wrong answer on paper, only trade-offs.
                    </p>
                </div>
            </div>

            {data.topic && (
                <div className="scenario-topic-chip">
                    <Target size={15} />
                    <span>{data.topic}</span>
                </div>
            )}

            <div className="setup-block">
                <label className="setup-label">Scenario intensity</label>
                <div className="difficulty-row">
                    {Object.values(SCENARIO_DIFFICULTIES).map(level => (
                        <button
                            key={level.id}
                            className={`difficulty-option ${difficulty === level.id ? 'is-active' : ''}`}
                            onClick={() => chooseDifficulty(level.id)}
                            disabled={isLoading}
                        >
                            <strong>{level.label}</strong>
                            <span>{level.blurb}</span>
                            <em>{level.decisions} decisions</em>
                        </button>
                    ))}
                </div>
            </div>

            <div className="setup-block">
                <label className="setup-label">
                    Decisions to make
                    <span className="rounds-value">{decisionCount}</span>
                </label>
                <input
                    type="range"
                    min="2"
                    max={maxDecisions}
                    value={decisionCount}
                    onChange={(e) => setDecisionCount(Number(e.target.value))}
                    className="premium-slider"
                    disabled={isLoading}
                />
                <div className="slider-range">
                    <span>2</span>
                    <span>Max: {maxDecisions}</span>
                </div>
            </div>

            {error && (
                <div className="scenario-error">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <button className="btn-primary scenario-start-btn" onClick={handleStart} disabled={isLoading}>
                {isLoading ? (
                    <>
                        <Loader2 size={18} className="animate-spin" /> Building Scenario...
                    </>
                ) : (
                    <>
                        <Compass size={18} /> Enter The Simulation
                    </>
                )}
            </button>
        </div>
    );
};

const ScenarioRun = ({ data, onFinish, onClose, loginHint }) => {
    const [phase, setPhase] = useState('briefing');
    const [meters, setMeters] = useState(data.meters);
    const [choices, setChoices] = useState(data.choices);
    const [steps, setSteps] = useState([]);
    const [decisionNumber, setDecisionNumber] = useState(1);
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState(null);
    const [debrief, setDebrief] = useState(null);
    const [pendingChoice, setPendingChoice] = useState(null);
    const scrollRef = useRef(null);

    const scrollToEnd = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    React.useEffect(() => {
        scrollToEnd();
    }, [steps, phase, scrollToEnd]);

    const handleChoose = async (choice) => {
        if (isBusy || pendingChoice) return;

        setIsBusy(true);
        setError(null);
        setPendingChoice(choice);

        const history = [
            { role: 'assistant', content: data.briefing },
            ...steps.flatMap(step => [
                { role: 'user', content: `I choose: ${step.choiceText}` },
                { role: 'assistant', content: `${step.consequence}\n\n${step.outcome}` }
            ]),
            { role: 'user', content: `I choose: ${choice.text}` }
        ];

        try {
            const resolution = await resolveScenarioChoice(history, {
                scenario: { ...data, context: data.context },
                meters,
                choice,
                decisionNumber,
                totalDecisions: data.totalDecisions
            });

            const nextMeters = meters.map((meter, index) => ({
                name: meter.name,
                value: Math.max(0, Math.min(100, meter.value + (resolution.meterDeltas[index] || 0)))
            }));

            setMeters(nextMeters);
            setSteps(prev => [
                ...prev,
                {
                    decision: decisionNumber,
                    choiceText: choice.text,
                    choiceHint: choice.hint,
                    consequence: resolution.consequence,
                    outcome: resolution.outcome,
                    meterDeltas: resolution.meterDeltas,
                    metersAfter: nextMeters,
                    scores: resolution.scores,
                    feedback: resolution.feedback,
                    lesson: resolution.lesson
                }
            ]);

            if (resolution.nextChoices.length >= 2) {
                setChoices(resolution.nextChoices);
                setDecisionNumber(prev => prev + 1);
                setPendingChoice(null);
                setPhase('choosing');
            } else {
                setPendingChoice(null);
                setPhase('debriefing');
                await runDebrief([...steps, {
                    decision: decisionNumber,
                    choiceText: choice.text,
                    consequence: resolution.consequence,
                    outcome: resolution.outcome
                }], nextMeters);
            }
        } catch (err) {
            setError(err.message || 'The simulation could not continue. Try again.');
            setPendingChoice(null);
        } finally {
            setIsBusy(false);
        }
    };

    const runDebrief = async (allSteps, finalMeters) => {
        const history = [
            { role: 'assistant', content: data.briefing },
            ...allSteps.flatMap(step => [
                { role: 'user', content: `I chose: ${step.choiceText}` },
                { role: 'assistant', content: `${step.consequence}\n\n${step.outcome}` }
            ])
        ];

        try {
            const result = await concludeScenario(history, {
                scenario: { ...data, context: data.context },
                meters: finalMeters,
                decisions: allSteps.length
            });

            const scoredSteps = allSteps.filter(step => step.scores);
            const avg = averageCriteria(
                Object.keys(SCENARIO_CRITERIA).reduce((acc, key) => {
                    const values = scoredSteps.map(step => step.scores[key]).filter(Number.isFinite);
                    acc[key] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
                }, {})
            );
            const outcome = getScenarioOutcome(finalMeters, avg);

            const final = { ...result, outcome: outcome.outcome, score: outcome.score, meters: finalMeters };
            setDebrief(final);
            setPhase('debrief');
            onFinish(final, allSteps);
        } catch (err) {
            setError(err.message || 'Could not write the debrief. Try again.');
            setPhase('choosing');
        }
    };

    const retryDebrief = () => {
        setPhase('debriefing');
        setError(null);
        runDebrief(steps, meters);
    };

    const isLastDecision = decisionNumber >= data.totalDecisions;

    return (
        <div className="scenario-shell">
            <div className="scenario-stage">
                <div className="scenario-identity">
                    <h2>{data.title}</h2>
                    <span className="scenario-role">{data.role}</span>
                    {data.stakes && <p className="scenario-stakes">{data.stakes}</p>}
                </div>

                <div className="meter-panel">
                    {meters.map(meter => (
                        <div className="meter" key={meter.name}>
                            <div className="meter-head">
                                <span className="meter-name">{meter.name}</span>
                                <strong className={meterTone(meter.value)}>{meter.value}</strong>
                            </div>
                            <div className="meter-track">
                                <div className={`meter-fill ${meterTone(meter.value)}`} style={{ width: `${meter.value}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="scenario-progress">
                    <span className="progress-label">Decision</span>
                    <strong>{phase === 'briefing' ? 0 : Math.min(decisionNumber, data.totalDecisions)} / {data.totalDecisions}</strong>
                    <div className="progress-dots">
                        {Array.from({ length: data.totalDecisions }).map((_, index) => (
                            <span
                                key={index}
                                className={`progress-dot ${index < steps.length ? 'is-done' : ''} ${index + 1 === decisionNumber && phase !== 'debrief' ? 'is-current' : ''}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="scenario-scroll" ref={scrollRef}>
                {steps.length === 0 && (
                    <div className="scenario-briefing animate-fade-in">
                        {data.setting && <p className="briefing-setting">{data.setting}</p>}
                        <RichText text={data.briefing} />
                    </div>
                )}

                {steps.map(step => (
                    <div className="scenario-step animate-fade-in" key={step.decision}>
                            <div className="step-marker">
                                <span>Decision {step.decision}</span>
                            </div>

                            <div className="chosen-call">
                                <span className="chosen-label">You chose</span>
                                <p>{step.choiceText}</p>
                            </div>

                            {step.consequence && (
                                <div className="step-consequence">
                                    <ChevronRight size={16} />
                                    <span>{step.consequence}</span>
                                </div>
                            )}

                            <div className="step-narrative">
                                <RichText text={step.outcome} />
                            </div>

                            {step.meterDeltas && (
                                <div className="delta-row">
                                    {step.metersAfter.map((meter, index) => {
                                        const delta = step.meterDeltas[index] || 0;
                                        if (delta === 0) return null;
                                        return (
                                            <span key={meter.name} className={`delta-chip ${delta > 0 ? 'is-up' : 'is-down'}`}>
                                                {delta > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                                {meter.name} {delta > 0 ? '+' : ''}{delta}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {step.scores && (
                                <div className="step-review">
                                    <div className="criteria-grid">
                                        {Object.entries(SCENARIO_CRITERIA).map(([key, label]) => (
                                            <div className="criteria-cell" key={key}>
                                                <span>{label}</span>
                                                <strong className={scoreTone(step.scores[key])}>{step.scores[key]}</strong>
                                            </div>
                                        ))}
                                    </div>
                                    {step.feedback && <p className="step-feedback">{step.feedback}</p>}
                                    {step.lesson && (
                                        <p className="step-lesson">
                                            <Lightbulb size={15} />
                                            <span>{step.lesson}</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                ))}

                {phase === 'debriefing' && (
                    <div className="scenario-debriefing animate-fade-in">
                        {isBusy ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Debriefing your run...
                            </>
                        ) : (
                            <div className="scenario-error">
                                <AlertCircle size={18} />
                                <span>{error}</span>
                            </div>
                        )}
                        {!isBusy && error && (
                            <button className="btn-secondary scenario-retry" onClick={retryDebrief}>
                                <RotateCcw size={16} /> Try Again
                            </button>
                        )}
                    </div>
                )}
            </div>

            {phase === 'briefing' && (
                <div className="scenario-composer is-static">
                    <div className="composer-label">
                        <Compass size={15} />
                        <span>The situation is set. Make your first call.</span>
                    </div>
                    <button className="btn-primary" onClick={() => setPhase('choosing')}>
                        <ChevronRight size={18} /> Begin
                    </button>
                </div>
            )}

            {phase === 'choosing' && (
                <div className="scenario-composer">
                    <div className="composer-label">
                        <Compass size={15} />
                        <span>
                            Decision {decisionNumber} of {data.totalDecisions}
                            {isLastDecision ? ' · final call' : ''}
                        </span>
                    </div>
                    <div className="choice-list">
                        {choices.map(choice => (
                            <button
                                key={choice.id}
                                className={`choice-option ${pendingChoice?.id === choice.id ? 'is-chosen' : ''}`}
                                onClick={() => handleChoose(choice)}
                                disabled={isBusy || Boolean(pendingChoice)}
                            >
                                <span className="choice-key">{choice.id.toUpperCase()}</span>
                                <span className="choice-body">
                                    <span className="choice-text">{choice.text}</span>
                                    {choice.hint && <span className="choice-hint">{choice.hint}</span>}
                                </span>
                                {pendingChoice?.id === choice.id && <Loader2 size={18} className="animate-spin" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {phase === 'debrief' && debrief && (
                <ScenarioDebrief debrief={debrief} steps={steps} onClose={onClose} />
            )}

            {loginHint && phase !== 'debrief' && (
                <div className="scenario-signin-hint">
                    <LogIn size={15} />
                    <span>Playing as a guest — this run will not be saved to your history.</span>
                    <button onClick={loginHint.onLogin}>Sign in</button>
                </div>
            )}

            {error && phase === 'choosing' && (
                <div className="scenario-error is-inline">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}><X size={16} /></button>
                </div>
            )}
        </div>
    );
};

const ScenarioDebrief = ({ debrief, steps, onClose }) => {
    const config = {
        success: {
            icon: <Trophy size={64} className="debrief-icon is-success" />,
            title: 'You Held The Situation',
            body: debrief.summary
        },
        partial: {
            icon: <Globe size={64} className="debrief-icon is-partial" />,
            title: 'Mixed Outcome',
            body: debrief.summary
        },
        failure: {
            icon: <AlertCircle size={64} className="debrief-icon is-failure" />,
            title: 'The Situation Broke Down',
            body: debrief.summary
        }
    }[debrief.outcome];

    const criteriaAverages = Object.entries(SCENARIO_CRITERIA).map(([key, label]) => {
        const values = steps.map(step => step.scores?.[key]).filter(Number.isFinite);
        return {
            key,
            label,
            value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
        };
    });

    return (
        <div className="scenario-debrief animate-fade-in">
            {config.icon}
            <h1>{config.title}</h1>
            {config.body && <p className="debrief-summary">{config.body}</p>}

            <div className="debrief-meters">
                {debrief.meters.map(meter => (
                    <div className="debrief-meter" key={meter.name}>
                        <span>{meter.name}</span>
                        <strong className={meterTone(meter.value)}>{meter.value}</strong>
                        <div className="meter-track">
                            <div className={`meter-fill ${meterTone(meter.value)}`} style={{ width: `${meter.value}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="debrief-criteria">
                {criteriaAverages.map(entry => (
                    <div className="debrief-criterion" key={entry.key}>
                        <span>{entry.label}</span>
                        <strong className={scoreTone(entry.value)}>{entry.value.toFixed(1)}</strong>
                    </div>
                ))}
            </div>

            <div className="debrief-narration">
                <RichText text={debrief.finalNarration} />
            </div>

            {debrief.strengths.length > 0 && (
                <div className="debrief-block">
                    <h3>What worked</h3>
                    <ul>
                        {debrief.strengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            )}

            {debrief.mistakes.length > 0 && (
                <div className="debrief-block">
                    <h3>What cost you</h3>
                    <ul>
                        {debrief.mistakes.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </div>
            )}

            {debrief.transferableLesson && (
                <div className="debrief-tip">
                    <Sparkles size={18} />
                    <p>{debrief.transferableLesson}</p>
                </div>
            )}

            <button className="btn-primary" onClick={onClose}>Back to Games Library</button>
        </div>
    );
};

const ScenarioSimulatorPlay = () => {
    const { isScenarioModalOpen, closeScenario, scenarioData, scenarioSessionId, openLogin } = useUI();
    const { currentUser, userProfile } = useAuth();

    const [liveScenario, setLiveScenario] = useState(null);
    const startedAtRef = useRef(null);
    const [lastSessionId, setLastSessionId] = useState(scenarioSessionId);

    if (lastSessionId !== scenarioSessionId) {
        setLastSessionId(scenarioSessionId);
        setLiveScenario(null);
    }

    const handleFinish = useCallback(async (debrief, steps) => {
        if (!currentUser) return;

        try {
            await addDoc(collection(db, 'quiz_results'), {
                userId: currentUser.uid,
                quizId: scenarioData?.scenarioId || null,
                quizTitle: `${liveScenario.title} Simulation`,
                gameType: 'AI Scenario Simulator',
                score: debrief.score,
                totalQuestions: steps.length,
                accuracy: debrief.score,
                duration: Math.floor((Date.now() - (startedAtRef.current || Date.now())) / 1000),
                timestamp: serverTimestamp(),
                outcome: debrief.outcome,
                finalMeters: debrief.meters,
                summary: debrief.summary,
                transferableLesson: debrief.transferableLesson,
                transcript: steps.flatMap(step => [
                    { role: 'user', content: step.choiceText },
                    { role: 'assistant', content: step.outcome }
                ])
            });

            if (scenarioData?.scenarioId) {
                await updateDoc(doc(db, 'scenarios', scenarioData.scenarioId), {
                    plays: increment(1),
                    lastPlayedAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error saving scenario result:', error);
        }
    }, [currentUser, scenarioData, liveScenario]);

    const handleStarted = (scenario) => {
        startedAtRef.current = Date.now();
        setLiveScenario(scenario);
    };

    if (!isScenarioModalOpen) return null;

    return (
        <Modal
            isOpen={isScenarioModalOpen}
            onClose={closeScenario}
            isFullScreen={true}
            title={liveScenario ? liveScenario.title : (scenarioData?.topic || 'AI Scenario Simulator')}
        >
            {!liveScenario ? (
                <ScenarioSetup
                    key={scenarioSessionId}
                    data={scenarioData || {}}
                    studentName={userProfile?.displayName || ''}
                    onStarted={handleStarted}
                />
            ) : (
                <ScenarioRun
                    key={scenarioSessionId}
                    data={liveScenario}
                    onFinish={handleFinish}
                    onClose={closeScenario}
                    loginHint={currentUser ? null : { onLogin: openLogin }}
                />
            )}
        </Modal>
    );
};

export default ScenarioSimulatorPlay;
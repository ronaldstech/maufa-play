import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzeContent, generateGameContent } from '../services/aiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BrainCircuit, Sliders, Sparkles, Swords, Compass } from 'lucide-react';
import Modal from './Modal';
import './PasteNotesModal.css';

const PasteNotesModal = () => {
    const { isPasteModalOpen, closePasteModal, openQuiz, openFlashcards, openPuzzle, openBoss, openCompanion, openDebate, openScenario, selectedGameType, userProfile, showAlert } = useUI();
    const { currentUser } = useAuth();
    const isFlashcards = selectedGameType === "AI Flashcard Battle";
    const isPuzzle = selectedGameType === "AI Puzzle Generator";
    const isBoss = selectedGameType === "AI Boss Battle";
    const isCompanion = selectedGameType === "AI Study Companion";
    const isDebate = selectedGameType === "AI Debate Game";
    const isScenario = selectedGameType === "AI Scenario Simulator";
    const contentLabel = isFlashcards ? 'Flashcards' : (isPuzzle ? 'Puzzle' : (isBoss ? 'Battle' : (isDebate ? 'Debate' : (isScenario ? 'Scenario' : 'Quiz'))));
    const itemLabel = isFlashcards ? 'flashcards' : (isPuzzle ? 'puzzles' : (isBoss ? 'battle questions' : 'questions'));
    const countLabel = isFlashcards ? 'Flashcards' : (isPuzzle ? 'Terms' : 'Questions');
    const [step, setStep] = useState(1); // 1: Paste, 2: Analyzing, 3: Slider/Configure, 4: Generating
    const [notes, setNotes] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [questionCount, setQuestionCount] = useState(5);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisPhase, setAnalysisPhase] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Simulated progress logic
    useEffect(() => {
        let interval;
        if (isProcessing && (step === 2 || step === 4)) {
            const phases = step === 4
                ? ['Initializing generator...', `Crafting ${itemLabel}...`, 'Optimizing content...', `Finalizing ${contentLabel.toLowerCase()}...`]
                : ['Saving notes...', 'Analyzing content...', 'Mapping concepts...', 'Identifying key terms...'];

            setAnalysisProgress(0);
            setAnalysisPhase(phases[0]);

            let currentProgress = 0;
            interval = setInterval(() => {
                currentProgress += Math.random() * 15;
                if (currentProgress > 95) currentProgress = 95;

                setAnalysisProgress(Math.floor(currentProgress));

                const phaseIndex = Math.floor((currentProgress / 100) * phases.length);
                if (phases[phaseIndex]) setAnalysisPhase(phases[phaseIndex]);
            }, 600);
        } else {
            setAnalysisProgress(0);
            setAnalysisPhase('');
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isProcessing, step, contentLabel, itemLabel]);

    const handleAnalyze = async () => {
        if (!notes.trim() || notes.length < 50) {
            showAlert(`Please paste a bit more content (at least 50 characters) for a quality ${contentLabel.toLowerCase()}.`, 'error');
            return;
        }

        setError(null);
        setStep(2);
        setIsProcessing(true);

        try {
            const result = await analyzeContent(notes);
            const maxQ = Number(result.maxQuestions) || 15;
            setAnalysis({ ...result, maxQuestions: maxQ });
            setQuestionCount(Math.min(5, maxQ));
            setStep(3);
        } catch (err) {
            showAlert(err.message, 'error');
            setStep(1);
        } finally {
            setIsProcessing(false);
        }
    };

    const startDebate = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            if (!currentUser) {
                throw new Error('You must be logged in to start and save a debate.');
            }

            const debateRef = await addDoc(collection(db, 'debates'), {
                userId: currentUser.uid,
                creatorName: userProfile?.displayName || currentUser.email.split('@')[0],
                creatorAvatar: userProfile?.photoURL || null,
                topic: analysis.topic,
                summary: analysis.summary,
                sourceMaterial: notes.substring(0, 1000),
                createdAt: serverTimestamp(),
                gameType: selectedGameType
            });

            closePasteModal();
            resetState();

            openDebate({
                topic: analysis.topic,
                summary: analysis.summary,
                context: notes,
                debateId: debateRef.id
            });
        } catch (err) {
            showAlert(err.message, 'error');
            setStep(3);
        } finally {
            setIsProcessing(false);
        }
    };

    const startScenario = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            if (!currentUser) {
                throw new Error('You must be logged in to start and save a scenario.');
            }

            const scenarioRef = await addDoc(collection(db, 'scenarios'), {
                userId: currentUser.uid,
                creatorName: userProfile?.displayName || currentUser.email.split('@')[0],
                creatorAvatar: userProfile?.photoURL || null,
                topic: analysis.topic,
                summary: analysis.summary,
                sourceMaterial: notes.substring(0, 1000),
                createdAt: serverTimestamp(),
                gameType: selectedGameType,
                plays: 0
            });

            closePasteModal();
            resetState();

            openScenario({
                topic: analysis.topic,
                summary: analysis.summary,
                context: notes,
                scenarioId: scenarioRef.id
            });
        } catch (err) {
            showAlert(err.message, 'error');
            setStep(3);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerate = async () => {
        if (isDebate) {
            await startDebate();
            return;
        }

        if (isScenario) {
            await startScenario();
            return;
        }

        setIsProcessing(true);
        setStep(4);
        setError(null);

        try {
            const content = await generateGameContent(selectedGameType, notes, { questionCount });

            if (!currentUser) {
                throw new Error(`You must be logged in to save and play ${itemLabel}.`);
            }

            // Save to Firestore - using a unified collection or keeping separate? 
            // The prompt says "Save to 'quizzes'" but maybe we should use 'flashcards' or a unified 'game_sessions'
            // For now, let's keep it consistent with the existing structure but use a 'type' field
            const collectionName = isFlashcards ? 'flashcards' : (isPuzzle ? 'puzzles' : (isBoss ? 'bosses' : 'quizzes'));
            const payload = isBoss
                ? { boss: content, questions: content.questions }
                : { [isFlashcards ? 'flashcards' : (isPuzzle ? 'puzzles' : 'questions')]: content };

            const gameRef = await addDoc(collection(db, collectionName), {
                userId: currentUser.uid,
                creatorName: userProfile?.displayName || currentUser.email.split('@')[0],
                creatorAvatar: userProfile?.photoURL || null,
                topic: analysis.topic,
                summary: analysis.summary,
                ...payload,
                sourceMaterial: notes.substring(0, 1000), // Save snippet
                createdAt: serverTimestamp(),
                gameType: selectedGameType
            });

            closePasteModal();
            resetState();

            // Open the new Game Modal
            if (isFlashcards) {
                openFlashcards({
                    flashcards: content,
                    title: analysis.topic,
                    gameId: gameRef.id
                });
            } else if (isPuzzle) {
                openPuzzle({
                    puzzles: content,
                    title: analysis.topic,
                    gameId: gameRef.id
                });
            } else if (isBoss) {
                openBoss({
                    ...content,
                    title: analysis.topic,
                    bossId: gameRef.id
                });
            } else {
                openQuiz({
                    questions: content,
                    title: analysis.topic,
                    quizId: gameRef.id
                });
            }
        } catch (err) {
            showAlert(err.message, 'error');
            setStep(3);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetState = () => {
        setStep(1);
        setNotes('');
        setAnalysis(null);
        setQuestionCount(5);
        setError(null);
    };

    const handleClose = () => {
        if (isProcessing) return;
        closePasteModal();
        resetState();
    };

    const handleCompanionStart = () => {
        if (!notes.trim() || notes.length < 50) {
            showAlert('Please paste a bit more content (at least 50 characters) to give the tutor something to work with.', 'error');
            return;
        }
        openCompanion({ context: notes });
        closePasteModal();
        resetState();
    };

    if (!isPasteModalOpen) return null;

    if (isCompanion) {
        return (
            <Modal isOpen={isPasteModalOpen} onClose={handleClose}>
                <div className="paste-modal-content">
                    <div className="paste-modal-header">
                        <div className="step-indicator">
                            <span className="active">1</span>
                            <div className="line"></div>
                            <span>2</span>
                        </div>
                        <h2><Sparkles className="icon-sparkle" /> Ground Your Tutor</h2>
                    </div>

                    <div className="paste-modal-body">
                        <div className="paste-step animate-fade-in">
                            <p className="step-desc">Paste your lecture notes below. The tutor will ground every answer in this material. You can also skip this and start chatting straight away.</p>
                            <div className="input-container">
                                <textarea
                                    placeholder="Paste notes here (min 50 characters)..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    autoFocus
                                />
                                <div className="textarea-footer">
                                    <span>{notes.length} characters</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="paste-modal-footer">
                        <button className="btn-ghost" onClick={handleClose}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={handleCompanionStart} disabled={notes.length < 50}>
                            Start Chatting <Sparkles size={18} />
                            <div className="btn-glow"></div>
                        </button>
                    </div>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isPasteModalOpen} onClose={handleClose}>
            <div className="paste-modal-content">
                <div className="paste-modal-header">
                    <div className="step-indicator">
                        <span className={step >= 1 ? 'active' : ''}>1</span>
                        <div className={`line ${step >= 2 ? 'active' : ''}`}></div>
                        <span className={step >= 3 ? 'active' : ''}>2</span>
                        <div className={`line ${step >= 4 ? 'active' : ''}`}></div>
                        <span className={step >= 4 ? 'active' : ''}>3</span>
                    </div>
                    {step === 1 && <h2><Sparkles className="icon-sparkle" /> Create {contentLabel}</h2>}
                    {step === 2 && <h2><BrainCircuit className="icon-brain animate-pulse" /> Analyzing Content</h2>}
                    {step === 3 && <h2><Sliders className="icon-slider" /> Configure {contentLabel}</h2>}
                    {step === 4 && <h2><Sparkles className="icon-sparkle animate-spin-slow" /> Generating {contentLabel}</h2>}
                </div>

                <div className="paste-modal-body">
                    {step === 1 && (
                        <div className="paste-step animate-fade-in">
                            <p className="step-desc">Paste your lecture notes, articles, or any text below. Our AI will analyze it to create a personalized challenge.</p>
                            <div className="input-container">
                                <textarea
                                    placeholder="Paste notes here (min 50 characters)..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    autoFocus
                                />
                                <div className="textarea-footer">
                                    <span>{notes.length} characters</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="analyzing-step animate-fade-in text-center">
                            <div className="analysis-progress-container">
                                <div className="progress-stats">
                                    <span className="progress-phase">{analysisPhase}</span>
                                    <span className="progress-percentage">{analysisProgress}%</span>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${analysisProgress}%` }}
                                    ></div>
                                </div>
                                <p className="analysis-subtext">Our AI is examining your notes to identify core learning objectives...</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && analysis && (
                        <div className="configure-step animate-fade-in">
                            <div className="analysis-summary card-glass">
                                <h3 className="topic-title">{analysis.topic}</h3>
                                <p className="summary-text">{analysis.summary}</p>
                            </div>

                            {isDebate || isScenario ? (
                                <p className="slider-hint">
                                    {isDebate
                                        ? 'Next you choose which side to argue, how tough the AI opponent is, and how many rounds you want.'
                                        : 'Next you set how intense the situation is and how many decisions you will have to make.'}
                                </p>
                            ) : (
                                <div className="slider-section">
                                    <div className="slider-header">
                                        <label>Number of {countLabel}</label>
                                        <span className="count-badge">{questionCount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max={analysis.maxQuestions}
                                        value={questionCount}
                                        onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                        className="premium-slider"
                                    />
                                    <div className="slider-range">
                                        <span>1</span>
                                        <span>Max: {analysis.maxQuestions}</span>
                                    </div>
                                    <p className="slider-hint">Based on your content, AI suggests up to {analysis.maxQuestions} {isFlashcards ? 'cards' : 'questions'}.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div className="analyzing-step animate-fade-in text-center">
                            <div className="analysis-progress-container">
                                <div className="progress-stats">
                                    <span className="progress-phase">{analysisPhase}</span>
                                    <span className="progress-percentage">{analysisProgress}%</span>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${analysisProgress}%` }}
                                    ></div>
                                </div>
                                <p className="analysis-subtext">Generating {questionCount} {itemLabel} from your content...</p>
                            </div>
                        </div>
                    )}

                </div>

                <div className="paste-modal-footer">
                    <button className="btn-ghost" onClick={handleClose} disabled={isProcessing}>
                        Cancel
                    </button>
                    {step === 1 && (
                        <button className="btn-primary" onClick={handleAnalyze} disabled={notes.length < 50}>
                            Analyze Content <BrainCircuit size={18} />
                            <div className="btn-glow"></div>
                        </button>
                    )}
                    {step === 3 && (
                        <button className="btn-primary" onClick={handleGenerate} disabled={isProcessing}>
                            {isDebate
                                ? <>Set Up Debate <Swords size={18} /></>
                                : isScenario
                                    ? <>Set Up Scenario <Compass size={18} /></>
                                    : <>Generate {questionCount} {countLabel} <Sparkles size={18} /></>}
                            <div className="btn-glow"></div>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PasteNotesModal;

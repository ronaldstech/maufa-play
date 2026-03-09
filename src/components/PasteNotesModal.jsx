import React, { useState, useEffect } from 'react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzeContent, generateGameContent } from '../services/aiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BrainCircuit, Sliders, Sparkles } from 'lucide-react';
import Modal from './Modal';
import './PasteNotesModal.css';

const PasteNotesModal = () => {
    const { isPasteModalOpen, closePasteModal, openQuiz, openFlashcards, selectedGameType, userProfile, showAlert } = useUI();
    const { currentUser } = useAuth();
    const isFlashcards = selectedGameType === "AI Flashcard Battle";
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
                ? ['Initializing generator...', `Crafting ${isFlashcards ? 'flashcards' : 'questions'}...`, 'Optimizing content...', `Finalizing ${isFlashcards ? 'cards' : 'quiz'}...`]
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
    }, [isProcessing, step]);

    const handleAnalyze = async () => {
        if (!notes.trim() || notes.length < 50) {
            showAlert(`Please paste a bit more content (at least 50 characters) for a quality ${isFlashcards ? 'flashcard set' : 'quiz'}.`, 'error');
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

    const handleGenerate = async () => {
        setIsProcessing(true);
        setStep(4);
        setError(null);

        try {
            const content = await generateGameContent(selectedGameType, notes, { questionCount });

            if (!currentUser) {
                throw new Error(`You must be logged in to save and play ${isFlashcards ? 'flashcards' : 'quizzes'}.`);
            }

            // Save to Firestore - using a unified collection or keeping separate? 
            // The prompt says "Save to 'quizzes'" but maybe we should use 'flashcards' or a unified 'game_sessions'
            // For now, let's keep it consistent with the existing structure but use a 'type' field
            const collectionName = isFlashcards ? 'flashcards' : 'quizzes';

            const gameRef = await addDoc(collection(db, collectionName), {
                userId: currentUser.uid,
                creatorName: userProfile?.displayName || currentUser.email.split('@')[0],
                creatorAvatar: userProfile?.photoURL || null,
                topic: analysis.topic,
                summary: analysis.summary,
                [isFlashcards ? 'flashcards' : 'questions']: content,
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

    if (!isPasteModalOpen) return null;

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
                    {step === 1 && <h2><Sparkles className="icon-sparkle" /> Create {isFlashcards ? 'Flashcards' : 'Quiz'}</h2>}
                    {step === 2 && <h2><BrainCircuit className="icon-brain animate-pulse" /> Analyzing Content</h2>}
                    {step === 3 && <h2><Sliders className="icon-slider" /> Configure {isFlashcards ? 'Deck' : 'Quiz'}</h2>}
                    {step === 4 && <h2><Sparkles className="icon-sparkle animate-spin-slow" /> Generating {isFlashcards ? 'Flashcards' : 'Questions'}</h2>}
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

                            <div className="slider-section">
                                <div className="slider-header">
                                    <label>Number of {isFlashcards ? 'Flashcards' : 'Questions'}</label>
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
                                <p className="analysis-subtext">Generating {questionCount} {isFlashcards ? 'curated flashcards' : 'challenging multiple choice questions'} from your content...</p>
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
                            Generate {questionCount} {isFlashcards ? 'Flashcards' : 'Questions'} <Sparkles size={18} />
                            <div className="btn-glow"></div>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PasteNotesModal;

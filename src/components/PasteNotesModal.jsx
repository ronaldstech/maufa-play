import React, { useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzeContent, generateGameContent } from '../services/aiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { BrainCircuit, Sliders, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import Modal from './Modal';
import './PasteNotesModal.css';

const PasteNotesModal = () => {
    const { isPasteModalOpen, closePasteModal, openQuiz } = useUI();
    const { currentUser } = useAuth();
    // Modal-based quiz flow integration

    const [step, setStep] = useState(1); // 1: Paste, 2: Analyzing, 3: Slider/Configure, 4: Generating
    const [notes, setNotes] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [questionCount, setQuestionCount] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    const handleAnalyze = async () => {
        if (!notes.trim() || notes.length < 50) {
            setError("Please paste a bit more content (at least 50 characters) for a quality quiz.");
            return;
        }

        setError(null);
        setStep(2);
        setIsProcessing(true);

        try {
            const result = await analyzeContent(notes);
            setAnalysis(result);
            setQuestionCount(Math.min(5, result.maxQuestions));
            setStep(3);
        } catch (err) {
            setError(err.message);
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
            const questions = await generateGameContent("AI Quiz Generator", notes, { questionCount });

            // Save to Firestore
            const quizRef = await addDoc(collection(db, 'quizzes'), {
                userId: currentUser.uid,
                topic: analysis.topic,
                summary: analysis.summary,
                questions: questions,
                sourceMaterial: notes.substring(0, 1000), // Save snippet
                createdAt: serverTimestamp()
            });

            closePasteModal();
            resetState();

            // Open the new Quiz Modal
            openQuiz({
                questions,
                title: analysis.topic,
                quizId: quizRef.id
            });
        } catch (err) {
            setError(err.message);
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
                    {step === 1 && <h2><Sparkles className="icon-sparkle" /> Create Your Quiz</h2>}
                    {step === 2 && <h2><BrainCircuit className="icon-brain animate-pulse" /> Analyzing Content</h2>}
                    {step === 3 && <h2><Sliders className="icon-slider" /> Configure Quiz</h2>}
                    {step === 4 && <h2><Sparkles className="icon-sparkle animate-spin-slow" /> Generating Questions</h2>}
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
                            <div className="loading-visual">
                                <Loader2 size={48} className="animate-spin" />
                            </div>
                            <p>Our AI is examining your notes to find the best question opportunities...</p>
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
                                    <label>Number of Questions</label>
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
                                <p className="slider-hint">Based on your content, AI suggests up to {analysis.maxQuestions} questions.</p>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="analyzing-step animate-fade-in text-center">
                            <div className="loading-visual">
                                <Sparkles size={48} className="text-gradient-primary animate-pulse" />
                            </div>
                            <p>Crafting {questionCount} multiple choice questions from your notes...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-toast animate-bounce-in">
                            <AlertCircle size={18} />
                            <span>{error}</span>
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
                            Generate {questionCount} Questions <Sparkles size={18} />
                            <div className="btn-glow"></div>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default PasteNotesModal;

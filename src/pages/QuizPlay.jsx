import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { ChevronRight, ChevronLeft, CheckCircle2, XCircle, RotateCcw, Award, Sparkles, Target, BarChart3, Clock } from 'lucide-react';
import Modal from '../components/Modal';
import './QuizPlay.css';

const QuizModalPlay = () => {
    const { isQuizModalOpen, closeQuiz, quizData } = useUI();
    const { currentUser } = useAuth();

    // Extract questions and title from quizData
    const questions = quizData?.questions || [];
    const title = quizData?.title || 'AI Quiz';
    const quizId = quizData?.quizId || null;

    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [startTime] = useState(Date.now());
    const [duration, setDuration] = useState(0);

    // Reset when modal opens
    useEffect(() => {
        if (isQuizModalOpen) {
            resetQuiz();
        }
    }, [isQuizModalOpen]);

    const handleOptionSelect = (optionIndex) => {
        if (showResults || isSaving) return;
        setSelectedAnswers({
            ...selectedAnswers,
            [currentQuestion]: optionIndex
        });
    };

    const handleNext = async () => {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            const finalScore = calculateScore();
            setShowResults(true);
            setDuration(Math.floor((Date.now() - startTime) / 1000));
            await saveResult(finalScore);
        }
    };

    const handlePrevious = () => {
        if (currentQuestion > 0 && !isSaving) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const calculateScore = () => {
        let currentScore = 0;
        questions.forEach((q, index) => {
            if (selectedAnswers[index] === q.correctAnswer) {
                currentScore++;
            }
        });
        setScore(currentScore);
        return currentScore;
    };

    const saveResult = async (finalScore) => {
        if (!currentUser || isSaving) return;

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'quiz_results'), {
                userId: currentUser.uid,
                quizId: quizId,
                score: finalScore,
                totalQuestions: questions.length,
                accuracy: Math.round((finalScore / questions.length) * 100),
                duration: Math.floor((Date.now() - startTime) / 1000),
                timestamp: serverTimestamp(),
                quizTitle: title,
                selectedAnswers: selectedAnswers,
                questions: questions // Store questions so we can review even if the original quiz is deleted
            });
        } catch (error) {
            console.error("Error saving quiz result:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const resetQuiz = () => {
        setCurrentQuestion(0);
        setSelectedAnswers({});
        setShowResults(false);
        setScore(0);
    };

    if (!isQuizModalOpen || !questions.length) return null;

    const currentQ = questions[currentQuestion];
    const progress = ((currentQuestion + 1) / questions.length) * 100;

    return (
        <Modal isOpen={isQuizModalOpen} onClose={closeQuiz} isFullScreen={true} title={title}>
            <div className={`quiz-modal-container ${showResults ? 'results-view' : ''}`}>
                {!showResults ? (
                    <div className="quiz-play-flow">
                        <div className="quiz-header">
                            <div className="quiz-info">
                                <div className="q-counter">
                                    <span className="current">{currentQuestion + 1}</span>
                                    <span className="divider">/</span>
                                    <span className="total">{questions.length}</span>
                                </div>
                            </div>
                            <div className="premium-progress">
                                <div className="progress-track">
                                    <div className="progress-fill" style={{ width: `${progress}%` }}>
                                        <div className="glow"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div key={currentQuestion} className="question-section animate-slide-in">
                            <h2 className="question-text">{currentQ.question}</h2>
                            <div className="options-container">
                                {currentQ.options.map((option, index) => (
                                    <button
                                        key={index}
                                        className={`option-btn ${selectedAnswers[currentQuestion] === index ? 'selected' : ''}`}
                                        onClick={() => handleOptionSelect(index)}
                                        style={{ '--index': index }}
                                    >
                                        <div className="option-marker">{String.fromCharCode(65 + index)}</div>
                                        <span className="option-label">{option}</span>
                                        <div className="selection-indicator"></div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="quiz-actions">
                            <button
                                className={`control-btn prev ${currentQuestion === 0 ? 'hidden' : ''}`}
                                onClick={handlePrevious}
                            >
                                <ChevronLeft /> Back
                            </button>
                            <button
                                className={`btn-primary next-btn ${selectedAnswers[currentQuestion] === undefined ? 'disabled' : ''}`}
                                onClick={handleNext}
                                disabled={selectedAnswers[currentQuestion] === undefined}
                            >
                                {currentQuestion === questions.length - 1 ? 'Finish Challenge' : 'Next Question'}
                                <ChevronRight className="icon-right" />
                                <div className="btn-glow"></div>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="results-flow animate-fade-in">
                        <div className="results-container">
                            {/* Background Glows for depth */}
                            <div className="bg-glow-purple"></div>
                            <div className="bg-glow-pink"></div>

                            <div className="results-card">
                                <header className="results-header">
                                    <div className="icon-badge">
                                        <Award size={32} />
                                    </div>
                                    <div className="header-text">
                                        <h1>{score / questions.length > 0.7 ? "Excellent Work!" : "Keep Pushing!"}</h1>
                                        <p>{title}</p>
                                    </div>
                                </header>

                                <div className="hero-content">
                                    {/* Left Side: The Score Visual */}
                                    <div className="score-visualization">
                                        <div className="progress-ring-wrapper">
                                            <svg viewBox="0 0 120 120">
                                                <defs>
                                                    <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                        <stop offset="0%" stopColor="#6366f1" />
                                                        <stop offset="50%" stopColor="#a855f7" />
                                                        <stop offset="100%" stopColor="#ec4899" />
                                                    </linearGradient>
                                                </defs>
                                                <circle className="ring-track" cx="60" cy="60" r="54" />
                                                <circle
                                                    className="ring-progress"
                                                    cx="60" cy="60" r="54"
                                                    strokeDasharray="339.29"
                                                    style={{ strokeDashoffset: 339.29 - (339.29 * (score / questions.length)) }}
                                                />
                                            </svg>
                                            <div className="score-display">
                                                <span className="current">{score}</span>
                                                <div className="divider"></div>
                                                <span className="total">{questions.length}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Side: The Stats */}
                                    <div className="metrics-column">
                                        <div className="metric-pill">
                                            <Target size={20} />
                                            <div className="metric-data">
                                                <span className="label">Accuracy</span>
                                                <span className="value">{Math.round((score / questions.length) * 100)}%</span>
                                            </div>
                                        </div>

                                        <div className="metric-pill">
                                            <Clock size={20} />
                                            <div className="metric-data">
                                                <span className="label">Time</span>
                                                <span className="value">{duration}s</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="performance-review">
                            <div className="review-header-section">
                                <h3><BarChart3 size={24} /> Performance Analysis</h3>
                                <p>Review your answers and learn from the results</p>
                            </div>

                            <div className="review-list">
                                {questions.map((q, idx) => {
                                    const isCorrect = selectedAnswers[idx] === q.correctAnswer;
                                    return (
                                        <div
                                            key={idx}
                                            className={`review-item ${isCorrect ? 'is-correct' : 'is-incorrect'}`}
                                            style={{ animationDelay: `${idx * 0.1}s` }}
                                        >
                                            <div className="review-item-number">
                                                <span>{idx + 1}</span>
                                            </div>
                                            <div className="review-item-body">
                                                <div className="review-item-header">
                                                    <p className="review-question">{q.question}</p>
                                                    <div className={`status-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                                                        {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                                    </div>
                                                </div>

                                                <div className="review-answers-grid">
                                                    <div className="answer-pill correct">
                                                        <span className="label">Correct Answer</span>
                                                        <span className="value">{q.options[q.correctAnswer]}</span>
                                                    </div>
                                                    {!isCorrect && (
                                                        <div className="answer-pill yours">
                                                            <span className="label">Your Choice</span>
                                                            <span className="value">{q.options[selectedAnswers[idx]] || 'Skipped'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="results-footer">
                            <button className="btn-ghost" onClick={resetQuiz}>
                                <RotateCcw size={20} /> Retake Quiz
                            </button>
                            <button className="btn-primary" onClick={closeQuiz}>
                                <Sparkles size={20} /> Close & Continue
                                <div className="btn-glow"></div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default QuizModalPlay;

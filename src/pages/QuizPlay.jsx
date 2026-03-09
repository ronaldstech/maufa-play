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
        <Modal isOpen={isQuizModalOpen} onClose={closeQuiz} maxWidth="900px">
            <div className={`quiz-modal-container ${showResults ? 'results-view' : ''}`}>
                {!showResults ? (
                    <div className="quiz-play-flow">
                        <div className="quiz-header">
                            <div className="quiz-info">
                                <span className="title-tag">{title}</span>
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
                        <div className="results-hero">
                            <div className="congrats-content">
                                <Award className="award-icon animate-bounce-gentle" size={80} />
                                <h1>Outstanding Effort!</h1>
                                <p className="topic-name">{title}</p>
                            </div>

                            <div className="main-score">
                                <div className="score-ring">
                                    <svg viewBox="0 0 100 100">
                                        <defs>
                                            <linearGradient id="score-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#6366f1" />
                                                <stop offset="50%" stopColor="#a855f7" />
                                                <stop offset="100%" stopColor="#ec4899" />
                                            </linearGradient>
                                        </defs>
                                        <circle className="ring-bg" cx="50" cy="50" r="45" />
                                        <circle
                                            className="ring-fill"
                                            cx="50" cy="50" r="45"
                                            style={{ '--offset': 283 - (283 * (score / questions.length)) }}
                                        />
                                    </svg>
                                    <div className="score-text">
                                        <span className="num">{score}</span>
                                        <span className="total">of {questions.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="stats-grid">
                                <div className="stat-box">
                                    <Target className="stat-icon" />
                                    <div className="stat-info">
                                        <span className="val">{Math.round((score / questions.length) * 100)}%</span>
                                        <span className="lbl">Accuracy</span>
                                    </div>
                                </div>
                                <div className="stat-box">
                                    <Clock className="stat-icon" />
                                    <div className="stat-info">
                                        <span className="val">{duration}s</span>
                                        <span className="lbl">Time Taken</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="results-details">
                            <h3><BarChart3 size={20} /> Performance Review</h3>
                            <div className="review-scroll">
                                {questions.map((q, idx) => (
                                    <div key={idx} className={`review-card ${selectedAnswers[idx] === q.correctAnswer ? 'correct' : 'incorrect'}`}>
                                        <div className="review-meta">
                                            <span className="q-index">Question {idx + 1}</span>
                                            {selectedAnswers[idx] === q.correctAnswer ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                        </div>
                                        <p className="q-content">{q.question}</p>
                                        <div className="answer-summary">
                                            <div className="ans-label">Correct: <span className="ans-val">{q.options[q.correctAnswer]}</span></div>
                                            {selectedAnswers[idx] !== q.correctAnswer && (
                                                <div className="ans-label yours">Yours: <span className="ans-val">{q.options[selectedAnswers[idx]] || 'Skipped'}</span></div>
                                            )}
                                        </div>
                                    </div>
                                ))}
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

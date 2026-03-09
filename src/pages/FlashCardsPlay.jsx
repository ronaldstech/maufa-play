import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import {
    ChevronRight,
    ChevronLeft,
    RotateCcw,
    Sparkles,
    Layers,
    CheckCircle2,
    HelpCircle,
    X,
    Maximize2,
    Volume2
} from 'lucide-react';
import Modal from '../components/Modal';
import './FlashCardsPlay.css';

const FlashCardsPlay = () => {
    const { isFlashcardModalOpen, closeFlashcards, flashcardData } = useUI();

    const flashcards = flashcardData?.flashcards || [];
    const title = flashcardData?.title || 'AI Flashcards';
    const gameId = flashcardData?.gameId || null;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [masteredCount, setMasteredCount] = useState(0);
    const [sessionStats, setSessionStats] = useState({ mastered: [], review: [] });
    const [showFinalResults, setShowFinalResults] = useState(false);

    // Reset when modal opens
    useEffect(() => {
        if (isFlashcardModalOpen) {
            resetSession();
            incrementAttempts();
        }
    }, [isFlashcardModalOpen]);

    const incrementAttempts = async () => {
        if (gameId) {
            try {
                const gameRef = doc(db, 'flashcards', gameId);
                await updateDoc(gameRef, {
                    attempts: increment(1)
                });
            } catch (error) {
                console.error("Error incrementing flashcard attempts:", error);
            }
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleNext = () => {
        if (currentIndex < flashcards.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
        } else {
            setShowFinalResults(true);
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setIsFlipped(false);
        }
    };

    const markAsMastered = () => {
        if (!sessionStats.mastered.includes(currentIndex)) {
            setSessionStats(prev => ({
                ...prev,
                mastered: [...prev.mastered, currentIndex],
                review: prev.review.filter(idx => idx !== currentIndex)
            }));
            setMasteredCount(prev => prev + 1);
        }
        handleNext();
    };

    const markForReview = () => {
        if (!sessionStats.review.includes(currentIndex)) {
            setSessionStats(prev => ({
                ...prev,
                review: [...prev.review, currentIndex],
                mastered: prev.mastered.filter(idx => idx !== currentIndex)
            }));
        }
        handleNext();
    };

    const resetSession = () => {
        setCurrentIndex(0);
        setIsFlipped(false);
        setMasteredCount(0);
        setSessionStats({ mastered: [], review: [] });
        setShowFinalResults(false);
    };

    const speak = (text) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    };

    // Filter out any invalid items (empty objects or missing front/back)
    const validFlashcards = flashcards.filter(card => card && (card.front || card.back));

    if (!isFlashcardModalOpen || !validFlashcards.length) return null;

    const currentCard = validFlashcards[currentIndex];
    const progress = ((currentIndex + 1) / validFlashcards.length) * 100;
    const masteryRate = Math.round((sessionStats.mastered.length / validFlashcards.length) * 100);

    if (!currentCard) {
        return (
            <Modal isOpen={isFlashcardModalOpen} onClose={closeFlashcards} isFullScreen={true} title={title}>
                <div className="flashcards-error-state">
                    <h3>Oops! Something went wrong.</h3>
                    <p>The content for this card is missing or invalid.</p>
                    <button className="btn-secondary" onClick={handleNext}>Skip to Next Card</button>
                    <button className="btn-ghost" onClick={closeFlashcards}>Close</button>
                </div>
            </Modal>
        );
    }

    return (
        <Modal isOpen={isFlashcardModalOpen} onClose={closeFlashcards} isFullScreen={true} title={title}>
            <div className="flashcards-game-container">
                {!showFinalResults ? (
                    <div className="flashcards-play-view">
                        <div className="play-header">
                            <div className="progress-info">
                                <span className="counter">Card {currentIndex + 1} of {flashcards.length}</span>
                                <div className="mastery-badge">
                                    <CheckCircle2 size={14} /> {sessionStats.mastered.length} Mastered
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

                        <div className="card-stage">
                            <div
                                className={`flashcard ${isFlipped ? 'flipped' : ''}`}
                                onClick={handleFlip}
                            >
                                <div className="card-inner">
                                    <div className="card-front card-face">
                                        <div className="card-label">Front Content</div>
                                        <div className="card-text">{currentCard.front}</div>
                                        <div className="card-footer">
                                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); speak(currentCard.front); }}>
                                                <Volume2 size={20} />
                                            </button>
                                            <div className="hint-text">Click to flip</div>
                                            <Maximize2 size={20} className="muted" />
                                        </div>
                                    </div>
                                    <div className="card-back card-face">
                                        <div className="card-label">Back Content</div>
                                        <div className="card-text">{currentCard.back}</div>
                                        <div className="card-footer">
                                            <button className="icon-btn" onClick={(e) => { e.stopPropagation(); speak(currentCard.back); }}>
                                                <Volume2 size={20} />
                                            </button>
                                            <div className="hint-text">Click to flip back</div>
                                            <Maximize2 size={20} className="muted" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="game-nav-controls">
                            <button
                                className={`nav-btn prev ${currentIndex === 0 ? 'disabled' : ''}`}
                                onClick={handlePrevious}
                                disabled={currentIndex === 0}
                            >
                                <ChevronLeft size={24} />
                            </button>

                            <div className="action-buttons">
                                <button className="btn-review" onClick={markForReview}>
                                    <HelpCircle size={20} /> Still Learning
                                </button>
                                <button className="btn-mastered" onClick={markAsMastered}>
                                    <CheckCircle2 size={20} /> I Mastered This
                                </button>
                            </div>

                            <button
                                className="nav-btn next"
                                onClick={handleNext}
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flashcards-results animate-fade-in">
                        <div className="results-hero">
                            <div className="bg-glow-purple"></div>
                            <div className="icon-badge">
                                <Layers size={40} />
                            </div>
                            <h1>Session Complete!</h1>
                            <p>You've reviewed all cards in "{title}"</p>
                        </div>

                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-value">{masteryRate}%</span>
                                <span className="stat-label">Mastery Rate</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{sessionStats.mastered.length}</span>
                                <span className="stat-label">Mastered</span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-value">{sessionStats.review.length}</span>
                                <span className="stat-label">To Review</span>
                            </div>
                        </div>

                        <div className="results-actions">
                            <button className="btn-secondary" onClick={resetSession}>
                                <RotateCcw size={20} /> Restart Session
                            </button>
                            <button className="btn-primary" onClick={closeFlashcards}>
                                <Sparkles size={20} /> Finish & Close
                                <div className="btn-glow"></div>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default FlashCardsPlay;

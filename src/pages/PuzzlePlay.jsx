import React, { useState, useEffect, useCallback } from 'react';
import { useUI } from '../contexts/UIContext';
import { Trophy, ArrowRight, RefreshCcw, CheckCircle2, AlertCircle, X, HelpCircle } from 'lucide-react';
import Modal from '../components/Modal';
import './PuzzlePlay.css';

const PuzzlePlay = () => {
    const { isPuzzleModalOpen, closePuzzle, puzzleData, showAlert } = useUI();
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [scrambledWord, setScrambledWord] = useState('');
    const [isCorrect, setIsCorrect] = useState(false);
    const [isError, setIsError] = useState(false);
    const [score, setScore] = useState(0);
    const [isGameOver, setIsGameOver] = useState(false);
    const [hintsUsed, setHintsUsed] = useState(0);

    const scramble = useCallback((word) => {
        if (!word || word.length <= 1) return word.toUpperCase();
        
        let scrambled = '';
        let attempts = 0;
        const upperWord = word.toUpperCase();

        while (attempts < 10) {
            const arr = upperWord.split('');
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            scrambled = arr.join('');
            if (scrambled !== upperWord) break;
            attempts++;
        }
        
        return scrambled;
    }, []);

    useEffect(() => {
        if (puzzleData && puzzleData.puzzles && puzzleData.puzzles[currentWordIndex]) {
            setScrambledWord(scramble(puzzleData.puzzles[currentWordIndex].word));
            setUserInput('');
            setIsCorrect(false);
            setIsError(false);
        }
    }, [puzzleData, currentWordIndex, scramble]);

    const handleInputChange = (e) => {
        setUserInput(e.target.value);
        setIsError(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const currentWord = puzzleData.puzzles[currentWordIndex].word.toUpperCase();
        
        if (userInput.toUpperCase().trim() === currentWord) {
            setIsCorrect(true);
            setScore(prev => prev + 100);
            
            setTimeout(() => {
                if (currentWordIndex + 1 < puzzleData.puzzles.length) {
                    setCurrentWordIndex(prev => prev + 1);
                } else {
                    setIsGameOver(true);
                }
            }, 1000);
        } else {
            setIsError(true);
            setTimeout(() => setIsError(false), 500);
        }
    };

    const skipWord = () => {
        if (currentWordIndex + 1 < puzzleData.puzzles.length) {
            setCurrentWordIndex(prev => prev + 1);
        } else {
            setIsGameOver(true);
        }
    };

    const handleClose = () => {
        closePuzzle();
        // Reset local state after modal closes
        setTimeout(() => {
            setCurrentWordIndex(0);
            setScore(0);
            setIsGameOver(false);
            setHintsUsed(0);
        }, 300);
    };

    if (!isPuzzleModalOpen || !puzzleData) return null;

    const currentPuzzle = puzzleData.puzzles[currentWordIndex];

    return (
        <Modal isOpen={isPuzzleModalOpen} onClose={handleClose} maxWidth="800px">
            <div className="puzzle-play-modal">
                {!isGameOver ? (
                    <>
                        <div className="puzzle-header">
                            <h2 className="puzzle-title">Word Scramble</h2>
                            <p className="text-secondary">{puzzleData.title}</p>
                        </div>

                        <div className="puzzle-stats">
                            <div className="stat-item">
                                <span className="stat-label">Progress</span>
                                <span className="stat-value">{currentWordIndex + 1} / {puzzleData.puzzles.length}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Score</span>
                                <span className="stat-value">{score}</span>
                            </div>
                        </div>

                        <div className="puzzle-content">
                            <div className="scrambled-word-container">
                                {scrambledWord.split('').map((letter, idx) => (
                                    <div key={idx} className="scrambled-letter animate-bounce-slow" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        {letter}
                                    </div>
                                ))}
                            </div>

                            <div className="puzzle-hint animate-fade-in">
                                <h4><HelpCircle size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Hint</h4>
                                <p>{currentPuzzle.hint}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="puzzle-input-area">
                                <input
                                    type="text"
                                    className={`puzzle-input ${isError ? 'error' : ''} ${isCorrect ? 'success' : ''}`}
                                    placeholder="Type your answer..."
                                    value={userInput}
                                    onChange={handleInputChange}
                                    autoFocus
                                    disabled={isCorrect}
                                />
                                <button type="submit" className="btn-primary mt-4 w-full" disabled={isCorrect || !userInput.trim()}>
                                    {isCorrect ? <CheckCircle2 size={20} /> : 'Check Answer'}
                                </button>
                            </form>
                        </div>

                        <div className="puzzle-footer">
                            <button className="btn-ghost" onClick={skipWord}>
                                Skip Word <ArrowRight size={18} />
                            </button>
                            <button className="btn-ghost" onClick={() => setScrambledWord(scramble(currentPuzzle.word))}>
                                <RefreshCcw size={18} /> Rescramble
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="puzzle-complete-screen animate-fade-in">
                        <Trophy size={80} className="success-icon animate-bounce-slow" />
                        <h1 className="completion-title">Excellent Work!</h1>
                        <p className="text-secondary">You've successfully unscrambled all the terms.</p>
                        
                        <div className="completion-stats">
                            <div className="stat-item">
                                <span className="stat-label">Final Score</span>
                                <span className="stat-value">{score}</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-label">Words Completed</span>
                                <span className="stat-value">{puzzleData.puzzles.length}</span>
                            </div>
                        </div>

                        <button className="btn-primary" onClick={handleClose}>
                            Return to Library
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default PuzzlePlay;

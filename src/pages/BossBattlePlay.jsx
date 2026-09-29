import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, increment } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import {
    Swords, Skull, Heart, Shield, Timer, Trophy,
    Zap, CheckCircle2, XCircle, Sparkles, ArrowRight
} from 'lucide-react';
import Modal from '../components/Modal';
import './BossBattlePlay.css';

const QUESTION_TIME = 20;
const BOSS_DAMAGE = { easy: 20, medium: 30, hard: 40 };
const PLAYER_DAMAGE = { easy: 12, medium: 18, hard: 25 };
const REVEAL_DELAY = 1700;

const BOSS_HP_PER_ROUND = BOSS_DAMAGE.easy;
const PLAYER_HP_PER_ROUND = PLAYER_DAMAGE.easy;

const getPercent = (value, max) => Math.max(0, Math.min(100, (value / max) * 100));

const BossBattleSession = ({ data, onClose }) => {
    const { currentUser } = useAuth();
    const { questions, bossName, bossTitle, bossIntro, bossId } = data;
    const [startTime] = useState(() => Date.now());

    const bossMaxHp = questions.length * BOSS_HP_PER_ROUND;
    const playerMaxHp = questions.length * PLAYER_HP_PER_ROUND;

    const [phase, setPhase] = useState('intro');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [bossHp, setBossHp] = useState(bossMaxHp);
    const [playerHp, setPlayerHp] = useState(playerMaxHp);
    const [correctCount, setCorrectCount] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
    const [feedback, setFeedback] = useState(null);
    const [summary, setSummary] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const question = questions[currentIndex];
    const difficulty = BOSS_DAMAGE[question?.difficulty] ? question.difficulty : 'medium';

    const saveResult = useCallback(async (result, finalAnswers) => {
        if (!currentUser) return;

        setIsSaving(true);
        try {
            await addDoc(collection(db, 'quiz_results'), {
                userId: currentUser.uid,
                quizId: bossId,
                score: result.correctCount,
                totalQuestions: questions.length,
                accuracy: Math.round((result.correctCount / questions.length) * 100),
                duration: Math.floor((Date.now() - startTime) / 1000),
                timestamp: serverTimestamp(),
                quizTitle: `${bossName} - ${bossTitle}`,
                gameType: 'AI Boss Battle',
                outcome: result.outcome,
                bossHpRemaining: result.bossHp,
                playerHpRemaining: result.playerHp,
                selectedAnswers: finalAnswers,
                questions
            });

            if (bossId) {
                await updateDoc(doc(db, 'bosses', bossId), { attempts: increment(1) });
            }
        } catch (error) {
            console.error("Error saving boss battle result:", error);
        } finally {
            setIsSaving(false);
        }
    }, [bossId, bossName, bossTitle, currentUser, questions, startTime]);

    const endBattle = useCallback((outcome, finalAnswers, nextBossHp, nextPlayerHp, correct) => {
        const result = {
            outcome,
            correctCount: correct,
            bossHp: nextBossHp,
            playerHp: nextPlayerHp
        };
        setSummary(result);
        setPhase(outcome);
        saveResult(result, finalAnswers);
    }, [saveResult]);

    const resolveQuestion = useCallback((answerIndex, timedOut = false) => {
        if (!question || selectedAnswer !== null) return;

        const isCorrect = !timedOut && answerIndex === question.correctAnswer;
        const speedBonus = isCorrect ? Math.round((timeLeft / QUESTION_TIME) * 10) : 0;
        const dealt = isCorrect ? BOSS_DAMAGE[difficulty] + speedBonus : 0;
        const taken = isCorrect ? 0 : PLAYER_DAMAGE[difficulty];

        const nextBossHp = Math.max(0, bossHp - dealt);
        const nextPlayerHp = Math.max(0, playerHp - taken);
        const nextAnswers = [...answers, timedOut ? -1 : answerIndex];
        const nextCorrect = correctCount + (isCorrect ? 1 : 0);

        setBossHp(nextBossHp);
        setPlayerHp(nextPlayerHp);
        setCorrectCount(nextCorrect);
        setAnswers(nextAnswers);
        setSelectedAnswer(timedOut ? -1 : answerIndex);
        setFeedback(isCorrect
            ? { type: 'hit', damage: dealt, speedBonus }
            : { type: 'hurt', damage: taken, taunt: question.taunt }
        );

        setTimeout(() => {
            setFeedback(null);

            if (nextBossHp <= 0) {
                endBattle('victory', nextAnswers, nextBossHp, nextPlayerHp, nextCorrect);
            } else if (nextPlayerHp <= 0) {
                endBattle('defeat', nextAnswers, nextBossHp, nextPlayerHp, nextCorrect);
            } else if (currentIndex + 1 < questions.length) {
                setCurrentIndex(prev => prev + 1);
                setTimeLeft(QUESTION_TIME);
                setSelectedAnswer(null);
            } else {
                endBattle('defeat', nextAnswers, nextBossHp, nextPlayerHp, nextCorrect);
            }
        }, REVEAL_DELAY);
    }, [answers, bossHp, correctCount, currentIndex, difficulty, endBattle, playerHp, question, questions.length, selectedAnswer, timeLeft]);

    useEffect(() => {
        if (phase !== 'battle' || selectedAnswer !== null) return;

        const timer = setTimeout(() => {
            if (timeLeft <= 1) {
                setTimeLeft(0);
                resolveQuestion(null, true);
            } else {
                setTimeLeft(prev => prev - 1);
            }
        }, 1000);

        return () => clearTimeout(timer);
    }, [phase, resolveQuestion, selectedAnswer, timeLeft]);

    const startBattle = () => {
        setTimeLeft(QUESTION_TIME);
        setPhase('battle');
    };

    const handleOptionSelect = (optionIndex) => {
        if (phase !== 'battle' || selectedAnswer !== null) return;
        resolveQuestion(optionIndex);
    };

    const isVictory = phase === 'victory';
    const isAnswerRevealed = selectedAnswer !== null;
    const timeIsLow = timeLeft <= 5;

    return (
        <Modal isOpen={true} onClose={onClose} isFullScreen={true} title={bossTitle}>
            <div className="boss-arena">
                <div className="boss-opponent">
                    <div className={`boss-avatar ${isVictory ? 'is-defeated' : ''}`}>
                        {isVictory ? <Shield size={40} /> : <Skull size={40} />}
                    </div>
                    <div className="boss-identity">
                        <h2 className="boss-name">{bossName}</h2>
                        <span className="boss-epithet">{bossTitle}</span>
                    </div>
                    <div className="hp-track boss-track">
                        <div className="hp-fill boss-fill" style={{ width: `${getPercent(bossHp, bossMaxHp)}%` }}></div>
                        <span className="hp-text">{bossHp} / {bossMaxHp}</span>
                    </div>
                </div>

                <div className="player-status">
                    <div className="hp-track player-track">
                        <div className="hp-fill player-fill" style={{ width: `${getPercent(playerHp, playerMaxHp)}%` }}></div>
                        <span className="hp-text">{playerHp} / {playerMaxHp}</span>
                    </div>
                    <div className="battle-metrics">
                        <span className="metric"><Swords size={14} /> {currentIndex + 1} / {questions.length}</span>
                        <span className={`metric ${timeIsLow ? 'is-low' : ''}`}><Timer size={14} /> {timeLeft}s</span>
                    </div>
                </div>

                {phase === 'intro' && (
                    <div className="boss-intro-screen animate-fade-in">
                        <Sparkles size={32} className="intro-sparkle" />
                        <h3>{bossName} blocks your path</h3>
                        <p>{bossIntro}</p>
                        <div className="intro-rules">
                            <div className="rule-item"><Zap size={16} /> Answer correctly to damage the boss</div>
                            <div className="rule-item"><Heart size={16} /> Wrong answers cost you health</div>
                            <div className="rule-item"><Timer size={16} /> Faster answers hit harder</div>
                        </div>
                        <button className="btn-primary" onClick={startBattle}>
                            Begin Battle <ArrowRight size={18} />
                        </button>
                    </div>
                )}

                {phase === 'battle' && (
                    <div className="boss-question-area animate-fade-in">
                        <div className="timer-bar">
                            <div className={`timer-fill ${timeIsLow ? 'is-low' : ''}`} style={{ width: `${(timeLeft / QUESTION_TIME) * 100}%` }}></div>
                        </div>

                        <span className={`difficulty-tag ${difficulty}`}>{difficulty}</span>
                        <h3 className="boss-question">{question.question}</h3>

                        <div className="boss-options">
                            {question.options.map((option, index) => {
                                const isCorrectOption = index === question.correctAnswer;
                                const isChosen = index === selectedAnswer;
                                let optionState = '';
                                if (isAnswerRevealed) {
                                    if (isCorrectOption) optionState = 'is-correct';
                                    else if (isChosen) optionState = 'is-wrong';
                                }
                                return (
                                    <button
                                        key={index}
                                        className={`boss-option ${optionState}`}
                                        onClick={() => handleOptionSelect(index)}
                                        disabled={isAnswerRevealed}
                                    >
                                        <span className="option-key">{String.fromCharCode(65 + index)}</span>
                                        <span className="option-text">{option}</span>
                                        {isAnswerRevealed && isCorrectOption && <CheckCircle2 size={20} />}
                                        {isAnswerRevealed && isChosen && !isCorrectOption && <XCircle size={20} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className={`boss-feedback ${feedback.type}`}>
                        {feedback.type === 'hit' ? (
                            <>
                                <Zap size={30} />
                                <span className="damage-number">-{feedback.damage}</span>
                                {feedback.speedBonus > 0 && <span className="speed-bonus">Speed bonus +{feedback.speedBonus}</span>}
                            </>
                        ) : (
                            <>
                                <Heart size={30} />
                                <span className="damage-number">-{feedback.damage}</span>
                                {feedback.taunt && <p className="boss-taunt">"{feedback.taunt}"</p>}
                            </>
                        )}
                    </div>
                )}

                {(phase === 'victory' || phase === 'defeat') && summary && (
                    <div className="boss-end-screen animate-fade-in">
                        {isVictory ? (
                            <Trophy size={80} className="end-icon victory-icon animate-bounce-slow" />
                        ) : (
                            <Skull size={80} className="end-icon defeat-icon" />
                        )}
                        <h1 className="end-title">{isVictory ? 'Victory!' : 'Defeated'}</h1>
                        <p className="text-secondary">
                            {isVictory
                                ? `${bossName} has fallen. Your understanding broke through.`
                                : `${bossName} still stands. Review the material and try again.`}
                        </p>

                        <div className="boss-end-stats">
                            <div className="end-stat">
                                <span className="end-stat-label">Questions Correct</span>
                                <span className="end-stat-value">{summary.correctCount} / {questions.length}</span>
                            </div>
                            <div className="end-stat">
                                <span className="end-stat-label">Boss HP Left</span>
                                <span className="end-stat-value">{summary.bossHp}</span>
                            </div>
                            <div className="end-stat">
                                <span className="end-stat-label">Your HP Left</span>
                                <span className="end-stat-value">{summary.playerHp}</span>
                            </div>
                            <div className="end-stat">
                                <span className="end-stat-label">Duration</span>
                                <span className="end-stat-value">{Math.floor((Date.now() - startTime) / 1000)}s</span>
                            </div>
                        </div>

                        <button className="btn-primary" onClick={onClose} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Return to Library'}
                        </button>
                    </div>
                )}
            </div>
        </Modal>
    );
};

const BossBattlePlay = () => {
    const { isBossModalOpen, closeBoss, bossData, bossSessionId } = useUI();

    if (!isBossModalOpen || !bossData?.questions?.length) return null;

    return (
        <BossBattleSession
            key={bossSessionId}
            data={bossData}
            onClose={closeBoss}
        />
    );
};

export default BossBattlePlay;

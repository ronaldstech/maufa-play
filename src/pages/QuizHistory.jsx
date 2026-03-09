import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import {
    History,
    Calendar,
    Target,
    Clock,
    ChevronRight,
    Award,
    BarChart3,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    BrainCircuit,
    Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './QuizHistory.css';

const QuizHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);

    useEffect(() => {
        if (!currentUser) return;

        setLoading(true);
        const q = query(
            collection(db, 'quiz_results'),
            where('userId', '==', currentUser.uid),
            orderBy('timestamp', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const historyData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setResults(historyData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching history:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Recent';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return (
            <div className="history-loading">
                <Loader2 className="animate-spin" size={48} />
                <p>Retrieving your learning journey...</p>
            </div>
        );
    }

    return (
        <div className="history-page">
            <div className="container">
                <header className="history-header">
                    <button className="back-btn" onClick={() => navigate('/games')}>
                        <ArrowLeft size={20} /> Back to Games
                    </button>
                    <div className="header-content animate-fade-in-up">
                        <h1>My <span className="text-gradient-primary">Quiz History</span></h1>
                        <p>Review your past performances and master the topics you've explored.</p>
                    </div>
                </header>

                {!selectedResult ? (
                    results.length > 0 ? (
                        <div className="history-grid animate-fade-in">
                            {results.map((result, index) => (
                                <div
                                    key={result.id}
                                    className="history-card-wrapper"
                                    style={{ '--delay': `${index * 0.1}s` }}
                                >
                                    <div className="history-card" onClick={() => setSelectedResult(result)}>
                                        <div className="card-top">
                                            <div className="topic-info">
                                                <h3>{result.quizTitle}</h3>
                                                <div className="date">
                                                    <Calendar size={14} /> {formatDate(result.timestamp)}
                                                </div>
                                            </div>
                                            <div className={`score-badge ${result.accuracy >= 70 ? 'high' : result.accuracy >= 40 ? 'mid' : 'low'}`}>
                                                {result.score}/{result.totalQuestions}
                                            </div>
                                        </div>

                                        <div className="card-stats">
                                            <div className="mini-stat">
                                                <Target size={14} />
                                                <span>{result.accuracy}% Accuracy</span>
                                            </div>
                                            <div className="mini-stat">
                                                <Clock size={14} />
                                                <span>{result.duration}s</span>
                                            </div>
                                        </div>

                                        <div className="card-footer">
                                            <span>Review Performance</span>
                                            <ChevronRight size={18} />
                                        </div>
                                        <div className="card-glow"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-history animate-fade-in">
                            <History size={64} className="empty-icon" />
                            <h2>No quizzes played yet</h2>
                            <p>Challenge yourself by generating a quiz from your notes!</p>
                            <button className="btn-primary" onClick={() => navigate('/games')}>
                                Explore AI Games
                            </button>
                        </div>
                    )
                ) : (
                    <div className="history-detail animate-slide-in">
                        <button className="back-to-list" onClick={() => setSelectedResult(null)}>
                            <ArrowLeft size={18} /> Back to History
                        </button>

                        <div className="detail-hero">
                            <div className="detail-meta">
                                <h2>{selectedResult.quizTitle}</h2>
                                <p>{formatDate(selectedResult.timestamp)}</p>
                            </div>
                            <div className="hero-stats">
                                <div className="stat-item">
                                    <Award size={24} className="icon-award" />
                                    <div className="s-info">
                                        <span className="s-val">{selectedResult.score}/{selectedResult.totalQuestions}</span>
                                        <span className="s-lbl">Final Score</span>
                                    </div>
                                </div>
                                <div className="stat-item">
                                    <BarChart3 size={24} className="icon-chart" />
                                    <div className="s-info">
                                        <span className="s-val">{selectedResult.accuracy}%</span>
                                        <span className="s-lbl">Accuracy</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="review-section">
                            <h3><BrainCircuit size={20} /> Deep Review</h3>
                            <div className="review-list">
                                {Array.isArray(selectedResult.questions) ? (
                                    selectedResult.questions.map((q, idx) => {
                                        const userAns = selectedResult.selectedAnswers?.[idx];
                                        const isCorrect = userAns === q.correctAnswer;

                                        return (
                                            <div key={idx} className={`review-item ${isCorrect ? 'correct' : 'incorrect'}`}>
                                                <div className="q-header">
                                                    <span className="q-num">Question {idx + 1}</span>
                                                    {isCorrect ? <CheckCircle2 size={18} className="text-success" /> : <XCircle size={18} className="text-error" />}
                                                </div>
                                                <p className="q-text">{q.question}</p>
                                                <div className="ans-comparison">
                                                    <div className="ans-row correct-ans">
                                                        <span className="label">Correct Answer:</span>
                                                        <span className="value">{q.options ? q.options[q.correctAnswer] : 'N/A'}</span>
                                                    </div>
                                                    {!isCorrect && q.options && (
                                                        <div className="ans-row user-ans">
                                                            <span className="label">Your Answer:</span>
                                                            <span className="value">{userAns !== undefined && userAns !== null ? q.options[userAns] : 'Skipped'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="no-data-msg">Detailed review data is unavailable for this session.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QuizHistory;

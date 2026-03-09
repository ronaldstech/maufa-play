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
    Loader2,
    Sparkles,
    Search,
    Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import './QuizHistory.css';

const QuizHistory = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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
            year: 'numeric'
        }).format(date);
    };

    const filteredResults = results.filter(r =>
        r.quizTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="history-page">
            <div className="container history-container">
                <header className="history-page-header">
                    <div className="header-top">
                        <button className="back-btn" onClick={() => navigate('/games')}>
                            <ArrowLeft size={20} /> Back to Games
                        </button>
                        <h1>My <span className="text-gradient-primary">Learning Journey</span></h1>
                        <p>Track your progress and master your topics.</p>
                    </div>

                    <div className="header-actions">
                        <div className="search-box">
                            <Search size={20} className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search sessions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </header>

                <div className="history-page-content">
                    {loading ? (
                        <div className="history-status-view">
                            <Loader2 className="animate-spin" size={48} />
                            <p>Loading your history...</p>
                        </div>
                    ) : filteredResults.length > 0 ? (
                        <div className="history-items-grid">
                            {filteredResults.map((result, index) => (
                                <div
                                    key={result.id}
                                    className="history-item-card"
                                    onClick={() => setSelectedResult(result)}
                                    style={{ '--delay': `${index * 0.05}s` }}
                                >
                                    <div className="item-card-header">
                                        <div className="item-icon">
                                            <BrainCircuit size={24} />
                                        </div>
                                        <div className={`item-score-badge ${result.accuracy >= 70 ? 'high' : 'low'}`}>
                                            {result.score}/{result.totalQuestions}
                                        </div>
                                    </div>
                                    <div className="item-card-body">
                                        <h3>{result.quizTitle}</h3>
                                        <div className="item-meta">
                                            <span><Calendar size={14} /> {formatDate(result.timestamp)}</span>
                                            <span><Clock size={14} /> {result.duration}s</span>
                                        </div>
                                    </div>
                                    <div className="item-card-footer">
                                        <span>View Analysis</span>
                                        <ChevronRight size={16} />
                                    </div>
                                    <div className="card-glow"></div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="history-status-view">
                            <div className="empty-state">
                                <History size={64} />
                                <h2>No sessions found</h2>
                                <p>{searchTerm ? "Try adjusting your search" : "Start playing to build your history!"}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Modal */}
            <Modal
                isOpen={!!selectedResult}
                onClose={() => setSelectedResult(null)}
                isFullScreen={true}
                title="Session Analysis"
            >
                {selectedResult && (
                    <div className="history-detail-view animate-fade-in">
                        <div className="detail-hero-section">
                            <div className="bg-glow-purple"></div>
                            <div className="bg-glow-pink"></div>

                            <div className="detail-hero-card">
                                <div className="detail-hero-content">
                                    <div className="hero-main-info">
                                        <h1>{selectedResult.quizTitle}</h1>
                                        <p><Calendar size={16} /> {formatDate(selectedResult.timestamp)} at {selectedResult.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>

                                    <div className="hero-metrics">
                                        <div className="hero-metric-pill">
                                            <Award size={20} />
                                            <div className="metric-data">
                                                <span className="label">Full Score</span>
                                                <span className="value">{selectedResult.score}/{selectedResult.totalQuestions}</span>
                                            </div>
                                        </div>
                                        <div className="hero-metric-pill">
                                            <Target size={20} />
                                            <div className="metric-data">
                                                <span className="label">Accuracy</span>
                                                <span className="value">{selectedResult.accuracy}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-analysis-section">
                            <div className="analysis-header">
                                <h3><BarChart3 size={24} /> Performance Analysis</h3>
                                <p>Deep dive into your session results</p>
                            </div>

                            <div className="analysis-list">
                                {Array.isArray(selectedResult.questions) ? (
                                    selectedResult.questions.map((q, idx) => {
                                        const userAns = selectedResult.selectedAnswers?.[idx];
                                        const isCorrect = userAns === q.correctAnswer;
                                        return (
                                            <div
                                                key={idx}
                                                className={`analysis-item ${isCorrect ? 'is-correct' : 'is-incorrect'}`}
                                                style={{ animationDelay: `${idx * 0.1}s` }}
                                            >
                                                <div className="analysis-item-number">
                                                    <span>{idx + 1}</span>
                                                </div>
                                                <div className="analysis-item-body">
                                                    <div className="analysis-item-header">
                                                        <p className="analysis-question">{q.question}</p>
                                                        <div className={`status-badge ${isCorrect ? 'correct' : 'incorrect'}`}>
                                                            {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                                            <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="analysis-answers-grid">
                                                        <div className="answer-pill correct">
                                                            <span className="label">Correct Answer</span>
                                                            <span className="value">{q.options[q.correctAnswer]}</span>
                                                        </div>
                                                        {!isCorrect && (
                                                            <div className="answer-pill yours">
                                                                <span className="label">Your Choice</span>
                                                                <span className="value">{userAns !== undefined && userAns !== null ? q.options[userAns] : 'Skipped'}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="no-analysis-data">
                                        <p>No detailed question data available for this session.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="history-modal-footer">
                            <button className="btn-primary" onClick={() => setSelectedResult(null)}>
                                <History size={20} /> Return to History
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default QuizHistory;

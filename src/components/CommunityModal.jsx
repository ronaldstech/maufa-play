import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { useUI } from '../contexts/UIContext';
import {
    Users,
    Search,
    Play,
    Calendar,
    User,
    HelpCircle,
    Loader2,
    ArrowRight,
    Sparkles,
    Filter
} from 'lucide-react';
import Modal from './Modal';
import './CommunityModal.css';

const CommunityModal = () => {
    const { isCommunityModalOpen, closeCommunityModal, openQuiz } = useUI();
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('recent'); // recent, popular (if we had likes)

    useEffect(() => {
        if (isCommunityModalOpen) {
            fetchCommunityQuizzes();
        }
    }, [isCommunityModalOpen]);

    const fetchCommunityQuizzes = async () => {
        setLoading(true);
        try {
            const q = query(
                collection(db, 'quizzes'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const querySnapshot = await getDocs(q);
            const quizData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setQuizzes(quizData);
        } catch (error) {
            console.error("Error fetching community quizzes:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredQuizzes = quizzes.filter(quiz =>
        quiz.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePlayQuiz = (quiz) => {
        openQuiz({
            questions: quiz.questions,
            title: quiz.topic,
            quizId: quiz.id
        });
        closeCommunityModal();
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Recently';
        const date = timestamp.toDate();
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short'
        }).format(date);
    };

    if (!isCommunityModalOpen) return null;

    return (
        <Modal isOpen={isCommunityModalOpen} onClose={closeCommunityModal} maxWidth="1000px">
            <div className="community-modal-container">
                <header className="community-header">
                    <div className="header-left">
                        <div className="icon-box">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2>Student Community Content</h2>
                            <p>Explore and learn from quizzes created by peers.</p>
                        </div>
                    </div>
                    <div className="search-bar-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search topics or creators..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                <div className="community-body">
                    {loading ? (
                        <div className="community-loading">
                            <Loader2 className="animate-spin" size={40} />
                            <p>Loading community challenges...</p>
                        </div>
                    ) : filteredQuizzes.length > 0 ? (
                        <div className="quizzes-grid">
                            {filteredQuizzes.map((quiz, index) => (
                                <div
                                    key={quiz.id}
                                    className="community-card animate-fade-in"
                                    style={{ '--delay': `${index * 0.05}s` }}
                                >
                                    <div className="card-top">
                                        <div className="creator-info">
                                            {quiz.creatorAvatar ? (
                                                <img src={quiz.creatorAvatar} alt={quiz.creatorName} className="creator-avatar" />
                                            ) : (
                                                <div className="creator-avatar-placeholder">
                                                    <User size={14} />
                                                </div>
                                            )}
                                            <span className="creator-name">{quiz.creatorName || 'Anonymous'}</span>
                                        </div>
                                        <div className="date-badge">
                                            <Calendar size={12} /> {formatDate(quiz.createdAt)}
                                        </div>
                                    </div>

                                    <h3 className="quiz-topic">{quiz.topic}</h3>
                                    <p className="quiz-summary">{quiz.summary || 'Prepare yourself for this challenge!'}</p>

                                    <div className="quiz-meta">
                                        <div className="meta-item">
                                            <HelpCircle size={14} />
                                            <span>{quiz.questions?.length || 0} Questions</span>
                                        </div>
                                        <div className="meta-item">
                                            <Sparkles size={14} />
                                            <span>AI Verified</span>
                                        </div>
                                    </div>

                                    <button className="play-btn" onClick={() => handlePlayQuiz(quiz)}>
                                        Play Quiz <Play size={16} fill="currentColor" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-quizzes">
                            <Users size={64} className="muted-icon" />
                            <h3>No quizzes found</h3>
                            <p>Try a different search term or be the first to create one!</p>
                        </div>
                    )}
                </div>

                <div className="community-footer">
                    <p>Total Community Contribution: <strong>{quizzes.length}+</strong> Quizzes</p>
                    <button className="btn-ghost" onClick={closeCommunityModal}>Close Browser</button>
                </div>
            </div>
        </Modal>
    );
};

export default CommunityModal;

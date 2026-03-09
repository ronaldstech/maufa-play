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
    const { isCommunityModalOpen, closeCommunityModal, openQuiz, openFlashcards, selectedGameType } = useUI();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('recent');
    const isFlashcards = selectedGameType === "AI Flashcard Battle";
    useEffect(() => {
        if (isCommunityModalOpen) {
            fetchCommunityContent();
        }
    }, [isCommunityModalOpen, selectedGameType]);

    const fetchCommunityContent = async () => {
        setLoading(true);
        try {
            const collectionName = isFlashcards ? 'flashcards' : 'quizzes';
            const q = query(
                collection(db, collectionName),
                orderBy('createdAt', 'desc'),
                limit(20)
            );
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setItems(data);
        } catch (error) {
            console.error("Error fetching community content:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter(item =>
        item.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.creatorName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handlePlay = (item) => {
        if (isFlashcards) {
            openFlashcards({
                flashcards: item.flashcards,
                title: item.topic,
                gameId: item.id
            });
        } else {
            openQuiz({
                questions: item.questions,
                title: item.topic,
                quizId: item.id
            });
        }
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
        <Modal isOpen={isCommunityModalOpen} onClose={closeCommunityModal} maxWidth="1000px" title={`Community ${isFlashcards ? 'Flashcards' : 'Quizzes'}`}>
            <div className="community-modal-container">
                <div className="community-sub-header">
                    <p>Explore and learn from {isFlashcards ? 'flashcards' : 'quizzes'} created by peers.</p>
                    <div className="search-bar-wrapper">
                        <Search className="search-icon" size={18} />
                        <input
                            type="text"
                            placeholder="Search topics or creators..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="community-body">
                    {loading ? (
                        <div className="community-loading">
                            <Loader2 className="animate-spin" size={40} />
                            <p>Loading community {isFlashcards ? 'decks' : 'challenges'}...</p>
                        </div>
                    ) : filteredItems.length > 0 ? (
                        <div className="quizzes-grid">
                            {filteredItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className="community-card animate-fade-in"
                                    style={{ '--delay': `${index * 0.05}s` }}
                                >
                                    <div className="card-top">
                                        <div className="creator-info">
                                            {item.creatorAvatar ? (
                                                <img src={item.creatorAvatar} alt={item.creatorName} className="creator-avatar" />
                                            ) : (
                                                <div className="creator-avatar-placeholder">
                                                    <User size={14} />
                                                </div>
                                            )}
                                            <span className="creator-name">{item.creatorName || 'Anonymous'}</span>
                                        </div>
                                        <div className="date-badge">
                                            <Calendar size={12} /> {formatDate(item.createdAt)}
                                        </div>
                                    </div>

                                    <h3 className="quiz-topic">{item.topic}</h3>
                                    <p className="quiz-summary">{item.summary || 'Prepare yourself for this challenge!'}</p>

                                    <div className="quiz-meta">
                                        <div className="meta-item">
                                            <HelpCircle size={14} />
                                            <span>{isFlashcards ? item.flashcards?.length : item.questions?.length || 0} {isFlashcards ? 'Cards' : 'Questions'}</span>
                                        </div>
                                        <div className="meta-item">
                                            <Users size={14} />
                                            <span>{item.attempts || 0} Plays</span>
                                        </div>
                                        <div className="meta-item">
                                            <Sparkles size={14} />
                                            <span>AI Verified</span>
                                        </div>
                                    </div>

                                    <button className="play-btn" onClick={() => handlePlay(item)}>
                                        Play {isFlashcards ? 'Deck' : 'Quiz'} <Play size={16} fill="currentColor" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-quizzes">
                            <Users size={64} className="muted-icon" />
                            <h3>No {isFlashcards ? 'flashcards' : 'quizzes'} found</h3>
                            <p>Try a different search term or be the first to create one!</p>
                        </div>
                    )}
                </div>

                <div className="community-footer">
                    <p>Total Contribution: <strong>{items.length}+</strong> {isFlashcards ? 'Decks' : 'Quizzes'}</p>
                    <button className="btn-ghost" onClick={closeCommunityModal}>Close</button>
                </div>
            </div>
        </Modal>
    );
};

export default CommunityModal;

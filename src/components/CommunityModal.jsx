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
    const { isCommunityModalOpen, closeCommunityModal, openQuiz, openFlashcards, openBoss, openCompanion, selectedGameType } = useUI();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('recent');
    const isFlashcards = selectedGameType === "AI Flashcard Battle";
    const isBoss = selectedGameType === "AI Boss Battle";
    const isCompanion = selectedGameType === "AI Study Companion";
    const typeLabel = isFlashcards ? 'Flashcards' : (isBoss ? 'Boss Battles' : (isCompanion ? 'Study Material' : 'Quizzes'));
    const playLabel = isFlashcards ? 'Deck' : (isBoss ? 'Battle' : (isCompanion ? 'Tutor' : 'Quiz'));
    const countLabel = isFlashcards ? 'Cards' : 'Questions';
    useEffect(() => {
        if (isCommunityModalOpen) {
            fetchCommunityContent();
        }
    }, [isCommunityModalOpen, selectedGameType]);

    const fetchCommunityContent = async () => {
        setLoading(true);
        try {
            const collectionName = isFlashcards ? 'flashcards' : (isBoss ? 'bosses' : 'quizzes');
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
        if (isCompanion) {
            openCompanion({
                context: [item.sourceMaterial, item.summary, item.topic].filter(Boolean).join('\n\n'),
                topic: item.topic
            });
        } else if (isFlashcards) {
            openFlashcards({
                flashcards: item.flashcards,
                title: item.topic,
                gameId: item.id
            });
        } else if (isBoss && item.boss) {
            openBoss({
                ...item.boss,
                questions: item.boss.questions || item.questions,
                title: item.topic,
                bossId: item.id
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
        <Modal isOpen={isCommunityModalOpen} onClose={closeCommunityModal} maxWidth="1000px" title={`Community ${typeLabel}`}>
            <div className="community-modal-container">
                <div className="community-sub-header">
                    <p>Explore and learn from {typeLabel.toLowerCase()} created by peers.</p>
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
                            <p>Loading community {isFlashcards ? 'decks' : (isBoss ? 'boss battles' : 'challenges')}...</p>
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
                                            <span>{isFlashcards ? item.flashcards?.length : item.questions?.length || 0} {countLabel}</span>
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
                                        Play {playLabel} <Play size={16} fill="currentColor" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="no-quizzes">
                            <Users size={64} className="muted-icon" />
                            <h3>No {typeLabel.toLowerCase()} found</h3>
                            <p>Try a different search term or be the first to create one!</p>
                        </div>
                    )}
                </div>

                <div className="community-footer">
                    <p>Total Contribution: <strong>{items.length}+</strong> {isFlashcards ? 'Decks' : (isBoss ? 'Boss Battles' : 'Quizzes')}</p>
                    <button className="btn-ghost" onClick={closeCommunityModal}>Close</button>
                </div>
            </div>
        </Modal>
    );
};

export default CommunityModal;

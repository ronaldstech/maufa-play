import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Type, GraduationCap, BrainCircuit, Globe, ClipboardType, Users, ScrollText, Loader2 } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import './GameSetup.css';

const GameSetup = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { openPasteModal, openCommunityModal, openPDFModal } = useUI();
    const [selectedSource, setSelectedSource] = useState(null);
    const [error, setError] = useState(null);

    const sources = [
        { id: 'pdf', title: 'PDF / Notes Upload', icon: <FileText size={36} strokeWidth={1.5} />, description: 'Upload your course materials directly.', color: '#3b82f6' },
        { id: 'topic', title: 'Topic Input', icon: <Type size={36} strokeWidth={1.5} />, description: 'Type in a specific subject or keywords.', comingSoon: true, color: '#10b981' },
        { id: 'course', title: 'Course Selection', icon: <GraduationCap size={36} strokeWidth={1.5} />, description: 'Choose from your enrolled curriculum.', comingSoon: true, color: '#f59e0b' },
        { id: 'ai-gen', title: 'AI Question Generator', icon: <BrainCircuit size={36} strokeWidth={1.5} />, description: 'Let AI craft unique academic challenges.', comingSoon: true, color: '#8b5cf6' },
        { id: 'web', title: 'Web Knowledge Sources', icon: <Globe size={36} strokeWidth={1.5} />, description: 'Pull verified knowledge from the internet.', comingSoon: true, color: '#06b6d4' },
        { id: 'paste', title: 'Paste Notes Text', icon: <ClipboardType size={36} strokeWidth={1.5} />, description: 'Copy and paste raw text to generate gameplay.', color: '#6366f1' },
        { id: 'community', title: 'Student Community Content', icon: <Users size={36} strokeWidth={1.5} />, description: 'Use content created by your peers.', color: '#ec4899' },
        { id: 'exams', title: 'Previous Exam Papers', icon: <ScrollText size={36} strokeWidth={1.5} />, description: 'Train on historical exam questions.', comingSoon: true, color: '#ef4444' }
    ];

    const getGameName = () => {
        const names = {
            '1': 'AI Quiz Generator',
            '2': 'AI Flashcard Battle',
            '3': 'AI Debate Game',
            '4': 'AI Scenario Simulator',
            '5': 'AI Puzzle Generator',
            '6': 'AI Boss Battle',
            '7': 'AI Story-Based Learning',
            '8': 'AI Study Companion'
        };
        return names[id] || 'AI Game';
    };

    const handleSourceSelect = (sourceId) => {
        const source = sources.find(s => s.id === sourceId);
        if (source?.comingSoon) return;

        if (sourceId === 'paste') {
            openPasteModal();
        } else if (sourceId === 'community') {
            openCommunityModal();
        } else if (sourceId === 'pdf') {
            openPDFModal();
        } else {
            setSelectedSource(sourceId);
            setError(null);
        }
    };

    const handleContinue = async () => {
        if (!selectedSource) return;
        // This is now unreachable for comingSoon items
        alert(`Source type '${selectedSource}' initialized.`);
    };

    return (
        <div className="game-setup-page">
            <div className="container">
                <button className="back-btn" onClick={() => navigate('/games')}>
                    &larr; Back to Games
                </button>

                <div className="setup-header animate-fade-in-up">
                    <div className="setup-badge">Step 1: Content Generation</div>
                    <h1 className="setup-title">
                        Configure <span className="text-gradient-primary">{getGameName()}</span>
                    </h1>
                    <p className="setup-subtitle">
                        Select an intelligent data source to generate your personalized learning content.
                    </p>
                </div>

                <div className="sources-grid">
                    {sources.map((source, index) => (
                        <div
                            key={source.id}
                            className={`source-card delay-${(index % 3) + 1} animate-fade-in-up 
                                ${selectedSource === source.id ? 'selected' : ''} 
                                ${source.comingSoon ? 'coming-soon' : ''}`}
                            onClick={() => handleSourceSelect(source.id)}
                            style={{ '--source-color': source.color }}
                        >
                            <div className="source-card-bg"></div>
                            {source.comingSoon && <div className="coming-soon-badge">Coming Soon</div>}
                            <div className="source-icon">{source.icon}</div>
                            <h3 className="source-title">{source.title}</h3>
                            <p className="source-description">{source.description}</p>

                            {!source.comingSoon && <div className="selection-ring"></div>}
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="error-message animate-fade-in-up">
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameSetup;

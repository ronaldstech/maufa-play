import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Type, GraduationCap, BrainCircuit, Globe, ClipboardType, Users, ScrollText, Loader2 } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import './GameSetup.css';

const GameSetup = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { openPasteModal, openCommunityModal } = useUI();
    const [selectedSource, setSelectedSource] = useState(null);
    const [error, setError] = useState(null);

    const sources = [
        { id: 'pdf', title: 'PDF / Notes Upload', icon: <FileText size={36} strokeWidth={1.5} />, description: 'Upload your course materials directly.' },
        { id: 'topic', title: 'Topic Input', icon: <Type size={36} strokeWidth={1.5} />, description: 'Type in a specific subject or keywords.' },
        { id: 'course', title: 'Course Selection', icon: <GraduationCap size={36} strokeWidth={1.5} />, description: 'Choose from your enrolled curriculum.' },
        { id: 'ai-gen', title: 'AI Question Generator', icon: <BrainCircuit size={36} strokeWidth={1.5} />, description: 'Let AI craft unique academic challenges.' },
        { id: 'web', title: 'Web Knowledge Sources', icon: <Globe size={36} strokeWidth={1.5} />, description: 'Pull verified knowledge from the internet.' },
        { id: 'paste', title: 'Paste Notes Text', icon: <ClipboardType size={36} strokeWidth={1.5} />, description: 'Copy and paste raw text to generate gameplay.' },
        { id: 'community', title: 'Student Community Content', icon: <Users size={36} strokeWidth={1.5} />, description: 'Use content created by your peers.' },
        { id: 'exams', title: 'Previous Exam Papers', icon: <ScrollText size={36} strokeWidth={1.5} />, description: 'Train on historical exam questions.' }
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
        if (sourceId === 'paste') {
            openPasteModal();
        } else if (sourceId === 'community') {
            openCommunityModal();
        } else {
            setSelectedSource(sourceId);
            setError(null);
        }
    };

    const handleContinue = async () => {
        if (!selectedSource) return;
        alert(`Source type '${selectedSource}' is not fully integrated with this flow yet. Please use 'Paste Notes Text'.`);
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
                            className={`source-card delay-${(index % 3) + 1} animate-fade-in-up ${selectedSource === source.id ? 'selected' : ''}`}
                            onClick={() => handleSourceSelect(source.id)}
                        >
                            <div className="source-card-bg"></div>
                            <div className="source-icon">{source.icon}</div>
                            <h3 className="source-title">{source.title}</h3>
                            <p className="source-description">{source.description}</p>

                            <div className="selection-ring"></div>
                        </div>
                    ))}
                </div>

                {error && (
                    <div className="error-message animate-fade-in-up">
                        <p>{error}</p>
                    </div>
                )}

                <div className="setup-footer animate-fade-in-up delay-3">
                    <button
                        className={`btn-primary continue-btn ${!selectedSource ? 'disabled' : ''}`}
                        onClick={handleContinue}
                        disabled={!selectedSource}
                    >
                        Continue to Play
                        <div className="btn-glow"></div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GameSetup;

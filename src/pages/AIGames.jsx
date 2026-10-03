import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Brain, Layers, MessageSquare, Globe, Puzzle, Swords, BookOpen, Bot } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useSettings } from '../contexts/settings-context';
import { GAMES } from '../config/games';
import './AIGames.css';

const ICONS = {
    quiz: Brain,
    flashcards: Layers,
    debate: MessageSquare,
    scenario: Globe,
    puzzle: Puzzle,
    boss: Swords,
    story: BookOpen,
    companion: Bot
};

const AIGames = () => {
    const { openCompanion } = useUI();
    const { gameAvailability, loading: settingsLoading } = useSettings();

    const games = useMemo(() => GAMES
        .filter((game) => gameAvailability[game.id]?.enabled !== false)
        .map((game) => {
            const availability = gameAvailability[game.id] || { enabled: true, comingSoon: false };
            const Icon = ICONS[game.iconKey] || Brain;

            return {
                ...game,
                comingSoon: settingsLoading ? Boolean(game.comingSoonByDefault) : availability.comingSoon,
                renderIcon: <Icon size={32} strokeWidth={1.5} />
            };
        }), [gameAvailability, settingsLoading]);

    return (
        <div className="games-page">
            <div className="container">
                <div className="games-header animate-fade-in-up">
                    <h1 className="games-title">
                        <span className="text-gradient-primary">AI Games</span> Library
                    </h1>
                    <p className="games-subtitle text-secondary">
                        Choose from our collection of interactive AI-powered learning experiences.
                    </p>
                </div>

                <div className="games-grid">
                    {games.map((game, index) => (
                        <div
                            key={game.id}
                            className={`game-card delay-${(index % 3) + 1} animate-fade-in-up ${game.comingSoon ? 'coming-soon' : ''}`}
                            style={{ '--game-color': game.color }}
                        >
                            <div className="game-card-bg"></div>
                            {game.comingSoon && <div className="coming-soon-badge">Coming Soon</div>}
                            <div className="game-icon">
                                {game.renderIcon}
                            </div>
                            <h3 className="game-title">{game.title}</h3>
                            <p className="game-description">{game.description}</p>

                            {game.comingSoon ? (
                                <button className="btn-primary play-btn disabled" disabled>
                                    Coming Soon
                                </button>
                            ) : game.opensCompanion ? (
                                <button
                                    className="btn-primary play-btn"
                                    onClick={() => openCompanion()}
                                    style={{ width: '100%' }}
                                >
                                    Play Now
                                </button>
                            ) : (
                                <Link to={`/games/${game.id}/setup`} className="btn-primary play-btn" style={{ textDecoration: 'none', textAlign: 'center' }}>
                                    Play Now
                                </Link>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AIGames;
import { useState } from 'react';
import { Gamepad2, Loader2, Zap, BookOpen, Puzzle, Swords, Target } from 'lucide-react';

const GAMES = [
    { id: 'quiz', label: 'Quiz battle', icon: Zap, hint: '8 multiple choice questions' },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen, hint: '10 cards to drill' },
    { id: 'puzzle', label: 'Word scramble', icon: Puzzle, hint: 'unscramble the key terms' },
    { id: 'boss', label: 'Boss battle', icon: Swords, hint: 'question-by-question duel' }
];

const GameLabPanel = ({ analysis, isConverting, onPlay }) => {
    const [scope, setScope] = useState('all');

    const sections = analysis.sections;
    const activeScope = scope === 'all' ? null : sections.find((section) => section.id === scope) || null;
    const label = activeScope ? activeScope.heading : 'the whole lecture';

    return (
        <div className="nl-stack">
            <section className="nl-panel">
                <h3 className="nl-panel-title">
                    <Gamepad2 size={18} strokeWidth={1.8} />
                    Turn the topic into a game
                </h3>
                <p className="nl-panel-sub">Pick how wide the game should look, then pick the game.</p>

                <div className="nl-scope">
                    <span className="nl-games-label"><Target size={14} strokeWidth={2} /> Play on</span>
                    <select className="nl-select" value={scope} onChange={(event) => setScope(event.target.value)}>
                        <option value="all">Everything ({sections.length} sections)</option>
                        {sections.map((section) => (
                            <option key={section.id} value={section.id}>{section.heading}</option>
                        ))}
                    </select>
                </div>

                <div className="nl-game-grid">
                    {GAMES.map((game) => {
                        const Icon = game.icon;
                        return (
                            <button
                                key={game.id}
                                type="button"
                                className="nl-game-card"
                                onClick={() => onPlay(game.id, activeScope)}
                                disabled={isConverting}
                            >
                                <Icon size={20} strokeWidth={1.7} />
                                <strong>{game.label}</strong>
                                <span>{game.hint}</span>
                            </button>
                        );
                    })}
                </div>

                {isConverting && (
                    <p className="nl-converting"><Loader2 size={14} className="nl-spin" /> Building your game from {label}…</p>
                )}
            </section>

            <section className="nl-panel nl-highstakes">
                <h3 className="nl-panel-title">
                    <Swords size={18} strokeWidth={1.8} />
                    Highest stakes sections
                </h3>
                <p className="nl-panel-sub">If you only have time for one game, play these.</p>
                <div className="nl-stakes-list">
                    {sections
                        .filter((section) => section.importance >= 4)
                        .map((section) => (
                            <div key={section.id} className="nl-stakes-item">
                                <span className={`nl-tag nl-tag-${section.importance >= 5 ? 'high' : 'mid'}`}>L{section.importance}</span>
                                <span className="nl-stakes-title">{section.heading}</span>
                                <button type="button" className="nl-btn-mini" onClick={() => onPlay('quiz', section)} disabled={isConverting}>
                                    Quiz
                                </button>
                            </div>
                        ))}
                </div>
            </section>
        </div>
    );
};

export default GameLabPanel;
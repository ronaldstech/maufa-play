import { useState } from 'react';
import { BookOpen, ListChecks, Sparkles, Loader2, Gamepad2, MessageSquareQuote, Swords, Puzzle, Zap, RotateCcw } from 'lucide-react';
import RichText from '../components/RichText';
import { useUI } from '../contexts/UIContext';

const MODES = [
    { id: 'dive', label: 'Deep dive', icon: BookOpen },
    { id: 'scan', label: 'Quick scan', icon: ListChecks }
];

const importanceLabel = (value) => `L${value}`;

const notesForCompanion = (analysis, section) => `Focus on this section of my notes: "${section.heading}". ${section.summary}`;

const SectionReader = ({ analysis, dives, diveProgress, isExplaining, onExplainSection, onPlay }) => {
    const [mode, setMode] = useState('dive');
    const { openCompanion } = useUI();

    return (
        <div className="nl-stack">
            <div className="nl-reader-head">
                <div className="nl-modes" role="tablist" aria-label="Reading mode">
                    {MODES.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={mode === item.id}
                                className={`nl-mode ${mode === item.id ? 'is-active' : ''}`}
                                onClick={() => setMode(item.id)}
                            >
                                <Icon size={15} strokeWidth={1.9} />
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                {mode === 'dive' && (
                    <span className="nl-progress">
                        {isExplaining
                            ? `Explaining ${diveProgress.done + 1} of ${diveProgress.total}…`
                            : `${diveProgress.total} sections explained`}
                    </span>
                )}
            </div>

            <div className="nl-sections">
                {analysis.sections.map((section, index) => {
                    const dive = dives[section.id];

                    return (
                        <article key={section.id} className="nl-section">
                            <header className="nl-section-head">
                                <span
                                    className={`nl-ring nl-ring-${section.importance}`}
                                    style={{ '--fill': `${(section.importance / 5) * 360}deg` }}
                                    title={`Importance ${section.importance} of 5`}
                                >
                                    <span>{index + 1}</span>
                                </span>
                                <div className="nl-section-titles">
                                    <h3 className="nl-section-title">{section.heading}</h3>
                                    <div className="nl-section-meta">
                                        <span className={`nl-tag nl-tag-${section.importance >= 4 ? 'high' : section.importance >= 3 ? 'mid' : 'low'}`}>
                                            {importanceLabel(section.importance)} priority
                                        </span>
                                        <span className="nl-meta-item">{section.studyMinutes} min</span>
                                        {section.hasFormula && <span className="nl-meta-item">has formulas</span>}
                                    </div>
                                </div>
                            </header>

                            <p className="nl-section-summary">{section.summary}</p>

                            {section.keyTerms.length > 0 && (
                                <div className="nl-terms-row">
                                    {section.keyTerms.map((term) => <span key={term} className="nl-term-pill">{term}</span>)}
                                </div>
                            )}

                            {mode === 'dive' && (
                                dive
                                    ? <RichText text={dive} className="nl-explain" />
                                    : <div className="nl-skeleton"><span /><span /><span /></div>
                            )}

                            <div className="nl-section-games">
                                <span className="nl-games-label"><Gamepad2 size={14} strokeWidth={2} /> Turn this into</span>
                                <div className="nl-games-row">
                                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('quiz', section)}>
                                        <Zap size={13} strokeWidth={2} /> Quiz
                                    </button>
                                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('flashcards', section)}>
                                        <BookOpen size={13} strokeWidth={2} /> Flashcards
                                    </button>
                                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('puzzle', section)}>
                                        <Puzzle size={13} strokeWidth={2} /> Puzzle
                                    </button>
                                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('boss', section)}>
                                        <Swords size={13} strokeWidth={2} /> Boss battle
                                    </button>
                                </div>
                            </div>

                            <div className="nl-section-tools">
                                {mode === 'dive' && (
                                    <button type="button" className="nl-btn-mini" onClick={() => onExplainSection(section)} disabled={isExplaining}>
                                        {isExplaining ? <Loader2 size={13} className="nl-spin" /> : <RotateCcw size={13} strokeWidth={2} />}
                                        Explain again
                                    </button>
                                )}
                                <button
                                    type="button"
                                    className="nl-btn-mini"
                                    onClick={() => openCompanion({ context: `${analysis.summary ? `${analysis.summary}\n\n` : ''}${notesForCompanion(analysis, section)}`, title: analysis.title })}
                                >
                                    <MessageSquareQuote size={13} strokeWidth={2} />
                                    Question me
                                </button>
                                {isExplaining && !dive && mode === 'dive' && (
                                    <span className="nl-inline-loading"><Loader2 size={12} className="nl-spin" /> writing…</span>
                                )}
                                {mode === 'dive' && !isExplaining && !dive && (
                                    <span className="nl-inline-loading"><Sparkles size={12} strokeWidth={2} /> queued</span>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default SectionReader;
import { useState } from 'react';
import { ChevronDown, Clock3, Sparkles, Loader2, MessageSquareQuote, Sigma } from 'lucide-react';
import RichText from '../components/RichText';
import { explainSection } from '../services/notesService';
import { useUI } from '../contexts/UIContext';

const importanceLabel = (value) => `L${value}`;

const OutlinePanel = ({ analysis, notes }) => {
    const [expanded, setExpanded] = useState(null);
    const [explains, setExplains] = useState({});
    const [pending, setPending] = useState(null);
    const [error, setError] = useState('');
    const { openCompanion } = useUI();

    const toggle = (sectionId) => {
        setExpanded((current) => (current === sectionId ? null : sectionId));
        setError('');
    };

    const handleExplain = async (section) => {
        setPending(section.id);
        setError('');

        try {
            const markdown = await explainSection({ notes, section });
            setExplains((current) => ({ ...current, [section.id]: markdown }));
        } catch (explainError) {
            setError(explainError.message || 'Could not build that explanation.');
        } finally {
            setPending(null);
        }
    };

    return (
        <div className="nl-panel">
            <h3 className="nl-panel-title">Lecture skeleton</h3>
            <p className="nl-panel-sub">Every section as it was taught, ranked by how much it matters.</p>

            {error && <div className="nl-alert nl-alert-inline">{error}</div>}

            <ol className="nl-outline">
                {analysis.sections.map((section, index) => {
                    const isOpen = expanded === section.id;
                    const explain = explains[section.id];
                    const isPending = pending === section.id;

                    return (
                        <li key={section.id} className={`nl-outline-item ${isOpen ? 'is-open' : ''}`}>
                            <button type="button" className="nl-outline-head" onClick={() => toggle(section.id)}>
                                <span
                                    className={`nl-ring nl-ring-${section.importance}`}
                                    style={{ '--fill': `${(section.importance / 5) * 360}deg` }}
                                    title={`Importance ${section.importance} of 5`}
                                >
                                    {index + 1}
                                </span>
                                <span className="nl-outline-main">
                                    <span className="nl-outline-title">
                                        {section.heading}
                                        {section.hasFormula && <Sigma size={13} strokeWidth={2.2} className="nl-inline-icon" />}
                                    </span>
                                    <span className="nl-outline-summary">{section.summary}</span>
                                    <span className="nl-outline-meta">
                                        <span className={`nl-tag nl-tag-${section.importance >= 4 ? 'high' : section.importance >= 3 ? 'mid' : 'low'}`}>
                                            {importanceLabel(section.importance)} priority
                                        </span>
                                        <span className="nl-meta-item"><Clock3 size={12} strokeWidth={2} />{section.studyMinutes} min</span>
                                        {section.keyTerms.length > 0 && (
                                            <span className="nl-meta-item">{section.keyTerms.slice(0, 3).join(' · ')}</span>
                                        )}
                                    </span>
                                </span>
                                <ChevronDown size={18} className="nl-chevron" strokeWidth={2} />
                            </button>

                            {isOpen && (
                                <div className="nl-outline-body">
                                    {section.keyTerms.length > 0 && (
                                        <div className="nl-terms-row">
                                            {section.keyTerms.map((term) => <span key={term} className="nl-term-pill">{term}</span>)}
                                        </div>
                                    )}

                                    {explain && <RichText text={explain} className="nl-explain" />}

                                    <div className="nl-outline-actions">
                                        <button type="button" className="nl-btn-primary nl-btn-sm" onClick={() => handleExplain(section)} disabled={isPending}>
                                            {isPending ? <Loader2 size={15} className="nl-spin" /> : <Sparkles size={15} strokeWidth={2} />}
                                            {isPending ? 'Writing…' : explain ? 'Rewrite it' : 'Explain this properly'}
                                        </button>
                                        <button
                                            type="button"
                                            className="nl-btn-ghost"
                                            onClick={() => openCompanion({ context: `${notes}\n\nSTUDENT FOCUS: "${section.heading}"`, title: analysis.title })}
                                        >
                                            <MessageSquareQuote size={15} strokeWidth={2} />
                                            Question me on this
                                        </button>
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ol>
        </div>
    );
};

export default OutlinePanel;
import { useState } from 'react';
import { Layers, Sparkles, Loader2, RotateCcw, Lightbulb } from 'lucide-react';
import RichText from '../components/RichText';
import { explainTerm } from '../services/notesService';

const GlossaryPanel = ({ analysis, notes }) => {
    const [flipped, setFlipped] = useState({});
    const [explains, setExplains] = useState({});
    const [pending, setPending] = useState(null);
    const [error, setError] = useState('');

    const toggleFlip = (term) => {
        setFlipped((current) => ({ ...current, [term]: !current[term] }));
        setError('');
    };

    const handleExplain = async (entry) => {
        setPending(entry.term);
        setError('');

        try {
            const markdown = await explainTerm({ notes, term: entry.term, definition: entry.definition });
            setExplains((current) => ({ ...current, [entry.term]: markdown }));
            setFlipped((current) => ({ ...current, [entry.term]: true }));
        } catch (explainError) {
            setError(explainError.message || 'Could not expand that term.');
        } finally {
            setPending(null);
        }
    };

    if (!analysis.glossary.length) {
        return (
            <div className="nl-panel nl-empty">
                <Layers size={26} strokeWidth={1.4} />
                <p>This lecture does not define enough specific terms to build a glossary.</p>
            </div>
        );
    }

    return (
        <div className="nl-panel">
            <h3 className="nl-panel-title">
                <Layers size={18} strokeWidth={1.8} />
                Glossary
            </h3>
            <p className="nl-panel-sub">Click a card to flip it. Most important first.</p>
            {error && <div className="nl-alert nl-alert-inline">{error}</div>}

            <div className="nl-cards">
                {analysis.glossary.map((entry) => {
                    const isFlipped = Boolean(flipped[entry.term]);
                    const explain = explains[entry.term];

                    return (
                        <div key={entry.term} className={`nl-card ${isFlipped ? 'is-flipped' : ''}`}>
                            <button type="button" className="nl-card-inner" onClick={() => toggleFlip(entry.term)}>
                                <span className="nl-card-face nl-card-front">
                                    <span className="nl-card-term">{entry.term}</span>
                                    <span className="nl-card-hint">tap to reveal</span>
                                </span>
                                <span className="nl-card-face nl-card-back">
                                    <span className="nl-card-definition">{entry.definition}</span>
                                    {entry.whyItMatters && (
                                        <span className="nl-card-why"><Lightbulb size={12} strokeWidth={2} />{entry.whyItMatters}</span>
                                    )}
                                    {entry.example && <span className="nl-card-example">{entry.example}</span>}
                                </span>
                            </button>

                            <div className="nl-card-tools">
                                {explain ? (
                                    <button type="button" className="nl-btn-mini" onClick={() => handleExplain(entry)} disabled={pending === entry.term}>
                                        <RotateCcw size={13} strokeWidth={2} /> Rewrite deeper
                                    </button>
                                ) : (
                                    <button type="button" className="nl-btn-mini" onClick={() => handleExplain(entry)} disabled={pending === entry.term}>
                                        {pending === entry.term ? <Loader2 size={13} className="nl-spin" /> : <Sparkles size={13} strokeWidth={2} />}
                                        Go deeper
                                    </button>
                                )}
                            </div>

                            {explain && <RichText text={explain} className="nl-explain nl-explain-sm" />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default GlossaryPanel;
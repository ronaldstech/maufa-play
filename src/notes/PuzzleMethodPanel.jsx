import { useState } from 'react';
import { Puzzle, Loader2, Play, Lightbulb, Check, X, Shuffle } from 'lucide-react';

const normalise = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const ClozeItem = ({ item }) => {
    const [value, setValue] = useState('');
    const [state, setState] = useState('idle');

    const check = () => {
        if (!value.trim()) return;
        setState(normalise(value) === normalise(item.answer) ? 'right' : 'wrong');
    };

    return (
        <div className={`nl-cloze is-${state}`}>
            <p className="nl-cloze-sentence">
                {item.before}<span className="nl-blank">____</span>{item.after}
            </p>

            <div className="nl-cloze-row">
                <input
                    className="nl-input nl-input-sm"
                    value={value}
                    onChange={(event) => { setValue(event.target.value); setState('idle'); }}
                    onKeyDown={(event) => { if (event.key === 'Enter') check(); }}
                    placeholder="fill the blank"
                />
                <button type="button" className="nl-btn-mini" onClick={check}>Check</button>
                {item.hint && (
                    <button type="button" className="nl-btn-mini" onClick={() => setState('hint')}>
                        <Lightbulb size={13} strokeWidth={2} /> Hint
                    </button>
                )}
                {state !== 'idle' && (
                    <span className={`nl-cloze-verdict is-${state}`}>
                        {state === 'right' ? <Check size={14} strokeWidth={2.4} /> : <X size={14} strokeWidth={2.4} />}
                        {state === 'right' ? 'Correct' : `Answer: ${item.answer}`}
                    </span>
                )}
            </div>

            {state === 'hint' && item.hint && <p className="nl-cloze-hint">{item.hint}</p>}
        </div>
    );
};

const PuzzleMethodPanel = ({ pack, isLoading, onLoad, onPlayScramble }) => {
    if (isLoading) {
        return (
            <div className="nl-panel nl-empty">
                <Loader2 size={26} className="nl-spin" strokeWidth={1.6} />
                <p>Building puzzles from every section…</p>
            </div>
        );
    }

    if (!pack) {
        return (
            <div className="nl-panel nl-empty">
                <Puzzle size={26} strokeWidth={1.4} />
                <p>Learn it the hard way: fill-in-the-blank checks and scrambled key terms drawn straight from your notes.</p>
                <button type="button" className="nl-btn-primary nl-btn-sm" onClick={onLoad}>
                    Build puzzles
                </button>
            </div>
        );
    }

    return (
        <div className="nl-stack">
            {pack.sections.map((entry) => (
                <section key={entry.sectionId} className="nl-panel">
                    <h3 className="nl-panel-title">{entry.heading}</h3>

                    {entry.cloze.length > 0 && (
                        <div className="nl-cloze-list">
                            {entry.cloze.map((item, index) => (
                                <ClozeItem key={`${entry.sectionId}-cloze-${index}`} item={item} />
                            ))}
                        </div>
                    )}

                    {entry.scramble.length > 0 && (
                        <div className="nl-scramble">
                            <div className="nl-scramble-head">
                                <Shuffle size={15} strokeWidth={2} />
                                <span>{entry.scramble.length} key terms to unscramble</span>
                            </div>
                            <div className="nl-scramble-words">
                                {entry.scramble.map((word) => (
                                    <span key={word.word} className="nl-scramble-chip">{word.word}</span>
                                ))}
                            </div>
                            <button type="button" className="nl-btn-ghost nl-btn-sm-ghost" onClick={() => onPlayScramble(entry)}>
                                <Play size={14} strokeWidth={2} />
                                Play this scramble
                            </button>
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
};

export default PuzzleMethodPanel;
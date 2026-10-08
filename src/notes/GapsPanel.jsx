import { ShieldAlert, Zap } from 'lucide-react';

const SEVERITY_NOTE = {
    high: 'If this is unclear, the rest of the lecture will feel shaky.',
    medium: 'Worth revisiting before the exam.',
    low: 'Nice to have, not critical.'
};

const GapsPanel = ({ analysis }) => (
    <div className="nl-stack">
        <section className="nl-panel">
            <h3 className="nl-panel-title">
                <ShieldAlert size={18} strokeWidth={1.8} />
                What the notes skip
            </h3>
            <p className="nl-panel-sub">Places where the lecture points at something it never explains.</p>

            {analysis.gaps.length ? (
                <div className="nl-gaps">
                    {analysis.gaps.map((gap) => (
                        <div key={gap.item} className={`nl-gap nl-gap-${gap.severity}`}>
                            <span className="nl-gap-severity">{gap.severity}</span>
                            <div>
                                <p className="nl-gap-item">{gap.item}</p>
                                {gap.note && <p className="nl-gap-note">{gap.note}</p>}
                                {!gap.note && <p className="nl-gap-note">{SEVERITY_NOTE[gap.severity]}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="nl-empty-line">Nothing obvious is missing — these notes cover their ground.</p>
            )}
        </section>

        <section className="nl-panel">
            <h3 className="nl-panel-title">
                <Zap size={18} strokeWidth={1.8} />
                Common wrong turns
            </h3>
            <p className="nl-panel-sub">Where students are most likely to walk away with the wrong idea.</p>

            {analysis.misconceptions.length ? (
                <div className="nl-myths">
                    {analysis.misconceptions.map((item) => (
                        <div key={item.myth} className="nl-myth">
                            <div className="nl-myth-col nl-myth-wrong">
                                <span className="nl-myth-label">Myth</span>
                                <p>{item.myth}</p>
                            </div>
                            <div className="nl-myth-col nl-myth-right">
                                <span className="nl-myth-label">Reality</span>
                                <p>{item.reality}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="nl-empty-line">No classic misconceptions detected in this material.</p>
            )}
        </section>
    </div>
);

export default GapsPanel;
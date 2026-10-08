import { BookOpen, Layers, Clock3, Sigma, GraduationCap } from 'lucide-react';
import { useUI } from '../contexts/UIContext';

const statItem = (icon, value, label) => (
    <div className="nl-stat">
        {icon}
        <strong>{value}</strong>
        <span>{label}</span>
    </div>
);

const OverviewPanel = ({ analysis, notes, onConvert, isConverting }) => {
    const { openCompanion } = useUI();
    const totalMinutes = analysis.sections.reduce((sum, section) => sum + section.studyMinutes, 0);
    const highValue = analysis.sections.filter((section) => section.importance >= 4);

    return (
        <div className="nl-overview">
            <header className="nl-hero">
                <div className="nl-hero-badges">
                    {analysis.subject && <span className="nl-chip nl-chip-blue">{analysis.subject}</span>}
                    <span className="nl-chip">{analysis.sections.length} sections</span>
                    <span className="nl-chip">{analysis.glossary.length} terms</span>
                    {highValue.length > 0 && <span className="nl-chip nl-chip-pink">{highValue.length} high stakes</span>}
                </div>
                <h2 className="nl-hero-title">{analysis.title}</h2>
                {analysis.summary && <p className="nl-hero-summary">{analysis.summary}</p>}
                <div className="nl-stats">
                    {statItem(<Clock3 size={16} strokeWidth={1.8} />, `${totalMinutes} min`, 'to master it all')}
                    {statItem(<BookOpen size={16} strokeWidth={1.8} />, analysis.sections.length, 'sections mapped')}
                    {statItem(<Layers size={16} strokeWidth={1.8} />, analysis.glossary.length, 'terms defined')}
                    {statItem(<Sigma size={16} strokeWidth={1.8} />, analysis.sections.filter((section) => section.hasFormula).length, 'sections with formulas')}
                </div>
            </header>

            <section className="nl-panel nl-convert">
                <h3 className="nl-panel-title">
                    <GraduationCap size={18} strokeWidth={1.8} />
                    Take it further
                </h3>
                <p className="nl-panel-sub">Turn this lecture into something you actively practise.</p>
                <div className="nl-convert-row">
                    <button type="button" className="nl-btn-ghost" onClick={() => onConvert('flashcards')} disabled={isConverting}>
                        Flashcards
                    </button>
                    <button type="button" className="nl-btn-ghost" onClick={() => onConvert('quiz')} disabled={isConverting}>
                        Practice quiz
                    </button>
                    <button type="button" className="nl-btn-ghost" onClick={() => onConvert('puzzle')} disabled={isConverting}>
                        Word scramble
                    </button>
                    <button type="button" className="nl-btn-ghost" onClick={() => openCompanion({ context: notes, title: analysis.title })}>
                        Ask the tutor
                    </button>
                </div>
            </section>
        </div>
    );
};

export default OverviewPanel;
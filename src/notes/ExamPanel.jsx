import { useState } from 'react';
import { GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react';
import RichText from '../components/RichText';

const ExamPanel = ({ pack, onLoad, isLoading }) => {
    const [revealed, setRevealed] = useState({});

    if (isLoading) {
        return (
            <div className="nl-panel nl-empty">
                <Loader2 size={26} className="nl-spin" strokeWidth={1.6} />
                <p>Building exam questions from this lecture…</p>
            </div>
        );
    }

    if (!pack) {
        return (
            <div className="nl-panel nl-empty">
                <GraduationCap size={26} strokeWidth={1.4} />
                <p>Load the exam pack to get likely questions, model answers and mark weightings.</p>
                <button type="button" className="nl-btn-primary nl-btn-sm" onClick={onLoad} disabled={isLoading}>
                    Build exam pack
                </button>
            </div>
        );
    }

    if (!pack.examQuestions.length) {
        return (
            <div className="nl-panel nl-empty">
                <GraduationCap size={26} strokeWidth={1.4} />
                <p>No exam questions could be derived from this lecture.</p>
            </div>
        );
    }

    const totalMarks = pack.examQuestions.reduce((sum, item) => sum + item.marks, 0);

    return (
        <div className="nl-panel">
            <h3 className="nl-panel-title">
                <GraduationCap size={18} strokeWidth={1.8} />
                Exam pack
            </h3>
            <p className="nl-panel-sub">
                {pack.examQuestions.length} questions, {totalMarks} marks total, weighted towards the sections that matter most.
            </p>

            <div className="nl-questions">
                {pack.examQuestions.map((item, index) => {
                    const isOpen = Boolean(revealed[index]);

                    return (
                        <article key={`${item.question}-${index}`} className={`nl-question ${isOpen ? 'is-open' : ''}`}>
                            <header className="nl-question-head">
                                <span className="nl-question-index">{index + 1}</span>
                                <div className="nl-question-main">
                                    <p className="nl-question-text">{item.question}</p>
                                    <div className="nl-question-meta">
                                        <span className={`nl-tag nl-tag-diff nl-tag-diff-${item.difficulty}`}>{item.difficulty}</span>
                                        <span className="nl-meta-item">{item.marks} marks</span>
                                        {item.topic && <span className="nl-meta-item">{item.topic}</span>}
                                    </div>
                                </div>
                            </header>

                            {isOpen ? (
                                <div className="nl-answer">
                                    <RichText text={item.answer} />
                                    <button type="button" className="nl-btn-mini" onClick={() => setRevealed((current) => ({ ...current, [index]: false }))}>
                                        <EyeOff size={13} strokeWidth={2} /> Hide
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="nl-btn-mini nl-reveal" onClick={() => setRevealed((current) => ({ ...current, [index]: true }))}>
                                    <Eye size={13} strokeWidth={2} /> Reveal answer
                                </button>
                            )}
                        </article>
                    );
                })}
            </div>
        </div>
    );
};

export default ExamPanel;
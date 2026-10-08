import { useMemo, useState } from 'react';
import { Loader2, NotebookPen, RotateCcw } from 'lucide-react';
import ImportBar from './ImportBar';
import OverviewPanel from './OverviewPanel';
import SectionReader from './SectionReader';
import MindMapPanel from './MindMap';
import GlossaryPanel from './GlossaryPanel';
import GapsPanel from './GapsPanel';
import PuzzleMethodPanel from './PuzzleMethodPanel';
import GameLabPanel from './GameLabPanel';
import ExamPanel from './ExamPanel';
import ConceptGraph from './ConceptGraph';
import {
    analyseLecture,
    buildConceptTree,
    buildExamPack,
    buildPuzzleMethod,
    explainSection,
    explainSections,
    prepareNotes,
    buildScopedSource
} from '../services/notesService';
import { generateGameContent } from '../services/aiService';
import { useUI } from '../contexts/UIContext';
import './notes.css';

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'sections', label: 'Sections' },
    { id: 'mindmap', label: 'Mind map' },
    { id: 'glossary', label: 'Glossary' },
    { id: 'gaps', label: 'Gaps & myths' },
    { id: 'puzzle', label: 'Puzzle method' },
    { id: 'games', label: 'Game lab' },
    { id: 'exam', label: 'Exam pack' }
];

const GAME_TYPES = {
    quiz: 'AI Quiz Generator',
    flashcards: 'AI Flashcard Battle',
    puzzle: 'AI Puzzle Generator',
    boss: 'AI Boss Battle'
};

const GAME_COUNTS = {
    quiz: { questionCount: 8 },
    flashcards: { questionCount: 10 },
    puzzle: { questionCount: 10 },
    boss: { questionCount: 8 }
};

const NotesLab = () => {
    const { openFlashcards, openQuiz, openPuzzle, openBoss, showAlert } = useUI();
    const [notes, setNotes] = useState('');
    const [sourceLabel, setSourceLabel] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [dives, setDives] = useState({});
    const [diveProgress, setDiveProgress] = useState({ done: 0, total: 0 });
    const [isExplaining, setIsExplaining] = useState(false);
    const [diveWarning, setDiveWarning] = useState('');
    const [tree, setTree] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [isTreeLoading, setIsTreeLoading] = useState(false);
    const [puzzlePack, setPuzzlePack] = useState(null);
    const [isPuzzleLoading, setIsPuzzleLoading] = useState(false);
    const [examPack, setExamPack] = useState(null);
    const [isPackLoading, setIsPackLoading] = useState(false);
    const [isAnalysing, setIsAnalysing] = useState(false);
    const [isConverting, setIsConverting] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    const preparedNotes = useMemo(() => prepareNotes(notes), [notes]);

    const handleNotesChange = (value, label) => {
        setNotes(value);
        if (label) setSourceLabel(label);
    };

    const reset = () => {
        setAnalysis(null);
        setDives({});
        setTree(null);
        setTimeline([]);
        setPuzzlePack(null);
        setExamPack(null);
        setDiveWarning('');
        setError('');
        setActiveTab('overview');
    };

    const runDeepDives = async (result) => {
        setIsExplaining(true);
        setDiveWarning('');

        try {
            const explained = await explainSections({
                notes: preparedNotes,
                sections: result.sections,
                onProgress: (done, total) => setDiveProgress({ done, total })
            });

            setDives((current) => {
                const next = { ...current };
                explained.forEach((item) => { next[item.id] = item.markdown; });
                return next;
            });
        } catch (diveError) {
            console.error('Section explanation failed:', diveError);
            setDiveWarning('Some sections could not be explained automatically. Use "Explain again" on those sections.');
        } finally {
            setIsExplaining(false);
        }
    };

    const handleAnalyse = async () => {
        setIsAnalysing(true);
        setError('');

        try {
            const result = await analyseLecture({ notes: preparedNotes });
            setAnalysis(result);
            setDives({});
            setTree(null);
            setTimeline([]);
            setPuzzlePack(null);
            setExamPack(null);
            setDiveProgress({ done: 0, total: result.sections.length });
            setActiveTab('overview');
            runDeepDives(result);
        } catch (analysisError) {
            setError(analysisError.message || 'Could not analyse these notes.');
        } finally {
            setIsAnalysing(false);
        }
    };

    const handleExplainSection = async (section) => {
        setIsExplaining(true);

        try {
            const markdown = await explainSection({ notes: preparedNotes, section });
            setDives((current) => ({ ...current, [section.id]: markdown }));
        } catch (explainError) {
            showAlert(explainError.message || 'Could not build that explanation.', 'error');
        } finally {
            setIsExplaining(false);
        }
    };

    const handleLoadTree = async () => {
        if (tree || isTreeLoading) return;

        setIsTreeLoading(true);

        try {
            const result = await buildConceptTree({ notes: preparedNotes, analysis });
            setTree(result.tree);
            setTimeline(result.timeline);
        } catch (treeError) {
            showAlert(treeError.message || 'Could not build the mind map.', 'error');
        } finally {
            setIsTreeLoading(false);
        }
    };

    const handleLoadPuzzles = async () => {
        if (puzzlePack || isPuzzleLoading) return;

        setIsPuzzleLoading(true);

        try {
            const result = await buildPuzzleMethod({ notes: preparedNotes, analysis });
            setPuzzlePack(result);
        } catch (puzzleError) {
            showAlert(puzzleError.message || 'Could not build puzzles from these notes.', 'error');
        } finally {
            setIsPuzzleLoading(false);
        }
    };

    const handleLoadPack = async () => {
        if (examPack || isPackLoading) return;

        setIsPackLoading(true);

        try {
            const result = await buildExamPack({ notes: preparedNotes, analysis });
            setExamPack(result);
        } catch (packError) {
            showAlert(packError.message || 'Could not build the exam pack.', 'error');
        } finally {
            setIsPackLoading(false);
        }
    };

    const openGenerated = (kind, content, title) => {
        if (kind === 'flashcards') openFlashcards({ flashcards: content, title });
        else if (kind === 'quiz') openQuiz({ questions: content, title });
        else if (kind === 'puzzle') openPuzzle({ puzzles: content, title });
        else openBoss({ ...content, title });
    };

    const handlePlay = async (kind, section = null) => {
        if (isConverting) return;

        setIsConverting(kind);
        const scopeLabel = section?.heading || analysis?.title || 'these notes';

        try {
            const source = buildScopedSource(preparedNotes, section);
            const content = await generateGameContent(GAME_TYPES[kind], source, GAME_COUNTS[kind]);

            if (!content || (Array.isArray(content) && !content.length)) {
                throw new Error('The AI could not build that game from this material.');
            }

            openGenerated(kind, content, scopeLabel);
        } catch (playError) {
            showAlert(playError.message || `Could not build that game from ${scopeLabel}.`, 'error');
        } finally {
            setIsConverting('');
        }
    };

    const handlePlayScramble = (entry) => handlePlay('puzzle', {
        heading: entry.heading,
        summary: entry.scramble.map((word) => `${word.word}: ${word.hint}`).join('; ')
    });

    return (
        <div className="notes-lab">
            <div className="nl-container">
                <header className="nl-header">
                    <span className="nl-eyebrow">Notes Lab</span>
                    <h1 className="nl-title">
                        Turn a lecture into <span className="nl-title-grad">something you understand</span>
                    </h1>
                    <p className="nl-sub">
                        Drop in your notes or a link to your slides. MaufaLab splits the lecture into sections,
                        explains every one of them properly, then lets you read it as a concept tree, solve it as
                        puzzles, or play it as a game.
                    </p>
                </header>

                <div className="nl-grid">
                    <div className="nl-col-left">
                        <ImportBar
                            notes={notes}
                            sourceLabel={sourceLabel}
                            onNotesChange={handleNotesChange}
                            onAnalyse={handleAnalyse}
                            isAnalysing={isAnalysing}
                            error={error}
                        />

                        {analysis && (
                            <button type="button" className="nl-btn-ghost nl-reset" onClick={reset}>
                                <RotateCcw size={15} strokeWidth={2} />
                                Analyse different notes
                            </button>
                        )}
                    </div>

                    <div className="nl-col-right">
                        {!analysis ? (
                            <div className="nl-placeholder">
                                <NotebookPen size={30} strokeWidth={1.3} />
                                <h3>What you get</h3>
                                <ul>
                                    <li><strong>Every section explained</strong> in plain language, automatically</li>
                                    <li><strong>Concept tree</strong> you can walk through node by node</li>
                                    <li><strong>Puzzle method</strong> with blanks and scrambled terms</li>
                                    <li><strong>Game lab</strong> that turns any section into a quiz, cards, puzzle or boss duel</li>
                                    <li><strong>Glossary</strong> of flip cards for every key term</li>
                                    <li><strong>Gaps and misconceptions</strong> the notes never cover</li>
                                    <li><strong>Exam pack</strong> with mark weightings</li>
                                </ul>
                            </div>
                        ) : (
                            <>
                                <nav className="nl-tabs" role="tablist" aria-label="Analysis views">
                                    {TABS.map((tab) => (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={activeTab === tab.id}
                                            className={`nl-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                if (tab.id === 'mindmap') handleLoadTree();
                                                if (tab.id === 'puzzle') handleLoadPuzzles();
                                                if (tab.id === 'exam') handleLoadPack();
                                            }}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>

                                {diveWarning && <div className="nl-alert nl-alert-inline">{diveWarning}</div>}

                                {activeTab === 'overview' && (
                                    <OverviewPanel
                                        analysis={analysis}
                                        notes={preparedNotes}
                                        onConvert={(kind) => handlePlay(kind, null)}
                                        isConverting={Boolean(isConverting)}
                                    />
                                )}
                                {activeTab === 'sections' && (
                                    <SectionReader
                                        analysis={analysis}
                                        dives={dives}
                                        diveProgress={diveProgress}
                                        isExplaining={isExplaining}
                                        onExplainSection={handleExplainSection}
                                        onPlay={handlePlay}
                                    />
                                )}
                                {activeTab === 'mindmap' && (
                                    <MindMapPanel
                                        tree={tree}
                                        timeline={timeline}
                                        isLoading={isTreeLoading}
                                        onLoad={handleLoadTree}
                                        onPlay={handlePlay}
                                    />
                                )}
                                {activeTab === 'glossary' && <GlossaryPanel analysis={analysis} notes={preparedNotes} />}
                                {activeTab === 'gaps' && <GapsPanel analysis={analysis} />}
                                {activeTab === 'puzzle' && (
                                    <PuzzleMethodPanel
                                        pack={puzzlePack}
                                        isLoading={isPuzzleLoading}
                                        onLoad={handleLoadPuzzles}
                                        onPlayScramble={handlePlayScramble}
                                    />
                                )}
                                {activeTab === 'games' && (
                                    <GameLabPanel
                                        analysis={analysis}
                                        isConverting={Boolean(isConverting)}
                                        onPlay={handlePlay}
                                    />
                                )}
                                {activeTab === 'exam' && (
                                    <ExamPanel pack={examPack} onLoad={handleLoadPack} isLoading={isPackLoading} />
                                )}
                            </>
                        )}

                        {examPack?.conceptMap?.nodes?.length > 0 && activeTab === 'mindmap' && (
                            <section className="nl-panel">
                                <h3 className="nl-panel-title">Concept graph</h3>
                                <p className="nl-panel-sub">The same ideas as a network instead of a tree.</p>
                                <ConceptGraph nodes={examPack.conceptMap.nodes} links={examPack.conceptMap.links} />
                            </section>
                        )}
                    </div>
                </div>
            </div>

            {isConverting && (
                <div className="nl-overlay">
                    <Loader2 size={22} className="nl-spin" />
                    <span>Building your game from these notes…</span>
                </div>
            )}
        </div>
    );
};

export default NotesLab;
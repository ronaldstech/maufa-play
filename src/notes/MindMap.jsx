import { useState } from 'react';
import { GitBranch, Loader2, Sparkles, Clock3, Share2 } from 'lucide-react';

const KIND_ICON = {
    topic: '◉',
    term: '◆',
    formula: 'ƒ',
    example: '✦',
    critical: '!'
};

const TreeNode = ({ node, depth, selectedId, onSelect, path }) => {
    const hasChildren = node.children?.length > 0;
    const isSelected = selectedId === node.id;

    return (
        <li className="nl-tree-branch">
            <div
                className={`nl-tree-node nl-tree-kind-${node.kind} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelect(node.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => { if (event.key === 'Enter') onSelect(node.id); }}
            >
                <span className="nl-tree-badge">{KIND_ICON[node.kind] || '◉'}</span>
                <span className="nl-tree-label">{node.label}</span>
            </div>

            {hasChildren && (
                <ul>
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            path={[...path, node.label]}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

const findNode = (node, id) => {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children || []) {
        const hit = findNode(child, id);
        if (hit) return hit;
    }
    return null;
};

const Timeline = ({ timeline }) => {
    if (!timeline?.length) return null;

    return (
        <section className="nl-panel">
            <h3 className="nl-panel-title">
                <Clock3 size={18} strokeWidth={1.8} />
                Sequence
            </h3>
            <p className="nl-panel-sub">The order this material builds up in.</p>
            <ol className="nl-timeline">
                {timeline.map((entry) => (
                    <li key={entry.label} className="nl-timeline-item">
                        <span className="nl-timeline-dot" />
                        <div>
                            <p className="nl-timeline-label">{entry.label}</p>
                            {entry.detail && <p className="nl-timeline-detail">{entry.detail}</p>}
                        </div>
                    </li>
                ))}
            </ol>
        </section>
    );
};

const MindMapPanel = ({ tree, timeline, isLoading, onLoad, onPlay }) => {
    const [selectedId, setSelectedId] = useState(null);

    if (isLoading) {
        return (
            <div className="nl-panel nl-empty">
                <Loader2 size={26} className="nl-spin" strokeWidth={1.6} />
                <p>Growing the concept tree from this lecture…</p>
            </div>
        );
    }

    if (!tree) {
        return (
            <div className="nl-panel nl-empty">
                <GitBranch size={26} strokeWidth={1.4} />
                <p>Build a mind map of the lecture: every section, term and formula as a tree you can walk through.</p>
                <button type="button" className="nl-btn-primary nl-btn-sm" onClick={onLoad}>
                    <Sparkles size={15} strokeWidth={2} />
                    Build mind map
                </button>
            </div>
        );
    }

    const selected = findNode(tree, selectedId) || tree;

    return (
        <div className="nl-stack">
            <section className="nl-panel">
                <h3 className="nl-panel-title">
                    <Share2 size={18} strokeWidth={1.8} />
                    Concept tree
                </h3>
                <p className="nl-panel-sub">Click any node to read it. Section nodes can be turned into a game.</p>

                <div className="nl-tree-scroll">
                    <ul className="nl-tree">
                        <TreeNode node={tree} depth={0} selectedId={selectedId} onSelect={setSelectedId} path={[]} />
                    </ul>
                </div>
            </section>

            <section className="nl-panel nl-node-detail">
                <div className="nl-node-detail-head">
                    <span className={`nl-tree-badge nl-tree-kind-${selected.kind}`}>{KIND_ICON[selected.kind] || '◉'}</span>
                    <div>
                        <p className="nl-node-detail-label">{selected.label}</p>
                        <p className="nl-node-detail-kind">{selected.kind}</p>
                    </div>
                </div>

                {selected.note && <p className="nl-node-detail-note">{selected.note}</p>}

                {selected.children?.length > 0 && (
                    <ul className="nl-node-children">
                        {selected.children.map((child) => (
                            <li key={child.id}><span className="nl-term-pill">{child.label}</span></li>
                        ))}
                    </ul>
                )}

                <div className="nl-node-actions">
                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('quiz', { heading: selected.label, summary: selected.note })}>
                        Quiz me on this
                    </button>
                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('flashcards', { heading: selected.label, summary: selected.note })}>
                        Flashcards
                    </button>
                    <button type="button" className="nl-btn-mini" onClick={() => onPlay('puzzle', { heading: selected.label, summary: selected.note })}>
                        Puzzle
                    </button>
                </div>
            </section>

            <Timeline timeline={timeline} />
        </div>
    );
};

export default MindMapPanel;
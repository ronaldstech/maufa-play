import { useMemo } from 'react';

const NODE_W = 168;
const NODE_H = 52;
const COL_GAP = 96;
const ROW_GAP = 26;
const PAD = 24;

const KIND_COLOR = {
    concept: '#8b5cf6',
    formula: '#3b82f6',
    example: '#ec4899',
    term: '#22d3ee'
};

const estimateDepth = (nodes, links) => {
    const incoming = new Map(nodes.map((node) => [node.id, 0]));
    const outgoing = new Map(nodes.map((node) => [node.id, []]));

    links.forEach((link) => {
        incoming.set(link.to, (incoming.get(link.to) || 0) + 1);
        outgoing.get(link.from)?.push(link.to);
    });

    const roots = nodes.filter((node) => (incoming.get(node.id) || 0) === 0).map((node) => node.id);
    const depth = new Map(nodes.map((node) => [node.id, 0]));
    const queue = [...(roots.length ? roots : nodes.map((node) => node.id))];

    while (queue.length) {
        const id = queue.shift();
        const level = depth.get(id) || 0;

        (outgoing.get(id) || []).forEach((child) => {
            if ((depth.get(child) || 0) <= level) {
                depth.set(child, level + 1);
                queue.push(child);
            }
        });
    }

    return depth;
};

/** Renders the AI-produced concept graph as a layered SVG map. */
const ConceptGraph = ({ nodes, links }) => {
    const layout = useMemo(() => {
        if (!nodes?.length) return null;

        const depth = estimateDepth(nodes, links || []);
        const columns = new Map();

        nodes.forEach((node) => {
            const level = depth.get(node.id) || 0;
            if (!columns.has(level)) columns.set(level, []);
            columns.get(level).push(node);
        });

        const levels = [...columns.keys()].sort((a, b) => a - b);
        const tallest = Math.max(...levels.map((level) => columns.get(level).length));
        const height = PAD * 2 + tallest * NODE_H + (tallest - 1) * ROW_GAP;
        const width = PAD * 2 + levels.length * NODE_W + (levels.length - 1) * COL_GAP;
        const positions = new Map();

        levels.forEach((level, columnIndex) => {
            const column = columns.get(level);
            const columnHeight = column.length * NODE_H + (column.length - 1) * ROW_GAP;
            const offsetY = (height - columnHeight) / 2;

            column.forEach((node, rowIndex) => {
                positions.set(node.id, {
                    x: PAD + columnIndex * (NODE_W + COL_GAP),
                    y: offsetY + rowIndex * (NODE_H + ROW_GAP)
                });
            });
        });

        return { positions, width, height };
    }, [nodes, links]);

    if (!layout) return null;

    return (
        <div className="nl-map-wrap">
            <svg className="nl-map" viewBox={`0 0 ${layout.width} ${layout.height}`} width="100%" role="img" aria-label="Concept map">
                <defs>
                    <linearGradient id="nl-link-grad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
                    </linearGradient>
                </defs>

                {(links || []).map((link) => {
                    const from = layout.positions.get(link.from);
                    const to = layout.positions.get(link.to);
                    if (!from || !to) return null;

                    const x1 = from.x + NODE_W;
                    const y1 = from.y + NODE_H / 2;
                    const x2 = to.x;
                    const y2 = to.y + NODE_H / 2;
                    const mid = (x1 + x2) / 2;

                    return (
                        <path
                            key={`${link.from}-${link.to}`}
                            d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`}
                            fill="none"
                            stroke="url(#nl-link-grad)"
                            strokeWidth="1.6"
                        />
                    );
                })}

                {nodes.map((node) => {
                    const pos = layout.positions.get(node.id);
                    if (!pos) return null;

                    const color = KIND_COLOR[node.kind] || KIND_COLOR.concept;
                    const label = node.label.length > 20 ? `${node.label.slice(0, 19)}…` : node.label;

                    return (
                        <g key={node.id} transform={`translate(${pos.x}, ${pos.y})`}>
                            <rect
                                width={NODE_W}
                                height={NODE_H}
                                rx="14"
                                fill="rgba(18,18,26,0.92)"
                                stroke={color}
                                strokeOpacity="0.55"
                                strokeWidth="1.3"
                            />
                            <rect width="4" height={NODE_H} rx="2" fill={color} />
                            <text x="16" y="22" fill="#f8f9fc" fontSize="13" fontWeight="600">{label}</text>
                            <text x="16" y="39" fill={color} fontSize="10.5" letterSpacing="0.06em">{String(node.kind || 'concept').toUpperCase()}</text>
                        </g>
                    );
                })}
            </svg>

            <div className="nl-legend">
                {Object.entries(KIND_COLOR).map(([kind, color]) => (
                    <span key={kind} className="nl-legend-item">
                        <i style={{ background: color }} />{kind}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default ConceptGraph;
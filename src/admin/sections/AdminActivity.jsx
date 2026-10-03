import React, { useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteRecord } from '../../services/adminService';
import { can } from '../permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminCollection } from '../hooks/useAdminCollection';
import { useDebounced } from '../hooks/useDebounced';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminConfirm from '../components/AdminConfirm';
import AdminBadge from '../components/AdminBadge';
import Modal from '../../components/Modal';
import RichText from '../../components/RichText';

const TABS = [
    { key: 'results', label: 'Game sessions', collection: 'quiz_results', orderField: 'timestamp' },
    { key: 'companion', label: 'Tutor sessions', collection: 'companion_sessions', orderField: 'updatedAt' }
];

const formatDateTime = (value) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
    if (!date || Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
};

const outcomeTone = (outcome) => {
    if (['you', 'success', 'victory'].includes(outcome)) return 'success';
    if (['failure', 'defeat'].includes(outcome)) return 'danger';
    if (['partial', 'draw', 'ai'].includes(outcome)) return 'warn';
    return 'neutral';
};

const AdminActivity = () => {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState(TABS[0].key);
    const [search, setSearch] = useState('');
    const [gameFilter, setGameFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [viewTarget, setViewTarget] = useState(null);

    const debouncedSearch = useDebounced(search);
    const tab = TABS.find((item) => item.key === activeTab) || TABS[0];
    const canManage = can(userProfile, 'manageActivity');

    const { items, loading, error, refresh, refreshedAt } = useAdminCollection(tab.collection, {
        pageSize: 150,
        orderField: tab.orderField
    });

    const gameTypes = useMemo(() => {
        const values = new Set(items.map((item) => item.gameType).filter(Boolean));
        return [...values].sort();
    }, [items]);

    const filtered = useMemo(() => {
        const term = debouncedSearch.trim().toLowerCase();

        return items.filter((item) => {
            const matchesTerm = !term
                || item.quizTitle?.toLowerCase().includes(term)
                || item.title?.toLowerCase().includes(term)
                || item.summary?.toLowerCase().includes(term)
                || item.userId?.toLowerCase().includes(term);
            const matchesGame = gameFilter === 'all' || item.gameType === gameFilter;
            return matchesTerm && matchesGame;
        });
    }, [items, debouncedSearch, gameFilter]);

    const handleDelete = async () => {
        await deleteRecord(tab.collection, deleteTarget.id);
        refresh();
    };

    const columns = useMemo(() => {
        const base = [
            {
                key: 'title',
                header: 'Session',
                render: (item) => (
                    <div className="admin-cell-stack">
                        <strong>{item.quizTitle || item.title || 'Untitled session'}</strong>
                        <span>{item.summary || item.context?.slice(0, 90) || 'No summary stored.'}</span>
                    </div>
                )
            },
            {
                key: 'user',
                header: 'Learner',
                width: '150px',
                render: (item) => item.studentName || item.userId || '—'
            }
        ];

        if (tab.key === 'results') {
            base.push(
                {
                    key: 'gameType',
                    header: 'Game',
                    width: '170px',
                    render: (item) => <AdminBadge value={item.gameType} label={item.gameType || 'Legacy'} tone="brand" />
                },
                {
                    key: 'score',
                    header: 'Score',
                    width: '90px',
                    render: (item) => (typeof item.accuracy === 'number' ? `${item.accuracy}%` : `${item.score ?? '—'}`)
                },
                {
                    key: 'outcome',
                    header: 'Outcome',
                    width: '110px',
                    render: (item) => (item.outcome
                        ? <AdminBadge value={item.outcome} label={item.outcome} tone={outcomeTone(item.outcome)} />
                        : '—')
                },
                {
                    key: 'duration',
                    header: 'Duration',
                    width: '90px',
                    render: (item) => (item.duration ? `${item.duration}s` : '—')
                }
            );
        } else {
            base.push(
                {
                    key: 'messages',
                    header: 'Messages',
                    width: '100px',
                    render: (item) => (Array.isArray(item.messages) ? item.messages.length : 0)
                }
            );
        }

        base.push(
            { key: 'when', header: 'When', width: '150px', render: (item) => formatDateTime(tab.key === 'results' ? item.timestamp : item.updatedAt) },
            {
                key: 'actions',
                header: '',
                width: '150px',
                align: 'right',
                render: (item) => (
                    <div className="admin-row-actions">
                        <button className="admin-row-btn" onClick={() => setViewTarget(item)}>Inspect</button>
                        {canManage && (
                            <button className="admin-row-btn is-danger" onClick={() => setDeleteTarget(item)}>
                                <Trash2 size={14} /> Delete
                            </button>
                        )}
                    </div>
                )
            }
        );

        return base;
    }, [tab, canManage]);

    return (
        <section className="admin-section">
            <header className="admin-section-head">
                <div>
                    <h1>Activity</h1>
                    <p>Everything learners have played and discussed.</p>
                </div>
            </header>

            <div className="admin-tabs">
                {TABS.map((item) => (
                    <button
                        key={item.key}
                        className={`admin-tab ${item.key === activeTab ? 'is-active' : ''}`}
                        onClick={() => { setActiveTab(item.key); setSearch(''); setGameFilter('all'); }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {error && <div className="admin-error">{error}</div>}

            <AdminToolbar
                search={search}
                onSearch={setSearch}
                searchPlaceholder="Search sessions..."
                onReset={() => { setSearch(''); setGameFilter('all'); }}
                onRefresh={refresh}
                updatedAt={refreshedAt}
                filters={tab.key === 'results' ? [
                    {
                        key: 'game',
                        label: 'Filter by game',
                        value: gameFilter,
                        onChange: setGameFilter,
                        options: [
                            { value: 'all', label: 'All games' },
                            ...gameTypes.map((value) => ({ value, label: value }))
                        ]
                    }
                ] : []}
            />

            <AdminTable
                columns={columns}
                rows={filtered}
                loading={loading}
                emptyTitle="No activity yet"
                emptyHint="Sessions appear here as soon as learners finish a game or talk to the tutor."
            />

            <AdminConfirm
                isOpen={Boolean(deleteTarget)}
                title="Delete this record?"
                message={`The stored session for "${deleteTarget?.quizTitle || deleteTarget?.title || 'this run'}" will be permanently removed.`}
                confirmLabel="Delete record"
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />

            <Modal
                isOpen={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                title={viewTarget?.quizTitle || viewTarget?.title || 'Session detail'}
                maxWidth="760px"
            >
                {viewTarget && (
                    <div className="admin-detail">
                        <div className="admin-detail-meta">
                            {viewTarget.gameType && <AdminBadge value={viewTarget.gameType} label={viewTarget.gameType} tone="brand" />}
                            {viewTarget.outcome && (
                                <AdminBadge value={viewTarget.outcome} label={viewTarget.outcome} tone={outcomeTone(viewTarget.outcome)} />
                            )}
                            <span>{formatDateTime(viewTarget.timestamp || viewTarget.updatedAt)}</span>
                            <span>{viewTarget.userId || 'unknown learner'}</span>
                        </div>

                        {Array.isArray(viewTarget.finalMeters) && (
                            <div className="admin-detail-block">
                                <h3>Final meters</h3>
                                <ul className="admin-detail-list is-inline">
                                    {viewTarget.finalMeters.map((meter) => (
                                        <li key={meter.name}>{meter.name}: <strong>{meter.value}</strong></li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {Array.isArray(viewTarget.transcript) && (
                            <div className="admin-detail-block">
                                <h3>Transcript</h3>
                                <div className="admin-transcript">
                                    {viewTarget.transcript.map((turn, index) => (
                                        <div key={index} className={`admin-transcript-row is-${turn.role}`}>
                                            <span>{turn.role === 'user' ? 'Learner' : 'AI'}</span>
                                            <div><RichText text={turn.content} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Array.isArray(viewTarget.messages) && (
                            <div className="admin-detail-block">
                                <h3>Messages ({viewTarget.messages.length})</h3>
                                <div className="admin-transcript">
                                    {viewTarget.messages.map((message, index) => (
                                        <div key={index} className={`admin-transcript-row is-${message.role}`}>
                                            <span>{message.role === 'user' ? 'Learner' : 'Tutor'}</span>
                                            <div><RichText text={message.content} /></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {Array.isArray(viewTarget.questions) && (
                            <div className="admin-detail-block">
                                <h3>Questions ({viewTarget.questions.length})</h3>
                                <ol className="admin-detail-list">
                                    {viewTarget.questions.map((question, index) => (
                                        <li key={index}>
                                            <RichText text={typeof question === 'string' ? question : question.question} />
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {(viewTarget.transferableLesson || viewTarget.coachingTip) && (
                            <div className="admin-detail-block">
                                <h3>Key takeaway</h3>
                                <p>{viewTarget.transferableLesson || viewTarget.coachingTip}</p>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </section>
    );
};

export default AdminActivity;
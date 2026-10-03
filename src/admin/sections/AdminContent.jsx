import React, { useMemo, useState } from 'react';
import { Eye, Trash2, Users } from 'lucide-react';
import { CONTENT_SOURCES, deleteRecord } from '../../services/adminService';
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

const formatDate = (value) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
    if (!date || Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const countItems = (item) => {
    if (Array.isArray(item.questions)) return item.questions.length;
    if (Array.isArray(item.flashcards)) return item.flashcards.length;
    if (Array.isArray(item.puzzles)) return item.puzzles.length;
    if (Array.isArray(item.boss?.questions)) return item.boss.questions.length;
    return null;
};

const AdminContent = () => {
    const { userProfile } = useAuth();
    const [activeKey, setActiveKey] = useState(CONTENT_SOURCES[0].key);
    const [search, setSearch] = useState('');
    const [creatorFilter, setCreatorFilter] = useState('all');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [viewTarget, setViewTarget] = useState(null);

    const debouncedSearch = useDebounced(search);
    const source = CONTENT_SOURCES.find((item) => item.key === activeKey) || CONTENT_SOURCES[0];
    const canModerate = can(userProfile, 'moderateContent');

    const { items, loading, error, refresh, refreshedAt } = useAdminCollection(source.collection, { pageSize: 150 });

    const creators = useMemo(() => {
        const names = new Set(items.map((item) => item.creatorName).filter(Boolean));
        return [...names].sort();
    }, [items]);

    const filtered = useMemo(() => {
        const term = debouncedSearch.trim().toLowerCase();

        return items.filter((item) => {
            const matchesTerm = !term
                || item.topic?.toLowerCase().includes(term)
                || item.summary?.toLowerCase().includes(term)
                || item.creatorName?.toLowerCase().includes(term);
            const matchesCreator = creatorFilter === 'all' || item.creatorName === creatorFilter;
            return matchesTerm && matchesCreator;
        });
    }, [items, debouncedSearch, creatorFilter]);

    const handleDelete = async () => {
        await deleteRecord(source.collection, deleteTarget.id);
        refresh();
    };

    const columns = useMemo(() => [
        {
            key: 'topic',
            header: 'Title',
            render: (item) => (
                <div className="admin-cell-stack">
                    <strong>{item.topic || 'Untitled'}</strong>
                    <span>{item.summary || 'No summary provided.'}</span>
                </div>
            )
        },
        {
            key: 'creator',
            header: 'Creator',
            width: '170px',
            render: (item) => (
                <div className="admin-cell-user is-compact">
                    {item.creatorAvatar ? (
                        <img src={item.creatorAvatar} alt="" />
                    ) : (
                        <span className="admin-cell-initials">{(item.creatorName || '?').slice(0, 2).toUpperCase()}</span>
                    )}
                    <span>{item.creatorName || 'Anonymous'}</span>
                </div>
            )
        },
        {
            key: 'size',
            header: 'Size',
            width: '80px',
            render: (item) => {
                const size = countItems(item);
                return size === null ? '—' : `${size} ${source.itemLabel}${size === 1 ? '' : 's'}`;
            }
        },
        {
            key: 'plays',
            header: 'Plays',
            width: '80px',
            render: (item) => item[source.playsField] || 0
        },
        { key: 'createdAt', header: 'Created', width: '120px', render: (item) => formatDate(item.createdAt) },
        {
            key: 'actions',
            header: '',
            width: '150px',
            align: 'right',
            render: (item) => (
                <div className="admin-row-actions">
                    <button className="admin-row-btn" onClick={() => setViewTarget(item)}>
                        <Eye size={14} /> Inspect
                    </button>
                    {canModerate && (
                        <button className="admin-row-btn is-danger" onClick={() => setDeleteTarget(item)}>
                            <Trash2 size={14} /> Delete
                        </button>
                    )}
                </div>
            )
        }
    ], [canModerate, source]);

    const totals = useMemo(() => items.reduce((sum, item) => sum + (item[source.playsField] || 0), 0), [items, source]);

    return (
        <section className="admin-section">
            <header className="admin-section-head">
                <div>
                    <h1>Content</h1>
                    <p>Community generated content across every game.</p>
                </div>
                <div className="admin-headline-stats">
                    <span><Users size={14} /> {filtered.length} shown</span>
                    <span><Trash2 size={14} /> {totals} total plays</span>
                </div>
            </header>

            <div className="admin-tabs">
                {CONTENT_SOURCES.map((item) => (
                    <button
                        key={item.key}
                        className={`admin-tab ${item.key === activeKey ? 'is-active' : ''}`}
                        onClick={() => { setActiveKey(item.key); setSearch(''); setCreatorFilter('all'); }}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {error && <div className="admin-error">{error}</div>}

            <AdminToolbar
                search={search}
                onSearch={setSearch}
                searchPlaceholder={`Search ${source.label.toLowerCase()}...`}
                onReset={() => { setSearch(''); setCreatorFilter('all'); }}
                onRefresh={refresh}
                updatedAt={refreshedAt}
                filters={[
                    {
                        key: 'creator',
                        label: 'Filter by creator',
                        value: creatorFilter,
                        onChange: setCreatorFilter,
                        options: [
                            { value: 'all', label: 'All creators' },
                            ...creators.map((name) => ({ value: name, label: name }))
                        ]
                    }
                ]}
            />

            <AdminTable
                columns={columns}
                rows={filtered}
                loading={loading}
                emptyTitle={`No ${source.label.toLowerCase()} yet`}
                emptyHint="Content created by learners will appear here."
            />

            <AdminConfirm
                isOpen={Boolean(deleteTarget)}
                title={`Delete this ${source.itemLabel}?`}
                message={`"${deleteTarget?.topic || 'Untitled'}" will be removed for every learner. Past session history is kept.`}
                confirmLabel="Delete permanently"
                onConfirm={handleDelete}
                onClose={() => setDeleteTarget(null)}
            />

            <Modal
                isOpen={Boolean(viewTarget)}
                onClose={() => setViewTarget(null)}
                title={viewTarget?.topic || 'Content detail'}
                maxWidth="720px"
            >
                {viewTarget && (
                    <div className="admin-detail">
                        <div className="admin-detail-meta">
                            <AdminBadge value={source.gameType} label={source.gameType} tone="brand" />
                            <span>Created {formatDate(viewTarget.createdAt)}</span>
                            <span>by {viewTarget.creatorName || 'Anonymous'}</span>
                        </div>

                        {viewTarget.summary && <p className="admin-detail-summary">{viewTarget.summary}</p>}

                        {viewTarget.sourceMaterial && (
                            <div className="admin-detail-block">
                                <h3>Source material</h3>
                                <p>{viewTarget.sourceMaterial}</p>
                            </div>
                        )}

                        {Array.isArray(viewTarget.questions) && (
                            <div className="admin-detail-block">
                                <h3>Questions ({viewTarget.questions.length})</h3>
                                <ol className="admin-detail-list">
                                    {viewTarget.questions.map((question, index) => (
                                        <li key={index}>
                                            <RichText text={typeof question === 'string' ? question : question.question} />
                                            {question && typeof question === 'object' && question.correctAnswer !== undefined && (
                                                <span className="admin-detail-answer">Answer: {String(question.correctAnswer)}</span>
                                            )}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {Array.isArray(viewTarget.flashcards) && (
                            <div className="admin-detail-block">
                                <h3>Cards ({viewTarget.flashcards.length})</h3>
                                <ol className="admin-detail-list">
                                    {viewTarget.flashcards.map((card, index) => (
                                        <li key={index}>
                                            <strong>{card.front}</strong>
                                            <span className="admin-detail-answer">{card.back}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}

                        {Array.isArray(viewTarget.puzzles) && (
                            <div className="admin-detail-block">
                                <h3>Puzzles ({viewTarget.puzzles.length})</h3>
                                <ol className="admin-detail-list">
                                    {viewTarget.puzzles.map((puzzle, index) => (
                                        <li key={index}>
                                            <strong>{puzzle.word}</strong>
                                            <span className="admin-detail-answer">{puzzle.scrambled || puzzle.hint || ''}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </div>
                )}
            </Modal>
        </section>
    );
};

export default AdminContent;
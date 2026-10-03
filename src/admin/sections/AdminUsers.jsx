import React, { useEffect, useMemo, useState } from 'react';
import { ShieldBan, ShieldCheck, RefreshCw } from 'lucide-react';
import { fetchUsers, setUserBanned, updateUserRole } from '../../services/adminService';
import { can, ROLES, resolveRole, DEFAULT_ROLE } from '../permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useDebounced } from '../hooks/useDebounced';
import AdminTable from '../components/AdminTable';
import AdminToolbar from '../components/AdminToolbar';
import AdminConfirm from '../components/AdminConfirm';
import AdminBadge from '../components/AdminBadge';

const formatDate = (value) => {
    if (!value) return '—';
    const date = typeof value === 'string' ? new Date(value) : value.toDate?.();
    if (!date || Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

const AdminUsers = () => {
    const { userProfile, currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [banTarget, setBanTarget] = useState(null);
    const [unbanTarget, setUnbanTarget] = useState(null);
    const [rowError, setRowError] = useState(null);

    const debouncedSearch = useDebounced(search);
    const canChangeRoles = can(userProfile, 'changeRoles');
    const canManageUsers = can(userProfile, 'manageUsers');

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            setUsers(await fetchUsers());
        } catch (err) {
            setError(err.message || 'Could not load users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const filtered = useMemo(() => {
        const term = debouncedSearch.trim().toLowerCase();

        return users.filter((user) => {
            const matchesTerm = !term
                || user.displayName?.toLowerCase().includes(term)
                || user.email?.toLowerCase().includes(term)
                || user.uid?.toLowerCase().includes(term);
            const matchesRole = roleFilter === 'all' || resolveRole(user) === roleFilter;
            return matchesTerm && matchesRole;
        });
    }, [users, debouncedSearch, roleFilter]);

    const handleRoleChange = async (user, role) => {
        setRowError(null);
        try {
            await updateUserRole(user.id, role);
            setUsers((prev) => prev.map((item) => (item.id === user.id ? { ...item, role } : item)));
        } catch (err) {
            setRowError(err.message || 'Could not update that role.');
        }
    };

    const handleBan = async () => {
        await setUserBanned(banTarget.id, { banned: true });
        setUsers((prev) => prev.map((item) => (item.id === banTarget.id ? { ...item, banned: true } : item)));
    };

    const handleUnban = async () => {
        await setUserBanned(unbanTarget.id, { banned: false });
        setUsers((prev) => prev.map((item) => (item.id === unbanTarget.id ? { ...item, banned: false } : item)));
    };

    const columns = useMemo(() => [
        {
            key: 'user',
            header: 'Learner',
            render: (user) => (
                <div className="admin-cell-user">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt="" />
                    ) : (
                        <span className="admin-cell-initials">{(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}</span>
                    )}
                    <div>
                        <strong>{user.displayName || 'Unnamed'}</strong>
                        <span>{user.email || user.uid}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'role',
            header: 'Role',
            width: '160px',
            render: (user) => {
                if (!canChangeRoles || user.id === currentUser?.uid) {
                    return <AdminBadge value={resolveRole(user)} tone={resolveRole(user) === 'admin' ? 'danger' : resolveRole(user) === 'moderator' ? 'warn' : 'neutral'} />;
                }

                return (
                    <select
                        className="admin-select is-inline"
                        value={resolveRole(user)}
                        onChange={(event) => handleRoleChange(user, event.target.value)}
                        aria-label={`Role for ${user.displayName || user.email}`}
                    >
                        {Object.entries(ROLES).map(([value, meta]) => (
                            <option key={value} value={value}>{meta.label}</option>
                        ))}
                    </select>
                );
            }
        },
        {
            key: 'status',
            header: 'Status',
            width: '110px',
            render: (user) => (user.banned
                ? <AdminBadge value="banned" label="Banned" tone="danger" />
                : <AdminBadge value="active" label="Active" tone="success" />)
        },
        { key: 'joined', header: 'Joined', width: '120px', render: (user) => formatDate(user.createdAt) },
        {
            key: 'actions',
            header: '',
            width: '120px',
            align: 'right',
            render: (user) => {
                if (!canManageUsers || user.id === currentUser?.uid) return null;

                return user.banned ? (
                    <button className="admin-row-btn is-success" onClick={() => setUnbanTarget(user)}>
                        <ShieldCheck size={14} /> Unban
                    </button>
                ) : (
                    <button className="admin-row-btn is-danger" onClick={() => setBanTarget(user)}>
                        <ShieldBan size={14} /> Ban
                    </button>
                );
            }
        }
    ], [canChangeRoles, canManageUsers, currentUser]);

    return (
        <section className="admin-section">
            <header className="admin-section-head">
                <div>
                    <h1>Users</h1>
                    <p>Roles, access and account standing across MaufaLab.</p>
                </div>
                <button className="admin-icon-btn" onClick={load} title="Refresh users">
                    <RefreshCw size={15} />
                </button>
            </header>

            {error && <div className="admin-error">{error}</div>}
            {rowError && <div className="admin-error">{rowError}</div>}

            <AdminToolbar
                search={search}
                onSearch={setSearch}
                searchPlaceholder="Search name, email or uid..."
                onReset={() => { setSearch(''); setRoleFilter('all'); }}
                filters={[
                    {
                        key: 'role',
                        label: 'Filter by role',
                        value: roleFilter,
                        onChange: setRoleFilter,
                        options: [
                            { value: 'all', label: 'All roles' },
                            ...Object.entries(ROLES).map(([value, meta]) => ({ value, label: meta.label }))
                        ]
                    }
                ]}
            />

            <AdminTable
                columns={columns}
                rows={filtered}
                loading={loading}
                emptyTitle="No users match"
                emptyHint="Try a different search term or role filter."
            />

            <AdminConfirm
                isOpen={Boolean(banTarget)}
                title="Ban this account?"
                message={`${banTarget?.displayName || banTarget?.email || 'This user'} will be signed out and blocked from using the platform.`}
                confirmLabel="Ban account"
                onConfirm={handleBan}
                onClose={() => setBanTarget(null)}
            />

            <AdminConfirm
                isOpen={Boolean(unbanTarget)}
                title="Lift the ban?"
                message={`${unbanTarget?.displayName || unbanTarget?.email || 'This user'} will regain full access.`}
                confirmLabel="Unban"
                tone="success"
                onConfirm={handleUnban}
                onClose={() => setUnbanTarget(null)}
            />

            <p className="admin-footnote">
                Roles are stored on each user document. Newly registered accounts default to{' '}
                <code>{DEFAULT_ROLE}</code>; only admins can change them.
            </p>
        </section>
    );
};

export default AdminUsers;
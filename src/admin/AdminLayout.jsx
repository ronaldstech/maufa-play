import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Library,
    Activity,
    Settings as SettingsIcon,
    LogOut,
    ArrowLeft,
    ShieldCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { resolveRole, ROLES } from './permissions';
import './admin.css';

const NAV_ITEMS = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/content', label: 'Content', icon: Library },
    { to: '/admin/activity', label: 'Activity', icon: Activity },
    { to: '/admin/settings', label: 'Settings', icon: SettingsIcon }
];

const AdminLayout = () => {
    const { currentUser, userProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [navOpen, setNavOpen] = useState(false);

    const role = resolveRole(userProfile);
    const displayName = userProfile?.displayName || currentUser?.email || 'Admin';

    const initials = useMemo(() => {
        const source = userProfile?.displayName || currentUser?.email || 'A';
        return source.slice(0, 2).toUpperCase();
    }, [userProfile, currentUser]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="admin-shell">
            <aside className={`admin-sidebar ${navOpen ? 'is-open' : ''}`}>
                <div className="admin-sidebar-head">
                    <div className="admin-brand">
                        <ShieldCheck size={22} />
                        <div>
                            <strong>MaufaLab</strong>
                            <span>Control Room</span>
                        </div>
                    </div>
                </div>

                <nav className="admin-nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
                            onClick={() => setNavOpen(false)}
                        >
                            <item.icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-foot">
                    <button className="admin-back-link" onClick={() => navigate('/games')}>
                        <ArrowLeft size={16} /> Back to games
                    </button>
                    <button className="admin-back-link is-danger" onClick={handleLogout}>
                        <LogOut size={16} /> Sign out
                    </button>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <button className="admin-nav-toggle" onClick={() => setNavOpen((open) => !open)} aria-label="Toggle navigation">
                        <LayoutDashboard size={18} />
                    </button>
                    <div className="admin-topbar-user">
                        {userProfile?.photoURL ? (
                            <img src={userProfile.photoURL} alt="" className="admin-avatar" />
                        ) : (
                            <span className="admin-avatar is-initials">{initials}</span>
                        )}
                        <div>
                            <strong>{displayName}</strong>
                            <span>{ROLES[role]?.label || role}</span>
                        </div>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
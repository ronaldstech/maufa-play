import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    Library,
    BarChart3,
    MessageSquare,
    TrendingUp,
    UserPlus,
    Sparkles
} from 'lucide-react';
import { fetchActivityCounts, fetchCompanionSessions, fetchPlatformCounts, fetchResults } from '../../services/adminService';
import { GAMES } from '../../config/games';
import { useAuth } from '../../contexts/AuthContext';
import AdminStatCard from '../components/AdminStatCard';

const DAY_MS = 24 * 60 * 60 * 1000;
const CHART_DAYS = 14;

const dayKey = (date) => date.toISOString().slice(0, 10);

const AdminDashboard = () => {
    const { userProfile } = useAuth();
    const [counts, setCounts] = useState(null);
    const [activityCounts, setActivityCounts] = useState(null);
    const [results, setResults] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Captured once so the chart window stays stable while the page is open.
    const [windowStart] = useState(() => Date.now());

    useEffect(() => {
        let active = true;

        Promise.all([
            fetchPlatformCounts(),
            fetchActivityCounts(),
            fetchResults({ pageSize: 300 }),
            fetchCompanionSessions({ pageSize: 50 })
        ])
            .then(([platform, activity, resultRows, sessionRows]) => {
                if (!active) return;
                setCounts(platform);
                setActivityCounts(activity);
                setResults(resultRows);
                setSessions(sessionRows);
            })
            .catch((err) => {
                if (!active) return;
                setError(err.message || 'Could not load dashboard data.');
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const chart = useMemo(() => {
        const buckets = new Map();

        for (let index = CHART_DAYS - 1; index >= 0; index -= 1) {
            buckets.set(dayKey(new Date(windowStart - index * DAY_MS)), 0);
        }

        results.forEach((result) => {
            const stamp = result.timestamp?.toDate ? result.timestamp.toDate() : null;
            if (!stamp) return;
            const key = dayKey(stamp);
            if (buckets.has(key)) {
                buckets.set(key, buckets.get(key) + 1);
            }
        });

        const series = [...buckets.entries()].map(([key, count]) => ({ key, count }));
        const peak = Math.max(1, ...series.map((point) => point.count));

        return { series, peak };
    }, [results, windowStart]);

    const gameBreakdown = useMemo(() => {
        const totals = new Map();

        results.forEach((result) => {
            const key = result.gameType || 'Legacy result';
            totals.set(key, (totals.get(key) || 0) + 1);
        });

        return [...totals.entries()]
            .map(([gameType, plays]) => ({
                gameType,
                plays,
                game: GAMES.find((item) => item.resultGameType === gameType) || null
            }))
            .sort((a, b) => b.plays - a.plays);
    }, [results]);

    const recentSessions = useMemo(() => {
        return [...sessions]
            .sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0))
            .slice(0, 6);
    }, [sessions]);

    return (
        <section className="admin-section">
            <header className="admin-section-head">
                <div>
                    <h1>Dashboard</h1>
                    <p>Platform health at a glance, welcome back {userProfile?.displayName || 'admin'}.</p>
                </div>
            </header>

            {error && <div className="admin-error">{error}</div>}

            <div className="admin-stat-grid">
                <AdminStatCard icon={Users} label="Learners" value={counts?.users} loading={loading} hint="Registered accounts" tone="brand" />
                <AdminStatCard icon={Library} label="Community content" value={counts?.contentTotal} loading={loading} hint="Across all games" tone="success" />
                <AdminStatCard icon={BarChart3} label="Game sessions" value={activityCounts?.results} loading={loading} hint="Completed runs" tone="warn" />
                <AdminStatCard icon={MessageSquare} label="Tutor sessions" value={activityCounts?.companionSessions} loading={loading} hint="Study Companion chats" />
            </div>

            <div className="admin-grid-two">
                <article className="admin-panel">
                    <header className="admin-panel-head">
                        <div>
                            <h2>Session activity</h2>
                            <p>Completed runs over the last {CHART_DAYS} days</p>
                        </div>
                        <TrendingUp size={18} />
                    </header>

                    <div className="admin-chart">
                        {chart.series.map((point) => (
                            <div className="admin-chart-col" key={point.key} title={`${point.key}: ${point.count} sessions`}>
                                <div className="admin-chart-bar-wrap">
                                    <div
                                        className="admin-chart-bar"
                                        style={{ height: `${Math.max(4, (point.count / chart.peak) * 100)}%` }}
                                    />
                                </div>
                                <span>{point.key.slice(8)}</span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="admin-panel">
                    <header className="admin-panel-head">
                        <div>
                            <h2>Plays by game</h2>
                            <p>Based on the most recent {results.length} sessions</p>
                        </div>
                        <Sparkles size={18} />
                    </header>

                    <ul className="admin-breakdown">
                        {gameBreakdown.length === 0 && <li className="admin-breakdown-empty">No sessions recorded yet.</li>}
                        {gameBreakdown.map((entry) => (
                            <li key={entry.gameType}>
                                <span className="admin-breakdown-dot" style={{ background: entry.game?.color || '#94a3b8' }} />
                                <span className="admin-breakdown-name">{entry.gameType}</span>
                                <strong>{entry.plays}</strong>
                            </li>
                        ))}
                    </ul>
                </article>
            </div>

            <div className="admin-grid-two">
                <article className="admin-panel">
                    <header className="admin-panel-head">
                        <div>
                            <h2>Content library</h2>
                            <p>Documents per collection</p>
                        </div>
                    </header>

                    <ul className="admin-breakdown">
                        {(counts?.contentBySource || []).map((source) => (
                            <li key={source.key}>
                                <span className="admin-breakdown-name">{source.label}</span>
                                <strong>{loading ? '…' : source.count}</strong>
                            </li>
                        ))}
                    </ul>

                    <Link className="admin-panel-link" to="/admin/content">Moderate content</Link>
                </article>

                <article className="admin-panel">
                    <header className="admin-panel-head">
                        <div>
                            <h2>Recent tutor activity</h2>
                            <p>Latest Study Companion sessions</p>
                        </div>
                        <UserPlus size={18} />
                    </header>

                    <ul className="admin-breakdown">
                        {recentSessions.length === 0 && <li className="admin-breakdown-empty">No tutor sessions yet.</li>}
                        {recentSessions.map((session) => (
                            <li key={session.id}>
                                <span className="admin-breakdown-name">{session.title || session.studentName || 'Untitled session'}</span>
                                <span className="admin-breakdown-meta">{session.studentName || 'Anonymous'}</span>
                            </li>
                        ))}
                    </ul>

                    <Link className="admin-panel-link" to="/admin/activity">Inspect activity</Link>
                </article>
            </div>
        </section>
    );
};

export default AdminDashboard;
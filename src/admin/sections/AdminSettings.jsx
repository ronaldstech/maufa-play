import React, { useState } from 'react';
import { Power, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { GAMES } from '../../config/games';
import { useSettings } from '../../contexts/settings-context';
import { can } from '../permissions';
import { useAuth } from '../../contexts/AuthContext';

const AdminSettings = () => {
    const { userProfile } = useAuth();
    const { gameAvailability, loading, updateGameAvailability, refresh } = useSettings();
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState(null);

    const canManage = can(userProfile, 'manageSettings');

    const toggle = async (game, field) => {
        setSavingId(game.id);
        setError(null);
        try {
            await updateGameAvailability(game.id, { [field]: !gameAvailability[game.id]?.[field] });
        } catch (err) {
            setError(err.message || 'Could not save that change.');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <section className="admin-section">
            <header className="admin-section-head">
                <div>
                    <h1>Settings</h1>
                    <p>Control which games are live for every learner.</p>
                </div>
                <button className="admin-icon-btn" onClick={refresh} title="Reload settings">
                    <Power size={15} />
                </button>
            </header>

            {error && <div className="admin-error">{error}</div>}
            {!canManage && (
                <div className="admin-notice">
                    <ShieldCheck size={16} />
                    <span>Only admins can change platform settings. You are signed in with limited access.</span>
                </div>
            )}

            <article className="admin-panel">
                <header className="admin-panel-head">
                    <div>
                        <h2>Game availability</h2>
                        <p>Turning a game off hides it from the library. "Coming soon" keeps it visible but locked.</p>
                    </div>
                </header>

                <ul className="admin-game-list">
                    {GAMES.map((game) => {
                        const availability = gameAvailability[game.id] || { enabled: true, comingSoon: false };
                        const saving = savingId === game.id;

                        return (
                            <li key={game.id} className="admin-game-row">
                                <span className="admin-game-dot" style={{ background: game.color }} />
                                <div className="admin-game-meta">
                                    <strong>{game.title}</strong>
                                    <span>{game.description}</span>
                                </div>

                                <div className="admin-game-toggles">
                                    <button
                                        className={`admin-toggle ${availability.enabled ? 'is-on' : ''}`}
                                        onClick={() => toggle(game, 'enabled')}
                                        disabled={!canManage || loading || saving}
                                        title={availability.enabled ? 'Visible in the library' : 'Hidden from the library'}
                                    >
                                        <Power size={14} />
                                        {availability.enabled ? 'Live' : 'Hidden'}
                                    </button>

                                    <button
                                        className={`admin-toggle is-soon ${availability.comingSoon ? 'is-on' : ''}`}
                                        onClick={() => toggle(game, 'comingSoon')}
                                        disabled={!canManage || loading || saving}
                                        title="Marks the game as coming soon"
                                    >
                                        <EyeOff size={14} />
                                        {availability.comingSoon ? 'Coming soon' : 'Playable'}
                                    </button>

                                    {saving && <Loader2 size={15} className="animate-spin" />}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </article>

            <article className="admin-panel">
                <header className="admin-panel-head">
                    <div>
                        <h2>Access model</h2>
                        <p>How staff permissions are resolved in this build.</p>
                    </div>
                </header>

                <ul className="admin-detail-list is-bulleted">
                    <li><code>role: 'admin'</code> on a user document grants full access, including roles and these settings.</li>
                    <li><code>role: 'moderator'</code> grants dashboard, content and activity tools only.</li>
                    <li>Accounts with <code>banned: true</code> are refused everywhere, including the admin area.</li>
                    <li>Client-side gating is only a UI guard — lock these collections down with Firestore security rules.</li>
                </ul>
            </article>
        </section>
    );
};

export default AdminSettings;
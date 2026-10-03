import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ShieldAlert, LogIn } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { can } from './permissions';
import AdminLayout from './AdminLayout';
import AdminDashboard from './sections/AdminDashboard';
import AdminUsers from './sections/AdminUsers';
import AdminContent from './sections/AdminContent';
import AdminActivity from './sections/AdminActivity';
import AdminSettings from './sections/AdminSettings';

const AccessScreen = ({ title, message, action }) => (
    <div className="admin-access-screen">
        <ShieldAlert size={44} />
        <h1>{title}</h1>
        <p>{message}</p>
        {action}
    </div>
);

/**
 * Guards the whole admin area and mounts its sections.
 *
 * Access requires `role: 'admin'` or `role: 'moderator'` on the signed-in user's
 * Firestore profile. A banned account is always refused.
 */
const AdminRouter = () => {
    const { currentUser, userProfile } = useAuth();
    const { openLogin } = useUI();

    if (!currentUser) {
        return (
            <Routes>
                <Route
                    path="*"
                    element={(
                        <AccessScreen
                            title="Sign in required"
                            message="The control room is limited to MaufaLab staff accounts."
                            action={(
                                <button className="btn-primary" onClick={openLogin}>
                                    <LogIn size={16} /> Sign in
                                </button>
                            )}
                        />
                    )}
                />
            </Routes>
        );
    }

    if (!can(userProfile, 'viewDashboard')) {
        return (
            <Routes>
                <Route
                    path="*"
                    element={(
                        <AccessScreen
                            title="No admin access"
                            message={(
                                <>
                                    Your account does not have a staff role yet. To bootstrap access, add
                                    {' '}<code>role: "admin"</code> to your document in the{' '}
                                    <code>users</code> collection, then sign out and back in.
                                </>
                            )}
                        />
                    )}
                />
            </Routes>
        );
    }

    return (
        <Routes>
            <Route element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="content" element={<AdminContent />} />
                <Route path="activity" element={<AdminActivity />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
        </Routes>
    );
};

export default AdminRouter;
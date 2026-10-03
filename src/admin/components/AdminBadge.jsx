import React from 'react';
import { ROLES, resolveRole } from '../permissions';

/**
 * Small coloured label used for roles, outcomes and status pills.
 */
const AdminBadge = ({ value, label, tone }) => {
    const role = ROLES[resolveRole({ role: value })];
    const resolvedTone = tone || (value === 'admin' ? 'danger' : value === 'moderator' ? 'warn' : 'neutral');

    return (
        <span className={`admin-badge is-${resolvedTone}`}>
            {label || role?.label || value}
        </span>
    );
};

export default AdminBadge;
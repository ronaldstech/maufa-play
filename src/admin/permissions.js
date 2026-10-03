/**
 * Role and permission model for the admin area.
 *
 * Roles live on the user document (`users/{uid}.role`). To bootstrap the first admin,
 * set `role: 'admin'` on your own user document in the Firestore console.
 */
export const ROLES = {
    admin: {
        label: 'Admin',
        rank: 3,
        description: 'Full control: users, roles, content, activity and platform settings.'
    },
    moderator: {
        label: 'Moderator',
        rank: 2,
        description: 'Can review and remove community content and activity records.'
    },
    user: {
        label: 'User',
        rank: 1,
        description: 'Standard learner account.'
    }
};

export const DEFAULT_ROLE = 'user';

export const PERMISSIONS = {
    viewDashboard: ['admin', 'moderator'],
    manageUsers: ['admin', 'moderator'],
    changeRoles: ['admin'],
    moderateContent: ['admin', 'moderator'],
    manageActivity: ['admin', 'moderator'],
    manageSettings: ['admin']
};

export const resolveRole = (profile) => {
    const role = profile?.role;
    return Object.prototype.hasOwnProperty.call(ROLES, role) ? role : DEFAULT_ROLE;
};

/**
 * @param {object|null} profile - The Firestore user profile.
 * @param {keyof PERMISSIONS} permission
 * @returns {boolean}
 */
export const can = (profile, permission) => {
    if (!profile || profile.banned === true) return false;
    const allowed = PERMISSIONS[permission];
    if (!allowed) return false;
    return allowed.includes(resolveRole(profile));
};

export const isStaff = (profile) => can(profile, 'viewDashboard');
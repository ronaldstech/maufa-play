import React from 'react';
import { Loader2 } from 'lucide-react';

const TONES = {
    default: 'is-default',
    success: 'is-success',
    warn: 'is-warn',
    danger: 'is-danger',
    brand: 'is-brand'
};

const AdminStatCard = ({ icon: Icon, label, value, hint, tone = 'default', loading = false }) => (
    <article className={`admin-stat-card ${TONES[tone] || TONES.default}`}>
        <div className="admin-stat-icon">
            {Icon ? <Icon size={20} /> : null}
        </div>
        <div className="admin-stat-body">
            <span className="admin-stat-label">{label}</span>
            {loading ? (
                <span className="admin-stat-value is-loading">
                    <Loader2 size={18} className="animate-spin" />
                </span>
            ) : (
                <span className="admin-stat-value">{value ?? '—'}</span>
            )}
            {hint && <span className="admin-stat-hint">{hint}</span>}
        </div>
    </article>
);

export default AdminStatCard;
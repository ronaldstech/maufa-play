import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '../../components/Modal';

const AdminConfirm = ({ isOpen, title, message, confirmLabel = 'Confirm', tone = 'danger', onConfirm, onClose }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const handleConfirm = async () => {
        setBusy(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(err.message || 'That action failed. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    const close = () => {
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={close} title={title} maxWidth="440px">
            <div className={`admin-confirm is-${tone}`}>
                <AlertTriangle size={22} />
                <p>{message}</p>
                {error && <span className="admin-confirm-error">{error}</span>}
                <div className="admin-confirm-actions">
                    <button className="btn-ghost" onClick={close} disabled={busy}>Cancel</button>
                    <button className={`btn-primary is-${tone}`} onClick={handleConfirm} disabled={busy}>
                        {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default AdminConfirm;
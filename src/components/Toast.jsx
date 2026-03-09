import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import './Toast.css';

const Toast = ({ alert, onRemove }) => {
    const [isRemoving, setIsRemoving] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleRemove = () => {
        setIsRemoving(true);
        setTimeout(() => {
            onRemove(alert.id);
        }, 300);
    };

    useEffect(() => {
        const startTime = Date.now();
        const endTime = startTime + alert.duration;

        const interval = setInterval(() => {
            const now = Date.now();
            const remaining = endTime - now;
            const percentage = Math.max(0, (remaining / alert.duration) * 100);

            setProgress(100 - percentage);

            if (now >= endTime) {
                clearInterval(interval);
                handleRemove();
            }
        }, 10);

        return () => clearInterval(interval);
    }, [alert, onRemove]);

    const icons = {
        success: <CheckCircle size={24} />,
        error: <XCircle size={24} />,
        info: <Info size={24} />
    };

    return (
        <div className={`toast ${alert.type} ${isRemoving ? 'removing' : ''}`}>
            <div className="toast-icon">
                {icons[alert.type]}
            </div>
            <div className="toast-content">
                <div className="toast-message">{alert.message}</div>
            </div>
            <button className="toast-close" onClick={handleRemove}>
                <X size={18} />
            </button>
            <div
                className="toast-progress"
                style={{ width: `${100 - progress}%`, transition: 'width 10ms linear' }}
            />
        </div>
    );
};

export default Toast;

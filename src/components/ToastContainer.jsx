import React from 'react';
import { useUI } from '../contexts/UIContext';
import Toast from './Toast';
import './Toast.css';

const ToastContainer = () => {
    const { alerts, removeAlert } = useUI();

    if (!alerts || alerts.length === 0) return null;

    return (
        <div className="toast-container">
            {alerts.map(alert => (
                <Toast
                    key={alert.id}
                    alert={alert}
                    onRemove={removeAlert}
                />
            ))}
        </div>
    );
};

export default ToastContainer;

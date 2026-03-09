import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
    return (
        <div className="loading-screen">
            <div className="loading-content">
                <div className="logo-container">
                    <div className="spinner-aura"></div>
                    <img src="/logo.png" alt="MaufaLab Logo" className="loading-logo" />
                </div>
                <div className="loading-text">
                    <h1 className="brand-name">
                        Maufa<span className="text-gradient-primary">Play</span>
                    </h1>
                    <div className="loading-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;

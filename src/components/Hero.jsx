import React from 'react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero">
            <div className="container hero-container">

                <div className="hero-content animate-fade-in-up">
                    <div className="badge">
                        <span className="badge-dot"></span>
                        Elevate Your Academic Journey
                    </div>

                    <h1 className="hero-title">
                        Master Your Studies with <br />
                        <span className="text-gradient-primary">AI-Powered Games</span>
                    </h1>

                    <p className="hero-description text-secondary delay-1">
                        MaufaLab transforms traditional learning into interactive, engaging AI games.
                        Prepare for exams, master complex subjects, and retain information faster than ever before.
                    </p>

                    <div className="hero-cta delay-2">
                        <button className="btn-primary hero-btn">
                            Start Learning Free
                        </button>
                        <button className="btn-secondary hero-btn with-icon">
                            Explore Games
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                    </div>

                    <div className="hero-stats delay-3">
                        <div className="stat-item">
                            <h3 className="stat-value">50+</h3>
                            <p className="stat-label">AI Models</p>
                        </div>
                        <div className="stat-item">
                            <h3 className="stat-value">10k+</h3>
                            <p className="stat-label">Active Students</p>
                        </div>
                        <div className="stat-item">
                            <h3 className="stat-value">98%</h3>
                            <p className="stat-label">Pass Rate</p>
                        </div>
                    </div>
                </div>

                <div className="hero-visual">
                    <div className="visual-container">
                        {/* Abstract visual representation of AI Games */}
                        <div className="glow-sphere main-sphere"></div>
                        <div className="glow-sphere secondary-sphere"></div>

                        <div className="glass-card floating-card card-1 delay-1">
                            <div className="card-icon math-icon">∑</div>
                            <div className="card-info">
                                <h4>Calculus Mastery</h4>
                                <div className="progress-bar"><div className="progress" style={{ width: '85%' }}></div></div>
                            </div>
                        </div>

                        <div className="glass-card floating-card card-2 delay-2">
                            <div className="card-icon hero-logo-icon">
                                <img src="/logo.png" alt="AI Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </div>
                            <div className="card-info">
                                <h4>Exam Prep Generated</h4>
                                <p className="text-sm">Ready to play!</p>
                            </div>
                        </div>

                        <div className="glass-card floating-card card-3 delay-3">
                            <div className="card-icon bio-icon">🧬</div>
                            <div className="card-info">
                                <h4>Biology Quiz</h4>
                                <div className="badge-small">Score: 95%</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
};

export default Hero;

import React from 'react';
import { Link } from 'react-router-dom';
import { Upload, Sparkles, Trophy } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import Hero from '../components/Hero';
import Features from '../components/Features';
import './Home.css';

const steps = [
    {
        id: 1,
        title: 'Bring Your Material',
        description: 'Paste notes, upload a PDF, or pick a topic. That is all the setup you need.',
        icon: <Upload size={28} strokeWidth={1.5} />
    },
    {
        id: 2,
        title: 'AI Builds The Session',
        description: 'Our models generate questions, explain concepts, and shape a study plan around your material.',
        icon: <Sparkles size={28} strokeWidth={1.5} />
    },
    {
        id: 3,
        title: 'Play, Recall, Improve',
        description: 'Answer, get instant feedback, and watch your retention climb with every round.',
        icon: <Trophy size={28} strokeWidth={1.5} />
    }
];

const Home = () => {
    const { openCompanion } = useUI();

    return (
        <div className="home-page">
            <Hero />

            <section className="how-it-works">
                <div className="container">
                    <div className="section-header">
                        <span className="eyebrow">How It Works</span>
                        <h2 className="section-title">
                            From Notes To <span className="text-gradient-primary">Active Recall</span>
                        </h2>
                        <p className="section-subtitle">
                            Passive reading fades. Three steps turn your material into something you actually remember.
                        </p>
                    </div>

                    <div className="steps-grid">
                        {steps.map((step, index) => (
                            <div
                                key={step.id}
                                className={`step-card glass-panel animate-fade-in-up delay-${index + 1}`}
                            >
                                <span className="step-number">{String(index + 1).padStart(2, '0')}</span>
                                <div className="step-icon">{step.icon}</div>
                                <h3 className="step-title">{step.title}</h3>
                                <p className="step-description">{step.description}</p>
                                <div className="step-glow" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <Features />

            <section className="cta-section">
                <div className="container">
                    <div className="cta-card glass-panel animate-fade-in-up">
                        <div className="cta-orbs" aria-hidden="true">
                            <div className="glow-sphere cta-sphere-1" />
                            <div className="glow-sphere cta-sphere-2" />
                        </div>

                        <div className="cta-content">
                            <span className="eyebrow">Start Free, No Card Needed</span>
                            <h2 className="cta-title">
                                Ready To Make Studying <span className="text-gradient-primary">Actually Fun?</span>
                            </h2>
                            <p className="section-subtitle">
                                Pick an AI game to turn your material into a challenge, or jump straight into a tutor that
                                quizzes and explains on demand.
                            </p>
                            <div className="cta-actions">
                                <Link to="/games" className="btn-primary hero-btn">
                                    Explore AI Games
                                </Link>
                                <button className="btn-secondary hero-btn" onClick={() => openCompanion()}>
                                    Meet Your AI Tutor
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;

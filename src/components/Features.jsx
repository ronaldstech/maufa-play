import React from 'react';
import { BookOpen, Target, Gamepad2 } from 'lucide-react';
import './Features.css';

const Features = () => {
    const features = [
        {
            id: 1,
            title: 'Interactive Study AI',
            description: 'Upload your notes or textbooks, and let our AI generate personalized, engaging study modules tailored to your pace.',
            icon: <BookOpen size={32} strokeWidth={1.5} />,
            color: 'blue'
        },
        {
            id: 2,
            title: 'Exam Simulator',
            description: 'Experience real exam conditions with AI-generated questions based on your curriculum, providing instant grading and feedback.',
            icon: <Target size={32} strokeWidth={1.5} />,
            color: 'purple'
        },
        {
            id: 3,
            title: 'Competitive AI Games',
            description: 'Challenge your friends or AI opponents in interactive educational battles to test your knowledge retention under pressure.',
            icon: <Gamepad2 size={32} strokeWidth={1.5} />,
            color: 'pink'
        }
    ];

    return (
        <section id="features" className="features">
            <div className="container">

                <div className="section-header">
                    <h2 className="section-title">
                        Learn Smarter. <span className="text-gradient">Play Harder.</span>
                    </h2>
                    <p className="section-subtitle">
                        Discover a comprehensive suite of AI tools designed to transform your academic journey from tedious memorization to active engagement.
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div
                            key={feature.id}
                            className={`feature-card delay-${index + 1} animate-fade-in-up`}
                        >
                            <div className={`feature-icon feature-icon-${feature.color}`}>
                                {feature.icon}
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>

                            <div className="feature-glow group-hover:opacity-100"></div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
};

export default Features;

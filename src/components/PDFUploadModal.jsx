import React, { useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { analyzeContent, generateGameContent } from '../services/aiService';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import {
    FileText,
    Upload,
    X,
    CheckCircle2,
    BrainCircuit,
    Sliders,
    Sparkles
} from 'lucide-react';
import Modal from './Modal';
import './PDFUploadModal.css';

import PDFWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = PDFWorker;

const PDFUploadModal = () => {
    const { isPDFModalOpen, closePDFModal, openQuiz, openFlashcards, selectedGameType, showAlert } = useUI();
    const { currentUser, userProfile } = useAuth();
    const isFlashcards = selectedGameType === "AI Flashcard Battle"; const fileInputRef = useRef(null);

    const [step, setStep] = useState(1); // 1: Select, 2: Extracting, 3: Analyzing, 4: Configure, 5: Generating
    const [file, setFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [questionCount, setQuestionCount] = useState(5);
    const [analysisProgress, setAnalysisProgress] = useState(0);
    const [analysisPhase, setAnalysisPhase] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

    // Simulated progress logic
    React.useEffect(() => {
        let interval;
        if (isProcessing && (step === 2 || step === 3 || step === 5)) {
            const phases = step === 5
                ? ['Initializing generator...', `Crafting ${isFlashcards ? 'flashcards' : 'questions'}...`, 'Optimizing content...', `Finalizing ${isFlashcards ? 'deck' : 'quiz'}...`]
                : ['Scanning document...', 'Extracting knowledge...', 'Mapping concepts...', 'Identifying key terms...'];

            setAnalysisProgress(0);
            setAnalysisPhase(phases[0]);

            let currentProgress = 0;
            interval = setInterval(() => {
                currentProgress += Math.random() * 15;
                if (currentProgress > 95) currentProgress = 95;

                setAnalysisProgress(Math.floor(currentProgress));

                // Update phases based on progress
                const phaseIndex = Math.floor((currentProgress / 100) * phases.length);
                if (phases[phaseIndex]) setAnalysisPhase(phases[phaseIndex]);
            }, 600);
        } else {
            setAnalysisProgress(0);
            setAnalysisPhase('');
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isProcessing, step]);

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setError(null);
        } else {
            setError("Please select a valid PDF file.");
        }
    };

    const extractText = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStep(2);
        setError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let fullText = '';

            for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit to 10 pages for performance
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n';
            }

            if (fullText.trim().length < 100) {
                throw new Error("Could not extract enough text from this PDF. It might be scanned or image-based.");
            }

            setExtractedText(fullText);
            handleAnalyze(fullText);
        } catch (err) {
            console.error("PDF Extraction error:", err);
            showAlert(err.message || "Failed to extract text from PDF.", 'error');
            setStep(1);
            setIsProcessing(false);
        }
    };

    const handleAnalyze = async (text) => {
        setStep(3);
        try {
            const result = await analyzeContent(text);
            const maxQ = Number(result.maxQuestions) || 15;
            setAnalysis({ ...result, maxQuestions: maxQ });
            setQuestionCount(Math.min(5, maxQ));
            setStep(4);
        } catch (err) {
            showAlert(err.message, 'error');
            setStep(1);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerate = async () => {
        setIsProcessing(true);
        setStep(5);
        setError(null);

        try {
            const content = await generateGameContent(selectedGameType, extractedText, { questionCount });

            if (!currentUser) {
                throw new Error(`You must be logged in to save and play ${isFlashcards ? 'flashcards' : 'quizzes'}.`);
            }

            const collectionName = isFlashcards ? 'flashcards' : 'quizzes';

            // Save to Firestore
            const gameRef = await addDoc(collection(db, collectionName), {
                userId: currentUser.uid,
                creatorName: userProfile?.displayName || currentUser.email.split('@')[0],
                creatorAvatar: userProfile?.photoURL || null,
                topic: analysis.topic,
                summary: analysis.summary,
                [isFlashcards ? 'flashcards' : 'questions']: content,
                sourceMaterial: "Extracted from PDF: " + file.name,
                createdAt: serverTimestamp(),
                gameType: selectedGameType
            });

            handleClose();

            // Open the appropriate Modal
            if (isFlashcards) {
                openFlashcards({
                    flashcards: content,
                    title: analysis.topic,
                    gameId: gameRef.id
                });
            } else {
                openQuiz({
                    questions: content,
                    title: analysis.topic,
                    quizId: gameRef.id
                });
            }
        } catch (err) {
            showAlert(err.message, 'error');
            setStep(4);
        } finally {
            setIsProcessing(false);
        }
    };

    const resetState = () => {
        setStep(1);
        setFile(null);
        setExtractedText('');
        setAnalysis(null);
        setQuestionCount(5);
        setError(null);
    };

    const handleClose = () => {
        if (isProcessing) return;
        closePDFModal();
        resetState();
    };

    if (!isPDFModalOpen) return null;

    return (
        <Modal isOpen={isPDFModalOpen} onClose={handleClose} maxWidth="600px">
            <div className="pdf-modal-content">
                <div className="pdf-modal-header">
                    <div className="step-indicator">
                        <span className={step >= 1 ? 'active' : ''}>1</span>
                        <div className={`line ${step >= 2 ? 'active' : ''}`}></div>
                        <span className={step >= 4 ? 'active' : ''}>2</span>
                        <div className={`line ${step >= 5 ? 'active' : ''}`}></div>
                        <span className={step >= 5 ? 'active' : ''}>3</span>
                    </div>
                    {step === 1 && <h2><Upload size={24} className="icon-purple" /> Upload Study Material</h2>}
                    {(step === 2 || step === 3) && <h2><BrainCircuit size={24} className="icon-purple animate-pulse" /> Processing Document</h2>}
                    {step === 4 && <h2><Sliders size={24} className="icon-purple" /> Configure {isFlashcards ? 'Deck' : 'Quiz'}</h2>}
                    {step === 5 && <h2><Sparkles size={24} className="icon-purple animate-spin-slow" /> Generating {isFlashcards ? 'Flashcards' : 'Questions'}</h2>}
                </div>

                <div className="pdf-modal-body">
                    {step === 1 && (
                        <div className="upload-step animate-fade-in">
                            <p className="step-desc">Upload your lecture notes, handouts, or text-based PDF. Our AI will scan the content to build your {isFlashcards ? 'flashcards' : 'quiz'}.</p>

                            <div
                                className={`upload-zone ${file ? 'has-file' : ''}`}
                                onClick={() => fileInputRef.current.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                    accept=".pdf"
                                    style={{ display: 'none' }}
                                />
                                {file ? (
                                    <div className="file-info-box">
                                        <FileText size={40} className="file-icon" />
                                        <span className="file-name">{file.name}</span>
                                        <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <button className="remove-file" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="upload-icon-box">
                                            <Upload size={32} />
                                        </div>
                                        <p>Click or drag & drop PDF here</p>
                                        <span>Maximum size: 10MB</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {(step === 2 || step === 3) && (
                        <div className="processing-step animate-fade-in text-center">
                            <div className="analysis-progress-container">
                                <div className="progress-stats">
                                    <span className="progress-phase">{analysisPhase}</span>
                                    <span className="progress-percentage">{analysisProgress}%</span>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${analysisProgress}%` }}
                                    ></div>
                                </div>
                                <p className="analysis-subtext">Our AI is examining your document to find the best question opportunities...</p>
                            </div>
                        </div>
                    )}

                    {step === 4 && analysis && (
                        <div className="configure-step animate-fade-in">
                            <div className="analysis-summary card-glass">
                                <h3 className="topic-title">{analysis.topic}</h3>
                                <p className="summary-text">{analysis.summary}</p>
                            </div>

                            <div className="slider-section">
                                <div className="slider-header">
                                    <label>Number of {selectedGameType === 'flashcards' ? 'Flashcards' : 'Questions'}</label>
                                    <span className="count-badge">{questionCount}</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max={analysis.maxQuestions}
                                    value={questionCount}
                                    onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                                    className="premium-slider"
                                />
                                <div className="slider-range">
                                    <span>1</span>
                                    <span>Max: {analysis.maxQuestions}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="processing-step animate-fade-in text-center">
                            <div className="analysis-progress-container">
                                <div className="progress-stats">
                                    <span className="progress-phase">{analysisPhase}</span>
                                    <span className="progress-percentage">{analysisProgress}%</span>
                                </div>
                                <div className="progress-bar-wrapper">
                                    <div
                                        className="progress-bar-fill"
                                        style={{ width: `${analysisProgress}%` }}
                                    ></div>
                                </div>
                                <p className="analysis-subtext">Our AI is crafting {questionCount} high-quality questions based on your material...</p>
                            </div>
                        </div>
                    )}

                </div>

                <div className="pdf-modal-footer">
                    <button className="btn-ghost" onClick={handleClose} disabled={isProcessing}>
                        Cancel
                    </button>
                    {step === 1 && (
                        <button className="btn-primary" onClick={extractText} disabled={!file || isProcessing}>
                            Process PDF <ArrowRight size={18} />
                            <div className="btn-glow"></div>
                        </button>
                    )}
                    {step === 4 && (
                        <button className="btn-primary" onClick={handleGenerate} disabled={isProcessing}>
                            Generate {isFlashcards ? 'Flashcards' : 'Quiz'} <Sparkles size={18} />
                            <div className="btn-glow"></div>
                        </button>
                    )}
                </div>
            </div>
        </Modal>
    );
};

// Simple ArrowRight icon placeholder if not in lucide
const ArrowRight = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
);

export default PDFUploadModal;

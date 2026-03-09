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
    AlertCircle,
    Loader2,
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
    const { isPDFModalOpen, closePDFModal, openQuiz } = useUI();
    const { currentUser, userProfile } = useAuth();
    const fileInputRef = useRef(null);

    const [step, setStep] = useState(1); // 1: Select, 2: Extracting, 3: Analyzing, 4: Configure, 5: Generating
    const [file, setFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [analysis, setAnalysis] = useState(null);
    const [questionCount, setQuestionCount] = useState(5);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState(null);

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
            setError(err.message || "Failed to extract text from PDF.");
            setStep(1);
            setIsProcessing(false);
        }
    };

    const handleAnalyze = async (text) => {
        setStep(3);
        try {
            const result = await analyzeContent(text);
            setAnalysis(result);
            setQuestionCount(Math.min(5, result.maxQuestions));
            setStep(4);
        } catch (err) {
            setError(err.message);
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
            const questions = await generateGameContent("AI Quiz Generator", extractedText, { questionCount });

            // Save to Firestore
            const quizRef = await addDoc(collection(db, 'quizzes'), {
                userId: currentUser.uid,
                creatorName: userProfile?.displayName || currentUser.email.split('@')[0],
                creatorAvatar: userProfile?.photoURL || null,
                topic: analysis.topic,
                summary: analysis.summary,
                questions: questions,
                sourceMaterial: "Extracted from PDF: " + file.name,
                createdAt: serverTimestamp()
            });

            handleClose();

            // Open the Quiz Modal
            openQuiz({
                questions,
                title: analysis.topic,
                quizId: quizRef.id
            });
        } catch (err) {
            setError(err.message);
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
                    {step === 4 && <h2><Sliders size={24} className="icon-purple" /> configure Quiz</h2>}
                    {step === 5 && <h2><Sparkles size={24} className="icon-purple animate-spin-slow" /> Generating Questions</h2>}
                </div>

                <div className="pdf-modal-body">
                    {step === 1 && (
                        <div className="upload-step animate-fade-in">
                            <p className="step-desc">Upload your lecture notes, handouts, or text-based PDF. Our AI will scan the content to build your quiz.</p>

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
                            <div className="loading-visual">
                                <Loader2 size={48} className="animate-spin" />
                            </div>
                            <p>{step === 2 ? 'Extracting text from PDF...' : 'Analyzing content for quiz topics...'}</p>
                            <span className="sub-text">This usually takes a few seconds.</span>
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
                                    <label>Number of Questions</label>
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
                            <div className="loading-visual">
                                <Sparkles size={48} className="text-gradient-primary animate-pulse" />
                            </div>
                            <p>Crafting {questionCount} high-quality questions...</p>
                        </div>
                    )}

                    {error && (
                        <div className="error-toast animate-bounce-in">
                            <AlertCircle size={18} />
                            <span>{error}</span>
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
                            Generate Quiz <Sparkles size={18} />
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

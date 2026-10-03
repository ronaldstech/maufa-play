import React, { createContext, useContext, useState } from 'react';

const UIContext = createContext();

export function useUI() {
    return useContext(UIContext);
}

export function UIProvider({ children }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isSignupOpen, setIsSignupOpen] = useState(false);
    const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
    const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
    const [isPDFModalOpen, setIsPDFModalOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizData, setQuizData] = useState(null);
    const [isFlashcardModalOpen, setIsFlashcardModalOpen] = useState(false);
    const [flashcardData, setFlashcardData] = useState(null);
    const [isPuzzleModalOpen, setIsPuzzleModalOpen] = useState(false);
    const [puzzleData, setPuzzleData] = useState(null);
    const [isBossModalOpen, setIsBossModalOpen] = useState(false);
    const [bossData, setBossData] = useState(null);
    const [bossSessionId, setBossSessionId] = useState(0);
    const [isCompanionModalOpen, setIsCompanionModalOpen] = useState(false);
    const [companionSessionId, setCompanionSessionId] = useState(0);
    const [companionSeed, setCompanionSeed] = useState(null);
    const [isDebateModalOpen, setIsDebateModalOpen] = useState(false);
    const [debateData, setDebateData] = useState(null);
    const [debateSessionId, setDebateSessionId] = useState(0);
    const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
    const [scenarioData, setScenarioData] = useState(null);
    const [scenarioSessionId, setScenarioSessionId] = useState(0);
    const [selectedGameType, setSelectedGameType] = useState('AI Quiz Generator');
    const [alerts, setAlerts] = useState([]);

    const switchToSignup = () => {
        setIsLoginOpen(false);
        setIsSignupOpen(true);
    };

    const switchToLogin = () => {
        setIsSignupOpen(false);
        setIsLoginOpen(true);
    };

    const showAlert = (message, type = 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setAlerts(prev => [...prev, { id, message, type, duration }]);
    };

    const removeAlert = (id) => {
        setAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    const openLogin = () => {
        setIsLoginOpen(true);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closeLogin = () => setIsLoginOpen(false);

    const openSignup = () => {
        setIsSignupOpen(true);
        setIsLoginOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closeSignup = () => setIsSignupOpen(false);

    const openPasteModal = (gameType) => {
        if (gameType) setSelectedGameType(gameType);
        setIsPasteModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsQuizModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closePasteModal = () => setIsPasteModalOpen(false);

    const openCommunityModal = (gameType) => {
        if (gameType) setSelectedGameType(gameType);
        setIsCommunityModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closeCommunityModal = () => setIsCommunityModalOpen(false);

    const openPDFModal = (gameType) => {
        if (gameType) setSelectedGameType(gameType);
        setIsPDFModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsCommunityModalOpen(false);
        setIsQuizModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closePDFModal = () => setIsPDFModalOpen(false);

    const openQuiz = (data) => {
        setQuizData(data);
        setIsQuizModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closeQuiz = () => {
        setIsQuizModalOpen(false);
        setQuizData(null);
    };

    const openFlashcards = (data) => {
        setFlashcardData(data);
        setIsFlashcardModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
    };

    const closeFlashcards = () => {
        setIsFlashcardModalOpen(false);
        setFlashcardData(null);
    };

    const openPuzzle = (data) => {
        setPuzzleData(data);
        setIsPuzzleModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
        setIsFlashcardModalOpen(false);
    };

    const closePuzzle = () => {
        setIsPuzzleModalOpen(false);
        setPuzzleData(null);
    };

    const openBoss = (data) => {
        setBossData(data);
        setBossSessionId(prev => prev + 1);
        setIsBossModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsFlashcardModalOpen(false);
        setIsPuzzleModalOpen(false);
        setIsCommunityModalOpen(false);
        setIsPDFModalOpen(false);
    };

    const closeBoss = () => {
        setIsBossModalOpen(false);
        setBossData(null);
    };

    const openCompanion = (seed = null) => {
        setCompanionSeed(seed);
        setCompanionSessionId(prev => prev + 1);
        setIsCompanionModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsFlashcardModalOpen(false);
        setIsPuzzleModalOpen(false);
        setIsBossModalOpen(false);
        setIsCommunityModalOpen(false);
        setIsPDFModalOpen(false);
    };

    const closeCompanion = () => {
        setIsCompanionModalOpen(false);
        setCompanionSeed(null);
    };

    const openDebate = (data) => {
        setDebateData(data);
        setDebateSessionId(prev => prev + 1);
        setIsDebateModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsFlashcardModalOpen(false);
        setIsPuzzleModalOpen(false);
        setIsBossModalOpen(false);
        setIsCompanionModalOpen(false);
        setIsCommunityModalOpen(false);
        setIsPDFModalOpen(false);
    };

    const closeDebate = () => {
        setIsDebateModalOpen(false);
        setDebateData(null);
    };

    const openScenario = (data) => {
        setScenarioData(data);
        setScenarioSessionId(prev => prev + 1);
        setIsScenarioModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsFlashcardModalOpen(false);
        setIsPuzzleModalOpen(false);
        setIsBossModalOpen(false);
        setIsCompanionModalOpen(false);
        setIsDebateModalOpen(false);
        setIsCommunityModalOpen(false);
        setIsPDFModalOpen(false);
    };

    const closeScenario = () => {
        setIsScenarioModalOpen(false);
        setScenarioData(null);
    };

    const value = {
        isLoginOpen,
        isSignupOpen,
        isPasteModalOpen,
        isCommunityModalOpen,
        isPDFModalOpen,
        isQuizModalOpen,
        isFlashcardModalOpen,
        isPuzzleModalOpen,
        isBossModalOpen,
        quizData,
        flashcardData,
        puzzleData,
        bossData,
        bossSessionId,
        isCompanionModalOpen,
        companionSeed,
        companionSessionId,
        isDebateModalOpen,
        debateData,
        debateSessionId,
        isScenarioModalOpen,
        scenarioData,
        scenarioSessionId,
        selectedGameType,
        setSelectedGameType,
        openLogin,
        closeLogin,
        openSignup,
        closeSignup,
        openPasteModal,
        closePasteModal,
        openCommunityModal,
        closeCommunityModal,
        openPDFModal,
        closePDFModal,
        openQuiz,
        closeQuiz,
        openFlashcards,
        closeFlashcards,
        openPuzzle,
        closePuzzle,
        openBoss,
        closeBoss,
        openCompanion,
        closeCompanion,
        openDebate,
        closeDebate,
        openScenario,
        closeScenario,
        switchToSignup,
        switchToLogin,
        alerts,
        showAlert,
        removeAlert
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
}

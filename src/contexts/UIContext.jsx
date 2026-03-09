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
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizData, setQuizData] = useState(null);

    const openLogin = () => {
        setIsLoginOpen(true);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
    };

    const closeLogin = () => setIsLoginOpen(false);

    const openSignup = () => {
        setIsSignupOpen(true);
        setIsLoginOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
    };

    const closeSignup = () => setIsSignupOpen(false);

    const openPasteModal = () => {
        setIsPasteModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsQuizModalOpen(false);
    };

    const closePasteModal = () => setIsPasteModalOpen(false);

    const openCommunityModal = () => {
        setIsCommunityModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
        setIsQuizModalOpen(false);
    };

    const closeCommunityModal = () => setIsCommunityModalOpen(false);

    const openQuiz = (data) => {
        setQuizData(data);
        setIsQuizModalOpen(true);
        setIsLoginOpen(false);
        setIsSignupOpen(false);
        setIsPasteModalOpen(false);
    };

    const closeQuiz = () => {
        setIsQuizModalOpen(false);
        setQuizData(null);
    };

    const switchToSignup = () => {
        setIsLoginOpen(false);
        setIsSignupOpen(true);
    };

    const switchToLogin = () => {
        setIsSignupOpen(false);
        setIsLoginOpen(true);
    };

    const value = {
        isLoginOpen,
        isSignupOpen,
        isPasteModalOpen,
        isCommunityModalOpen,
        isQuizModalOpen,
        quizData,
        openLogin,
        closeLogin,
        openSignup,
        closeSignup,
        openPasteModal,
        closePasteModal,
        openCommunityModal,
        closeCommunityModal,
        openQuiz,
        closeQuiz,
        switchToSignup,
        switchToLogin
    };

    return (
        <UIContext.Provider value={value}>
            {children}
        </UIContext.Provider>
    );
}

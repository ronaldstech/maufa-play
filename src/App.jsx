import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import { SettingsProvider } from './contexts/SettingsProvider';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import AIGames from './pages/AIGames';
import GameSetup from './pages/GameSetup';
import QuizModalPlay from './pages/QuizPlay';
import FlashCardsPlay from './pages/FlashCardsPlay';
import PuzzlePlay from './pages/PuzzlePlay';
import BossBattlePlay from './pages/BossBattlePlay';
import StudyCompanion from './pages/StudyCompanion';
import DebatePlay from './pages/DebatePlay';
import ScenarioSimulatorPlay from './pages/ScenarioSimulatorPlay';
import QuizHistory from './pages/QuizHistory';
import NotesLab from './notes/NotesLab';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PasteNotesModal from './components/PasteNotesModal';
import Modal from './components/Modal';
import CommunityModal from './components/CommunityModal';
import PDFUploadModal from './components/PDFUploadModal';
import ToastContainer from './components/ToastContainer';
import AdminRouter from './admin/AdminRouter';

function AppContent() {
  const { isLoginOpen, closeLogin, isSignupOpen, closeSignup } = useUI();

  return (
    <div className="app-container">
      <ScrollToTop />
      <div className="bg-mesh"></div>

      <Routes>
        <Route path="/admin/*" element={<AdminRouter />} />
        <Route
          path="*"
          element={(
            <>
              <Navbar />

              <main className="main-content flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/games" element={<AIGames />} />
                  <Route path="/games/:id/setup" element={<GameSetup />} />
                  <Route path="/history" element={<QuizHistory />} />
                  <Route path="/notes" element={<NotesLab />} />
                </Routes>
              </main>

              <Footer />
            </>
          )}
        />
      </Routes>

      {/* Auth Modals */}
      <Modal isOpen={isLoginOpen} onClose={closeLogin} title="Sign In">
        <Login />
      </Modal>
      <Modal isOpen={isSignupOpen} onClose={closeSignup} title="Create Account">
        <Signup />
      </Modal>

      {/* Quiz Generation Modal */}
      <PasteNotesModal />

      <QuizModalPlay />
      <FlashCardsPlay />
      <PuzzlePlay />
      <BossBattlePlay />
      <StudyCompanion />
      <DebatePlay />
      <ScenarioSimulatorPlay />

      {/* Community Content Browser */}
      <CommunityModal />

      {/* PDF Upload Modal */}
      <PDFUploadModal />
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

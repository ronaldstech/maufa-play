import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider, useUI } from './contexts/UIContext';
import ScrollToTop from './components/ScrollToTop';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import AIGames from './pages/AIGames';
import GameSetup from './pages/GameSetup';
import QuizModalPlay from './pages/QuizPlay';
import QuizHistory from './pages/QuizHistory';
import Login from './pages/Login';
import Signup from './pages/Signup';
import PasteNotesModal from './components/PasteNotesModal';
import Modal from './components/Modal';
import CommunityModal from './components/CommunityModal';

function AppContent() {
  const { isLoginOpen, closeLogin, isSignupOpen, closeSignup } = useUI();

  return (
    <div className="app-container">
      <ScrollToTop />
      <div className="bg-mesh"></div>
      <Navbar />

      <main className="main-content flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<AIGames />} />
          <Route path="/games/:id/setup" element={<GameSetup />} />
          <Route path="/history" element={<QuizHistory />} />
        </Routes>
      </main>

      <Footer />

      {/* Auth Modals */}
      <Modal isOpen={isLoginOpen} onClose={closeLogin} title="Sign In">
        <Login />
      </Modal>
      <Modal isOpen={isSignupOpen} onClose={closeSignup} title="Create Account">
        <Signup />
      </Modal>

      {/* Quiz Generation Modal */}
      <PasteNotesModal />

      {/* Interactive Quiz Modal */}
      <QuizModalPlay />

      {/* Community Content Browser */}
      <CommunityModal />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </AuthProvider>
  );
}

export default App;

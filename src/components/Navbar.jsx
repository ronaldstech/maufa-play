import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useRef } from 'react';
import { Menu, X, User, Home, Zap, Gamepad2, History, Info, LogOut, ChevronDown, Settings } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userProfile, logout } = useAuth();
    const { openLogin, openSignup } = useUI();
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isProfileOpen]);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const isActive = (path) => {
        if (path === '/') return location.pathname === '/';
        if (path.startsWith('/#')) return location.pathname === '/' && location.hash === path.substring(1);
        return location.pathname.startsWith(path);
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/');
        } catch (error) {
            console.error('Failed to log out', error);
        }
    };

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled glass-panel' : ''}`}>
            <div className="container nav-container">
                <Link textDecoration="none" to="/" className="logo">
                    <img src="/logo.png" alt="MaufaLab Logo" className="logo-image" />
                    <span className="logo-text">Maufa<span className="font-light text-gradient-text">Play</span></span>
                </Link>

                <div className={`nav-links ${isMobileMenuOpen ? 'active' : ''}`}>
                    <Link to="/" className={`nav-link ${isActive('/') ? 'active-link' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
                        <Home size={18} /> <span>Home</span>
                    </Link>
                    <Link to="/games" className={`nav-link ${isActive('/games') ? 'active-link' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
                        <Gamepad2 size={18} /> <span>AI Games</span>
                    </Link>
                    {currentUser && (
                        <Link to="/history" className={`nav-link ${isActive('/history') ? 'active-link' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
                            <History size={18} /> <span>My History</span>
                        </Link>
                    )}

                    {currentUser ? (
                        <div className="nav-user-actions mobile-actions">
                            <div className="mobile-user-info">
                                <div className="user-profile">
                                    {userProfile?.photoURL ? (
                                        <img src={userProfile.photoURL} alt="Avatar" className="user-avatar" />
                                    ) : (
                                        <div className="user-avatar-placeholder">
                                            <User size={16} />
                                        </div>
                                    )}
                                    <span className="user-email">{userProfile?.displayName || currentUser.email.split('@')[0]}</span>
                                </div>
                            </div>
                            <div className="mobile-dropdown-links">
                                <Link to="/profile" className="mobile-dropdown-link" onClick={() => setIsMobileMenuOpen(false)}>
                                    <User size={16} /> Profile
                                </Link>
                                <button onClick={handleLogout} className="mobile-dropdown-link logout">
                                    <LogOut size={16} /> Logout
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mobile-actions">
                            <button className="btn-secondary" onClick={() => { openLogin(); setIsMobileMenuOpen(false); }}>Log In</button>
                            <button className="btn-primary" onClick={() => { openSignup(); setIsMobileMenuOpen(false); }}>Get Started</button>
                        </div>
                    )}
                </div>

                <div className="nav-actions">
                    {currentUser ? (
                        <div className="nav-user-actions desktop-actions" ref={dropdownRef}>
                            <div
                                className={`user-profile-trigger ${isProfileOpen ? 'active' : ''}`}
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                            >
                                {userProfile?.photoURL ? (
                                    <img src={userProfile.photoURL} alt="Avatar" className="user-avatar" />
                                ) : (
                                    <div className="user-avatar-placeholder">
                                        <User size={16} />
                                    </div>
                                )}
                                <span className="user-email">{userProfile?.displayName || currentUser.email.split('@')[0]}</span>
                                <ChevronDown size={14} className={`chevron-icon ${isProfileOpen ? 'rotate' : ''}`} />
                            </div>

                            {isProfileOpen && (
                                <div className="profile-dropdown glass-panel animate-scale-in">
                                    <Link to="/profile" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                                        <User size={16} />
                                        <span>View Profile</span>
                                    </Link>
                                    <Link to="/settings" className="dropdown-item" onClick={() => setIsProfileOpen(false)}>
                                        <Settings size={16} />
                                        <span>Settings</span>
                                    </Link>
                                    <div className="dropdown-divider"></div>
                                    <button onClick={handleLogout} className="dropdown-item logout-btn">
                                        <LogOut size={16} />
                                        <span>Sign Out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="desktop-actions">
                            <button className="btn-secondary" onClick={openLogin}>Log In</button>
                            <button className="btn-primary" onClick={openSignup}>
                                Get Started
                                <div className="btn-glow"></div>
                            </button>
                        </div>
                    )}
                </div>

                <button
                    className={`mobile-menu-btn ${isMobileMenuOpen ? 'open' : ''}`}
                    onClick={toggleMobileMenu}
                    aria-label="Toggle menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;

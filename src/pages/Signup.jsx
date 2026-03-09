import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Mail, Lock, Loader2, User } from 'lucide-react';
import './Auth.css';

const Signup = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signup, loginWithGoogle } = useAuth();
    const { closeSignup, switchToLogin, showAlert } = useUI();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        if (password !== passwordConfirm) {
            showAlert('Passwords do not match', 'error');
            return setError('Passwords do not match');
        }

        try {
            setError('');
            setLoading(true);
            await signup(email, password, name);
            showAlert('Account created successfully! Welcome to MaufaLab.', 'success');
            closeSignup();
        } catch (err) {
            setError('Failed to create an account: ' + err.message);
            showAlert('Failed to create account. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignUp() {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            showAlert('Successfully signed up with Google!', 'success');
            closeSignup();
        } catch (err) {
            setError('Failed to sign in with Google: ' + err.message);
            showAlert('Google sign-up failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-card-inner">
            <div className="auth-header">
                <h2>Create an Account</h2>
                <p>Join MaufaLab and unlock premium AI tools.</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label>Full Name</label>
                    <div className="input-wrapper">
                        <User className="input-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Email Address</label>
                    <div className="input-wrapper">
                        <Mail className="input-icon" size={20} />
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Password</label>
                    <div className="input-wrapper">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            placeholder="Create a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Confirm Password</label>
                    <div className="input-wrapper">
                        <Lock className="input-icon" size={20} />
                        <input
                            type="password"
                            placeholder="Confirm your password"
                            value={passwordConfirm}
                            onChange={(e) => setPasswordConfirm(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button disabled={loading} className="btn-primary auth-submit" type="submit">
                    {loading ? <Loader2 className="spinner" size={20} /> : 'Sign Up'}
                </button>
            </form>

            <div className="auth-divider">
                <span>or continue with</span>
            </div>

            <button
                disabled={loading}
                onClick={handleGoogleSignUp}
                className="btn-secondary google-btn"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" />
                Sign up with Google
            </button>

            <div className="auth-footer">
                Already have an account? <button onClick={switchToLogin} className="auth-link-btn">Sign In</button>
            </div>
        </div>
    );
};

export default Signup;

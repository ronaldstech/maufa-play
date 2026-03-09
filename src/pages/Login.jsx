import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Mail, Lock, Loader2 } from 'lucide-react';
import './Auth.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, loginWithGoogle } = useAuth();
    const { closeLogin, switchToSignup } = useUI();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();

        try {
            setError('');
            setLoading(true);
            await login(email, password);
            closeLogin();
        } catch (err) {
            setError('Failed to log in: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSignIn() {
        try {
            setError('');
            setLoading(true);
            await loginWithGoogle();
            closeLogin();
        } catch (err) {
            setError('Failed to sign in with Google: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-card-inner">
            <div className="auth-header">
                <h2>Welcome Back</h2>
                <p>Sign in to continue your academic journey.</p>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-form">
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
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>

                <button disabled={loading} className="btn-primary auth-submit" type="submit">
                    {loading ? <Loader2 className="spinner" size={20} /> : 'Sign In'}
                </button>
            </form>

            <div className="auth-divider">
                <span>or continue with</span>
            </div>

            <button
                disabled={loading}
                onClick={handleGoogleSignIn}
                className="btn-secondary google-btn"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" />
                Sign in with Google
            </button>

            <div className="auth-footer">
                Don't have an account? <button onClick={switchToSignup} className="auth-link-btn">Sign Up</button>
            </div>
        </div>
    );
};

export default Login;

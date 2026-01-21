import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE, BACKEND_URL } from '../config';

export default function Login() {
    const { login, connectionError } = useAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            if (data.success && data.data) {
                const userData = {
                    id: data.data.user?.id,
                    username: data.data.user?.username,
                    fullName: data.data.user?.fullName,
                    email: data.data.user?.email,
                    isDevSuperadmin: data.data.user?.isDevSuperadmin,
                    company: data.data.user?.company,
                };
                login(userData, data.data.token);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err) {
            if (err.name === 'TypeError') {
                setError(`Cannot connect to backend at ${BACKEND_URL}. Check if the server is running.`);
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="auth-title">🚗 Fleet Tracker</h1>
                <p className="auth-subtitle">Sign in to your account</p>

                {(error || connectionError) && (
                    <div className="message message-error">
                        {error || connectionError}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                        Default Admin Account
                    </p>
                    <p style={{ fontSize: '0.8rem' }}>
                        Username: <strong>admin</strong> | Password: <strong>admin123</strong>
                    </p>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Connecting to: <code>{BACKEND_URL}</code>
                    </p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        To change server, edit <code>.env</code> or set <code>VITE_BACKEND_URL</code> environment variable.
                    </p>
                </div>
            </div>
        </div>
    );
}

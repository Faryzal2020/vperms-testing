import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Vehicles from './pages/Vehicles';
import Devices from './pages/Devices';
import DeviceDetail from './pages/DeviceDetail';
import System from './pages/System';
import Roles from './pages/Roles';
import Users from './pages/Users';
import Companies from './pages/Companies';
import Owners from './pages/Owners';
import SimCards from './pages/SimCards';
import CanConfig from './pages/CanConfig';
import Layout from './components/Layout';
import { AuthContext } from './context/AuthContext';
import { API_BASE, BACKEND_URL } from './config';

function App() {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(null);

    useEffect(() => {
        if (token) {
            fetch(`${API_BASE}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
            })
                .then(res => {
                    if (!res.ok) throw new Error('Invalid token');
                    return res.json();
                })
                .then(data => {
                    if (data.success && data.data) {
                        const userData = data.data;
                        setUser({
                            id: userData.user?.id,
                            username: userData.user?.username,
                            fullName: userData.user?.fullName,
                            email: userData.user?.email,
                            isDevSuperadmin: userData.user?.isDevSuperadmin,
                            company: userData.user?.company,
                            roles: userData.roles || [],
                            permissions: userData.permissions || [],
                            type: userData.type,
                        });
                        setConnectionError(null);
                    } else {
                        localStorage.removeItem('token');
                        setToken(null);
                    }
                    setLoading(false);
                })
                .catch((err) => {
                    console.error('Auth check failed:', err);
                    if (err.message.includes('fetch') || err.message.includes('network')) {
                        setConnectionError(`Cannot connect to backend at ${BACKEND_URL}`);
                    }
                    localStorage.removeItem('token');
                    setToken(null);
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }
    }, [token]);

    const login = (userData, tokenValue) => {
        localStorage.setItem('token', tokenValue);
        setToken(tokenValue);
        setUser(userData);
        setConnectionError(null);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                    Connecting to {BACKEND_URL}...
                </p>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, token, login, logout, connectionError }}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                    <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
                        <Route index element={<Dashboard />} />
                        <Route path="vehicles" element={<Vehicles />} />
                        <Route path="devices" element={<Devices />} />
                        <Route path="devices/:id" element={<DeviceDetail />} />
                        <Route path="system" element={<System />} />
                        <Route path="roles" element={<Roles />} />
                        <Route path="users" element={<Users />} />
                        <Route path="companies" element={<Companies />} />
                        <Route path="owners" element={<Owners />} />
                        <Route path="simcards" element={<SimCards />} />
                        <Route path="can-configs" element={<CanConfig />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthContext.Provider>
    );
}

export default App;


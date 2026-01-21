import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { BACKEND_URL } from '../config';

export default function Dashboard() {
    const { user } = useAuth();
    const api = useApi();
    const [stats, setStats] = useState({ vehicles: 0, devices: 0, connected: 0, users: 0 });
    const [loading, setLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            const [vehiclesRes, devicesRes, statusRes] = await Promise.allSettled([
                api.get('/vehicles?limit=1'),
                api.get('/devices?limit=1'),
                api.get('/system/status'),
            ]);

            setStats({
                vehicles: vehiclesRes.status === 'fulfilled' ? vehiclesRes.value.pagination?.total || 0 : '?',
                devices: devicesRes.status === 'fulfilled' ? devicesRes.value.pagination?.total || 0 : '?',
                connected: statusRes.status === 'fulfilled' ? statusRes.value.data?.servers?.tcp?.connections || 0 : '?',
                users: statusRes.status === 'fulfilled' ? statusRes.value.data?.database?.users || 0 : '?',
            });

            if (statusRes.status === 'fulfilled') {
                setSystemStatus(statusRes.value.data);
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="page-subtitle">
                        Welcome back, {user?.fullName || user?.username}
                        {user?.isDevSuperadmin && <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>Dev Superadmin</span>}
                    </p>
                </div>
                <div>
                    <span className="badge badge-success">Connected to {BACKEND_URL}</span>
                </div>
            </div>

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <>
                    <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
                        <div className="stat-card">
                            <div className="stat-value">{stats.vehicles}</div>
                            <div className="stat-label">Vehicles</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.devices}</div>
                            <div className="stat-label">Devices</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value" style={{ color: stats.connected > 0 ? 'var(--success)' : 'inherit' }}>
                                {stats.connected}
                            </div>
                            <div className="stat-label">Connected Now</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{stats.users}</div>
                            <div className="stat-label">Users</div>
                        </div>
                    </div>

                    {systemStatus && (
                        <div className="grid grid-2">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">🖥️ Server Status</h3>
                                </div>
                                <div className="card-body">
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">TCP Server</span>
                                            <span className={`badge ${systemStatus.servers?.tcp?.running ? 'badge-success' : 'badge-danger'}`}>
                                                {systemStatus.servers?.tcp?.running ? 'Running' : 'Stopped'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">TCP Port</span>
                                            <span>{systemStatus.servers?.tcp?.port}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">API Server</span>
                                            <span className={`badge ${systemStatus.servers?.api?.running ? 'badge-success' : 'badge-danger'}`}>
                                                {systemStatus.servers?.api?.running ? 'Running' : 'Stopped'}
                                            </span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Uptime</span>
                                            <span>{formatUptime(systemStatus.uptime)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">📊 Queue & Memory</h3>
                                </div>
                                <div className="card-body">
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <span className="info-label">Queue Pending</span>
                                            <span>{systemStatus.queue?.telemetry?.pending || 0}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Events Pending</span>
                                            <span>{systemStatus.queue?.events?.pending || 0}</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Heap Used</span>
                                            <span>{systemStatus.memory?.heapUsedMB} MB</span>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-label">Background Jobs</span>
                                            <span className={`badge ${systemStatus.jobs?.running ? 'badge-success' : 'badge-warning'}`}>
                                                {systemStatus.jobs?.running ? 'Running' : 'Stopped'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title">👤 Your Account</h3>
                        </div>
                        <div className="card-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Username</span>
                                    <span>{user?.username}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Full Name</span>
                                    <span>{user?.fullName || '-'}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Email</span>
                                    <span>{user?.email}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Company</span>
                                    <span>{user?.company?.companyName || 'None'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

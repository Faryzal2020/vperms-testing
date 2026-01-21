import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { BACKEND_URL } from '../config';

export default function System() {
    const api = useApi();
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadSystemInfo();
    }, []);

    const loadSystemInfo = async () => {
        setLoading(true);
        try {
            const statusRes = await api.get('/system/status');
            if (statusRes.success) setStatus(statusRes.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatUptime = (seconds) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        let str = '';
        if (days > 0) str += `${days}d `;
        if (hours > 0 || days > 0) str += `${hours}h `;
        str += `${mins}m`;
        return str;
    };

    if (loading) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">System Status</h1>
                    <p className="page-subtitle">Backend: {BACKEND_URL}</p>
                </div>
                <button className="btn btn-primary" onClick={loadSystemInfo}>🔄 Refresh</button>
            </div>

            {error && <div className="message message-error">{error}</div>}

            {status && (
                <>
                    <div className="grid grid-2">
                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">🖥️ System Info</h3>
                            </div>
                            <div className="card-body">
                                <div className="info-list">
                                    <div className="info-row"><span>Environment</span><span className="badge">{status.environment}</span></div>
                                    <div className="info-row"><span>Uptime</span><span>{formatUptime(status.uptime)}</span></div>
                                    <div className="info-row"><span>TCP Port</span><span>{status.servers?.tcp?.port}</span></div>
                                    <div className="info-row"><span>API Port</span><span>{status.servers?.api?.port}</span></div>
                                    <div className="info-row"><span>Active Connections</span><span className="badge badge-success">{status.servers?.tcp?.connections}</span></div>
                                    <div className="info-row"><span>Total Packets</span><span>{status.servers?.tcp?.totalPackets?.toLocaleString()}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <h3 className="card-title">📊 Resources</h3>
                            </div>
                            <div className="card-body">
                                <div className="info-list">
                                    <div className="info-row"><span>Heap Used</span><span>{status.memory?.heapUsedMB} MB</span></div>
                                    <div className="info-row"><span>RSS Memory</span><span>{status.memory?.rssMB} MB</span></div>
                                    <div className="info-row"><span>Queue Pending</span><span>{status.queue?.telemetry?.pending}</span></div>
                                    <div className="info-row"><span>Events Pending</span><span>{status.queue?.events?.pending}</span></div>
                                    <div className="info-row"><span>Total Flushed</span><span>{status.queue?.worker?.flushed?.toLocaleString()}</span></div>
                                    <div className="info-row">
                                        <span>Background Jobs</span>
                                        <span className={`badge ${status.jobs?.running ? 'badge-success' : 'badge-warning'}`}>
                                            {status.jobs?.running ? 'Running' : 'Stopped'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title">🗄️ Database Counts</h3>
                        </div>
                        <div className="card-body">
                            <div className="grid grid-4">
                                <div className="stat-card">
                                    <div className="stat-value">{status.database?.devices}</div>
                                    <div className="stat-label">Devices</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{status.database?.vehicles}</div>
                                    <div className="stat-label">Vehicles</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{status.database?.users}</div>
                                    <div className="stat-label">Users</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">{status.database?.companies}</div>
                                    <div className="stat-label">Companies</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

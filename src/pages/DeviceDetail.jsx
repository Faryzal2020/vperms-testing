import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import DeviceHeader from '../components/devices/DeviceHeader';
import DeviceMap from '../components/devices/DeviceMap';
import TelemetryStats from '../components/devices/TelemetryStats';
import TelemetryHistory from '../components/devices/TelemetryHistory';

export default function DeviceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const api = useApi();

    // State
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Data States
    const [history, setHistory] = useState([]);
    const [track, setTrack] = useState([]);
    const [stats, setStats] = useState(null);

    // Filters
    const [timePreset, setTimePreset] = useState('today');
    const [pagination, setPagination] = useState({ page: 1, limit: 50, hasNext: false });

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // 1. Get Device Details (includes real-time status)
            const deviceData = await api.get(`/devices/${id}`);
            setDevice(deviceData.data);

            // 2. Get Telemetry Summary
            try {
                const summaryData = await api.get(`/telemetry/${id}/summary?start=${getTimeRange(timePreset).start.toISOString()}&end=${getTimeRange(timePreset).end.toISOString()}`);
                setStats(summaryData.data.statistics);
            } catch (e) {
                console.warn('Failed to load summary', e);
            }

            // 3. Get GPS Track
            try {
                const trackData = await api.get(`/telemetry/${id}/track?start=${getTimeRange(timePreset).start.toISOString()}&end=${getTimeRange(timePreset).end.toISOString()}&maxPoints=500`);
                setTrack(trackData.data.track || []);
            } catch (e) {
                console.warn('Failed to load track', e);
            }

            // 4. Get History Logs
            await loadHistory(1);

        } catch (err) {
            setError(err.message || 'Failed to load device data');
        } finally {
            setLoading(false);
        }
    }, [id, timePreset, api]);

    const loadHistory = async (page) => {
        try {
            const range = getTimeRange(timePreset);
            const historyData = await api.post(`/history/${id}`, {
                timePreset: 'custom',
                timeParams: {
                    startTime: range.start.toISOString(),
                    endTime: range.end.toISOString()
                },
                pagination: {
                    enabled: true,
                    page: page,
                    limit: 50
                }
            });

            setHistory(historyData.data || []);
            setPagination({
                page: page,
                limit: 50,
                hasNext: (historyData.meta?.returnedRecords || 0) === 50 // Simple check
            });
        } catch (e) {
            console.warn('Failed to load history', e);
        }
    };

    useEffect(() => {
        loadData();

        // Poll for real-time updates every 30s
        const interval = setInterval(() => {
            api.get(`/devices/${id}`).then(res => {
                if (res.data) setDevice(res.data);
            }).catch(e => console.error(e));
        }, 30000);

        return () => clearInterval(interval);
    }, [loadData, id]);

    // Helper for Time Ranges
    const getTimeRange = (preset) => {
        const now = new Date();
        const start = new Date();

        if (preset === 'today') {
            start.setHours(0, 0, 0, 0);
        } else if (preset === 'yesterday') {
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setHours(23, 59, 59, 999);
            return { start, end };
        } else if (preset === 'week') {
            start.setDate(start.getDate() - 7);
        }

        return { start, end: now };
    };

    if (loading && !device) {
        return <div className="loading"><div className="spinner"></div></div>;
    }

    if (error) {
        return (
            <div className="message message-error">
                {error} <br />
                <button className="btn btn-sm" onClick={() => navigate('/devices')}>Back to Devices</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            {device && <DeviceHeader device={device} telemetry={device.realTimeStatus} />}

            {/* Controls */}
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
                {['today', 'yesterday', 'week'].map(preset => (
                    <button
                        key={preset}
                        className={`btn ${timePreset === preset ? 'btn-primary' : ''}`}
                        onClick={() => setTimePreset(preset)}
                        style={{ textTransform: 'capitalize' }}
                    >
                        {preset}
                    </button>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Left Col: Map */}
                <DeviceMap
                    track={track}
                    currentPosition={device?.realTimeStatus}
                    height="450px"
                />

                {/* Right Col: Stats & Quick Info */}
                <div>
                    <h3 style={{ marginBottom: '1rem' }}>Summary</h3>
                    <TelemetryStats stats={stats} />
                </div>
            </div>

            {/* History Table */}
            <h3 style={{ marginBottom: '1rem' }}>Telemetry Log</h3>
            <TelemetryHistory
                data={history}
                pagination={pagination}
                onPageChange={(p) => loadHistory(p)}
            />
        </div>
    );
}

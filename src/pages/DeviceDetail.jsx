import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useSocket } from '../context/SocketContext';
import DeviceHeader from '../components/devices/DeviceHeader';
import DeviceMap from '../components/devices/DeviceMap';
import TelemetryStats from '../components/devices/TelemetryStats';
import TelemetryHistory from '../components/devices/TelemetryHistory';
import EventsTable from '../components/devices/EventsTable';
import TimelineView from '../components/devices/TimelineView';

export default function DeviceDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const api = useApi();
    const { subscribe, unsubscribe, lastMessageFor } = useSocket();

    // State
    const [device, setDevice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview');

    // Data States
    const [track, setTrack] = useState([]);
    const [stats, setStats] = useState(null);
    const [history, setHistory] = useState([]);
    const [events, setEvents] = useState([]);
    const [timeline, setTimeline] = useState([]);
    
    // Filters and Pagination
    const [timePreset, setTimePreset] = useState('today');
    const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 50, hasNext: false });
    const [eventsPagination, setEventsPagination] = useState({ page: 1, limit: 50, hasNext: false });
    const [timelinePagination, setTimelinePagination] = useState({ page: 1, limit: 50, hasNext: false });

    // Helper for Time Ranges
    const getTimeRange = useCallback((preset) => {
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
    }, []);

    const loadHistory = useCallback(async (page) => {
        try {
            const range = getTimeRange(timePreset);
            const res = await api.post(`/history/${id}`, {
                timePreset: 'custom',
                timeParams: { startTime: range.start.toISOString(), endTime: range.end.toISOString() },
                pagination: { enabled: true, page: page, limit: 50 }
            });
            setHistory(res.data || []);
            setHistoryPagination({ page, limit: 50, hasNext: (res.meta?.returnedRecords || 0) === 50 });
        } catch (e) {
            console.warn('Failed to load history', e);
        }
    }, [id, timePreset, api, getTimeRange]);

    const loadEvents = useCallback(async (page) => {
        try {
            const range = getTimeRange(timePreset);
            const res = await api.post(`/history/${id}/events`, {
                timePreset: 'custom',
                timeParams: { startTime: range.start.toISOString(), endTime: range.end.toISOString() },
                pagination: { enabled: true, page: page, limit: 50 }
            });
            setEvents(res.data?.events || []);
            setEventsPagination({ page, limit: 50, hasNext: (res.data?.meta?.returnedEvents || 0) === 50 });
        } catch (e) {
            console.warn('Failed to load events', e);
        }
    }, [id, timePreset, api, getTimeRange]);

    const loadTimeline = useCallback(async (vehicleId, page) => {
        if (!vehicleId) return;
        try {
            const range = getTimeRange(timePreset);
            const res = await api.get(`/vehicles/${vehicleId}/recent-activity?start=${range.start.toISOString()}&end=${range.end.toISOString()}&page=${page}&limit=50`);
            setTimeline(res.data?.activities || []);
            setTimelinePagination({ page, limit: 50, hasNext: ((res.data?.pagination?.total || 0) > page * 50) });
        } catch (e) {
            console.warn('Failed to load timeline', e);
        }
    }, [timePreset, api, getTimeRange]);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const deviceData = await api.get(`/devices/${id}`);
            setDevice(deviceData.data);
            
            // Subscribe to live updates via WebSocket
            if (deviceData.data?.imei) {
                subscribe(deviceData.data.imei);
            }

            const range = getTimeRange(timePreset);

            try {
                const summaryData = await api.get(`/telemetry/${id}/summary?start=${range.start.toISOString()}&end=${range.end.toISOString()}`);
                setStats(summaryData.data.statistics);
            } catch (e) { console.warn('Failed to load summary'); }

            try {
                const trackData = await api.get(`/telemetry/${id}/track?start=${range.start.toISOString()}&end=${range.end.toISOString()}&maxPoints=500`);
                setTrack(trackData.data.track || []);
            } catch (e) { console.warn('Failed to load track'); }

            await loadHistory(1);
            await loadEvents(1);
            if (deviceData.data.vehicle?.id) {
                await loadTimeline(deviceData.data.vehicle.id, 1);
            }

        } catch (err) {
            setError(err.message || 'Failed to load device data');
        } finally {
            setLoading(false);
        }
    }, [id, timePreset, api, getTimeRange, loadHistory, loadEvents, loadTimeline, subscribe]);

    useEffect(() => {
        loadData();
        return () => {
            if (device?.imei) unsubscribe(device.imei);
        };
    }, [id]); // Only reload on ID change

    // Listen for WebSocket updates
    useEffect(() => {
        if (!device?.imei) return;
        
        const update = lastMessageFor(device.imei);
        if (update && update.type === 'telemetry_update') {
            const tel = update.data;
            if (!tel) return;

            // Normalize WebSocket data to match API format for RealTimeStatus
            const newStatus = {
                latitude: tel.gps?.latitude || tel.latitude,
                longitude: tel.gps?.longitude || tel.longitude,
                speed: tel.gps?.speed || tel.speed,
                heading: tel.gps?.heading || tel.heading,
                satellites: tel.gps?.satellites || tel.satellites,
                ignition: tel.ignition,
                connection_status: 'online',
                last_update: update.timestamp || new Date().toISOString(),
                can_details: tel.can_details
            };

            setDevice(prev => ({
                ...prev,
                realTimeStatus: newStatus
            }));

            // Optional: Update track with new point
            if (newStatus.latitude && newStatus.longitude) {
                setTrack(prev => {
                    const lastPoint = prev[prev.length - 1];
                    // Avoid duplicate points
                    if (lastPoint && lastPoint.coordinates[0] === newStatus.longitude && lastPoint.coordinates[1] === newStatus.latitude) {
                        return prev;
                    }
                    return [...prev, {
                        coordinates: [newStatus.longitude, newStatus.latitude],
                        timestamp: newStatus.last_update
                    }];
                });
            }
        }
    }, [lastMessageFor, device?.imei]);

    // Polling as fallback (less frequent)
    useEffect(() => {
        const interval = setInterval(() => {
            api.get(`/devices/${id}`).then(res => {
                if (res.data) {
                    setDevice(prev => ({
                        ...res.data,
                        // Preserve newer WS status if available
                        realTimeStatus: (prev && new Date(prev.realTimeStatus?.last_update) > new Date(res.data.realTimeStatus?.last_update))
                            ? prev.realTimeStatus
                            : res.data.realTimeStatus
                    }));
                }
            }).catch(e => console.error(e));
        }, 60000); // 1 minute polling fallback

        return () => clearInterval(interval);
    }, [id, api]);

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
            {device && <DeviceHeader device={device} telemetry={device.realTimeStatus} />}

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['overview', 'data', 'events', 'timeline'].map(tab => (
                        <button
                            key={tab}
                            className={`btn ${activeTab === tab ? 'btn-primary' : ''}`}
                            onClick={() => setActiveTab(tab)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {['today', 'yesterday', 'week'].map(preset => (
                        <button
                            key={preset}
                            className={`btn btn-sm ${timePreset === preset ? 'btn-primary' : ''}`}
                            onClick={() => setTimePreset(preset)}
                            style={{ textTransform: 'capitalize' }}
                        >
                            {preset}
                        </button>
                    ))}
                </div>
            </div>

            <div className="tab-content" style={{ marginTop: '1rem' }}>
                {activeTab === 'overview' && (
                    <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        <DeviceMap track={track} currentPosition={device?.realTimeStatus} height="450px" />
                        <div>
                            <h3 style={{ marginBottom: '1rem' }}>Summary</h3>
                            <TelemetryStats stats={stats} />
                        </div>
                    </div>
                )}

                {activeTab === 'data' && (
                    <div>
                        <h3 style={{ marginBottom: '1rem' }}>Raw Telemetry Log</h3>
                        <TelemetryHistory data={history} pagination={historyPagination} onPageChange={(p) => loadHistory(p)} />
                    </div>
                )}

                {activeTab === 'events' && (
                    <div>
                        <h3 style={{ marginBottom: '1rem' }}>Hardware Events & Alerts</h3>
                        <EventsTable data={events} pagination={eventsPagination} onPageChange={(p) => loadEvents(p)} />
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div>
                        <h3 style={{ marginBottom: '1rem' }}>Recent Operations Activity</h3>
                        <TimelineView 
                            loading={loading} 
                            data={timeline} 
                            error={null} 
                            pagination={timelinePagination} 
                            onPageChange={(p) => loadTimeline(device.vehicle?.id, p)} 
                            vehicleContext={device.vehicle?.plateNumber} 
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

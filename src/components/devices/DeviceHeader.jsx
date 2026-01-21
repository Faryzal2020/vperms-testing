import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DeviceHeader({ device, telemetry }) {
    const navigate = useNavigate();

    // Status Logic
    const isOnline = telemetry?.realTimeStatus?.connection_status === 'online';
    const lastSeen = telemetry?.last_seen
        ? new Date(telemetry.last_seen).toLocaleString()
        : (device?.lastSeen
            ? new Date(device.lastSeen).toLocaleString()
            : 'Never');

    // Hardware Status
    const ignition = telemetry?.ignition ? 'ON' : 'OFF';
    const ignitionColor = telemetry?.ignition ? '#22c55e' : '#64748b';

    // Battery or Power logic (if available in io_elements)
    const powerVoltage = telemetry?.io_elements?.['67']
        ? `${(telemetry.io_elements['67'] / 1000).toFixed(1)}V`
        : null;

    return (
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <button
                            className="btn btn-sm"
                            onClick={() => navigate('/devices')}
                            style={{ padding: '0.25rem 0.5rem', marginRight: '0.5rem' }}
                        >
                            ← Back
                        </button>
                        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
                            {device.vehicle?.plateNumber || 'Unassigned Vehicle'}
                        </h1>
                        <span className={`badge ${isOnline ? 'badge-success' : 'badge-warning'}`}>
                            {isOnline ? '🟢 Online' : '🟡 Offline'}
                        </span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
                        <span>
                            <strong>IMEI:</strong> <span style={{ fontFamily: 'monospace' }}>{device.imei}</span>
                        </span>
                        <span>
                            <strong>Model:</strong> {device.deviceModel}
                        </span>
                        <span>
                            <strong>SIM:</strong> {device.simCard?.simNumber || 'N/A'}
                        </span>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Last Seen: <strong>{lastSeen}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <div className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ignitionColor }}></span>
                            Ignition: {ignition}
                        </div>
                        {powerVoltage && (
                            <div className="badge badge-secondary">
                                🔋 {powerVoltage}
                            </div>
                        )}
                        <div className="badge badge-secondary">
                            📡 {telemetry?.satellites || 0} Sats
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';

export default function TelemetryHistory({ data, pagination, onPageChange }) {
    const [expandedRow, setExpandedRow] = useState(null);

    const toggleRow = (index) => {
        setExpandedRow(expandedRow === index ? null : index);
    };

    if (!data || data.length === 0) {
        return <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No telemetry data found for this period.</div>;
    }

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-container">
                <table className="table" style={{ margin: 0 }}>
                    <thead>
                        <tr>
                            <th style={{ width: '50px' }}></th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Speed</th>
                            <th>Fuel</th>
                            <th>Location</th>
                            <th>Attributes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, index) => {
                            const isExpanded = expandedRow === index;

                            // Extract data from the actual API structure
                            const speed = row.telemetry?.speed || 0;
                            const latitude = row.gps?.latitude || 0;
                            const longitude = row.gps?.longitude || 0;

                            // Ignition is in elements with ID 239 or as a named key
                            const ignition = row.elements?.ignition?.value === 1 ||
                                row.elements?.['239']?.value === 1 ||
                                false;

                            // Fuel level is element ID 84
                            const fuelLevel = row.elements?.fuel_level?.value ||
                                row.elements?.['84']?.value ||
                                null;

                            // Odometer is element ID 16
                            const odometer = row.elements?.odometer?.value ||
                                row.elements?.['16']?.value ||
                                null;

                            // Status Logic
                            let status = 'Stopped';
                            let statusColor = '#ef4444'; // red
                            if (speed > 0) {
                                status = 'Moving';
                                statusColor = '#22c55e'; // green
                            } else if (ignition) {
                                status = 'Idle';
                                statusColor = '#eab308'; // yellow
                            }

                            return (
                                <React.Fragment key={index}>
                                    <tr
                                        onClick={() => toggleRow(index)}
                                        style={{ cursor: 'pointer', backgroundColor: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                                    >
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {isExpanded ? '▼' : '▶'}
                                        </td>
                                        <td style={{ fontFamily: 'monospace' }}>
                                            {new Date(row.time).toLocaleTimeString()}
                                        </td>
                                        <td>
                                            <span className="badge" style={{
                                                backgroundColor: `${statusColor}20`,
                                                color: statusColor,
                                                border: `1px solid ${statusColor}40`
                                            }}>
                                                {status}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: speed > 100 ? 'bold' : 'normal', color: speed > 100 ? '#ef4444' : 'inherit' }}>
                                                {speed} km/h
                                            </span>
                                        </td>
                                        <td>
                                            {fuelLevel !== null ? `${fuelLevel}%` : '-'}
                                        </td>
                                        <td>
                                            {latitude !== 0 && longitude !== 0 ? (
                                                <a
                                                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ color: 'var(--primary-color)', fontSize: '0.9rem' }}
                                                >
                                                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                                                </a>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>No GPS</span>
                                            )}
                                        </td>
                                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {odometer && `ODO: ${odometer} km`}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <td colSpan="7" style={{ padding: '0 1.5rem 1.5rem 1.5rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', fontSize: '0.9rem' }}>
                                                    <div>
                                                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>GPS Data</h4>
                                                        <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
                                                            {JSON.stringify(row.gps, null, 2)}
                                                        </pre>
                                                        <h4 style={{ marginBottom: '0.5rem', marginTop: '1rem', color: 'var(--text-muted)' }}>Telemetry</h4>
                                                        <pre style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', overflow: 'auto' }}>
                                                            {JSON.stringify(row.telemetry, null, 2)}
                                                        </pre>
                                                    </div>
                                                    <div>
                                                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--text-muted)' }}>IO Elements</h4>
                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem' }}>
                                                            {Object.entries(row.elements || {}).map(([key, data]) => (
                                                                <div key={key} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '4px' }}>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{key}</div>
                                                                    <div style={{ fontWeight: 'bold' }}>{data.value} {data.unit || ''}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Simple footer if pagination needed */}
            {pagination && (
                <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                    <button
                        className="btn btn-sm"
                        disabled={pagination.page <= 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        Previous
                    </button>
                    <span>Page {pagination.page}</span>
                    <button
                        className="btn btn-sm"
                        disabled={!pagination.hasNext}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}

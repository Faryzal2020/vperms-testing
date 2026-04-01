import React from 'react';

export default function EventsTable({ data, pagination, onPageChange }) {
    if (!data || data.length === 0) {
        return <div className="empty-state" style={{ padding: '2rem' }}>No events found for this period</div>;
    }

    const severityColors = {
        info: 'badge-secondary',
        warning: 'badge-warning',
        critical: 'badge-danger',
        fatal: 'badge-danger'
    };

    const formatEventType = (type) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div>
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Event</th>
                            <th>Severity</th>
                            <th>Value</th>
                            <th>Location</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((event, idx) => (
                            <tr key={idx}>
                                <td>{new Date(event.time).toLocaleString()}</td>
                                <td><strong>{formatEventType(event.eventType)}</strong></td>
                                <td>
                                    <span className={`badge ${severityColors[event.severity] || 'badge-secondary'}`}>
                                        {event.severity || 'info'}
                                    </span>
                                </td>
                                <td>
                                    {event.value !== null && event.value !== undefined ? (
                                        <span style={{ fontFamily: 'monospace' }}>{event.value}</span>
                                    ) : (
                                        <span className="text-muted">-</span>
                                    )}
                                </td>
                                <td>
                                    {event.location ? (
                                        <a 
                                            href={`https://maps.google.com/?q=${event.location.latitude},${event.location.longitude}`}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            {event.location.latitude.toFixed(5)}, {event.location.longitude.toFixed(5)}
                                        </a>
                                    ) : (
                                        <span className="text-muted">Unknown</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pagination && pagination.hasNext && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button className="btn btn-sm" onClick={() => onPageChange(pagination.page + 1)}>
                        Load More Events (Page {pagination.page + 1})
                    </button>
                </div>
            )}
        </div>
    );
}

import React from 'react';

export default function TimelineView({ loading, data, error, pagination, onPageChange, vehicleContext }) {
    if (loading && data.length === 0) {
        return <div className="loading" style={{ margin: '2rem' }}><div className="spinner"></div></div>;
    }

    if (error) {
        return <div className="message message-error" style={{ margin: '1rem' }}>{error}</div>;
    }

    if (!vehicleContext) {
        return (
            <div className="empty-state" style={{ padding: '2rem' }}>
                <p><strong>Timeline unavailable.</strong></p>
                <p>This device is currently unassigned. The Recent Activity timeline displays historical business events (e.g., trips, geofence alerts) strictly when the device operates inside a vehicle.</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return <div className="empty-state" style={{ padding: '2rem' }}>No recent activity found for vehicle: {vehicleContext}</div>;
    }

    // A simple vertical timeline
    return (
        <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-light)' }}>
            <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Activity exactly as logged under {vehicleContext}</h4>
            
            <div className="timeline-container" style={{ position: 'relative', paddingLeft: '20px' }}>
                <div style={{
                    position: 'absolute',
                    left: '5px',
                    top: '0',
                    bottom: '0',
                    width: '2px',
                    background: 'var(--border)'
                }} />

                {data.map((item, idx) => (
                    <div key={idx} style={{ position: 'relative', marginBottom: '1.5rem' }}>
                        <div style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '4px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: item.type === 'TRIP' ? 'var(--primary)' : 
                                        item.type === 'GEOFENCE_ALERT' ? 'var(--warning)' : 
                                        item.type === 'COMMAND' ? 'var(--info)' : 'var(--text-muted)',
                            border: '2px solid white',
                            boxShadow: '0 0 0 1px var(--border)'
                        }} />
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {new Date(item.timestamp || item.time).toLocaleString()}
                            </span>
                            <div style={{ background: 'var(--bg-light, rgba(255, 255, 255, 0.05))', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', marginTop: '0.25rem', color: 'var(--text, inherit)' }}>
                                <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                    {item.type} {item.subtype ? `- ${item.subtype}` : ''}
                                </strong>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #a0aec0)' }}>
                                    {item.description || item.message || JSON.stringify(item.details || {})}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pagination && pagination.hasNext && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                    <button className="btn btn-sm" onClick={() => onPageChange(pagination.page + 1)}>
                        Load Older (Page {pagination.page + 1})
                    </button>
                </div>
            )}
        </div>
    );
}

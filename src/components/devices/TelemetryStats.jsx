import React from 'react';

export default function TelemetryStats({ stats }) {
    if (!stats) return null;

    const cards = [
        {
            label: 'Distance Traveled',
            value: `${(stats.distanceTraveled / 1000).toFixed(2)} km`,
            icon: '🛣️',
            color: 'var(--primary-color)'
        },
        {
            label: 'Max Speed',
            value: `${stats.maxSpeed} km/h`,
            icon: '🚀',
            color: '#ef4444' // red
        },
        {
            label: 'Avg Speed',
            value: `${stats.avgSpeed} km/h`,
            icon: '⚡',
            color: '#3b82f6' // blue
        },
        {
            label: 'Engine On Time',
            value: formatDuration(stats.ignitionOnTime), // Assuming seconds or count? 
            // Wait, backend returns count of points. 
            // If points are 10s apart, then count * 10 / 3600 hours roughly. 
            // Let's assume stats.ignitionOnTime is a count for now, need to clarify unit.
            // Backend sql: SUM(CASE WHEN ignition = true THEN 1 ELSE 0 END)
            // It's a count of records. Estimating duration depends on frequency.
            // let's just show count for now or "Active Points"
            subLabel: 'Active Points',
            icon: '⏱️',
            color: '#22c55e' // green
        }
    ];

    function formatDuration(count) {
        if (!count) return '0';
        return count.toLocaleString();
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {cards.map((card, index) => (
                <div key={index} className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                        fontSize: '2rem',
                        background: `${card.color}20`,
                        padding: '0.75rem',
                        borderRadius: '12px',
                        lineHeight: 1
                    }}>
                        {card.icon}
                    </div>
                    <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                            {card.label}
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                            {card.value}
                        </div>
                        {card.subLabel && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {card.subLabel}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

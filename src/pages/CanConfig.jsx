import { useState, useEffect } from 'react';
import { API_BASE } from '../config';
import { useAuth } from '../context/AuthContext';

export default function CanConfig() {
    const { token } = useAuth();
    const [configs, setConfigs] = useState([]);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [jsonContent, setJsonContent] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [saveMessage, setSaveMessage] = useState(null);
    const [expandedIds, setExpandedIds] = useState(new Set());

    useEffect(() => {
        fetchConfigs();
    }, [token]);

    useEffect(() => {
        if (selectedConfig) {
            // When selection changes, update the JSON editor content
            // We use the 'config' property of the selected item
            setJsonContent(JSON.stringify(selectedConfig.config, null, 4));
            setSaveMessage(null);
            setError(null);
        } else {
            setJsonContent('');
        }
    }, [selectedConfig]);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/can-configs?limit=100`, { // Fetching all for now
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setConfigs(data.data);
            } else {
                setError(data.message || 'Failed to load configurations');
            }
        } catch (err) {
            setError('Network error loading configurations');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedConfig) return;

        try {
            setSaving(true);
            setSaveMessage(null);
            setError(null);

            // Parse JSON to ensure validity
            let parsedConfig;
            try {
                parsedConfig = JSON.parse(jsonContent);
                // eslint-disable-next-line no-unused-vars
            } catch (e) {
                setError('Invalid JSON format');
                setSaving(false);
                return;
            }

            const res = await fetch(`${API_BASE}/can-configs/${selectedConfig.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: selectedConfig.name,
                    description: selectedConfig.description,
                    config: parsedConfig
                })
            });

            const data = await res.json();
            if (data.success) {
                setSaveMessage('Configuration saved successfully');
                // Update local state
                setConfigs(prev => prev.map(c =>
                    c.id === selectedConfig.id ? { ...c, config: parsedConfig } : c
                ));
                setSelectedConfig(prev => ({ ...prev, config: parsedConfig }));
            } else {
                setError(data.message || 'Failed to save configuration');
            }
        } catch (err) {
            setError('Network error saving configuration');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (id, e) => {
        e.stopPropagation();
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="can-config-page" style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            {/* Inner Sidebar for List */}
            <div className="config-sidebar" style={{
                width: '350px',
                borderRight: '1px solid #ddd',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f8f9fa'
            }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid #ddd', fontWeight: 'bold' }}>
                    CAN Configurations
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '1rem' }}>Loading...</div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {configs.map(config => (
                                <li key={config.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <div
                                        onClick={() => setSelectedConfig(config)}
                                        style={{
                                            padding: '10px 15px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedConfig?.id === config.id ? '#e9ecef' : 'transparent',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ fontWeight: 500 }}>{config.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                                {config.devices?.length || 0} devices
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => toggleExpand(config.id, e)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: '1.2rem',
                                                padding: '0 5px'
                                            }}
                                        >
                                            {expandedIds.has(config.id) ? '−' : '+'}
                                        </button>
                                    </div>

                                    {/* Nested Device List */}
                                    {expandedIds.has(config.id) && (
                                        <ul style={{
                                            listStyle: 'none',
                                            padding: '0',
                                            margin: '0',
                                            backgroundColor: '#f1f3f5',
                                            borderTop: '1px solid #eee'
                                        }}>
                                            {config.devices && config.devices.length > 0 ? (
                                                config.devices.map(device => (
                                                    <li key={device.id} style={{
                                                        padding: '8px 15px 8px 30px',
                                                        borderBottom: '1px solid #e9ecef',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        <div style={{ fontWeight: 500 }}>{device.vehicle?.plateNumber || 'No Plate'}</div>
                                                        <div style={{ color: '#666', fontSize: '0.75rem' }}>{device.imei}</div>
                                                    </li>
                                                ))
                                            ) : (
                                                <li style={{ padding: '8px 15px 8px 30px', color: '#999', fontSize: '0.85rem' }}>
                                                    No devices assigned
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Main Content for Editor */}
            <div className="config-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0' }}>
                {selectedConfig ? (
                    <>
                        <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid #ddd',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#fff'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedConfig.name}</h2>
                                <p style={{ margin: '5px 0 0', color: '#666', fontSize: '0.9rem' }}>
                                    {selectedConfig.description || 'No description'}
                                </p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#0d6efd',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: saving ? 'wait' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        {/* Messages */}
                        {error && (
                            <div style={{ padding: '10px 15px', backgroundColor: '#f8d7da', color: '#721c24', margin: '10px' }}>
                                {error}
                            </div>
                        )}
                        {saveMessage && (
                            <div style={{ padding: '10px 15px', backgroundColor: '#d1e7dd', color: '#0f5132', margin: '10px' }}>
                                {saveMessage}
                            </div>
                        )}

                        {/* Editor Area */}
                        <div style={{ flex: 1, padding: '1rem', display: 'flex', flexDirection: 'column' }}>
                            <textarea
                                value={jsonContent}
                                onChange={(e) => setJsonContent(e.target.value)}
                                style={{
                                    flex: 1,
                                    width: '100%',
                                    fontFamily: 'monospace',
                                    fontSize: '14px',
                                    padding: '1rem',
                                    border: '1px solid #ced4da',
                                    borderRadius: '4px',
                                    resize: 'none',
                                    backgroundColor: '#fafafa'
                                }}
                                spellCheck="false"
                            />
                        </div>
                    </>
                ) : (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        color: '#6c757d',
                        flexDirection: 'column'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                        <h3>Select a Configuration</h3>
                        <p>Choose a CAN configuration from the list to edit</p>
                    </div>
                )}
            </div>
        </div>
    );
}

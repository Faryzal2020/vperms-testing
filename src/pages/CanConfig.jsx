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

    // Modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [devices, setDevices] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());
    const [configToAssign, setConfigToAssign] = useState(null);
    const [assigning, setAssigning] = useState(false);
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        fetchConfigs();
    }, [token]);

    useEffect(() => {
        if (selectedConfig) {
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
            const res = await fetch(`${API_BASE}/can-configs?limit=100`, {
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

    const fetchDevices = async () => {
        try {
            setLoadingDevices(true);
            // Fetch all devices to show in the list
            // We might want to filter, but for now we fetch all
            const res = await fetch(`${API_BASE}/devices?limit=1000`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.success) {
                setDevices(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch devices:', err);
        } finally {
            setLoadingDevices(false);
        }
    };

    const handleSave = async () => {
        if (!selectedConfig) return;

        try {
            setSaving(true);
            setSaveMessage(null);
            setError(null);

            let parsedConfig;
            try {
                parsedConfig = JSON.parse(jsonContent);
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

    const openAssignModal = async (config, e) => {
        e.stopPropagation();
        setConfigToAssign(config);
        setShowAssignModal(true);
        // Pre-select devices already assigned to this config
        const currentIds = new Set(config.devices ? config.devices.map(d => d.id) : []);
        setSelectedDeviceIds(currentIds);

        if (devices.length === 0) {
            await fetchDevices();
        }
    };

    const handleAssign = async () => {
        try {
            setAssigning(true);
            const res = await fetch(`${API_BASE}/can-configs/${configToAssign.id}/devices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    deviceIds: Array.from(selectedDeviceIds)
                })
            });

            const data = await res.json();
            if (data.success) {
                // Refresh configs to show new assignments
                await fetchConfigs();
                setShowAssignModal(false);
            } else {
                alert('Failed to assign devices: ' + data.message);
            }
        } catch (error) {
            console.error('Assign error:', error);
            alert('Failed to assign devices');
        } finally {
            setAssigning(false);
        }
    };

    // Filter devices for modal
    const filteredDevices = devices.filter(d =>
        (d.imei && d.imei.includes(filterText)) ||
        (d.vehicle?.plateNumber && d.vehicle.plateNumber.toLowerCase().includes(filterText.toLowerCase()))
    );

    return (
        <div className="can-config-page" style={{ display: 'flex', height: '100%', overflow: 'hidden', color: 'var(--text-primary)' }}>
            {/* Inner Sidebar for List */}
            <div className="config-sidebar" style={{
                width: '350px',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--bg-secondary)'
            }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 'bold' }}>
                    CAN Configurations
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '1rem' }}>Loading...</div>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {configs.map(config => (
                                <li key={config.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div
                                        onClick={() => setSelectedConfig(config)}
                                        style={{
                                            padding: '10px 15px',
                                            cursor: 'pointer',
                                            backgroundColor: selectedConfig?.id === config.id ? 'var(--bg-card)' : 'transparent',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                            <div style={{ fontWeight: 500 }}>{config.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                {config.devices?.length || 0} devices
                                            </div>
                                        </div>

                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={(e) => openAssignModal(config, e)}
                                            style={{ marginRight: '10px', fontSize: '0.7rem', padding: '2px 8px' }}
                                        >
                                            Assign
                                        </button>
                                    </div>

                                    {/* Expand Button Strip */}
                                    <div
                                        onClick={(e) => toggleExpand(config.id, e)}
                                        style={{
                                            textAlign: 'center',
                                            fontSize: '0.8rem',
                                            padding: '2px 0',
                                            cursor: 'pointer',
                                            color: 'var(--text-muted)',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderTop: '1px solid rgba(255,255,255,0.05)'
                                        }}
                                    >
                                        {expandedIds.has(config.id) ? '▲' : '▼'}
                                    </div>

                                    {/* Nested Device List */}
                                    {expandedIds.has(config.id) && (
                                        <ul style={{
                                            listStyle: 'none',
                                            padding: '0',
                                            margin: '0',
                                            backgroundColor: 'rgba(0,0,0,0.2)',
                                            borderTop: '1px solid var(--border)'
                                        }}>
                                            {config.devices && config.devices.length > 0 ? (
                                                config.devices.map(device => (
                                                    <li key={device.id} style={{
                                                        padding: '8px 15px 8px 30px',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        <div style={{ fontWeight: 500 }}>{device.vehicle?.plateNumber || 'No Plate'}</div>
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{device.imei}</div>
                                                    </li>
                                                ))
                                            ) : (
                                                <li style={{ padding: '8px 15px 8px 30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
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
            <div className="config-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', backgroundColor: 'var(--bg-primary)' }}>
                {selectedConfig ? (
                    <>
                        <div style={{
                            padding: '1rem',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: 'var(--bg-secondary)'
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{selectedConfig.name}</h2>
                                <p style={{ margin: '5px 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    {selectedConfig.description || 'No description'}
                                </p>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="btn btn-primary"
                                style={{
                                    cursor: saving ? 'wait' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>

                        {/* Messages */}
                        {error && (
                            <div className="message message-error" style={{ margin: '10px' }}>
                                {error}
                            </div>
                        )}
                        {saveMessage && (
                            <div className="message message-success" style={{ margin: '10px' }}>
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
                                    border: '1px solid var(--border)',
                                    borderRadius: '4px',
                                    resize: 'none',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: 'var(--text-primary)'
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
                        color: 'var(--text-secondary)',
                        flexDirection: 'column'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚙️</div>
                        <h3>Select a Configuration</h3>
                        <p>Choose a CAN configuration from the list to edit</p>
                    </div>
                )}
            </div>

            {/* Assignment Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Assign Devices to {configToAssign?.name}</h2>
                            <button className="modal-close" onClick={() => setShowAssignModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <input
                                type="text"
                                placeholder="Filter devices..."
                                className="form-input"
                                value={filterText}
                                onChange={e => setFilterText(e.target.value)}
                                style={{ marginBottom: '1rem' }}
                            />

                            <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                {loadingDevices ? (
                                    <div style={{ padding: '1rem' }}>Loading devices...</div>
                                ) : (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {filteredDevices.map(device => {
                                            const isSelected = selectedDeviceIds.has(device.id);
                                            return (
                                                <li
                                                    key={device.id}
                                                    onClick={() => {
                                                        const next = new Set(selectedDeviceIds);
                                                        if (next.has(device.id)) next.delete(device.id);
                                                        else next.add(device.id);
                                                        setSelectedDeviceIds(next);
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        borderBottom: '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px'
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        readOnly
                                                        style={{ pointerEvents: 'none' }}
                                                    />
                                                    <div>
                                                        <div style={{ fontWeight: 500 }}>
                                                            {device.vehicle?.plateNumber || 'No Plate'}
                                                        </div>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                            {device.imei}
                                                            {device.canConfigId && device.canConfigId !== configToAssign?.id && (
                                                                <span style={{ marginLeft: '5px', color: 'var(--warning)' }}>
                                                                    (Assigned to other)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {selectedDeviceIds.size} devices selected
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)}>Cancel</button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAssign}
                                disabled={assigning}
                            >
                                {assigning ? 'Saving...' : 'Save Assignments'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

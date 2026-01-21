import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { usePermissions } from '../hooks/usePermissions';

export default function Devices() {
    const api = useApi();
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();
    const [devices, setDevices] = useState([]);
    const [simCards, setSimCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState(null);
    const [formData, setFormData] = useState({
        imei: '',
        deviceModel: 'FMC130',
        firmwareVersion: '',
        simCardId: '',
        status: 'active',
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => {
        loadDevices();

        // Only load SIM cards if user has permission
        if (hasPermission('sim_cards:read') || hasPermission('sim_cards:list')) {
            loadSimCards();
        }
    }, [pagination.page]); // Removed hasPermission to prevent infinite loop

    const loadDevices = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/devices?page=${pagination.page}&limit=${pagination.limit}`);
            setDevices(data.data || []);
            setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadSimCards = async () => {
        try {
            const data = await api.get('/simcards?limit=1000'); // Note: endpoint is /simcards not /sim-cards
            setSimCards(data.data || []);
        } catch (err) {
            console.error('Failed to load SIM cards:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Prepare payload with proper type conversions
            const payload = {
                imei: formData.imei,
                deviceModel: formData.deviceModel || null,
                firmwareVersion: formData.firmwareVersion || null,
                simCardId: formData.simCardId || null, // Convert empty string to null
                status: formData.status,
            };

            if (editingDevice) {
                await api.put(`/devices/${editingDevice.id}`, payload);
            } else {
                await api.post('/devices', payload);
            }
            setShowModal(false);
            setEditingDevice(null);
            resetForm();
            loadDevices();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this device?')) return;
        try {
            await api.delete(`/devices/${id}`);
            loadDevices();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (device) => {
        setEditingDevice(device);
        setFormData({
            imei: device.imei || '',
            deviceModel: device.deviceModel || 'FMC130',
            firmwareVersion: device.firmwareVersion || '',
            simCardId: device.simCardId || '',
            status: device.status || 'active',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ imei: '', deviceModel: 'FMC130', firmwareVersion: '', simCardId: '', status: 'active' });
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Devices</h1>
                    <p className="page-subtitle">{pagination.total} GPS devices registered</p>
                </div>
                {hasPermission('devices:create') && (
                    <button className="btn btn-primary" onClick={() => { resetForm(); setEditingDevice(null); setShowModal(true); }}>
                        + Add Device
                    </button>
                )}
            </div>

            {error && <div className="message message-error">{error}</div>}

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>IMEI</th>
                                    <th>Model</th>
                                    <th>SIM Card</th>
                                    <th>Vehicle</th>
                                    <th>Connection</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.map(device => (
                                    <tr key={device.id}>
                                        <td><strong style={{ fontFamily: 'monospace' }}>{device.imei}</strong></td>
                                        <td>{device.deviceModel}</td>
                                        <td>
                                            {device.simCard ? (
                                                <span>{device.simCard.simNumber} <small className="text-muted">({device.simCard.provider})</small></span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            {device.vehicle ? (
                                                <span className="badge">{device.vehicle.plateNumber}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            {device.realTimeStatus ? (
                                                <span className={`badge ${device.realTimeStatus.connection_status === 'online' ? 'badge-success' : 'badge-warning'}`}>
                                                    {device.realTimeStatus.connection_status === 'online' ? '🟢 Online' : '🟡 Offline'}
                                                </span>
                                            ) : (
                                                <span className="badge badge-secondary">Unknown</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${device.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {device.status}
                                            </span>
                                        </td>
                                        <td>
                                            {hasPermission('devices:read') && (
                                                <button className="btn btn-sm btn-primary" style={{ marginRight: '0.5rem' }} onClick={() => navigate(`/devices/${device.id}`)}>Monitor</button>
                                            )}
                                            {hasPermission('devices:update') && (
                                                <button className="btn btn-sm" onClick={() => openEditModal(device)}>Edit</button>
                                            )}
                                            {hasPermission('devices:delete') && (
                                                <button className="btn btn-sm btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleDelete(device.id)}>Delete</button>
                                            )}
                                            {!hasPermission('devices:read') && !hasPermission('devices:update') && !hasPermission('devices:delete') && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No actions</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {devices.length === 0 && (
                                    <tr><td colSpan="7" className="empty-state">No devices found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination.total > pagination.limit && (
                        <div className="pagination">
                            <button className="btn btn-sm" disabled={pagination.page <= 1} onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}>Previous</button>
                            <span style={{ margin: '0 1rem' }}>Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}</span>
                            <button className="btn btn-sm" disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)} onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}>Next</button>
                        </div>
                    )}
                </>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingDevice ? 'Edit Device' : 'Add Device'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">IMEI *</label>
                                    <input type="text" className="form-input" value={formData.imei} onChange={(e) => setFormData({ ...formData, imei: e.target.value })} placeholder="15-digit IMEI" pattern="\d{15}" required disabled={!!editingDevice} />
                                    <small style={{ color: 'var(--text-muted)' }}>Cannot be changed after creation</small>
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Device Model</label>
                                        <select className="form-input" value={formData.deviceModel} onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}>
                                            <option value="FMC130">Teltonika FMC130</option>
                                            <option value="FMC125">Teltonika FMC125</option>
                                            <option value="FMC640">Teltonika FMC640</option>
                                            <option value="FMB920">Teltonika FMB920</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Firmware</label>
                                        <input type="text" className="form-input" value={formData.firmwareVersion} onChange={(e) => setFormData({ ...formData, firmwareVersion: e.target.value })} placeholder="v03.25.10.Rev.00" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SIM Card</label>
                                    <select className="form-input" value={formData.simCardId} onChange={(e) => setFormData({ ...formData, simCardId: e.target.value })}>
                                        <option value="">-- No SIM Card --</option>
                                        {simCards.map(sim => (
                                            <option key={sim.id} value={sim.id}>
                                                {sim.simNumber} ({sim.provider})
                                                {sim.device && sim.device.id !== editingDevice?.id ? ` - On ${sim.device.imei}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Status</label>
                                    <select className="form-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="maintenance">Maintenance</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingDevice ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

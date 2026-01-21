import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

export default function Vehicles() {
    const api = useApi();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const [vehicles, setVehicles] = useState([]);
    const [owners, setOwners] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [formData, setFormData] = useState({
        plateNumber: '',
        vehicleType: '',
        brand: '',
        model: '',
        year: '',
        color: '',
        ownerId: '',
        companyId: '',
        status: 'active',
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    useEffect(() => {
        loadVehicles();

        // Only load owners if user has permission
        if (hasPermission('owners:read') || hasPermission('owners:list')) {
            loadOwners();
        }

        // Only load companies if user has permission and no company assigned
        if (user && !user.companyId && (hasPermission('companies:read') || hasPermission('companies:list'))) {
            loadCompanies();
        }
    }, [pagination.page, user]); // Removed hasPermission to prevent infinite loop

    const loadVehicles = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/vehicles?page=${pagination.page}&limit=${pagination.limit}`);
            setVehicles(data.data || []);
            setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadOwners = async () => {
        try {
            const data = await api.get('/owners?limit=1000'); // Get all owners for dropdown
            setOwners(data.data || []);
        } catch (err) {
            console.error('Failed to load owners:', err);
        }
    };

    const loadCompanies = async () => {
        try {
            const data = await api.get('/companies?limit=1000');
            setCompanies(data.data || []);
        } catch (err) {
            console.error('Failed to load companies:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            // Prepare payload with proper type conversions
            const payload = {
                plateNumber: formData.plateNumber,
                vehicleType: formData.vehicleType || null,
                brand: formData.brand || null,
                model: formData.model || null,
                year: formData.year ? parseInt(formData.year, 10) : null, // Convert to integer or null
                color: formData.color || null,
                ownerId: formData.ownerId || null, // Convert empty string to null
                companyId: formData.companyId || null, // Convert empty string to null
                status: formData.status,
            };

            if (editingVehicle) {
                await api.put(`/vehicles/${editingVehicle.id}`, payload);
            } else {
                await api.post('/vehicles', payload);
            }
            setShowModal(false);
            setEditingVehicle(null);
            resetForm();
            loadVehicles();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;
        try {
            await api.delete(`/vehicles/${id}`);
            loadVehicles();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            plateNumber: vehicle.plateNumber || '',
            vehicleType: vehicle.vehicleType || '',
            brand: vehicle.brand || '',
            model: vehicle.model || '',
            year: vehicle.year || '',
            color: vehicle.color || '',
            ownerId: vehicle.ownerId || '',
            companyId: vehicle.companyId || '',
            status: vehicle.status || 'active',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            plateNumber: '',
            vehicleType: '',
            brand: '',
            model: '',
            year: '',
            color: '',
            ownerId: '',
            companyId: '',
            status: 'active',
        });
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Vehicles</h1>
                    <p className="page-subtitle">{pagination.total} vehicles registered</p>
                </div>
                {hasPermission('vehicles:create') && (
                    <button className="btn btn-primary" onClick={() => { resetForm(); setEditingVehicle(null); setShowModal(true); }}>
                        + Add Vehicle
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
                                    <th>Plate Number</th>
                                    <th>Type</th>
                                    <th>Brand/Model</th>
                                    <th>Owner</th>
                                    <th>Device</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vehicles.map(vehicle => (
                                    <tr key={vehicle.id}>
                                        <td><strong>{vehicle.plateNumber}</strong></td>
                                        <td>{vehicle.vehicleType || '-'}</td>
                                        <td>{vehicle.brand} {vehicle.model}</td>
                                        <td>
                                            {vehicle.owner ? (
                                                <span style={{ fontWeight: 500 }}>{vehicle.owner.fullName}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            {vehicle.device ? (
                                                <span className="badge badge-success">{vehicle.device.imei}</span>
                                            ) : (
                                                <span className="badge badge-warning">No device</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${vehicle.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {vehicle.status}
                                            </span>
                                        </td>
                                        <td>
                                            {(hasPermission('vehicles:update') || hasPermission('vehicles:delete')) && (
                                                <>
                                                    {hasPermission('vehicles:update') && (
                                                        <button className="btn btn-sm" onClick={() => openEditModal(vehicle)}>Edit</button>
                                                    )}
                                                    {hasPermission('vehicles:delete') && (
                                                        <button className="btn btn-sm btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleDelete(vehicle.id)}>Delete</button>
                                                    )}
                                                </>
                                            )}
                                            {!hasPermission('vehicles:update') && !hasPermission('vehicles:delete') && (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No actions</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {vehicles.length === 0 && (
                                    <tr><td colSpan="7" className="empty-state">No vehicles found</td></tr>
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
                            <h2>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Plate Number *</label>
                                    <input type="text" className="form-input" value={formData.plateNumber} onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })} required />
                                </div>

                                {user && !user.companyId && (
                                    <div className="form-group">
                                        <label className="form-label">Company *</label>
                                        <select
                                            className="form-input"
                                            value={formData.companyId}
                                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                            required
                                        >
                                            <option value="">-- Select Company --</option>
                                            {companies.map(company => (
                                                <option key={company.id} value={company.id}>
                                                    {company.companyName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Vehicle Type</label>
                                        <select className="form-input" value={formData.vehicleType} onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}>
                                            <option value="">Select type</option>
                                            <option value="car">Car</option>
                                            <option value="truck">Truck</option>
                                            <option value="motorcycle">Motorcycle</option>
                                            <option value="excavator">Excavator</option>
                                            <option value="bus">Bus</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Year</label>
                                        <input type="number" className="form-input" value={formData.year} onChange={(e) => setFormData({ ...formData, year: e.target.value })} min="1990" max="2030" />
                                    </div>
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Brand</label>
                                        <input type="text" className="form-input" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Model</label>
                                        <input type="text" className="form-input" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Owner</label>
                                    <select className="form-input" value={formData.ownerId} onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}>
                                        <option value="">-- No Owner --</option>
                                        {owners.map(owner => (
                                            <option key={owner.id} value={owner.id}>
                                                {owner.fullName} ({owner.ktpNumber})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Color</label>
                                        <input type="text" className="form-input" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
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
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingVehicle ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

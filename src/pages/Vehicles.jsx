import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

// ─── Vehicle Models Panel (right sidebar) ────────────────────────────────
function VehicleModelsPanel({ api, vehicleModels, setVehicleModels, onModelsChanged, onAssignModel }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ name: '', description: '' });
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadModels();
    }, []);

    const loadModels = async () => {
        setLoading(true);
        try {
            const data = await api.get('/vehicle-models');
            setVehicleModels(data.data || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const payload = { name: formData.name, description: formData.description || null };
            if (editingId) {
                await api.put(`/vehicle-models/${editingId}`, payload);
            } else {
                await api.post('/vehicle-models', payload);
            }
            resetForm();
            loadModels();
            if (onModelsChanged) onModelsChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this vehicle model?')) return;
        try {
            await api.delete(`/vehicle-models/${id}`);
            loadModels();
            if (onModelsChanged) onModelsChanged();
        } catch (err) {
            setError(err.message);
        }
    };

    const startEdit = (model) => {
        setEditingId(model.id);
        setFormData({ name: model.name, description: model.description || '' });
        setShowForm(true);
    };

    const resetForm = () => {
        setEditingId(null);
        setFormData({ name: '', description: '' });
        setShowForm(false);
    };

    return (
        <div className="models-panel">
            <div className="models-panel-header">
                <h3 className="models-panel-title">Vehicle Models</h3>
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => { resetForm(); setShowForm(true); }}
                    title="Add Model"
                >+</button>
            </div>

            {error && <div className="message message-error" style={{ margin: '0.5rem 0', fontSize: '0.8rem', padding: '0.5rem' }}>{error}</div>}

            {showForm && (
                <form onSubmit={handleSubmit} className="models-form">
                    <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="Model name *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        autoFocus
                    />
                    <input
                        type="text"
                        className="form-input form-input-sm"
                        placeholder="Description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <div className="models-form-actions">
                        <button type="submit" className="btn btn-sm btn-primary">
                            {editingId ? 'Update' : 'Add'}
                        </button>
                        <button type="button" className="btn btn-sm" onClick={resetForm}>Cancel</button>
                    </div>
                </form>
            )}

            <div className="models-list">
                {loading ? (
                    <div className="loading" style={{ padding: '1rem' }}><div className="spinner" style={{ width: 20, height: 20 }}></div></div>
                ) : vehicleModels.length === 0 ? (
                    <div className="empty-state" style={{ padding: '1rem', fontSize: '0.85rem' }}>No models yet</div>
                ) : (
                    vehicleModels.map(model => (
                        <div key={model.id} className="model-item">
                            <div className="model-item-info">
                                <span className="model-item-name">{model.name}</span>
                                {model.description && <span className="model-item-desc">{model.description}</span>}
                            </div>
                            <div className="model-item-actions">
                                <button className="btn-icon" onClick={() => onAssignModel(model)} title="Assign to vehicles">⇄</button>
                                <button className="btn-icon" onClick={() => startEdit(model)} title="Edit">✎</button>
                                <button className="btn-icon btn-icon-danger" onClick={() => handleDelete(model.id)} title="Delete">✕</button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// ─── Main Vehicles Page ──────────────────────────────────────────────────
export default function Vehicles() {
    const api = useApi();
    const { user } = useAuth();
    const { hasPermission } = usePermissions();
    const [vehicles, setVehicles] = useState([]);
    const [vehicleModels, setVehicleModels] = useState([]);
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
        vehicleModelId: '',
        year: '',
        color: '',
        ownerId: '',
        companyId: '',
        status: 'active',
    });
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    // ── Assign mode state ──
    const [assignMode, setAssignMode] = useState(false);
    const [assigningModel, setAssigningModel] = useState(null); // the model being assigned
    const [selectedVehicleIds, setSelectedVehicleIds] = useState(new Set());
    const [assignLoading, setAssignLoading] = useState(false);

    useEffect(() => {
        loadVehicles();

        if (hasPermission('owners:read') || hasPermission('owners:list')) {
            loadOwners();
        }

        if (user && !user.companyId && (hasPermission('companies:read') || hasPermission('companies:list'))) {
            loadCompanies();
        }
    }, [pagination.page, user]);

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
            const data = await api.get('/owners?limit=1000');
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
            const payload = {
                plateNumber: formData.plateNumber,
                vehicleType: formData.vehicleType || null,
                brand: formData.brand || null,
                vehicleModelId: formData.vehicleModelId || null,
                year: formData.year ? parseInt(formData.year, 10) : null,
                color: formData.color || null,
                ownerId: formData.ownerId || null,
                companyId: formData.companyId || null,
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
            vehicleModelId: vehicle.vehicleModelId || vehicle.vehicleModel?.id || '',
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
            vehicleModelId: '',
            year: '',
            color: '',
            ownerId: '',
            companyId: '',
            status: 'active',
        });
    };

    const getModelName = (vehicle) => {
        if (vehicle.vehicleModel?.name) return vehicle.vehicleModel.name;
        return '-';
    };

    // ── Assign mode handlers ──
    const startAssignMode = (model) => {
        setAssigningModel(model);
        setAssignMode(true);
        setSelectedVehicleIds(new Set());
    };

    const cancelAssignMode = () => {
        setAssignMode(false);
        setAssigningModel(null);
        setSelectedVehicleIds(new Set());
    };

    const toggleVehicleSelection = (vehicleId) => {
        setSelectedVehicleIds(prev => {
            const next = new Set(prev);
            if (next.has(vehicleId)) {
                next.delete(vehicleId);
            } else {
                next.add(vehicleId);
            }
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedVehicleIds.size === vehicles.length) {
            setSelectedVehicleIds(new Set());
        } else {
            setSelectedVehicleIds(new Set(vehicles.map(v => v.id)));
        }
    };

    const confirmAssign = async () => {
        if (selectedVehicleIds.size === 0) return;
        setAssignLoading(true);
        setError('');
        try {
            await api.patch('/vehicles/bulk-update', {
                vehicleIds: [...selectedVehicleIds],
                data: { vehicleModelId: assigningModel.id },
            });
            cancelAssignMode();
            loadVehicles();
        } catch (err) {
            setError(err.message);
        } finally {
            setAssignLoading(false);
        }
    };

    const allSelected = vehicles.length > 0 && selectedVehicleIds.size === vehicles.length;
    const someSelected = selectedVehicleIds.size > 0 && selectedVehicleIds.size < vehicles.length;

    return (
        <div className="vehicles-layout">
            {/* ── Left: Vehicles List ── */}
            <div className="vehicles-main">
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Vehicles</h1>
                        <p className="page-subtitle">
                            {assignMode ? (
                                <>Assigning model: <strong>{assigningModel?.name}</strong> — {selectedVehicleIds.size} selected</>
                            ) : (
                                <>{pagination.total} vehicles registered</>
                            )}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {assignMode && (
                            <>
                                <button
                                    className="btn btn-sm btn-primary"
                                    onClick={confirmAssign}
                                    disabled={selectedVehicleIds.size === 0 || assignLoading}
                                >
                                    {assignLoading ? 'Assigning...' : `Confirm (${selectedVehicleIds.size})`}
                                </button>
                                <button className="btn btn-sm" onClick={cancelAssignMode}>Cancel</button>
                            </>
                        )}
                        {!assignMode && hasPermission('vehicles:create') && (
                            <button className="btn btn-primary" onClick={() => { resetForm(); setEditingVehicle(null); setShowModal(true); }}>
                                + Add Vehicle
                            </button>
                        )}
                    </div>
                </div>

                {error && <div className="message message-error">{error}</div>}

                {loading ? (
                    <div className="loading"><div className="spinner"></div></div>
                ) : (
                    <>
                        <div className="table-container" style={{ overflow: 'auto', flex: 1 }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        {assignMode && (
                                            <th style={{ width: 40, textAlign: 'center' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    ref={el => { if (el) el.indeterminate = someSelected; }}
                                                    onChange={toggleSelectAll}
                                                />
                                            </th>
                                        )}
                                        <th>Plate Number</th>
                                        <th>Type</th>
                                        <th>Brand / Model</th>
                                        <th>Owner</th>
                                        <th>Device</th>
                                        <th>Status</th>
                                        {!assignMode && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {vehicles.map(vehicle => (
                                        <tr
                                            key={vehicle.id}
                                            className={assignMode && selectedVehicleIds.has(vehicle.id) ? 'row-selected' : ''}
                                            onClick={assignMode ? () => toggleVehicleSelection(vehicle.id) : undefined}
                                            style={assignMode ? { cursor: 'pointer' } : undefined}
                                        >
                                            {assignMode && (
                                                <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedVehicleIds.has(vehicle.id)}
                                                        onChange={() => toggleVehicleSelection(vehicle.id)}
                                                    />
                                                </td>
                                            )}
                                            <td><strong>{vehicle.plateNumber}</strong></td>
                                            <td>{vehicle.vehicleType || '-'}</td>
                                            <td>{vehicle.brand} {getModelName(vehicle)}</td>
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
                                            {!assignMode && (
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
                                            )}
                                        </tr>
                                    ))}
                                    {vehicles.length === 0 && (
                                        <tr><td colSpan={assignMode ? 8 : 7} className="empty-state">No vehicles found</td></tr>
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
            </div>

            {/* ── Right: Vehicle Models Panel ── */}
            <VehicleModelsPanel
                api={api}
                vehicleModels={vehicleModels}
                setVehicleModels={setVehicleModels}
                onModelsChanged={loadVehicles}
                onAssignModel={startAssignMode}
            />

            {/* ── Vehicle Create/Edit Modal ── */}
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
                                        <select
                                            className="form-input"
                                            value={formData.vehicleModelId}
                                            onChange={(e) => setFormData({ ...formData, vehicleModelId: e.target.value })}
                                        >
                                            <option value="">-- No Model --</option>
                                            {vehicleModels.map(m => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
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

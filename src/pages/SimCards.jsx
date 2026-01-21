import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function SimCards() {
    const api = useApi();
    const [simCards, setSimCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingSimCard, setEditingSimCard] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [search, setSearch] = useState('');
    const [filterAssigned, setFilterAssigned] = useState('');

    const [formData, setFormData] = useState({
        simNumber: '',
        provider: '',
        status: 'active',
        activationDate: '',
    });

    useEffect(() => {
        loadData();
    }, [pagination.page, search, filterAssigned]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `/simcards?page=${pagination.page}&limit=${pagination.limit}`;
            if (search) url += `&search=${search}`;
            if (filterAssigned) url += `&assigned=${filterAssigned}`;

            const res = await api.get(url);
            setSimCards(res.data || []);
            setPagination(prev => ({ ...prev, total: res.pagination?.total || 0 }));
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
            const data = { ...formData };
            if (!data.activationDate) delete data.activationDate;

            if (editingSimCard) {
                await api.put(`/simcards/${editingSimCard.id}`, data);
                setSuccess('SIM card updated successfully');
            } else {
                await api.post('/simcards', data);
                setSuccess('SIM card created successfully');
            }
            setShowModal(false);
            setEditingSimCard(null);
            resetForm();
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (simCard) => {
        if (!confirm(`Are you sure you want to delete SIM "${simCard.simNumber}"?`)) return;
        try {
            await api.delete(`/simcards/${simCard.id}`);
            setSuccess('SIM card deleted successfully');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (simCard) => {
        setEditingSimCard(simCard);
        setFormData({
            simNumber: simCard.simNumber,
            provider: simCard.provider || '',
            status: simCard.status,
            activationDate: simCard.activationDate ? simCard.activationDate.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            simNumber: '',
            provider: '',
            status: 'active',
            activationDate: '',
        });
    };

    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(''), 3000);
            return () => clearTimeout(t);
        }
    }, [success]);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">SIM Cards</h1>
                    <p className="page-subtitle">{pagination.total} SIM cards registered</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingSimCard(null); setShowModal(true); }}>
                    + Add SIM Card
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by SIM number or provider..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ maxWidth: '300px' }}
                    />
                    <select
                        className="form-input"
                        value={filterAssigned}
                        onChange={(e) => { setFilterAssigned(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 'auto' }}
                    >
                        <option value="">All SIM Cards</option>
                        <option value="true">Assigned</option>
                        <option value="false">Unassigned</option>
                    </select>
                </div>
            </div>

            {error && <div className="message message-error">{error}</div>}
            {success && <div className="message message-success">{success}</div>}

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>SIM Number</th>
                                    <th>Provider</th>
                                    <th>Assigned To</th>
                                    <th>Vehicle</th>
                                    <th>Status</th>
                                    <th>Activation Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {simCards.map(sim => (
                                    <tr key={sim.id}>
                                        <td><strong style={{ fontFamily: 'monospace' }}>{sim.simNumber}</strong></td>
                                        <td>{sim.provider || '-'}</td>
                                        <td>
                                            {sim.device ? (
                                                <span className="badge badge-primary">{sim.device.imei}</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
                                            )}
                                        </td>
                                        <td>
                                            {sim.device?.vehicle ? (
                                                <span className="badge">{sim.device.vehicle.plateNumber}</span>
                                            ) : '-'}
                                        </td>
                                        <td>
                                            <span className={`badge ${sim.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {sim.status}
                                            </span>
                                        </td>
                                        <td>{sim.activationDate ? new Date(sim.activationDate).toLocaleDateString() : '-'}</td>
                                        <td>
                                            <button className="btn btn-sm" onClick={() => openEditModal(sim)}>Edit</button>
                                            {!sim.device && (
                                                <button className="btn btn-sm btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleDelete(sim)}>Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {simCards.length === 0 && (
                                    <tr><td colSpan="7" className="empty-state">No SIM cards found</td></tr>
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

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingSimCard ? 'Edit SIM Card' : 'Add SIM Card'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">SIM Number *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.simNumber}
                                        onChange={(e) => setFormData({ ...formData, simNumber: e.target.value })}
                                        required
                                        disabled={!!editingSimCard}
                                        placeholder="e.g., 6281234567890"
                                    />
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Provider</label>
                                        <select className="form-input" value={formData.provider} onChange={(e) => setFormData({ ...formData, provider: e.target.value })}>
                                            <option value="">Select Provider</option>
                                            <option value="Telkomsel">Telkomsel</option>
                                            <option value="Indosat">Indosat</option>
                                            <option value="XL">XL</option>
                                            <option value="Tri">Tri</option>
                                            <option value="Smartfren">Smartfren</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Status</label>
                                        <select className="form-input" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Activation Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={formData.activationDate}
                                        onChange={(e) => setFormData({ ...formData, activationDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingSimCard ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Owners() {
    const api = useApi();
    const [owners, setOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingOwner, setEditingOwner] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [search, setSearch] = useState('');
    const [filterPayment, setFilterPayment] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        ktpNumber: '',
        dateOfBirth: '',
        homeAddress: '',
        phoneNumber: '',
        email: '',
        paymentStatus: 'pending',
        paymentAmount: '',
        paymentDueDate: '',
    });

    useEffect(() => {
        loadData();
    }, [pagination.page, search, filterPayment]);

    const loadData = async () => {
        setLoading(true);
        try {
            let url = `/owners?page=${pagination.page}&limit=${pagination.limit}`;
            if (search) url += `&search=${search}`;
            if (filterPayment) url += `&paymentStatus=${filterPayment}`;

            const res = await api.get(url);
            setOwners(res.data || []);
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
            if (!data.dateOfBirth) delete data.dateOfBirth;
            if (!data.paymentAmount) delete data.paymentAmount;
            if (!data.paymentDueDate) delete data.paymentDueDate;
            if (data.paymentAmount) data.paymentAmount = parseFloat(data.paymentAmount);

            if (editingOwner) {
                await api.put(`/owners/${editingOwner.id}`, data);
                setSuccess('Owner updated successfully');
            } else {
                await api.post('/owners', data);
                setSuccess('Owner created successfully');
            }
            setShowModal(false);
            setEditingOwner(null);
            resetForm();
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (owner) => {
        if (!confirm(`Are you sure you want to delete "${owner.fullName}"?`)) return;
        try {
            await api.delete(`/owners/${owner.id}`);
            setSuccess('Owner deleted successfully');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (owner) => {
        setEditingOwner(owner);
        setFormData({
            fullName: owner.fullName,
            ktpNumber: owner.ktpNumber,
            dateOfBirth: owner.dateOfBirth ? owner.dateOfBirth.split('T')[0] : '',
            homeAddress: owner.homeAddress || '',
            phoneNumber: owner.phoneNumber || '',
            email: owner.email || '',
            paymentStatus: owner.paymentStatus,
            paymentAmount: owner.paymentAmount || '',
            paymentDueDate: owner.paymentDueDate ? owner.paymentDueDate.split('T')[0] : '',
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            fullName: '',
            ktpNumber: '',
            dateOfBirth: '',
            homeAddress: '',
            phoneNumber: '',
            email: '',
            paymentStatus: 'pending',
            paymentAmount: '',
            paymentDueDate: '',
        });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        if (!amount) return '-';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
    };

    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
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
                    <h1 className="page-title">Vehicle Owners</h1>
                    <p className="page-subtitle">{pagination.total} owners registered</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingOwner(null); setShowModal(true); }}>
                    + Add Owner
                </button>
            </div>

            {/* Filters */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by name, KTP, phone, or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ maxWidth: '350px' }}
                    />
                    <select
                        className="form-input"
                        value={filterPayment}
                        onChange={(e) => { setFilterPayment(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ width: 'auto' }}
                    >
                        <option value="">All Payment Status</option>
                        <option value="pending">Pending</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
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
                                    <th>Full Name</th>
                                    <th>KTP Number</th>
                                    <th>Phone</th>
                                    <th>Vehicles</th>
                                    <th>Payment Status</th>
                                    <th>Due Date</th>
                                    <th>Amount</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {owners.map(owner => (
                                    <tr key={owner.id}>
                                        <td><strong>{owner.fullName}</strong></td>
                                        <td style={{ fontFamily: 'monospace' }}>{owner.ktpNumber}</td>
                                        <td>{owner.phoneNumber || '-'}</td>
                                        <td><span className="badge">{owner.vehicleCount || 0}</span></td>
                                        <td>
                                            <span className={`badge ${owner.paymentStatus === 'paid' ? 'badge-success' :
                                                    owner.paymentStatus === 'overdue' || isOverdue(owner.paymentDueDate) ? 'badge-danger' :
                                                        'badge-warning'
                                                }`}>
                                                {owner.paymentStatus === 'pending' && isOverdue(owner.paymentDueDate) ? 'overdue' : owner.paymentStatus}
                                            </span>
                                        </td>
                                        <td style={{ color: isOverdue(owner.paymentDueDate) ? 'var(--danger)' : 'inherit' }}>
                                            {formatDate(owner.paymentDueDate)}
                                        </td>
                                        <td>{formatCurrency(owner.paymentAmount)}</td>
                                        <td>
                                            <button className="btn btn-sm" onClick={() => openEditModal(owner)}>Edit</button>
                                            <button className="btn btn-sm btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleDelete(owner)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {owners.length === 0 && (
                                    <tr><td colSpan="8" className="empty-state">No owners found</td></tr>
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
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>{editingOwner ? 'Edit Owner' : 'Add Owner'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Full Name *</label>
                                        <input type="text" className="form-input" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">KTP Number *</label>
                                        <input type="text" className="form-input" value={formData.ktpNumber} onChange={(e) => setFormData({ ...formData, ktpNumber: e.target.value })} required disabled={!!editingOwner} pattern="\d{16}" title="16 digit KTP number" />
                                    </div>
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Date of Birth</label>
                                        <input type="date" className="form-input" value={formData.dateOfBirth} onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone Number</label>
                                        <input type="text" className="form-input" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Home Address</label>
                                    <textarea className="form-input" value={formData.homeAddress} onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })} rows="2" />
                                </div>

                                <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>Payment Information</h4>
                                <div className="grid grid-3">
                                    <div className="form-group">
                                        <label className="form-label">Payment Status</label>
                                        <select className="form-input" value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}>
                                            <option value="pending">Pending</option>
                                            <option value="paid">Paid</option>
                                            <option value="overdue">Overdue</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Amount (IDR)</label>
                                        <input type="number" className="form-input" value={formData.paymentAmount} onChange={(e) => setFormData({ ...formData, paymentAmount: e.target.value })} min="0" step="1000" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Due Date</label>
                                        <input type="date" className="form-input" value={formData.paymentDueDate} onChange={(e) => setFormData({ ...formData, paymentDueDate: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingOwner ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

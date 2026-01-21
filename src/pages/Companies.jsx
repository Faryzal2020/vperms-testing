import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Companies() {
    const api = useApi();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCompany, setEditingCompany] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
        status: 'active',
    });

    useEffect(() => {
        loadData();
    }, [pagination.page, search]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/companies?page=${pagination.page}&limit=${pagination.limit}${search ? `&search=${search}` : ''}`);
            setCompanies(res.data || []);
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
            if (!data.password) delete data.password;

            if (editingCompany) {
                await api.put(`/companies/${editingCompany.id}`, data);
                setSuccess('Company updated successfully');
            } else {
                await api.post('/companies', data);
                setSuccess('Company created successfully');
            }
            setShowModal(false);
            setEditingCompany(null);
            resetForm();
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (company) => {
        if (!confirm(`Are you sure you want to delete "${company.companyName}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/companies/${company.id}`);
            setSuccess('Company deleted successfully');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (company) => {
        setEditingCompany(company);
        setFormData({
            username: company.username,
            password: '',
            companyName: company.companyName,
            email: company.email,
            phone: company.phone || '',
            address: company.address || '',
            status: company.status,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            companyName: '',
            email: '',
            phone: '',
            address: '',
            status: 'active',
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
                    <h1 className="page-title">Companies</h1>
                    <p className="page-subtitle">{pagination.total} companies registered</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingCompany(null); setShowModal(true); }}>
                    + Add Company
                </button>
            </div>

            {/* Search */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body" style={{ padding: '1rem' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by company name, username, or email..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        style={{ maxWidth: '400px' }}
                    />
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
                                    <th>Company Name</th>
                                    <th>Username</th>
                                    <th>Email</th>
                                    <th>Phone</th>
                                    <th>Users</th>
                                    <th>Vehicles</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.map(company => (
                                    <tr key={company.id}>
                                        <td><strong>{company.companyName}</strong></td>
                                        <td>{company.username}</td>
                                        <td>{company.email}</td>
                                        <td>{company.phone || '-'}</td>
                                        <td><span className="badge">{company.userCount || 0}</span></td>
                                        <td><span className="badge">{company.vehicleCount || 0}</span></td>
                                        <td>
                                            <span className={`badge ${company.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {company.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm" onClick={() => openEditModal(company)}>Edit</button>
                                            <button className="btn btn-sm btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleDelete(company)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                                {companies.length === 0 && (
                                    <tr><td colSpan="8" className="empty-state">No companies found</td></tr>
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
                            <h2>{editingCompany ? 'Edit Company' : 'Add Company'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Company Name *</label>
                                    <input type="text" className="form-input" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} required />
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Username *</label>
                                        <input type="text" className="form-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required disabled={!!editingCompany} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{editingCompany ? 'New Password (optional)' : 'Password *'}</label>
                                        <input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingCompany} />
                                    </div>
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Email *</label>
                                        <input type="email" className="form-input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input type="text" className="form-input" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Address</label>
                                    <textarea className="form-input" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} rows="2" />
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
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingCompany ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

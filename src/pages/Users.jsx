import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Users() {
    const api = useApi();
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
    const [search, setSearch] = useState('');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        fullName: '',
        email: '',
        phone: '',
        companyId: '',
        status: 'active',
    });

    useEffect(() => {
        loadData();
    }, [pagination.page, search]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [usersRes, companiesRes, rolesRes] = await Promise.all([
                api.get(`/users?page=${pagination.page}&limit=${pagination.limit}${search ? `&search=${search}` : ''}`),
                api.get('/companies?limit=100'),
                api.get('/roles'),
            ]);
            setUsers(usersRes.data || []);
            setPagination(prev => ({ ...prev, total: usersRes.pagination?.total || 0 }));
            setCompanies(companiesRes.data || []);
            setRoles(rolesRes.data || []);
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
            if (!data.companyId) delete data.companyId;

            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, data);
                setSuccess('User updated successfully');
            } else {
                await api.post('/users', data);
                setSuccess('User created successfully');
            }
            setShowModal(false);
            setEditingUser(null);
            resetForm();
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async (user) => {
        if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;
        try {
            await api.delete(`/users/${user.id}`);
            setSuccess('User deleted successfully');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAssignRole = async (userId, roleId) => {
        try {
            await api.post(`/users/${userId}/roles`, { roleId });
            setSuccess('Role assigned');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleRemoveRole = async (userId, roleId) => {
        try {
            await api.delete(`/users/${userId}/roles/${roleId}`);
            setSuccess('Role removed');
            loadData();
        } catch (err) {
            setError(err.message);
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: '',
            fullName: user.fullName,
            email: user.email,
            phone: user.phone || '',
            companyId: user.companyId || '',
            status: user.status,
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            fullName: '',
            email: '',
            phone: '',
            companyId: '',
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
                    <h1 className="page-title">Users</h1>
                    <p className="page-subtitle">{pagination.total} users registered</p>
                </div>
                <button className="btn btn-primary" onClick={() => { resetForm(); setEditingUser(null); setShowModal(true); }}>
                    + Add User
                </button>
            </div>

            {/* Search */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="card-body" style={{ padding: '1rem' }}>
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search by username, name, or email..."
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
                                    <th>Username</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Company</th>
                                    <th>Roles</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <strong>{user.username}</strong>
                                            {user.isDevSuperadmin && (
                                                <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>DevSuper</span>
                                            )}
                                        </td>
                                        <td>{user.fullName}</td>
                                        <td>{user.email}</td>
                                        <td>{user.company?.companyName || <span style={{ color: 'var(--text-muted)' }}>None</span>}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {user.roles?.map(role => (
                                                    <span key={role.id} className="badge" style={{ cursor: 'pointer' }} onClick={() => handleRemoveRole(user.id, role.id)} title="Click to remove">
                                                        {role.name} ×
                                                    </span>
                                                ))}
                                                <select
                                                    className="form-input"
                                                    style={{ width: 'auto', padding: '0.25rem', fontSize: '0.8rem' }}
                                                    value=""
                                                    onChange={(e) => e.target.value && handleAssignRole(user.id, e.target.value)}
                                                >
                                                    <option value="">+ Role</option>
                                                    {roles.filter(r => !user.roles?.some(ur => ur.id === r.id)).map(role => (
                                                        <option key={role.id} value={role.id}>{role.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn btn-sm" onClick={() => openEditModal(user)}>Edit</button>
                                            {!user.isDevSuperadmin && (
                                                <button className="btn btn-sm btn-danger" style={{ marginLeft: '0.5rem' }} onClick={() => handleDelete(user)}>Delete</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan="7" className="empty-state">No users found</td></tr>
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
                            <h2>{editingUser ? 'Edit User' : 'Add User'}</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Username *</label>
                                        <input type="text" className="form-input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required disabled={!!editingUser} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">{editingUser ? 'New Password (optional)' : 'Password *'}</label>
                                        <input type="password" className="form-input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Full Name *</label>
                                    <input type="text" className="form-input" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} required />
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
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Company</label>
                                        <select className="form-input" value={formData.companyId} onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}>
                                            <option value="">No Company</option>
                                            {companies.map(c => (
                                                <option key={c.id} value={c.id}>{c.companyName}</option>
                                            ))}
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
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingUser ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

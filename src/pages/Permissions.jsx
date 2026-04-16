import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Permissions() {
    const api = useApi();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPermissionModal, setShowPermissionModal] = useState(false);
    const [permissionFormData, setPermissionFormData] = useState({
        key: '',
        description: '',
        category: '',
    });

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        setLoading(true);
        try {
            const data = await api.get('/permissions');
            setPermissions(data.data?.permissions || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePermission = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/permissions', permissionFormData);
            setShowPermissionModal(false);
            setPermissionFormData({ key: '', description: '', category: '' });
            await loadPermissions();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    // Filter permissions based on search
    const filteredPermissions = permissions.filter(perm => {
        const query = searchQuery.toLowerCase();
        return perm.key.toLowerCase().includes(query) ||
               (perm.description && perm.description.toLowerCase().includes(query)) ||
               (perm.category && perm.category.toLowerCase().includes(query));
    });

    // Group permissions by category
    const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
        const category = perm.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {});

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Permissions</h1>
                    <p className="page-subtitle">{permissions.length} permissions defined</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowPermissionModal(true)}>
                    + Create Permission
                </button>
            </div>

            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-body">
                    <div className="form-group" style={{ margin: 0 }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search among all permissions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {error && <div className="message message-error">{error}</div>}

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <div>
                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category} className="card" style={{ marginBottom: '1.5rem' }}>
                            <div className="card-header">
                                <h3 className="card-title" style={{ textTransform: 'capitalize' }}>
                                    {category}
                                </h3>
                                <span className="badge badge-primary">{perms.length} permissions</span>
                            </div>
                            <div className="card-body">
                                <div className="permission-grid">
                                    {perms.map(perm => (
                                        <div key={perm.id} className="permission-item">
                                            <div>
                                                <div className="permission-key">{perm.key}</div>
                                                {perm.description && (
                                                    <div className="permission-desc">{perm.description}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredPermissions.length === 0 && (
                        <div className="empty-state">
                            <p>No permissions found matching "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Permission Modal */}
            {showPermissionModal && (
                <div className="modal-overlay" onClick={() => setShowPermissionModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Permission Node</h2>
                            <button className="modal-close" onClick={() => setShowPermissionModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreatePermission}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Permission Key *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={permissionFormData.key}
                                        onChange={(e) => setPermissionFormData({ ...permissionFormData, key: e.target.value })}
                                        required
                                        placeholder="e.g., vehicles:activate"
                                    />
                                    <small style={{ color: 'var(--text-muted)' }}>Format: resource:action (lowercase)</small>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        value={permissionFormData.description}
                                        onChange={(e) => setPermissionFormData({ ...permissionFormData, description: e.target.value })}
                                        placeholder="What this permission allows"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={permissionFormData.category}
                                        onChange={(e) => setPermissionFormData({ ...permissionFormData, category: e.target.value })}
                                        placeholder="e.g., vehicles, users, reports"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowPermissionModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Creating...' : 'Create Permission'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

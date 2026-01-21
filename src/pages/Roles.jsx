import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Roles() {
    const api = useApi();
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [selectedRole, setSelectedRole] = useState(null);
    const [rolePermissions, setRolePermissions] = useState([]);
    const [roleInheritance, setRoleInheritance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showInheritanceModal, setShowInheritanceModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        priority: 0,
        isDefault: false,
    });

    useEffect(() => {
        loadRoles();
        loadPermissions();
    }, []);

    useEffect(() => {
        if (selectedRole) {
            loadRolePermissions(selectedRole.id);
            loadRoleInheritance(selectedRole.id);
        }
    }, [selectedRole]);

    const loadRoles = async () => {
        setLoading(true);
        try {
            const data = await api.get('/roles');
            console.log('DEBUG: Roles Data:', data);
            setRoles(data.data || []);
        } catch (err) {
            console.error('DEBUG: Failed to load roles', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const loadPermissions = async () => {
        try {
            const data = await api.get('/permissions');
            console.log('DEBUG: All Permissions Data:', data);
            setPermissions(data.data?.permissions || []);
        } catch (err) {
            console.error('Failed to load permissions:', err);
        }
    };

    const loadRolePermissions = async (roleId) => {
        try {
            const data = await api.get(`/roles/${roleId}/permissions`);
            console.log(`DEBUG: Permissions for Role ${roleId}:`, data);
            setRolePermissions(data.data || []);
        } catch (err) {
            console.error('Failed to load role permissions:', err);
            setRolePermissions([]);
        }
    };

    const loadRoleInheritance = async (roleId) => {
        try {
            const data = await api.get(`/roles/${roleId}/inheritance`);
            setRoleInheritance(data.data || []);
        } catch (err) {
            console.error('Failed to load role inheritance:', err);
            setRoleInheritance([]);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/roles', formData);
            setShowCreateModal(false);
            resetForm();
            await loadRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRole = async (roleId) => {
        if (!confirm('Are you sure you want to delete this role? This cannot be undone.')) return;

        setSaving(true);
        try {
            await api.delete(`/roles/${roleId}`);
            if (selectedRole?.id === roleId) {
                setSelectedRole(null);
            }
            await loadRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const togglePermission = async (permission, currentState) => {
        if (!selectedRole) return;

        setSaving(true);
        try {
            const encodedKey = encodeURIComponent(permission.key);

            if (currentState === 'granted') {
                // Remove permission
                await api.delete(`/roles/${selectedRole.id}/permissions/${encodedKey}`);
            } else if (currentState === 'banned') {
                // Change from banned to granted
                await api.post(`/roles/${selectedRole.id}/permissions`, {
                    permissionKey: permission.key,
                    granted: true
                });
            } else {
                // Grant permission
                await api.post(`/roles/${selectedRole.id}/permissions`, {
                    permissionKey: permission.key,
                    granted: true
                });
            }

            await loadRolePermissions(selectedRole.id);
            await loadRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const banPermission = async (permission) => {
        if (!selectedRole) return;

        setSaving(true);
        try {
            await api.post(`/roles/${selectedRole.id}/permissions`, {
                permissionKey: permission.key,
                granted: false
            });

            await loadRolePermissions(selectedRole.id);
            await loadRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const addInheritance = async (parentRoleId) => {
        if (!selectedRole) return;

        setSaving(true);
        try {
            await api.post(`/roles/${selectedRole.id}/inheritance`, { inheritsFromId: parentRoleId });
            await loadRoleInheritance(selectedRole.id);
            await loadRoles();
            setShowInheritanceModal(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const removeInheritance = async (parentRoleId) => {
        if (!selectedRole) return;

        setSaving(true);
        try {
            await api.delete(`/roles/${selectedRole.id}/inheritance/${parentRoleId}`);
            await loadRoleInheritance(selectedRole.id);
            await loadRoles();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getPermissionState = (permissionKey) => {
        const perm = rolePermissions.find(rp => rp.key === permissionKey);
        if (!perm) return 'none';
        return perm.granted ? 'granted' : 'banned';
    };

    const resetForm = () => {
        setFormData({ name: '', description: '', priority: 0, isDefault: false });
    };

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, perm) => {
        const category = perm.category || 'other';
        if (!acc[category]) acc[category] = [];
        acc[category].push(perm);
        return acc;
    }, {});

    // Available roles for inheritance (exclude self and already inherited)
    const availableParentRoles = roles.filter(r =>
        r.id !== selectedRole?.id &&
        !roleInheritance.some(i => i.roleId === r.id)
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Roles & Permissions</h1>
                    <p className="page-subtitle">Manage role-based access control</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Create Role
                </button>
            </div>

            {error && <div className="message message-error">{error}</div>}

            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : (
                <div className="grid grid-2">
                    {/* Roles List */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">Roles ({roles.length})</h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {roles.map(role => (
                                    <div
                                        key={role.id}
                                        style={{
                                            padding: '1rem',
                                            background: selectedRole?.id === role.id ? 'var(--accent)' : 'var(--bg-card)',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        <div onClick={() => setSelectedRole(role)}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                                                        {role.name}
                                                        {role.isDefault && (
                                                            <span className="badge badge-primary" style={{ marginLeft: '0.5rem' }}>Default</span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                        {role.description}
                                                    </div>
                                                </div>
                                                <div className="badge badge-success">
                                                    {role.permissionCount || 0} perms
                                                </div>
                                            </div>
                                        </div>
                                        {selectedRole?.id === role.id && role.name !== 'devsuperadmin' && (
                                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}
                                                    disabled={saving}
                                                >
                                                    Delete Role
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Permissions & Inheritance */}
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title">
                                {selectedRole ? `${selectedRole.name}` : 'Select a role'}
                            </h3>
                            {selectedRole && (
                                <button className="btn btn-sm" onClick={() => setShowInheritanceModal(true)}>
                                    + Add Inheritance
                                </button>
                            )}
                        </div>
                        <div className="card-body">
                            {selectedRole ? (
                                <div>
                                    {saving && (
                                        <div className="message" style={{ background: 'var(--bg-card)', marginBottom: '1rem' }}>
                                            Updating...
                                        </div>
                                    )}

                                    {/* Role Inheritance */}
                                    {roleInheritance.length > 0 && (
                                        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px' }}>
                                            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                                                Inherits From:
                                            </h4>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {roleInheritance.map(inh => (
                                                    <div key={inh.roleId} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'rgba(99, 102, 241, 0.2)', borderRadius: '6px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{inh.roleName}</span>
                                                        <button
                                                            onClick={() => removeInheritance(inh.roleId)}
                                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0', fontSize: '1rem', lineHeight: 1 }}
                                                            disabled={saving}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Permissions */}
                                    {Object.entries(groupedPermissions).map(([category, perms]) => (
                                        <div key={category} style={{ marginBottom: '1.5rem' }}>
                                            <h4 style={{
                                                fontSize: '0.9rem',
                                                fontWeight: 600,
                                                textTransform: 'uppercase',
                                                color: 'var(--text-secondary)',
                                                marginBottom: '0.75rem',
                                                letterSpacing: '0.05em'
                                            }}>
                                                {category}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {perms.map(perm => {
                                                    const state = getPermissionState(perm.key);
                                                    return (
                                                        <div
                                                            key={perm.id}
                                                            style={{
                                                                padding: '0.75rem 1rem',
                                                                background: state === 'granted' ? 'rgba(34, 197, 94, 0.1)' : state === 'banned' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
                                                                border: `1px solid ${state === 'granted' ? 'var(--success)' : state === 'banned' ? 'var(--danger)' : 'var(--border)'}`,
                                                                borderRadius: '6px',
                                                                transition: 'all 0.2s',
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontWeight: 500, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                                                                        {perm.key}
                                                                    </div>
                                                                    {perm.description && (
                                                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                                            {perm.description}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                    {state === 'granted' ? (
                                                                        <>
                                                                            <span className="badge badge-success">✓ Granted</span>
                                                                            <button
                                                                                className="btn btn-sm"
                                                                                onClick={() => togglePermission(perm, state)}
                                                                                disabled={saving}
                                                                            >
                                                                                Revoke
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-sm btn-danger"
                                                                                onClick={() => banPermission(perm)}
                                                                                disabled={saving}
                                                                            >
                                                                                Ban
                                                                            </button>
                                                                        </>
                                                                    ) : state === 'banned' ? (
                                                                        <>
                                                                            <span className="badge badge-danger">✕ Banned</span>
                                                                            <button
                                                                                className="btn btn-sm btn-success"
                                                                                onClick={() => togglePermission(perm, state)}
                                                                                disabled={saving}
                                                                            >
                                                                                Grant
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-sm"
                                                                                onClick={() => togglePermission(perm, state)}
                                                                                disabled={saving}
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <button
                                                                                className="btn btn-sm btn-success"
                                                                                onClick={() => togglePermission(perm, state)}
                                                                                disabled={saving}
                                                                            >
                                                                                Grant
                                                                            </button>
                                                                            <button
                                                                                className="btn btn-sm btn-danger"
                                                                                onClick={() => banPermission(perm)}
                                                                                disabled={saving}
                                                                            >
                                                                                Ban
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏷️</p>
                                    <p>Select a role to view and manage its permissions</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Create Role Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Create New Role</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateRole}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Role Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="e.g., fleet_operator"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="form-input"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Brief description of this role"
                                    />
                                </div>
                                <div className="grid grid-2">
                                    <div className="form-group">
                                        <label className="form-label">Priority</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.priority}
                                            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value, 10) })}
                                            min="0"
                                            max="100"
                                        />
                                        <small style={{ color: 'var(--text-muted)' }}>Higher priority = more important</small>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">
                                            <input
                                                type="checkbox"
                                                checked={formData.isDefault}
                                                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                                style={{ marginRight: '0.5rem' }}
                                            />
                                            Set as default role
                                        </label>
                                        <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                                            New users will get this role automatically
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Creating...' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Inheritance Modal */}
            {showInheritanceModal && selectedRole && (
                <div className="modal-overlay" onClick={() => setShowInheritanceModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Role Inheritance</h2>
                            <button className="modal-close" onClick={() => setShowInheritanceModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                Select a role for <strong>{selectedRole.name}</strong> to inherit permissions from:
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {availableParentRoles.length > 0 ? (
                                    availableParentRoles.map(role => (
                                        <div
                                            key={role.id}
                                            onClick={() => addInheritance(role.id)}
                                            style={{
                                                padding: '1rem',
                                                background: 'var(--bg-card)',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                border: '1px solid var(--border)',
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-card)'}
                                        >
                                            <div style={{ fontWeight: 600 }}>{role.name}</div>
                                            {role.description && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                                    {role.description}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="empty-state">
                                        <p>No available roles to inherit from</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn" onClick={() => setShowInheritanceModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

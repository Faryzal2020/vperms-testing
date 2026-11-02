import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import RuleEditorModal from '../components/RuleEditorModal';

export default function OpenApiKeys() {
    const api = useApi();
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filters
    const [search, setSearch] = useState('');
    const [envFilter, setEnvFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSecretModal, setShowSecretModal] = useState(false);
    const [createdSecretData, setCreatedSecretData] = useState(null);
    const [copied, setCopied] = useState(false);

    // Dedicated Rule Editor & Rule Viewer States
    const [selectedKeyForEditor, setSelectedKeyForEditor] = useState(null);
    const [selectedKeyForRules, setSelectedKeyForRules] = useState(null);
    const [rulesData, setRulesData] = useState(null);
    const [loadingRules, setLoadingRules] = useState(false);
    const [rulesError, setRulesError] = useState('');

    // Create Key Form
    const [formData, setFormData] = useState({
        label: '',
        environment: 'production',
        ipAllowlist: '',
        defaultRateLimit: 60,
        defaultQuota: 50000,
    });

    useEffect(() => {
        loadKeys();
    }, [statusFilter]);

    const loadKeys = async () => {
        setLoading(true);
        setError('');
        try {
            const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
            const res = await api.get(`/admin/keys${query}`);
            setKeys(res.data || []);
        } catch (err) {
            setError(err.message || 'Failed to load Open API keys.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateKey = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const ipList = formData.ipAllowlist
                ? formData.ipAllowlist
                      .split(/[\n,]/)
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [];

            const payload = {
                label: formData.label,
                environment: formData.environment,
                defaultRateLimit: Number(formData.defaultRateLimit) || 60,
                defaultQuota: Number(formData.defaultQuota) || 50000,
                ipAllowlist: ipList,
            };

            const res = await api.post('/admin/keys', payload);
            setShowCreateModal(false);

            // Pop up the one-time rawKey modal
            setCreatedSecretData({
                rawKey: res.data.rawKey,
                label: res.data.key.label,
                keyPrefix: res.data.key.keyPrefix,
                environment: res.data.key.environment,
            });
            setShowSecretModal(true);
            setCopied(false);

            setSuccess('API key created successfully.');
            setFormData({
                label: '',
                environment: 'production',
                ipAllowlist: '',
                defaultRateLimit: 60,
                defaultQuota: 50000,
            });
            loadKeys();
        } catch (err) {
            setError(err.message || 'Failed to create key.');
        }
    };

    const handleCopySecret = async () => {
        if (!createdSecretData?.rawKey) return;
        try {
            await navigator.clipboard.writeText(createdSecretData.rawKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch {
            // Fallback for older browsers
            setCopied(false);
        }
    };

    const handleToggleSuspend = async (key) => {
        const action = key.status === 'active' ? 'suspend' : 'resume';
        if (!confirm(`Are you sure you want to ${action} API key "${key.label}"?`)) return;

        try {
            await api.post(`/admin/keys/${key.id}/suspend`, {});
            setSuccess(`Key ${key.keyPrefix} is now ${key.status === 'active' ? 'suspended' : 'active'}.`);
            loadKeys();
        } catch (err) {
            setError(err.message || 'Failed to update key status.');
        }
    };

    const handleDeleteKey = async (key) => {
        if (!confirm(`Are you sure you want to REVOKE and DELETE key "${key.label}" (${key.keyPrefix})? This action CANNOT be undone.`)) return;

        try {
            await api.delete(`/admin/keys/${key.id}`);
            setSuccess(`Key ${key.keyPrefix} has been revoked.`);
            loadKeys();
        } catch (err) {
            setError(err.message || 'Failed to revoke key.');
        }
    };

    const handleOpenRuleViewer = async (key) => {
        setSelectedKeyForRules(key);
        setLoadingRules(true);
        setRulesError('');
        setRulesData(null);

        try {
            const res = await api.get(`/admin/keys/${key.id}/effective-access`);
            setRulesData(res.data);
        } catch (err) {
            setRulesError(err.message || 'Failed to load rules for this key.');
        } finally {
            setLoadingRules(false);
        }
    };

    // Filter keys client-side by search and environment
    const filteredKeys = keys.filter((k) => {
        const matchSearch =
            !search ||
            k.label.toLowerCase().includes(search.toLowerCase()) ||
            k.keyPrefix.toLowerCase().includes(search.toLowerCase());

        const matchEnv = envFilter === 'all' || k.environment === envFilter;
        return matchSearch && matchEnv;
    });

    return (
        <div className="open-api-keys-page">
            <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        🔑 Open API Keys Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                        Manage partner keys, inspect active endpoint rules, and monitor access boundaries.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    + Create New API Key
                </button>
            </div>

            {error && (
                <div className="alert alert-danger" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: 8, color: '#fca5a5' }}>
                    ⚠️ {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--success)', borderRadius: 8, color: '#86efac' }}>
                    ✓ {success}
                </div>
            )}

            {/* Filter Bar */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-body" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="🔍 Search by label or prefix (e.g. pk_live_...)"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div>
                        <select
                            className="form-input"
                            value={envFilter}
                            onChange={(e) => setEnvFilter(e.target.value)}
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="all">All Environments</option>
                            <option value="production">Production</option>
                            <option value="sandbox">Sandbox</option>
                        </select>
                    </div>
                    <div>
                        <select
                            className="form-input"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                    <button className="btn btn-secondary" onClick={loadKeys} title="Refresh Keys">
                        ↻ Refresh
                    </button>
                </div>
            </div>

            {/* Keys Table */}
            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="card-title">Provisioned API Keys ({filteredKeys.length})</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Zero-Trust Default Deny: Keys without rules cannot access endpoints.
                    </span>
                </div>
                <div className="card-body" style={{ padding: 0 }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                            Loading API keys...
                        </div>
                    ) : filteredKeys.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No API keys found matching the filters.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Label</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Prefix</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Env</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Rules</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Rate Limit</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Created</th>
                                        <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKeys.map((key) => {
                                        const isZeroTrust = Number(key.rulesCount) === 0;
                                        return (
                                            <tr key={key.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                                                <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                    {key.label}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-hover)' }}>
                                                    {key.keyPrefix}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <span
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: 4,
                                                            fontWeight: 600,
                                                            background: key.environment === 'production' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                                            color: key.environment === 'production' ? '#a5b4fc' : '#fcd34d',
                                                        }}
                                                    >
                                                        {key.environment.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <span
                                                        style={{
                                                            fontSize: '0.75rem',
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: 4,
                                                            fontWeight: 600,
                                                            background: key.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                            color: key.status === 'active' ? '#86efac' : '#fca5a5',
                                                        }}
                                                    >
                                                        {key.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    {isZeroTrust ? (
                                                        <button
                                                            onClick={() => setSelectedKeyForEditor(key)}
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: 4,
                                                                fontWeight: 600,
                                                                background: 'rgba(239, 68, 68, 0.15)',
                                                                color: '#f87171',
                                                                border: '1px dashed #ef4444',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.25rem',
                                                            }}
                                                            title="Zero-Trust Baseline: Click to assign endpoint rules in the dedicated editor"
                                                        >
                                                            🛡️ 0 (Default Deny — Edit)
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSelectedKeyForEditor(key)}
                                                            style={{
                                                                fontSize: '0.75rem',
                                                                padding: '0.2rem 0.5rem',
                                                                borderRadius: 4,
                                                                fontWeight: 600,
                                                                background: 'rgba(34, 197, 94, 0.2)',
                                                                color: '#86efac',
                                                                border: '1px solid rgba(34, 197, 94, 0.3)',
                                                                cursor: 'pointer',
                                                            }}
                                                            title="Click to manage endpoint rules"
                                                        >
                                                            ✓ {key.rulesCount} endpoint{key.rulesCount > 1 ? 's' : ''} (Edit)
                                                        </button>
                                                    )}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {key.defaultRateLimit} req/min
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {new Date(key.createdAt).toLocaleDateString()}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                                                        <button
                                                            className="btn btn-sm btn-primary"
                                                            onClick={() => setSelectedKeyForEditor(key)}
                                                            title="Dedicated Rule & Scope Editor: Configure endpoints, tenancy, rate limits, and field redactions"
                                                            style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                                        >
                                                            ⚙️ Edit Rules
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => handleOpenRuleViewer(key)}
                                                            title="Inspect Effective Rules & Data Scope"
                                                            style={{ borderColor: 'var(--accent)', color: 'var(--accent-hover)' }}
                                                        >
                                                            🔍 Preview
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => handleToggleSuspend(key)}
                                                            title={key.status === 'active' ? 'Temporarily suspend traffic' : 'Re-activate key'}
                                                        >
                                                            {key.status === 'active' ? '⏸ Suspend' : '▶ Resume'}
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDeleteKey(key)}
                                                            title="Permanently revoke key"
                                                        >
                                                            🗑
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* CREATE KEY MODAL */}
            {showCreateModal && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content card" style={{ width: '520px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="card-title">Create New Open API Key</span>
                            <button className="btn-icon" onClick={() => setShowCreateModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreateKey}>
                            <div className="card-body">
                                <div className="form-group">
                                    <label className="form-label">Key Label / Partner Name *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. Indomobil Logistics Jakarta Prod"
                                        required
                                        value={formData.label}
                                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                        Human-readable name identifying the client or integration.
                                    </small>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Environment</label>
                                    <select
                                        className="form-input"
                                        value={formData.environment}
                                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                                    >
                                        <option value="production">Production (pk_live_...)</option>
                                        <option value="sandbox">Sandbox (pk_test_...)</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">IP Address Allowlist (Optional)</label>
                                    <textarea
                                        className="form-input"
                                        rows={2}
                                        placeholder="e.g. 103.28.15.0/24, 202.158.40.10 (comma or newline separated)"
                                        value={formData.ipAllowlist}
                                        onChange={(e) => setFormData({ ...formData, ipAllowlist: e.target.value })}
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'block' }}>
                                        Leave empty to allow from any client IP address.
                                    </small>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Default Rate Limit</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.defaultRateLimit}
                                            onChange={(e) => setFormData({ ...formData, defaultRateLimit: e.target.value })}
                                        />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>req / minute</small>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Monthly Quota</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={formData.defaultQuota}
                                            onChange={(e) => setFormData({ ...formData, defaultQuota: e.target.value })}
                                        />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>requests / month</small>
                                    </div>
                                </div>

                                <div style={{ padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 8, marginTop: '0.5rem' }}>
                                    <strong style={{ color: '#fbbf24', fontSize: '0.85rem' }}>🛡️ Zero-Trust Security Note:</strong>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem', lineHeight: 1.4 }}>
                                        Newly created keys start with <strong>ZERO permissions</strong>. After creation, you must explicitly assign endpoint rules before the partner can call any routes.
                                    </p>
                                </div>
                            </div>
                            <div className="card-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Generate Key
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ONE-TIME SECRET REVEAL MODAL */}
            {showSecretModal && createdSecretData && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div className="modal-content card" style={{ width: '600px', maxWidth: '95%' }}>
                        <div className="card-header" style={{ background: 'rgba(34, 197, 94, 0.15)', borderBottom: '1px solid var(--success)' }}>
                            <span className="card-title" style={{ color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                ✓ API Key Generated Successfully
                            </span>
                        </div>
                        <div className="card-body">
                            <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                                Key <strong>"{createdSecretData.label}"</strong> ({createdSecretData.environment}) has been generated.
                            </p>

                            <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid var(--danger)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                                <strong style={{ color: '#f87171', fontSize: '0.85rem' }}>⚠️ IMPORTANT: Copy this key immediately</strong>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                                    This secret key will <strong>NEVER be shown again</strong>. It is hashed on the server with HMAC-SHA256 and cannot be retrieved later.
                                </p>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Bearer API Key Token:</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        type="text"
                                        readOnly
                                        className="form-input"
                                        style={{ fontFamily: 'monospace', fontSize: '0.85rem', background: 'var(--bg-tertiary)', color: '#a5b4fc', letterSpacing: '0.02em' }}
                                        value={createdSecretData.rawKey}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleCopySecret}
                                        style={{ whiteSpace: 'nowrap' }}
                                    >
                                        {copied ? '✓ Copied!' : '📋 Copy'}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="card-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowSecretModal(false);
                                    setCreatedSecretData(null);
                                }}
                            >
                                Done, I have saved the key safely
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RULE VIEWER MODAL (READ-ONLY) */}
            {selectedKeyForRules && (
                <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="modal-content card" style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <span className="card-title" style={{ fontSize: '1.1rem' }}>
                                    🔍 Rule Viewer: {selectedKeyForRules.label}
                                </span>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--accent-hover)' }}>
                                        {selectedKeyForRules.keyPrefix}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        Status: <strong>{selectedKeyForRules.status}</strong>
                                    </span>
                                </div>
                            </div>
                            <button className="btn-icon" onClick={() => setSelectedKeyForRules(null)}>✕</button>
                        </div>

                        <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                            {loadingRules ? (
                                <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                                    Resolving effective access rules...
                                </div>
                            ) : rulesError ? (
                                <div className="alert alert-danger" style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: 8, color: '#fca5a5' }}>
                                    {rulesError}
                                </div>
                            ) : !rulesData || rulesData.totalEndpointsAllowed === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: 8 }}>
                                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
                                    <h4 style={{ color: '#f87171', marginBottom: '0.5rem' }}>Zero-Trust Baseline: 0 Endpoints Allowed</h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '500px', margin: '0 auto' }}>
                                        No endpoint rules are configured on this key. Any public API call made with this key will return <code style={{ color: '#fca5a5' }}>403 Forbidden (NO_RULES_CONFIGURED)</code>.
                                    </p>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                                        Rules can be attached via backend management API or rule profiles.
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                            Authorized Endpoints ({rulesData.totalEndpointsAllowed})
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            Dry-run effective access map
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {rulesData.endpoints.map((rule, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    background: 'var(--bg-card)',
                                                    border: '1px solid var(--border)',
                                                    borderRadius: 8,
                                                    padding: '1rem 1.25rem',
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        {(rule.allowedMethods || ['GET']).map((m) => (
                                                            <span
                                                                key={m}
                                                                style={{
                                                                    fontSize: '0.7rem',
                                                                    padding: '0.15rem 0.4rem',
                                                                    borderRadius: 4,
                                                                    fontWeight: 700,
                                                                    background: m === 'GET' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                                                    color: m === 'GET' ? '#86efac' : '#a5b4fc',
                                                                }}
                                                            >
                                                                {m}
                                                            </span>
                                                        ))}
                                                        <code style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                            {rule.path}
                                                        </code>
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                                        {rule.endpointId}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.8rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                                    {/* Data Scope */}
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Data Scope (Tenancy):</span>
                                                        {rule.dataScope.isGlobal ? (
                                                            <span style={{ color: '#fbbf24', fontWeight: 600 }}>Global [*] (All Companies)</span>
                                                        ) : rule.dataScope.allowedCompanies?.length > 0 ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                {rule.dataScope.allowedCompanies.map((cid) => (
                                                                    <span key={cid} style={{ padding: '0.1rem 0.35rem', background: 'var(--bg-primary)', borderRadius: 4, fontSize: '0.7rem', color: '#93c5fd' }}>
                                                                        {cid.slice(0, 8)}...
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>None specified</span>
                                                        )}
                                                    </div>

                                                    {/* Constraints */}
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Request Constraints:</span>
                                                        <div style={{ color: 'var(--text-secondary)' }}>
                                                            Max Page Size: <strong style={{ color: 'var(--text-primary)' }}>{rule.constraints.maxPageSize}</strong>
                                                        </div>
                                                        {rule.constraints.maxTimeRangeDays && (
                                                            <div style={{ color: 'var(--text-secondary)' }}>
                                                                Max Time Range: <strong style={{ color: 'var(--text-primary)' }}>{rule.constraints.maxTimeRangeDays} days</strong>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Redactions */}
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Redacted Fields:</span>
                                                        {rule.denyFields?.length > 0 ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                {rule.denyFields.map((f) => (
                                                                    <span key={f} style={{ padding: '0.1rem 0.35rem', background: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', borderRadius: 4, fontSize: '0.7rem' }}>
                                                                        ✕ {f}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>None</span>
                                                        )}
                                                    </div>

                                                    {/* Rate & Cost */}
                                                    <div>
                                                        <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>Rate & Weight:</span>
                                                        <div style={{ color: 'var(--text-secondary)' }}>
                                                            Limit: <strong style={{ color: 'var(--text-primary)' }}>{rule.rateLimit} req/min</strong>
                                                        </div>
                                                        <div style={{ color: 'var(--text-secondary)' }}>
                                                            Cost: <strong style={{ color: 'var(--text-primary)' }}>{rule.costUnits} unit{rule.costUnits > 1 ? 's' : ''}</strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card-footer" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    const target = selectedKeyForRules;
                                    setSelectedKeyForRules(null);
                                    setSelectedKeyForEditor(target);
                                }}
                            >
                                ⚙️ Open Dedicated Rule Editor
                            </button>
                            <button className="btn btn-secondary" onClick={() => setSelectedKeyForRules(null)}>
                                Close Viewer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DEDICATED RULE & SCOPE EDITOR MODAL */}
            {selectedKeyForEditor && (
                <RuleEditorModal
                    apiKey={selectedKeyForEditor}
                    onClose={() => setSelectedKeyForEditor(null)}
                    onRuleUpdated={loadKeys}
                    api={api}
                />
            )}
        </div>
    );
}

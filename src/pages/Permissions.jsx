import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

export default function Permissions() {
    const api = useApi();
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    // Group permissions by category
    const groupedPermissions = permissions.reduce((acc, perm) => {
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
                </div>
            )}
        </div>
    );
}

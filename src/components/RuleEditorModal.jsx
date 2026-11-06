import { useState, useEffect } from 'react';

/**
 * Standard registered endpoints in the Open API registry.
 */
export const KNOWN_ENDPOINTS = [
    {
        id: 'public.vehicles.list',
        method: 'GET',
        path: '/api/public/v1/vehicles',
        name: 'List Fleet Vehicles (All)',
        description: 'Query vehicles belonging to authorized companies with status and last location summary.',
        category: 'Vehicles',
        defaultMaxPageSize: 100,
        defaultDenyFields: ['dealer_cost', 'sim_iccid'],
        defaultCost: 1,
        allowedFilters: ['status', 'plateNumber'],
    },
    {
        id: 'public.vehicles.detail.get',
        method: 'GET',
        path: '/api/public/v1/vehicles/:id',
        name: 'Single Vehicle Details (One)',
        description: 'Detailed vehicle information, metadata, model specs, odometer, and current operational status.',
        category: 'Vehicles',
        defaultMaxPageSize: null,
        defaultDenyFields: ['dealer_cost', 'sim_iccid', 'dealerId', 'raw_io_elements'],
        defaultCost: 1,
        allowedFilters: [],
    },
    {
        id: 'public.vehicles.location.get',
        method: 'GET',
        path: '/api/public/v1/vehicles/:id/location',
        name: 'Real-Time Vehicle Location',
        description: 'Latest real-time GPS telemetry, speed, ignition, and battery status for a single vehicle.',
        category: 'Vehicles',
        defaultMaxPageSize: null,
        defaultDenyFields: ['raw_io_elements', 'socket_fd'],
        defaultCost: 1,
        allowedFilters: [],
    },
    {
        id: 'public.vehicles.history.get',
        method: 'GET',
        path: '/api/public/v1/vehicles/:id/history',
        name: 'Single Vehicle Location History',
        description: 'Raw high-frequency GPS ping track from TimescaleDB hypertable for a single vehicle (max 7 days).',
        category: 'History',
        defaultMaxPageSize: 2000,
        defaultMaxTimeRangeDays: 7,
        defaultDenyFields: ['device_battery_raw_mv', 'gsm_operator_code'],
        defaultCost: 3,
        allowedFilters: ['timePreset', 'hours', 'start', 'end', 'maxPoints'],
    },
    {
        id: 'public.vehicles.history.batch',
        method: 'GET',
        path: '/api/public/v1/vehicles/history',
        name: 'Batch Vehicle Location History (Some)',
        description: 'Multi-vehicle location history tracks for up to 20 vehicles in a single query.',
        category: 'History',
        defaultMaxPageSize: 20,
        defaultMaxTimeRangeDays: 7,
        defaultDenyFields: ['device_battery_raw_mv', 'gsm_operator_code'],
        defaultCost: 3,
        allowedFilters: ['vehicleIds', 'timePreset', 'hours', 'start', 'end', 'maxPoints'],
    },
    {
        id: 'public.vehicles.events.get',
        method: 'GET',
        path: '/api/public/v1/vehicles/:id/events',
        name: 'Vehicle Events History',
        description: 'Query driving events (ignition on/off, overspeed, harsh braking, crash, idling) from device events table.',
        category: 'Events',
        defaultMaxPageSize: 100,
        defaultMaxTimeRangeDays: 30,
        defaultDenyFields: ['internal_device_id', 'sim_iccid'],
        defaultCost: 2,
        allowedFilters: ['eventType', 'severity', 'timePreset', 'hours', 'start', 'end'],
    },
    {
        id: 'public.vehicles.trips.get',
        method: 'GET',
        path: '/api/public/v1/vehicles/:id/trips',
        name: 'Vehicle Historical Trips',
        description: 'Trips, routes, start/end timestamps, distance, and duration logs.',
        category: 'Trips',
        defaultMaxPageSize: 100,
        defaultMaxTimeRangeDays: 30,
        defaultDenyFields: ['driver_ssn', 'internal_calc_trace'],
        defaultCost: 2,
        allowedFilters: ['timePreset', 'start', 'end'],
    },
    {
        id: 'public.vehicles.history.get',
        method: 'GET',
        path: '/api/public/v1/vehicles/:id/history',
        name: 'TimescaleDB Telemetry History',
        description: 'Raw high-frequency GPS ping points from TimescaleDB hypertable (capped at 7 days).',
        category: 'History',
        defaultMaxPageSize: 2000,
        defaultMaxTimeRangeDays: 7,
        defaultDenyFields: ['device_battery_raw_mv', 'gsm_operator_code'],
        defaultCost: 3,
        allowedFilters: [],
    },
    {
        id: 'bms.battery.latest',
        method: 'GET',
        path: '/api/public/v1/bms/:identifier/latest',
        name: 'EV BMS Battery Telemetry',
        description: 'Electric vehicle battery management system cell voltages, SoC, SoH, temperature, and diagnostics.',
        category: 'BMS',
        defaultMaxPageSize: null,
        defaultDenyFields: ['raw_error_registers', 'mosfet_override_flag'],
        defaultCost: 1,
        allowedFilters: [],
    },
];

const COMMON_DENY_FIELDS = [
    'dealer_cost',
    'sim_iccid',
    'internal_device_id',
    'raw_io_elements',
    'raw_error_registers',
    'mosfet_override_flag',
    'driver_ssn',
    'internal_calc_trace',
];

export default function RuleEditorModal({ apiKey, onClose, onRuleUpdated, api }) {
    const [activeTab, setActiveTab] = useState('rules'); // 'rules' | 'form' | 'presets' | 'preview'
    const [keyDetails, setKeyDetails] = useState(null);
    const [assignedRules, setAssignedRules] = useState([]);
    const [effectiveAccess, setEffectiveAccess] = useState(null);
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Rule Form State
    const [editingRuleId, setEditingRuleId] = useState(null);
    const [formEndpointId, setFormEndpointId] = useState('public.vehicles.list');
    const [formCustomEndpointId, setFormCustomEndpointId] = useState('');
    const [formMethods, setFormMethods] = useState(['GET']);
    const [formScopeType, setFormScopeType] = useState('global'); // 'global' | 'company'
    const [formSelectedCompanies, setFormSelectedCompanies] = useState([]);
    const [formAllowedVehicles, setFormAllowedVehicles] = useState('');
    const [formMaxPageSize, setFormMaxPageSize] = useState('100');
    const [formMaxTimeRangeDays, setFormMaxTimeRangeDays] = useState('');
    const [formAllowedFilters, setFormAllowedFilters] = useState('status, plateNumber');
    const [formDenyFields, setFormDenyFields] = useState(['dealer_cost', 'sim_iccid']);
    const [formNewDenyField, setFormNewDenyField] = useState('');
    const [formCustomRateLimit, setFormCustomRateLimit] = useState('');
    const [formCostUnits, setFormCostUnits] = useState('1');

    // Preset State
    const [presetCompanyId, setPresetCompanyId] = useState('');
    const [presetLoading, setPresetLoading] = useState(false);

    useEffect(() => {
        loadAllData();
    }, [apiKey?.id]);

    const loadAllData = async () => {
        if (!apiKey?.id) return;
        setLoading(true);
        setError('');
        try {
            // Load key details (with its assigned rules)
            const keyRes = await api.get(`/admin/keys/${apiKey.id}`);
            if (keyRes.data) {
                setKeyDetails(keyRes.data);
                setAssignedRules(keyRes.data.rules || []);
            }

            // Load effective access preview
            try {
                const effRes = await api.get(`/admin/keys/${apiKey.id}/effective-access`);
                setEffectiveAccess(effRes.data);
            } catch {
                // Ignore if not yet available
            }

            // Load companies for the selector
            try {
                const compRes = await api.get('/companies?limit=100');
                setCompanies(compRes.data || []);
                if (compRes.data?.length > 0 && !presetCompanyId) {
                    setPresetCompanyId(compRes.data[0].id);
                }
            } catch {
                // Non-fatal if companies fail to load
            }
        } catch (err) {
            setError(err.message || 'Failed to load key rules and details.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndpointChange = (endpointId) => {
        setFormEndpointId(endpointId);
        const known = KNOWN_ENDPOINTS.find((e) => e.id === endpointId);
        if (known) {
            setFormMethods([known.method]);
            if (known.defaultMaxPageSize) {
                setFormMaxPageSize(String(known.defaultMaxPageSize));
            } else {
                setFormMaxPageSize('');
            }
            if (known.defaultMaxTimeRangeDays) {
                setFormMaxTimeRangeDays(String(known.defaultMaxTimeRangeDays));
            } else {
                setFormMaxTimeRangeDays('');
            }
            if (known.allowedFilters?.length > 0) {
                setFormAllowedFilters(known.allowedFilters.join(', '));
            } else {
                setFormAllowedFilters('');
            }
            if (known.defaultDenyFields?.length > 0) {
                setFormDenyFields([...known.defaultDenyFields]);
            }
            setFormCostUnits(String(known.defaultCost || 1));
        }
    };

    const handleStartAddRule = () => {
        setEditingRuleId(null);
        handleEndpointChange('public.vehicles.list');
        setFormScopeType('global');
        setFormSelectedCompanies([]);
        setFormAllowedVehicles('');
        setFormCustomRateLimit('');
        setError('');
        setSuccessMsg('');
        setActiveTab('form');
    };

    const handleStartEditRule = (rule) => {
        setEditingRuleId(rule.id);
        const isKnown = KNOWN_ENDPOINTS.some((e) => e.id === rule.endpointId);
        if (isKnown) {
            setFormEndpointId(rule.endpointId);
            setFormCustomEndpointId('');
        } else {
            setFormEndpointId('custom');
            setFormCustomEndpointId(rule.endpointId);
        }

        setFormMethods(rule.methods || ['GET']);

        if ((rule.allowedCompanies || []).includes('*')) {
            setFormScopeType('global');
            setFormSelectedCompanies([]);
        } else {
            setFormScopeType('company');
            setFormSelectedCompanies(rule.allowedCompanies || []);
        }

        setFormAllowedVehicles((rule.allowedVehicles || []).join('\n'));
        setFormMaxPageSize(rule.maxPageSize ? String(rule.maxPageSize) : '');
        setFormMaxTimeRangeDays(rule.maxTimeRangeDays ? String(rule.maxTimeRangeDays) : '');
        setFormAllowedFilters((rule.allowedFilters || []).join(', '));
        setFormDenyFields(rule.denyFields || []);
        setFormCustomRateLimit(rule.customRateLimit ? String(rule.customRateLimit) : '');
        setFormCostUnits(String(rule.costUnits || 1));

        setError('');
        setSuccessMsg('');
        setActiveTab('form');
    };

    const handleToggleMethod = (method) => {
        if (formMethods.includes(method)) {
            if (formMethods.length > 1) {
                setFormMethods(formMethods.filter((m) => m !== method));
            }
        } else {
            setFormMethods([...formMethods, method]);
        }
    };

    const handleAddDenyField = (fieldToAdd) => {
        const field = (fieldToAdd || formNewDenyField).trim();
        if (field && !formDenyFields.includes(field)) {
            setFormDenyFields([...formDenyFields, field]);
            setFormNewDenyField('');
        }
    };

    const handleRemoveDenyField = (fieldToRemove) => {
        setFormDenyFields(formDenyFields.filter((f) => f !== fieldToRemove));
    };

    const handleToggleCompany = (companyId) => {
        if (formSelectedCompanies.includes(companyId)) {
            setFormSelectedCompanies(formSelectedCompanies.filter((id) => id !== companyId));
        } else {
            setFormSelectedCompanies([...formSelectedCompanies, companyId]);
        }
    };

    const handleSaveRule = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        const targetEndpointId = formEndpointId === 'custom' ? formCustomEndpointId.trim() : formEndpointId;
        if (!targetEndpointId) {
            setError('Please specify a valid Endpoint ID.');
            return;
        }

        let allowedCompanies = [];
        if (formScopeType === 'global') {
            allowedCompanies = ['*'];
        } else {
            allowedCompanies = formSelectedCompanies;
            if (allowedCompanies.length === 0) {
                setError('When scoping to companies, please select at least one company or choose Global [*].');
                return;
            }
        }

        const vehiclesList = formAllowedVehicles
            .split(/[\n,]/)
            .map((v) => v.trim())
            .filter(Boolean);

        const filtersList = formAllowedFilters
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean);

        const payload = {
            endpointId: targetEndpointId,
            methods: formMethods,
            allowedCompanies,
            allowedVehicles: vehiclesList,
            maxPageSize: formMaxPageSize ? parseInt(formMaxPageSize, 10) : null,
            maxTimeRangeDays: formMaxTimeRangeDays ? parseInt(formMaxTimeRangeDays, 10) : null,
            allowedFilters: filtersList,
            denyFields: formDenyFields,
            customRateLimit: formCustomRateLimit ? parseInt(formCustomRateLimit, 10) : null,
            costUnits: parseInt(formCostUnits, 10) || 1,
            enabled: true,
        };

        setSubmitting(true);
        try {
            await api.post(`/admin/keys/${apiKey.id}/rules`, payload);
            setSuccessMsg(`Rule for "${targetEndpointId}" saved successfully!`);
            await loadAllData();
            if (onRuleUpdated) onRuleUpdated();
            setActiveTab('rules');
        } catch (err) {
            setError(err.message || 'Failed to save endpoint rule.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteRule = async (rule) => {
        if (!confirm(`Are you sure you want to revoke access to endpoint "${rule.endpointId}"?`)) return;

        setError('');
        setSuccessMsg('');
        try {
            await api.delete(`/admin/keys/${apiKey.id}/rules/${rule.id}`);
            setSuccessMsg(`Rule for "${rule.endpointId}" revoked successfully.`);
            await loadAllData();
            if (onRuleUpdated) onRuleUpdated();
        } catch (err) {
            setError(err.message || 'Failed to delete rule.');
        }
    };

    // Quick Preset Handlers
    const handleApplyGlobalVehiclesPreset = async () => {
        if (!confirm('This will configure global access to all vehicles across all companies (public.vehicles.list & public.vehicles.location.get). Continue?')) return;

        setPresetLoading(true);
        setError('');
        try {
            // 1. vehicles.list
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.list',
                methods: ['GET'],
                allowedCompanies: ['*'],
                allowedVehicles: [],
                maxPageSize: 100,
                denyFields: ['dealer_cost', 'sim_iccid'],
                costUnits: 1,
                enabled: true,
            });

            // 2. vehicles.location.get
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.location.get',
                methods: ['GET'],
                allowedCompanies: ['*'],
                allowedVehicles: [],
                denyFields: ['raw_io_elements', 'socket_fd'],
                costUnits: 1,
                enabled: true,
            });

            setSuccessMsg('✓ Global Vehicle Read preset applied! Key can now read all vehicles across all companies.');
            await loadAllData();
            if (onRuleUpdated) onRuleUpdated();
            setActiveTab('rules');
        } catch (err) {
            setError(err.message || 'Failed to apply preset.');
        } finally {
            setPresetLoading(false);
        }
    };

    const handleApplyCompanyPreset = async () => {
        if (!presetCompanyId) {
            setError('Please select a target company.');
            return;
        }

        const compName = companies.find((c) => c.id === presetCompanyId)?.companyName || presetCompanyId;
        if (!confirm(`Configure access to vehicles strictly belonging to "${compName}"?`)) return;

        setPresetLoading(true);
        setError('');
        try {
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.list',
                methods: ['GET'],
                allowedCompanies: [presetCompanyId],
                allowedVehicles: [],
                maxPageSize: 100,
                denyFields: ['dealer_cost', 'sim_iccid'],
                costUnits: 1,
                enabled: true,
            });

            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.location.get',
                methods: ['GET'],
                allowedCompanies: [presetCompanyId],
                allowedVehicles: [],
                denyFields: ['raw_io_elements', 'socket_fd'],
                costUnits: 1,
                enabled: true,
            });

            setSuccessMsg(`✓ Company fleet read preset applied for "${compName}".`);
            await loadAllData();
            if (onRuleUpdated) onRuleUpdated();
            setActiveTab('rules');
        } catch (err) {
            setError(err.message || 'Failed to apply company preset.');
        } finally {
            setPresetLoading(false);
        }
    };

    const handleApplyFullFleetPreset = async () => {
        if (!confirm('This will grant full vehicle access including trips history and raw TimescaleDB telemetry points. Continue?')) return;

        setPresetLoading(true);
        setError('');
        try {
            // list
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.list',
                methods: ['GET'],
                allowedCompanies: ['*'],
                allowedVehicles: [],
                maxPageSize: 100,
                denyFields: ['dealer_cost', 'sim_iccid'],
                costUnits: 1,
                enabled: true,
            });
            // location
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.location.get',
                methods: ['GET'],
                allowedCompanies: ['*'],
                allowedVehicles: [],
                denyFields: ['raw_io_elements'],
                costUnits: 1,
                enabled: true,
            });
            // trips
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.trips.get',
                methods: ['GET'],
                allowedCompanies: ['*'],
                allowedVehicles: [],
                maxPageSize: 100,
                maxTimeRangeDays: 30,
                denyFields: ['driver_ssn', 'internal_calc_trace'],
                costUnits: 2,
                enabled: true,
            });
            // history (TimescaleDB)
            await api.post(`/admin/keys/${apiKey.id}/rules`, {
                endpointId: 'public.vehicles.history.get',
                methods: ['GET'],
                allowedCompanies: ['*'],
                allowedVehicles: [],
                maxPageSize: 2000,
                maxTimeRangeDays: 7,
                denyFields: ['device_battery_raw_mv', 'gsm_operator_code'],
                costUnits: 3,
                enabled: true,
            });

            setSuccessMsg('✓ Full Telematics & History preset applied!');
            await loadAllData();
            if (onRuleUpdated) onRuleUpdated();
            setActiveTab('rules');
        } catch (err) {
            setError(err.message || 'Failed to apply full telematics preset.');
        } finally {
            setPresetLoading(false);
        }
    };

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1050,
                backdropFilter: 'blur(4px)',
            }}
        >
            <div
                className="modal-content card"
                style={{
                    width: '950px',
                    maxWidth: '96%',
                    maxHeight: '92vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    border: '1px solid var(--border)',
                }}
            >
                {/* MODAL HEADER */}
                <div
                    className="card-header"
                    style={{
                        padding: '1.25rem 1.5rem',
                        background: 'linear-gradient(to right, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.05))',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                ⚙️ Rule & Scope Editor
                            </h2>
                            <span
                                style={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.8rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: 4,
                                    background: 'var(--bg-card)',
                                    color: 'var(--accent-hover)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                {apiKey.keyPrefix}
                            </span>
                            <span
                                style={{
                                    fontSize: '0.75rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: 4,
                                    fontWeight: 600,
                                    background: apiKey.environment === 'production' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                    color: apiKey.environment === 'production' ? '#a5b4fc' : '#fcd34d',
                                }}
                            >
                                {apiKey.environment?.toUpperCase()}
                            </span>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem', marginBottom: 0 }}>
                            Key: <strong>{apiKey.label}</strong> • Rate Cap: <strong>{apiKey.defaultRateLimit} req/min</strong> • Monthly Quota: <strong>{apiKey.defaultQuota}</strong>
                        </p>
                    </div>
                    <button
                        className="btn-icon"
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            fontSize: '1.25rem',
                            cursor: 'pointer',
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* NAVIGATION TABS */}
                <div
                    style={{
                        display: 'flex',
                        gap: '0.5rem',
                        padding: '0.5rem 1.5rem',
                        background: 'var(--bg-tertiary)',
                        borderBottom: '1px solid var(--border)',
                    }}
                >
                    <button
                        className="btn btn-sm"
                        onClick={() => setActiveTab('rules')}
                        style={{
                            background: activeTab === 'rules' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'rules' ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                        }}
                    >
                        📋 Configured Rules ({assignedRules.length})
                    </button>
                    <button
                        className="btn btn-sm"
                        onClick={handleStartAddRule}
                        style={{
                            background: activeTab === 'form' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'form' ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                        }}
                    >
                        {editingRuleId ? '✏️ Edit Rule' : '+ Add Endpoint Rule'}
                    </button>
                    <button
                        className="btn btn-sm"
                        onClick={() => setActiveTab('presets')}
                        style={{
                            background: activeTab === 'presets' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'presets' ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                        }}
                    >
                        ⚡ Quick Presets
                    </button>
                    <button
                        className="btn btn-sm"
                        onClick={() => setActiveTab('preview')}
                        style={{
                            background: activeTab === 'preview' ? 'var(--accent)' : 'transparent',
                            color: activeTab === 'preview' ? 'white' : 'var(--text-secondary)',
                            fontWeight: 600,
                        }}
                    >
                        🔍 Effective Access Preview ({effectiveAccess?.totalEndpointsAllowed || 0})
                    </button>
                </div>

                {/* NOTIFICATIONS */}
                {error && (
                    <div style={{ margin: '1rem 1.5rem 0 1.5rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--danger)', borderRadius: 8, color: '#fca5a5', fontSize: '0.85rem' }}>
                        ⚠️ {error}
                    </div>
                )}
                {successMsg && (
                    <div style={{ margin: '1rem 1.5rem 0 1.5rem', padding: '0.75rem 1rem', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid var(--success)', borderRadius: 8, color: '#86efac', fontSize: '0.85rem' }}>
                        {successMsg}
                    </div>
                )}

                {/* MODAL BODY */}
                <div className="card-body" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                            Loading key rules and permissions...
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: CONFIGURED RULES LIST */}
                            {activeTab === 'rules' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                                Active Endpoint Rules
                                            </h3>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Endpoints unlocked for this specific API key.
                                            </span>
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={handleStartAddRule}>
                                            + Assign Endpoint Rule
                                        </button>
                                    </div>

                                    {assignedRules.length === 0 ? (
                                        <div
                                            style={{
                                                padding: '2.5rem',
                                                textAlign: 'center',
                                                background: 'rgba(239, 68, 68, 0.08)',
                                                border: '1px dashed rgba(239, 68, 68, 0.4)',
                                                borderRadius: 8,
                                            }}
                                        >
                                            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🛡️</div>
                                            <h4 style={{ color: '#f87171', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                                                Zero-Trust Baseline: 0 Endpoints Allowed
                                            </h4>
                                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '520px', margin: '0 auto' }}>
                                                This key currently has zero rules. Any client request using this key will immediately receive <code>403 Forbidden (NO_RULES_CONFIGURED)</code>.
                                            </p>
                                            <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                                <button className="btn btn-primary" onClick={handleApplyGlobalVehiclesPreset}>
                                                    🚀 Quick Unlock: Read All Vehicles
                                                </button>
                                                <button className="btn btn-secondary" onClick={handleStartAddRule}>
                                                    Custom Rule
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            {assignedRules.map((rule) => {
                                                const known = KNOWN_ENDPOINTS.find((k) => k.id === rule.endpointId);
                                                const isGlobal = (rule.allowedCompanies || []).includes('*');

                                                return (
                                                    <div
                                                        key={rule.id}
                                                        style={{
                                                            background: 'var(--bg-card)',
                                                            border: '1px solid var(--border)',
                                                            borderRadius: 8,
                                                            padding: '1rem 1.25rem',
                                                            transition: 'border-color 0.2s',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                            <div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                    {(rule.methods || ['GET']).map((m) => (
                                                                        <span
                                                                            key={m}
                                                                            style={{
                                                                                fontSize: '0.7rem',
                                                                                padding: '0.15rem 0.45rem',
                                                                                borderRadius: 4,
                                                                                fontWeight: 700,
                                                                                background: m === 'GET' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(99, 102, 241, 0.2)',
                                                                                color: m === 'GET' ? '#86efac' : '#a5b4fc',
                                                                            }}
                                                                        >
                                                                            {m}
                                                                        </span>
                                                                    ))}
                                                                    <code style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                                                        {known ? known.path : rule.endpointId}
                                                                    </code>
                                                                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                                                        ({rule.endpointId})
                                                                    </span>
                                                                </div>
                                                                {known?.description && (
                                                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.35rem', marginBottom: 0 }}>
                                                                        {known.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    className="btn btn-sm btn-secondary"
                                                                    onClick={() => handleStartEditRule(rule)}
                                                                    title="Edit this rule"
                                                                >
                                                                    ✏️ Edit
                                                                </button>
                                                                <button
                                                                    className="btn btn-sm btn-danger"
                                                                    onClick={() => handleDeleteRule(rule)}
                                                                    title="Revoke endpoint access"
                                                                >
                                                                    🗑 Revoke
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Scope Details Bar */}
                                                        <div
                                                            style={{
                                                                display: 'grid',
                                                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                                                gap: '0.75rem',
                                                                fontSize: '0.8rem',
                                                                marginTop: '0.75rem',
                                                                paddingTop: '0.75rem',
                                                                borderTop: '1px solid rgba(255,255,255,0.06)',
                                                            }}
                                                        >
                                                            {/* Tenancy Scope */}
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                                                                    🏢 Tenancy Scope:
                                                                </span>
                                                                {isGlobal ? (
                                                                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                                                                        🌐 Global [*] (All Companies)
                                                                    </span>
                                                                ) : rule.allowedCompanies?.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                        {rule.allowedCompanies.map((cid) => {
                                                                            const comp = companies.find((c) => c.id === cid);
                                                                            return (
                                                                                <span
                                                                                    key={cid}
                                                                                    style={{
                                                                                        padding: '0.1rem 0.35rem',
                                                                                        background: 'var(--bg-primary)',
                                                                                        borderRadius: 4,
                                                                                        fontSize: '0.7rem',
                                                                                        color: '#93c5fd',
                                                                                    }}
                                                                                    title={cid}
                                                                                >
                                                                                    {comp?.companyName || `${cid.slice(0, 8)}...`}
                                                                                </span>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-muted)' }}>None (Inherited)</span>
                                                                )}
                                                            </div>

                                                            {/* Constraints */}
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                                                                    📏 Constraints:
                                                                </span>
                                                                <div style={{ color: 'var(--text-secondary)' }}>
                                                                    Max Page: <strong style={{ color: 'var(--text-primary)' }}>{rule.maxPageSize || 'Registry Default'}</strong>
                                                                </div>
                                                                {rule.maxTimeRangeDays && (
                                                                    <div style={{ color: 'var(--text-secondary)' }}>
                                                                        Max Range: <strong style={{ color: 'var(--text-primary)' }}>{rule.maxTimeRangeDays} days</strong>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Redacted Fields */}
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                                                                    🛡️ Denied Fields:
                                                                </span>
                                                                {rule.denyFields?.length > 0 ? (
                                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                                        {rule.denyFields.map((f) => (
                                                                            <span
                                                                                key={f}
                                                                                style={{
                                                                                    padding: '0.1rem 0.35rem',
                                                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                                                    color: '#fca5a5',
                                                                                    borderRadius: 4,
                                                                                    fontSize: '0.7rem',
                                                                                }}
                                                                            >
                                                                                ✕ {f}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                                                                )}
                                                            </div>

                                                            {/* Rate Override & Weight */}
                                                            <div>
                                                                <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.2rem' }}>
                                                                    ⚡ Cost & Rate Limit:
                                                                </span>
                                                                <div style={{ color: 'var(--text-secondary)' }}>
                                                                    Rate Limit: <strong style={{ color: 'var(--text-primary)' }}>{rule.customRateLimit || `${keyDetails.defaultRateLimit} (Key Default)`} req/min</strong>
                                                                </div>
                                                                <div style={{ color: 'var(--text-secondary)' }}>
                                                                    Weight: <strong style={{ color: 'var(--text-primary)' }}>{rule.costUnits || 1} unit(s)</strong>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 2: RULE ADD / EDIT FORM */}
                            {activeTab === 'form' && (
                                <form onSubmit={handleSaveRule}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                            {editingRuleId ? '✏️ Edit Endpoint Rule' : '➕ Assign New Endpoint Rule'}
                                        </h3>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setActiveTab('rules')}>
                                            ← Back to Rules List
                                        </button>
                                    </div>

                                    {/* 1. Endpoint Selector */}
                                    <div className="form-group">
                                        <label className="form-label">Target Open API Endpoint *</label>
                                        <select
                                            className="form-input"
                                            value={formEndpointId}
                                            onChange={(e) => handleEndpointChange(e.target.value)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <optgroup label="Registered Open API Endpoints">
                                                {KNOWN_ENDPOINTS.map((ep) => (
                                                    <option key={ep.id} value={ep.id}>
                                                        [{ep.method}] {ep.path} — {ep.name} ({ep.id})
                                                    </option>
                                                ))}
                                            </optgroup>
                                            <option value="custom">+ Custom Endpoint ID...</option>
                                        </select>
                                    </div>

                                    {formEndpointId === 'custom' && (
                                        <div className="form-group">
                                            <label className="form-label">Custom Endpoint Identifier *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. public.vehicles.custom.get"
                                                required
                                                value={formCustomEndpointId}
                                                onChange={(e) => setFormCustomEndpointId(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {/* 2. Allowed Methods */}
                                    <div className="form-group">
                                        <label className="form-label">Permitted HTTP Methods</label>
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                                                <label
                                                    key={m}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        cursor: 'pointer',
                                                        padding: '0.35rem 0.75rem',
                                                        borderRadius: 6,
                                                        background: formMethods.includes(m) ? 'rgba(99, 102, 241, 0.25)' : 'var(--bg-card)',
                                                        border: `1px solid ${formMethods.includes(m) ? 'var(--accent)' : 'var(--border)'}`,
                                                        fontSize: '0.85rem',
                                                        fontWeight: 600,
                                                        color: formMethods.includes(m) ? '#a5b4fc' : 'var(--text-secondary)',
                                                    }}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formMethods.includes(m)}
                                                        onChange={() => handleToggleMethod(m)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    {m}
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 3. Tenancy Scope (Global vs Specific Companies) */}
                                    <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <label className="form-label" style={{ fontWeight: 600 }}>
                                            🏢 Multi-Tenancy Data Scope (allowedCompanies)
                                        </label>
                                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="scopeType"
                                                    value="global"
                                                    checked={formScopeType === 'global'}
                                                    onChange={() => setFormScopeType('global')}
                                                />
                                                <span style={{ fontWeight: formScopeType === 'global' ? 600 : 400, color: formScopeType === 'global' ? '#fbbf24' : 'var(--text-secondary)' }}>
                                                    🌐 Global Scope [*] — Access All Vehicles Across All Companies
                                                </span>
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="scopeType"
                                                    value="company"
                                                    checked={formScopeType === 'company'}
                                                    onChange={() => setFormScopeType('company')}
                                                />
                                                <span style={{ fontWeight: formScopeType === 'company' ? 600 : 400, color: formScopeType === 'company' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                    🏢 Scoped to Specific Company / Companies
                                                </span>
                                            </label>
                                        </div>

                                        {formScopeType === 'company' && (
                                            <div style={{ marginTop: '0.75rem' }}>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                                                    Select one or more authorized companies:
                                                </span>
                                                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', background: 'var(--bg-primary)' }}>
                                                    {companies.map((c) => (
                                                        <label
                                                            key={c.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.5rem',
                                                                padding: '0.25rem 0.5rem',
                                                                cursor: 'pointer',
                                                                borderRadius: 4,
                                                                background: formSelectedCompanies.includes(c.id) ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                                                            }}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={formSelectedCompanies.includes(c.id)}
                                                                onChange={() => handleToggleCompany(c.id)}
                                                            />
                                                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: formSelectedCompanies.includes(c.id) ? 600 : 400 }}>
                                                                {c.companyName}
                                                            </span>
                                                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                                                ({c.id})
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 4. Asset Scope (Specific Vehicles) */}
                                    <div className="form-group">
                                        <label className="form-label">
                                            Asset Scope (allowedVehicles) — Optional
                                        </label>
                                        <textarea
                                            className="form-input"
                                            rows={2}
                                            placeholder="Leave empty for all vehicles in company scope, or enter specific Vehicle UUIDs (newline separated)"
                                            value={formAllowedVehicles}
                                            onChange={(e) => setFormAllowedVehicles(e.target.value)}
                                        />
                                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                            If empty, query results include all vehicles within authorized company scope.
                                        </small>
                                    </div>

                                    {/* 5. Constraints Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Max Page Size (Pagination Ceiling)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="e.g. 50, 100, 200"
                                                value={formMaxPageSize}
                                                onChange={(e) => setFormMaxPageSize(e.target.value)}
                                            />
                                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                Hard clamp on `?limit=N` parameter.
                                            </small>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Max Time Range (Days)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="e.g. 7, 30"
                                                value={formMaxTimeRangeDays}
                                                onChange={(e) => setFormMaxTimeRangeDays(e.target.value)}
                                            />
                                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                Capped difference between `start` and `end` timestamps.
                                            </small>
                                        </div>
                                    </div>

                                    {/* 6. Response Field Redactions (denyFields) */}
                                    <div className="form-group">
                                        <label className="form-label">Response Field Redactions (denyFields)</label>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                                            {formDenyFields.map((field) => (
                                                <span
                                                    key={field}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        color: '#fca5a5',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: 4,
                                                        fontSize: '0.8rem',
                                                    }}
                                                >
                                                    ✕ {field}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveDenyField(field)}
                                                        style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Add sensitive field to redact (e.g. dealer_cost, sim_iccid)"
                                                value={formNewDenyField}
                                                onChange={(e) => setFormNewDenyField(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleAddDenyField();
                                                    }
                                                }}
                                            />
                                            <button type="button" className="btn btn-secondary" onClick={() => handleAddDenyField()}>
                                                + Add
                                            </button>
                                        </div>

                                        {/* Suggestions */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Quick add:</span>
                                            {COMMON_DENY_FIELDS.map((cf) => {
                                                if (formDenyFields.includes(cf)) return null;
                                                return (
                                                    <button
                                                        key={cf}
                                                        type="button"
                                                        onClick={() => handleAddDenyField(cf)}
                                                        style={{
                                                            fontSize: '0.7rem',
                                                            padding: '0.1rem 0.35rem',
                                                            borderRadius: 4,
                                                            background: 'var(--bg-card)',
                                                            border: '1px dashed var(--border)',
                                                            color: 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                        }}
                                                    >
                                                        + {cf}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* 7. Rate Limit & Cost Override */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Custom Rate Limit (req/min)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder={`Leave empty to inherit (${keyDetails.defaultRateLimit} req/min)`}
                                                value={formCustomRateLimit}
                                                onChange={(e) => setFormCustomRateLimit(e.target.value)}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Cost Units (Rate Limiter Weight)</label>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                value={formCostUnits}
                                                onChange={(e) => setFormCostUnits(e.target.value)}
                                            />
                                            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                                Weight deducted from sliding-window rate limit and quota (default: 1).
                                            </small>
                                        </div>
                                    </div>

                                    {/* Form Submit Footer */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('rules')}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="btn btn-primary" disabled={submitting}>
                                            {submitting ? 'Saving Rule...' : editingRuleId ? '✓ Update Rule' : '✓ Save & Assign Rule'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* TAB 3: QUICK PRESETS */}
                            {activeTab === 'presets' && (
                                <div>
                                    <div style={{ marginBottom: '1.25rem' }}>
                                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                            ⚡ 1-Click Access Presets
                                        </h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                                            Instantly stamp standardized, contract-compliant endpoint rules onto this key without manually configuring individual JSON properties.
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                                        {/* Preset 1: Global All Vehicles Read */}
                                        <div
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 10,
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>🌐</span>
                                                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
                                                        All Vehicles — Global Read
                                                    </h4>
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                                    Grants global un-scoped access to read all vehicles and their real-time GPS locations across all companies in the system.
                                                </p>
                                                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#93c5fd' }}>
                                                    <div>✓ <code>public.vehicles.list</code> (Global [*])</div>
                                                    <div>✓ <code>public.vehicles.location.get</code> (Global [*])</div>
                                                    <div>✓ Redacts: <code>dealer_cost</code>, <code>sim_iccid</code></div>
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn-primary"
                                                style={{ marginTop: '1.25rem', width: '100%' }}
                                                onClick={handleApplyGlobalVehiclesPreset}
                                                disabled={presetLoading}
                                            >
                                                {presetLoading ? 'Applying...' : '🚀 Apply Global Vehicles Read'}
                                            </button>
                                        </div>

                                        {/* Preset 2: Company Fleet Read */}
                                        <div
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 10,
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>🏢</span>
                                                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
                                                        Company Fleet Read-Only
                                                    </h4>
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                                    Scopes vehicle listing and location tracking strictly to a designated client company tenant.
                                                </p>
                                                <div style={{ marginTop: '0.75rem' }}>
                                                    <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                                                        Target Company:
                                                    </label>
                                                    <select
                                                        className="form-input"
                                                        value={presetCompanyId}
                                                        onChange={(e) => setPresetCompanyId(e.target.value)}
                                                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                                                    >
                                                        {companies.map((c) => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.companyName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn-secondary"
                                                style={{ marginTop: '1.25rem', width: '100%', borderColor: 'var(--accent)', color: 'var(--accent-hover)' }}
                                                onClick={handleApplyCompanyPreset}
                                                disabled={presetLoading || !presetCompanyId}
                                            >
                                                {presetLoading ? 'Applying...' : '🏢 Apply Company Scope'}
                                            </button>
                                        </div>

                                        {/* Preset 3: Full Telematics & TimescaleDB */}
                                        <div
                                            style={{
                                                background: 'var(--bg-card)',
                                                border: '1px solid var(--border)',
                                                borderRadius: 10,
                                                padding: '1.25rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                    <span style={{ fontSize: '1.5rem' }}>📊</span>
                                                    <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
                                                        Full Telematics & Trips
                                                    </h4>
                                                </div>
                                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                                    Grants access to vehicles, real-time location, trip records, and high-frequency TimescaleDB telemetry points.
                                                </p>
                                                <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#86efac' }}>
                                                    <div>✓ <code>public.vehicles.list</code></div>
                                                    <div>✓ <code>public.vehicles.location.get</code></div>
                                                    <div>✓ <code>public.vehicles.trips.get</code> (30-day max)</div>
                                                    <div>✓ <code>public.vehicles.history.get</code> (7-day max)</div>
                                                </div>
                                            </div>

                                            <button
                                                className="btn btn-secondary"
                                                style={{ marginTop: '1.25rem', width: '100%' }}
                                                onClick={handleApplyFullFleetPreset}
                                                disabled={presetLoading}
                                            >
                                                {presetLoading ? 'Applying...' : '📊 Apply Full Telematics'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: EFFECTIVE ACCESS PREVIEW */}
                            {activeTab === 'preview' && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                                🔍 Dry-Run Effective Access Preview
                                            </h3>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                Resolved runtime permissions and routes for {apiKey.keyPrefix}.
                                            </span>
                                        </div>
                                        <button className="btn btn-secondary btn-sm" onClick={loadAllData}>
                                            ↻ Refresh Preview
                                        </button>
                                    </div>

                                    {!effectiveAccess || effectiveAccess.totalEndpointsAllowed === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)', borderRadius: 8, border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                                            <p style={{ color: '#f87171', margin: 0 }}>
                                                Zero endpoints are currently accessible with this key.
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {effectiveAccess.endpoints.map((ep, idx) => (
                                                <div
                                                    key={idx}
                                                    style={{
                                                        background: 'var(--bg-primary)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: 6,
                                                        padding: '0.75rem 1rem',
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <span style={{ padding: '0.1rem 0.4rem', borderRadius: 4, background: 'rgba(34, 197, 94, 0.2)', color: '#86efac', fontWeight: 700, fontSize: '0.7rem' }}>
                                                                {ep.allowedMethods?.join(', ')}
                                                            </span>
                                                            <code style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                                                {ep.path}
                                                            </code>
                                                        </div>
                                                        <span style={{ fontSize: '0.75rem', color: ep.dataScope.isGlobal ? '#fbbf24' : '#93c5fd', fontWeight: 600 }}>
                                                            {ep.dataScope.isGlobal ? '🌐 Global Scope [*]' : `🏢 ${ep.dataScope.allowedCompanies?.length || 0} Companies`}
                                                        </span>
                                                    </div>

                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                                                        <span>Limit: <strong>{ep.constraints.maxPageSize} items</strong></span>
                                                        {ep.constraints.maxTimeRangeDays && <span>Max Range: <strong>{ep.constraints.maxTimeRangeDays} days</strong></span>}
                                                        <span>Rate: <strong>{ep.rateLimit} req/min</strong></span>
                                                        <span>Cost: <strong>{ep.costUnits} unit(s)</strong></span>
                                                        {ep.denyFields?.length > 0 && <span>Redacted: <strong>{ep.denyFields.join(', ')}</strong></span>}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Sample Curl Command */}
                                            <div style={{ marginTop: '1rem', padding: '0.85rem', background: 'var(--bg-tertiary)', borderRadius: 6, border: '1px solid var(--border)' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.35rem' }}>
                                                    Sample client test request:
                                                </span>
                                                <code style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#a5b4fc', display: 'block', wordBreak: 'break-all' }}>
                                                    curl -X GET "http://&lt;BACKEND_HOST&gt;{effectiveAccess.endpoints[0]?.path}?limit=10" -H "X-Api-Key: &lt;RAW_KEY&gt;"
                                                </code>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* MODAL FOOTER */}
                <div
                    className="card-footer"
                    style={{
                        padding: '1rem 1.5rem',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}
                >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        All rule changes are enforced instantly with HMAC-SHA256 zero-trust verification.
                    </span>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

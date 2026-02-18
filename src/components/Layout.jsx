import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

export default function Layout() {
    const { user, logout } = useAuth();
    const { hasPermission, hasAnyPermission } = usePermissions();

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getRoleBadge = () => {
        if (user?.isDevSuperadmin) return 'Dev Superadmin';
        if (!user?.roles?.length) return 'No Role';
        return user.roles.map(r => r.name).join(', ');
    };

    return (
        <div className="app">
            <aside className="sidebar">
                <div className="sidebar-logo">
                    🚗 Fleet Tracker
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-section">Main</div>
                    <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                        📊 Dashboard
                    </NavLink>

                    {hasPermission('vehicles:read') && (
                        <NavLink to="/vehicles" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            🚗 Vehicles
                        </NavLink>
                    )}

                    {hasPermission('devices:read') && (
                        <NavLink to="/devices" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            📡 Devices
                        </NavLink>
                    )}

                    {hasAnyPermission('owners:read', 'sim_cards:read') && (
                        <div className="nav-section">Data Management</div>
                    )}

                    {hasPermission('owners:read') && (
                        <NavLink to="/owners" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            👤 Owners
                        </NavLink>
                    )}

                    {hasPermission('sim_cards:read') && (
                        <NavLink to="/simcards" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            📱 SIM Cards
                        </NavLink>
                    )}

                    {hasAnyPermission('roles:read', 'users:read', 'companies:read', 'admin:read') && (
                        <div className="nav-section">Admin</div>
                    )}

                    {hasPermission('roles:read') && (
                        <NavLink to="/roles" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            🔐 Roles & Permissions
                        </NavLink>
                    )}

                    {hasPermission('users:read') && (
                        <NavLink to="/users" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            👥 Users
                        </NavLink>
                    )}

                    {hasPermission('companies:read') && (
                        <NavLink to="/companies" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            🏢 Companies
                        </NavLink>
                    )}

                    {hasPermission('admin:read') && (
                        <NavLink to="/system" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            ⚙️ System
                        </NavLink>
                    )}

                    {hasPermission('devices:write') && (
                        <NavLink to="/can-configs" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                            🔧 CAN Configs
                        </NavLink>
                    )}
                </nav>

                <div className="sidebar-user">
                    <div className="user-info">
                        <div className="user-avatar">{getInitials(user?.fullName || user?.username)}</div>
                        <div className="user-details">
                            <div className="user-name">{user?.fullName || user?.username}</div>
                            <div className="user-role">{getRoleBadge()}</div>
                        </div>
                    </div>
                    <button className="btn btn-secondary" style={{ width: '100%' }} onClick={logout}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}

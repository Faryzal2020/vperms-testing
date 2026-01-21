import { useAuth } from '../context/AuthContext';

/**
 * Hook to check if the current user has a specific permission
 * Supports wildcard permissions and devSuperadmin bypass
 */
export function usePermissions() {
    const { user } = useAuth();

    /**
     * Check if user has a specific permission
     * @param {string} permissionKey - Permission key to check (e.g., 'vehicles:create')
     * @returns {boolean} - True if user has permission
     */
    const hasPermission = (permissionKey) => {
        if (!user) return false;

        // DevSuperadmin bypasses all checks
        if (user.isDevSuperadmin) return true;

        // Check if user has permissions array
        if (!user.permissions || !Array.isArray(user.permissions)) return false;

        // Check for wildcard permission
        if (user.permissions.includes('*')) return true;

        // Check for exact permission match
        if (user.permissions.includes(permissionKey)) return true;

        // Check for wildcard resource permission (e.g., 'vehicles:*' matches 'vehicles:create')
        const [resource] = permissionKey.split(':');
        if (user.permissions.includes(`${resource}:*`)) return true;

        return false;
    };

    /**
     * Check if user has ANY of the specified permissions
     * @param {string[]} permissionKeys - Array of permission keys
     * @returns {boolean} - True if user has at least one permission
     */
    const hasAnyPermission = (...permissionKeys) => {
        return permissionKeys.some(key => hasPermission(key));
    };

    /**
     * Check if user has ALL of the specified permissions
     * @param {string[]} permissionKeys - Array of permission keys
     * @returns {boolean} - True if user has all permissions
     */
    const hasAllPermissions = (...permissionKeys) => {
        return permissionKeys.every(key => hasPermission(key));
    };

    /**
     * Check if user has a specific role
     * @param {string} roleName - Role name to check
     * @returns {boolean} - True if user has the role
     */
    const hasRole = (roleName) => {
        if (!user || !user.roles) return false;
        return user.roles.some(role => role.name === roleName);
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
        hasRole,
    };
}

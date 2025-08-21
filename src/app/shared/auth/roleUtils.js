// --- Role-Based Access Control Utilities ---
// Unified role management across both systems

// Define role hierarchy and permissions
export const ROLES = {
    STUDENT: 'student',
    INSTRUCTOR: 'instructor', 
    ADMIN: 'admin',
    SUPER_ADMIN: 'super_admin'
};

export const PERMISSIONS = {
    // Student permissions
    VIEW_COURSES: 'view_courses',
    ENROLL_COURSES: 'enroll_courses',
    SUBMIT_ASSIGNMENTS: 'submit_assignments',
    CHAT_WITH_AI: 'chat_with_ai',
    
    // Instructor permissions
    MANAGE_COURSES: 'manage_courses',
    VIEW_STUDENT_PROGRESS: 'view_student_progress',
    RESPOND_TO_QNA: 'respond_to_qna',
    CREATE_LESSONS: 'create_lessons',
    
    // Admin permissions
    MANAGE_USERS: 'manage_users',
    VIEW_ANALYTICS: 'view_analytics',
    MANAGE_SYSTEM_SETTINGS: 'manage_system_settings',
    ACCESS_COMMAND_CENTER: 'access_command_center',
    
    // Super admin permissions
    MANAGE_ADMINS: 'manage_admins',
    SYSTEM_CONFIGURATION: 'system_configuration',
    DATA_MANAGEMENT: 'data_management'
};

// Role to permissions mapping
const ROLE_PERMISSIONS = {
    [ROLES.STUDENT]: [
        PERMISSIONS.VIEW_COURSES,
        PERMISSIONS.ENROLL_COURSES,
        PERMISSIONS.SUBMIT_ASSIGNMENTS,
        PERMISSIONS.CHAT_WITH_AI
    ],
    [ROLES.INSTRUCTOR]: [
        ...ROLE_PERMISSIONS[ROLES.STUDENT] || [],
        PERMISSIONS.MANAGE_COURSES,
        PERMISSIONS.VIEW_STUDENT_PROGRESS,
        PERMISSIONS.RESPOND_TO_QNA,
        PERMISSIONS.CREATE_LESSONS,
        PERMISSIONS.ACCESS_COMMAND_CENTER
    ],
    [ROLES.ADMIN]: [
        ...ROLE_PERMISSIONS[ROLES.INSTRUCTOR] || [],
        PERMISSIONS.MANAGE_USERS,
        PERMISSIONS.VIEW_ANALYTICS,
        PERMISSIONS.MANAGE_SYSTEM_SETTINGS
    ],
    [ROLES.SUPER_ADMIN]: [
        ...ROLE_PERMISSIONS[ROLES.ADMIN] || [],
        PERMISSIONS.MANAGE_ADMINS,
        PERMISSIONS.SYSTEM_CONFIGURATION,
        PERMISSIONS.DATA_MANAGEMENT
    ]
};

// Helper functions for role checking
export const getUserRole = (user) => {
    return user?.profile?.role || user?.role || ROLES.STUDENT;
};

export const hasPermission = (user, permission) => {
    const userRole = getUserRole(user);
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
    return rolePermissions.includes(permission);
};

export const hasAnyPermission = (user, permissions) => {
    return permissions.some(permission => hasPermission(user, permission));
};

export const hasAllPermissions = (user, permissions) => {
    return permissions.every(permission => hasPermission(user, permission));
};

export const isRole = (user, role) => {
    return getUserRole(user) === role;
};

export const isAtLeastRole = (user, minimumRole) => {
    const userRole = getUserRole(user);
    const roleHierarchy = [ROLES.STUDENT, ROLES.INSTRUCTOR, ROLES.ADMIN, ROLES.SUPER_ADMIN];
    
    const userRoleIndex = roleHierarchy.indexOf(userRole);
    const minimumRoleIndex = roleHierarchy.indexOf(minimumRole);
    
    return userRoleIndex >= minimumRoleIndex;
};

// Admin access helpers
export const canAccessCommandCenter = (user) => {
    return hasPermission(user, PERMISSIONS.ACCESS_COMMAND_CENTER) || 
           isAtLeastRole(user, ROLES.INSTRUCTOR);
};

export const canManageUsers = (user) => {
    return hasPermission(user, PERMISSIONS.MANAGE_USERS);
};

export const canManageCourses = (user) => {
    return hasPermission(user, PERMISSIONS.MANAGE_COURSES);
};

// Email-based role detection (temporary solution for existing users)
export const detectRoleFromEmail = (email) => {
    if (!email) return ROLES.STUDENT;
    
    const emailLower = email.toLowerCase();
    
    // Super admin emails
    if (emailLower === 'mike@mikesalazaracademy.com' || 
        emailLower === 'admin@mikesalazaracademy.com') {
        return ROLES.SUPER_ADMIN;
    }
    
    // Admin emails
    if (emailLower.includes('admin') || 
        emailLower.includes('manager')) {
        return ROLES.ADMIN;
    }
    
    // Instructor emails
    if (emailLower.includes('instructor') || 
        emailLower.includes('teacher') || 
        emailLower.includes('coach')) {
        return ROLES.INSTRUCTOR;
    }
    
    return ROLES.STUDENT;
};

// Role update utility
export const updateUserRole = async (userId, newRole, currentUser) => {
    // Check if current user has permission to change roles
    if (!hasPermission(currentUser, PERMISSIONS.MANAGE_USERS)) {
        throw new Error('Insufficient permissions to change user roles');
    }
    
    // Super admin role can only be assigned by another super admin
    if (newRole === ROLES.SUPER_ADMIN && !isRole(currentUser, ROLES.SUPER_ADMIN)) {
        throw new Error('Only super admins can assign super admin role');
    }
    
    // TODO: Implement database update logic here
    console.log(`Updating user ${userId} to role ${newRole}`);
    
    return { success: true, newRole };
};

// Role-based component wrapper
export const withRoleAccess = (Component, requiredPermission) => {
    return function RoleProtectedComponent(props) {
        const { user, ...otherProps } = props;
        
        if (!hasPermission(user, requiredPermission)) {
            return (
                <div style={{ 
                    padding: 'var(--space-lg)', 
                    textAlign: 'center',
                    color: 'var(--color-textSecondary)'
                }}>
                    <div style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>🔒</div>
                    <h3>Access Restricted</h3>
                    <p>You don't have permission to view this content.</p>
                </div>
            );
        }
        
        return <Component {...otherProps} user={user} />;
    };
};

export default {
    ROLES,
    PERMISSIONS,
    getUserRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAtLeastRole,
    canAccessCommandCenter,
    canManageUsers,
    canManageCourses,
    detectRoleFromEmail,
    updateUserRole,
    withRoleAccess
};

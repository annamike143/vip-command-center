// --- Cross-System Navigation Utilities ---
// Unified navigation between Learning Realm and Command Center

// Base URLs for different environments
const SYSTEM_URLS = {
    learning: {
        development: 'http://localhost:3000',
        production: 'https://learning.mikesalazaracademy.com'
    },
    admin: {
        development: 'http://localhost:3001', 
        production: 'https://admin.mikesalazaracademy.com'
    }
};

// Get current environment
const getCurrentEnvironment = () => {
    if (typeof window === 'undefined') return 'development';
    return window.location.hostname === 'localhost' ? 'development' : 'production';
};

// Navigate between systems
export const navigateToSystem = (system, path = '/', newTab = false) => {
    const environment = getCurrentEnvironment();
    const baseUrl = SYSTEM_URLS[system]?.[environment];
    
    if (!baseUrl) {
        console.error(`Invalid system: ${system}`);
        return;
    }
    
    const url = `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    
    if (newTab) {
        window.open(url, '_blank');
    } else {
        window.location.href = url;
    }
};

// Quick navigation functions
export const goToLearningRealm = (path = '/') => navigateToSystem('learning', path);
export const goToCommandCenter = (path = '/') => navigateToSystem('admin', path);

// Admin-specific navigation
export const goToUserManagement = () => navigateToSystem('admin', '/');
export const goToCourseBuilder = () => navigateToSystem('admin', '/?tab=course-builder');
export const goToMentorshipInbox = () => navigateToSystem('admin', '/?tab=inbox');

// Learning-specific navigation  
export const goToCourse = (courseId, lessonId = null) => {
    const path = lessonId ? `/course/${courseId}/${lessonId}` : `/course/${courseId}`;
    navigateToSystem('learning', path);
};

export const goToMyCourses = () => navigateToSystem('learning', '/');

// User role-based navigation
export const getNavigationForRole = (userRole) => {
    const commonNavigation = [
        { label: 'My Courses', action: () => goToMyCourses() }
    ];
    
    if (userRole === 'admin' || userRole === 'instructor') {
        return [
            ...commonNavigation,
            { label: 'Command Center', action: () => goToCommandCenter() },
            { label: 'User Management', action: () => goToUserManagement() },
            { label: 'Course Builder', action: () => goToCourseBuilder() },
            { label: 'Mentorship Inbox', action: () => goToMentorshipInbox() }
        ];
    }
    
    return commonNavigation;
};

// Deep linking support
export const createDeepLink = (system, path, params = {}) => {
    const environment = getCurrentEnvironment();
    const baseUrl = SYSTEM_URLS[system]?.[environment];
    
    if (!baseUrl) return null;
    
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });
    
    return url.toString();
};

// Cross-system authentication check
export const checkCrossSystemAuth = async () => {
    // This would typically check if user is authenticated across both systems
    // For now, we'll assume Firebase auth handles this
    return true;
};

export default {
    navigateToSystem,
    goToLearningRealm,
    goToCommandCenter,
    goToUserManagement,
    goToCourseBuilder,
    goToMentorshipInbox,
    goToCourse,
    goToMyCourses,
    getNavigationForRole,
    createDeepLink,
    checkCrossSystemAuth
};

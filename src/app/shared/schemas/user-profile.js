// --- Unified User Profile Schema ---
// Standardized schema for both Learning Realm and Command Center

export const USER_PROFILE_SCHEMA = {
    profile: {
        firstName: '',
        lastName: '',
        email: '',
        status: 'active',        // active | frozen | pending
        role: 'student',         // student | admin | instructor
        createdAt: '',
        dateEnrolled: '',        // Keep for backwards compatibility
        updatedAt: '',
        lastActive: '',
        // Optional fields
        displayName: '',
        photoURL: '',
        tempPassword: '',        // For admin reference during creation
        createdBy: ''           // Admin who created the account
    },
    enrollments: {
        // courseId: {
        //     progress: {
        //         currentLessonId: '',
        //         unlockedLessons: {},
        //         completedLessons: {},
        //         qnaThreads: {},
        //         lessonThreads: {}
        //     }
        // }
    },
    aiContext: {
        totalSessions: 0,
        lastSessionDate: '',
        preferences: {
            timezone: '',
            // User preferences for AI interactions
        },
        // AI-specific data separate from core profile
        experienceLevel: 'beginner',
        industry: '',
        currentRole: '',
        primaryGoals: []
    }
};

// Schema validation functions
export const validateUserProfile = (profile) => {
    const required = ['firstName', 'email', 'status', 'role'];
    const missing = required.filter(field => !profile?.profile?.[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required profile fields: ${missing.join(', ')}`);
    }
    
    // Validate status
    const validStatuses = ['active', 'frozen', 'pending'];
    if (!validStatuses.includes(profile.profile.status)) {
        throw new Error(`Invalid status: ${profile.profile.status}`);
    }
    
    // Validate role
    const validRoles = ['student', 'admin', 'instructor'];
    if (!validRoles.includes(profile.profile.role)) {
        throw new Error(`Invalid role: ${profile.profile.role}`);
    }
    
    return true;
};

// Migration helpers for existing data
export const migrateUserProfile = (existingProfile) => {
    // Handle different profile structures and migrate to unified schema
    const migrated = {
        profile: {
            firstName: existingProfile.profile?.firstName || existingProfile.firstName || '',
            lastName: existingProfile.profile?.lastName || existingProfile.lastName || '',
            email: existingProfile.profile?.email || existingProfile.email || '',
            status: existingProfile.profile?.status || 'active',
            role: existingProfile.profile?.role || 'student',
            createdAt: existingProfile.profile?.createdAt || existingProfile.createdAt || new Date().toISOString(),
            dateEnrolled: existingProfile.profile?.dateEnrolled || existingProfile.dateEnrolled || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: existingProfile.profile?.lastActive || new Date().toISOString(),
            displayName: existingProfile.profile?.displayName || existingProfile.displayName || '',
            photoURL: existingProfile.profile?.photoURL || existingProfile.photoURL || '',
            tempPassword: existingProfile.profile?.tempPassword || existingProfile.tempPassword || '',
            createdBy: existingProfile.profile?.createdBy || existingProfile.createdBy || ''
        },
        enrollments: existingProfile.enrollments || {},
        aiContext: {
            totalSessions: existingProfile.aiContext?.totalSessions || existingProfile.engagement?.totalSessions || 0,
            lastSessionDate: existingProfile.aiContext?.lastSessionDate || existingProfile.engagement?.lastSessionDate || '',
            preferences: existingProfile.aiContext?.preferences || {},
            experienceLevel: existingProfile.aiContext?.experienceLevel || existingProfile.personal?.experienceLevel || 'beginner',
            industry: existingProfile.aiContext?.industry || existingProfile.career?.industryInterest || '',
            currentRole: existingProfile.aiContext?.currentRole || existingProfile.career?.currentRole || '',
            primaryGoals: existingProfile.aiContext?.primaryGoals || existingProfile.career?.primaryGoals || []
        }
    };
    
    // Validate migrated profile
    validateUserProfile(migrated);
    
    return migrated;
};

// Helper functions for profile operations
export const createUserProfile = (userData) => {
    const profile = {
        ...USER_PROFILE_SCHEMA,
        profile: {
            ...USER_PROFILE_SCHEMA.profile,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: userData.email || '',
            createdAt: new Date().toISOString(),
            dateEnrolled: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            ...userData
        }
    };
    
    validateUserProfile(profile);
    return profile;
};

export const updateUserProfile = (existingProfile, updates) => {
    const updated = {
        ...existingProfile,
        profile: {
            ...existingProfile.profile,
            ...updates,
            updatedAt: new Date().toISOString(),
            lastActive: new Date().toISOString()
        }
    };
    
    validateUserProfile(updated);
    return updated;
};

export default USER_PROFILE_SCHEMA;

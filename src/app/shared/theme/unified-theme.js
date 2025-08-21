// --- Unified Theme System for VIP Academy ---
// Simplified, maintainable theme system shared between both projects

export const UNIFIED_THEME = {
    // Core Brand Colors
    primary: '#00A9E0',           // Primary blue for actions, links
    accent: '#FFD700',            // Gold for premium features, highlights
    background: '#F5F5F7',        // Main background
    surface: '#FFFFFF',           // Card backgrounds, modals
    text: '#001F3F',              // Primary text color
    textSecondary: '#6A737D',     // Secondary text
    textMuted: '#9CA3AF',         // Muted text, captions
    border: '#E1E4E8',            // Borders, dividers
    
    // Status Colors
    success: '#16A34A',           // Green for success states
    warning: '#F59E0B',           // Orange for warnings
    error: '#EF4444',             // Red for errors
    info: '#3B82F6',              // Blue for info
    
    // Interactive States
    hover: 'rgba(0, 169, 224, 0.1)',
    focus: 'rgba(0, 169, 224, 0.2)',
    disabled: '#CBD5E1',
    
    // Shadows
    shadowCard: '0 4px 12px rgba(0, 0, 0, 0.08)',
    shadowHover: '0 8px 24px rgba(0, 0, 0, 0.12)',
    shadowModal: '0 20px 50px rgba(0, 31, 63, 0.3)',
    
    // Typography
    fontHeading: '"Poppins", sans-serif',
    fontBody: '"Inter", sans-serif',
    
    // Spacing Scale (consistent spacing)
    space: {
        xs: '0.25rem',    // 4px
        sm: '0.5rem',     // 8px
        md: '1rem',       // 16px
        lg: '1.5rem',     // 24px
        xl: '2rem',       // 32px
        '2xl': '3rem',    // 48px
    }
};

// CSS Custom Properties Generator
export const generateCSSVariables = () => {
    const cssVariables = {};
    
    // Convert theme to CSS custom properties
    Object.entries(UNIFIED_THEME).forEach(([key, value]) => {
        if (typeof value === 'object' && key === 'space') {
            // Handle spacing scale
            Object.entries(value).forEach(([spaceKey, spaceValue]) => {
                cssVariables[`--space-${spaceKey}`] = spaceValue;
            });
        } else if (typeof value === 'string') {
            cssVariables[`--color-${key}`] = value;
        }
    });
    
    return cssVariables;
};

// Apply theme to document
export const applyUnifiedTheme = () => {
    const root = document.documentElement;
    const cssVariables = generateCSSVariables();
    
    Object.entries(cssVariables).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    // Legacy compatibility - map old variable names
    const legacyMappings = {
        '--background-color': UNIFIED_THEME.background,
        '--text-primary': UNIFIED_THEME.text,
        '--text-secondary': UNIFIED_THEME.textSecondary,
        '--surface-color': UNIFIED_THEME.surface,
        '--border-color': UNIFIED_THEME.border,
        '--primary-red': UNIFIED_THEME.primary, // Map old red to new primary
        '--primary-red-hover': '#0088CC',
    };
    
    Object.entries(legacyMappings).forEach(([property, value]) => {
        root.style.setProperty(property, value);
    });
    
    console.log('✅ Unified theme applied successfully');
};

// Theme utilities
export const themeUtils = {
    // Get color with opacity
    withOpacity: (color, opacity) => {
        if (color.startsWith('#')) {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }
        return color;
    },
    
    // Get spacing value
    spacing: (scale) => UNIFIED_THEME.space[scale] || scale,
    
    // Responsive breakpoints
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
    }
};

export default UNIFIED_THEME;

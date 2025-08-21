// --- ThemeProvider.js - Unified Theme System ---
'use client';

import { useEffect } from 'react';
import { applyUnifiedTheme } from '../shared/theme/unified-theme';

// Simplified ThemeProvider using unified theme
export default function ThemeProvider({ children }) {
    useEffect(() => {
        applyUnifiedTheme();
    }, []);

    return <>{children}</>;
}
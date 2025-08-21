// --- ThemeSelector.js - SmartBot Theme Display ---
'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import './ThemeSelector.css';

const ThemeSelector = () => {
    const { themeName } = useTheme();

    return (
        <div className="theme-selector">
            <div className="theme-display">
                🤖 {themeName}
            </div>
        </div>
    );
};

export default ThemeSelector;

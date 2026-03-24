/**
 * 🪄 LUMOS IL - MAGIC FINGERPRINT UTILITY (UPGRADED)
 * Generates a browser fingerprint using Canvas rendering + Hardware specs.
 * Survives Incognito mode as it relies on hardware/engine quirks.
 */

export const getMagicFingerprint = (): string => {
    if (typeof window === 'undefined') return '';

    try {
        // 1. Hardware & Engine Components
        const components = [
            window.navigator.userAgent,
            window.navigator.language,
            window.screen.width + 'x' + window.screen.height,
            window.screen.colorDepth,
            new Date().getTimezoneOffset(),
            window.navigator.hardwareConcurrency || 'unknown',
            // @ts-ignore
            window.navigator.deviceMemory || 'unknown',
        ];

        // 2. Canvas Fingerprinting (The "Secret Sauce")
        // Rendering a specific string to a hidden canvas reveals GPU/Browser rendering quirks.
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            canvas.width = 240;
            canvas.height = 60;
            ctx.textBaseline = "top";
            ctx.font = "14px 'Arial'";
            ctx.textBaseline = "alphabetic";
            ctx.fillStyle = "#f60";
            ctx.fillRect(125,1,62,20);
            ctx.fillStyle = "#069";
            ctx.fillText("Lumos-IL Wizard Trace 🧙‍♂️", 2, 15);
            ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
            ctx.fillText("Hidden-Spell-12345", 4, 45);
            
            const canvasData = canvas.toDataURL();
            components.push(canvasData);
        }

        // 3. Simple hash function for the components string
        const str = components.join('|');
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }

        return 'WIZ-' + Math.abs(hash).toString(36).toUpperCase();
    } catch (e) {
        // Fallback for extreme privacy-hardened browsers
        return 'WIZ-FALLBACK-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    }
};

const STICKY_KEY = 'lumos_wizard_trace';

/**
 * Plants a sticky marker in localStorage that survives logouts.
 */
export const plantStickyMarker = (role: string) => {
    if (typeof window === 'undefined') return;
    if (role === 'אסיר אזקבאן' || role === 'GHOST') {
        localStorage.setItem(STICKY_KEY, 'marked-by-ministry');
    }
};

/**
 * Checks if the browser has a sticky marker of a banned user.
 */
export const hasStickyMarker = (): boolean => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STICKY_KEY) === 'marked-by-ministry';
};

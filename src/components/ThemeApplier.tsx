'use client';

import { useEffect } from 'react';

/**
 * A client-side component that applies stored theme and font-size settings
 * to the root HTML element. This prevents hydration mismatches by running
 * only on the client after initial mount.
 */
export function ThemeApplier() {
  useEffect(() => {
    const applySettings = () => {
      const saved = localStorage.getItem('vlognest_display_config');
      if (!saved) return;

      try {
        const config = JSON.parse(saved);
        const html = document.documentElement;

        // Apply Theme
        if (config.theme === 'dark') {
          html.classList.add('dark');
        } else if (config.theme === 'light') {
          html.classList.remove('dark');
        } else if (config.theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (isDark) html.classList.add('dark');
          else html.classList.remove('dark');
        }

        // Apply Font Size
        if (config.fontSize) {
          html.style.setProperty('--root-font-size', `${config.fontSize}%`);
        }
      } catch (e) {
        console.error('Failed to apply display settings', e);
      }
    };

    applySettings();

    // Listen for storage changes from other tabs
    window.addEventListener('storage', applySettings);
    return () => window.removeEventListener('storage', applySettings);
  }, []);

  return null;
}
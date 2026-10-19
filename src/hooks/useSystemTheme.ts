import { useState, useEffect } from 'react'

export function useSystemTheme() {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        // Check if the window object exists (for SSR safety)
        if (typeof window === 'undefined') return

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

        // Set the initial value
        setIsDark(mediaQuery.matches)

        // Listener for subsequent changes
        const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)

        // Modern browsers use addEventListener
        mediaQuery.addEventListener('change', handler)

        return () => mediaQuery.removeEventListener('change', handler)
    }, [])

    return isDark ? 'dark' : 'light'
}
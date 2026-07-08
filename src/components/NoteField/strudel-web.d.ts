/**
 * @strudel/web ships no TypeScript types. This is the minimal ambient
 * declaration needed for the functions this project actually imports —
 * everything else (chord, setcpm, hush, ...) is typed where it's used,
 * on the Window interface, since that's how the package exposes it.
 */
declare module '@strudel/web' {
    export function initStrudel(options?: Record<string, unknown>): Promise<void> | void;
}

// Most Vite/CRA setups already declare this (vite/client, react-app-env.d.ts).
// Included here only so this file type-checks standalone if yours doesn't.
declare module '*.css';
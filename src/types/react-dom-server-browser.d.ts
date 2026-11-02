/**
 * react-dom-server-browser.d.ts
 * src/types/react-dom-server-browser.d.ts
 *
 * A declaration for `react-dom/server.browser`, which @types/react-dom does
 * not ship one for.
 *
 * ─── WHY THIS FILE EXISTS ────────────────────────────────────────────────────
 *
 * `renderToReadableStream` is the only server renderer that both waits for
 * lazy components to resolve and needs nothing from `node:stream`. The
 * alternative, `renderToPipeableStream`, is only in the `react-dom/server`
 * Node entry and requires a `Writable`, which means `@types/node` in a tsconfig
 * that is otherwise browser only.
 *
 * Installing @types/node is not free here. The project's tsconfig does not set
 * `types`, so @types/node would be picked up globally and would change what
 * `setTimeout` returns across the entire codebase, from `number` to
 * `NodeJS.Timeout`. That is the kind of change that breaks a file nobody
 * touched. A fifteen line declaration for one function has no such reach.
 *
 * `react-dom/server.browser` does exist and does export this function; only its
 * types are missing. Checked against react-dom 18.3.
 *
 * Delete this file if @types/react-dom ever ships `server.browser.d.ts`, or if
 * the project moves to React 19, whose `react-dom/server` Node entry exports
 * `renderToReadableStream` directly.
 */

declare module 'react-dom/server.browser' {
    import type { ReactNode } from 'react'

    interface RenderToReadableStreamOptions {
        identifierPrefix?: string
        namespaceURI?: string
        nonce?: string
        bootstrapScriptContent?: string
        bootstrapScripts?: string[]
        bootstrapModules?: string[]
        progressiveChunkSize?: number
        signal?: AbortSignal
        onError?: (error: unknown) => string | void
    }

    /**
     * Resolves once the shell is ready. The returned stream also carries an
     * `allReady` promise, which resolves once every Suspense boundary has
     * settled and every lazy component has loaded. That promise is the whole
     * reason for using this function.
     */
    export function renderToReadableStream(
        children: ReactNode,
        options?: RenderToReadableStreamOptions,
    ): Promise<ReadableStream<Uint8Array> & { allReady: Promise<void> }>
}
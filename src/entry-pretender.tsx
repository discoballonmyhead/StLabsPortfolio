/**
 * entry-prerender.tsx
 * src/entry-prerender.tsx
 *
 * The build-time entry point. Never shipped to the browser.
 *
 * scripts/prerender.mjs bundles this file for Node and calls `renderPath` once
 * per route. Everything the script needs out of the app comes through here, so
 * the script itself never imports TypeScript and never has to know about the
 * `@/` alias.
 *
 * ─── WHY NOT renderToString ──────────────────────────────────────────────────
 *
 * Half the pages are behind `lazy()`. `renderToString` does not wait for a
 * Suspense boundary to resolve: it renders the fallback and returns. Every
 * project page, privacy page and status page would prerender as the loading
 * overlay, which is worse than prerendering nothing, because a crawler would
 * then index the word "Loading" as the content of forty pages.
 *
 * ─── WHY THE WEB STREAM AND NOT THE NODE ONE ─────────────────────────────────
 *
 * `renderToReadableStream` and `renderToPipeableStream` both wait for lazy
 * chunks. The pipeable one needs a `node:stream` Writable, which drags
 * `@types/node` and `Buffer` into a tsconfig that is otherwise browser only,
 * and then this file stops compiling under the project's own settings.
 *
 * The web stream version needs none of that: `ReadableStream` and `Response`
 * are globals in Node 18 and typed by the DOM lib the project already has. Its
 * `allReady` promise is also a cleaner way to say "wait for everything" than a
 * callback plus a sink.
 *
 * It is imported from `react-dom/server.browser` rather than
 * `react-dom/server`, because the Node entry of react-dom 18 exports
 * `renderToPipeableStream` and not this one. The browser entry runs perfectly
 * well in Node; it is named for the stream flavour it uses, not for where it
 * can run. @types/react-dom has no declaration for that entry, so there is a
 * small one in src/types/react-dom-server-browser.d.ts with the reasoning in
 * it.
 */

import { renderToReadableStream } from 'react-dom/server.browser'
import { StaticRouter } from 'react-router-dom'
import RouteTree from './RouteTree'
import { routes } from './routes'
// Add the specific file extension

export { resolveMeta, absoluteUrl, allIndexablePaths, allPrerenderPaths } from './seo/routeMeta'
export { graphFor } from './seo/jsonld'
export { brand, projects, leadership } from './config'
export { seo } from './config/site.config.seo'
export interface RenderResult {
    html: string
    /** Errors React recovered from inside a Suspense boundary. */
    recoverable: string[]
}

/**
 * Render one path to HTML.
 *
 * Rejects on a real render error rather than returning half a document, so the
 * script can report which route broke and move on instead of writing a
 * truncated file over a good one.
 */
export async function renderPath(path: string): Promise<RenderResult> {
    const recoverable: string[] = []

    const stream = await renderToReadableStream(
        <StaticRouter location={path}>
            <RouteTree routes={routes} />
        </StaticRouter>,
        {
            onError(error: unknown) {
                // Called for an error inside a boundary. The render can still
                // complete, so these are collected rather than thrown. A
                // failure in the shell itself rejects the promise above instead.
                recoverable.push(error instanceof Error ? error.message : String(error))
            },
        },
    )

    // Without this the stream resolves as soon as the shell is ready, which is
    // before any lazy page has loaded. This is the line that makes lazy routes
    // prerender as their real content.
    await stream.allReady

    const html = await new Response(stream as unknown as BodyInit).text()
    return { html, recoverable }
}
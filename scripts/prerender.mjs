// scripts/prerender.mjs
//
// Runs after `vite build`. Walks every path in src/routes.tsx and writes a
// real, fully-rendered index.html for each one into dist/. Only depends on
// official react-router-dom + react-dom/server exports, so it tracks
// react-router-dom's own version directly — no third-party SSG wrapper that
// can fall behind after a version bump.
import { createServer } from 'vite'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import React from 'react'
import fs from 'node:fs/promises'
import path from 'node:path'
import { Writable } from 'node:stream'

const root = process.cwd()
const dist = path.join(root, 'dist')

function flatten(routeList, prefix = '') {
  const out = []
  for (const r of routeList) {
    const segment = r.index ? '' : (r.path ?? '')
    const full = ('/' + [prefix, segment].filter(Boolean).join('/')).replace(/\/{2,}/g, '/')
    if (r.children) out.push(...flatten(r.children, full))
    else if (r.path !== '*') out.push(full)
  }
  return out
}

// renderToString can't wait for React.lazy()/Suspense to resolve — it just
// emits the fallback. renderToPipeableStream's onAllReady callback is the
// one that actually waits for every lazy chunk before we capture output,
// which matters a lot here since almost every page is lazy-loaded.
function renderPage(element) {
  return new Promise((resolve, reject) => {
    let html = ''
    const writable = new Writable({
      write(chunk, _enc, cb) {
        html += chunk.toString()
        cb()
      },
    })
    const { pipe } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(writable)
        writable.on('finish', () => resolve(html))
      },
      onError(err) {
        reject(err)
      },
    })
  })
}

const ROOT_DIV_RE = /<div id="root"([^>]*)><\/div>/

async function main() {
  const vite = await createServer({
    root,
    server: { middlewareMode: true },
    appType: 'custom',
  })

  const { routes } = await vite.ssrLoadModule('/src/routes.tsx')
  const { default: RouteTree } = await vite.ssrLoadModule('/src/RouteTree.tsx')

  const paths = flatten(routes)
  const template = await fs.readFile(path.join(dist, 'index.html'), 'utf-8')

  if (!ROOT_DIV_RE.test(template)) {
    throw new Error(
      '[prerender] Could not find `<div id="root"></div>` in dist/index.html. ' +
      'If your mount element uses a different id or isn\'t empty in source, ' +
      'update ROOT_DIV_RE in this script to match it.',
    )
  }

  console.log(`[prerender] rendering ${paths.length} routes...`)
  for (const p of paths) {
    const appHtml = await renderPage(
      React.createElement(
        StaticRouter,
        { location: p },
        React.createElement(RouteTree, { routes }),
      ),
    )
    const html = template.replace(ROOT_DIV_RE, (_m, attrs) => `<div id="root"${attrs}>${appHtml}</div>`)
    const outPath = p === '/'
      ? path.join(dist, 'index.html')
      : path.join(dist, p, 'index.html')
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, html)
    console.log(`  ${p} -> ${path.relative(root, outPath)}`)
  }

  await vite.close()
  console.log('[prerender] done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

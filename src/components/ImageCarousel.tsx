/**
 * ImageCarousel.tsx
 *
 * Lightbox-style image carousel for project screenshots.
 * - Renders a clickable cover thumbnail in the project page
 * - On click opens a full-screen overlay carousel
 * - Keyboard nav (← →, Esc), swipe on mobile, click outside to close
 * - If screenshots array is empty or undefined, renders nothing
 * - Images that fail to load are gracefully skipped with an error tile
 */

import { useEffect, useState, useCallback, useRef } from 'react'

interface Props {
    coverImage?: string
    screenshots?: string[]
    projectName: string
}

const STYLE_ID = 'carousel-styles'
function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return
    const el = document.createElement('style')
    el.id = STYLE_ID
    el.textContent = `
    @keyframes car-fade-in  { from { opacity:0; } to { opacity:1; } }
    @keyframes car-scale-in { from { opacity:0; transform: scale(0.96); } to { opacity:1; transform: scale(1); } }
    .car-overlay {
      position: fixed; inset: 0; z-index: 500;
      background: rgba(4,4,4,0.96);
      display: flex; align-items: center; justify-content: center;
      animation: car-fade-in 0.18s ease-out;
      backdrop-filter: blur(8px);
    }
    .car-img-wrap {
      animation: car-scale-in 0.2s var(--ease-out, cubic-bezier(0.16,1,0.3,1));
    }
    .car-thumb {
      cursor: pointer;
      transition: opacity 0.15s, transform 0.15s;
    }
    .car-thumb:hover { opacity: 0.85; transform: scale(1.01); }
    .car-nav-btn {
      position: absolute; top: 50%; transform: translateY(-50%);
      background: rgba(10,10,10,0.8); border: 1px solid #2a2a2a;
      color: #aaa; cursor: pointer; border-radius: 6px;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s, color 0.12s;
      font-size: 16px; user-select: none;
    }
    .car-nav-btn:hover { background: rgba(30,30,30,0.95); color: #f2f2f2; }
    .car-dot {
      width: 6px; height: 6px; border-radius: 50%;
      transition: background 0.15s, transform 0.15s;
      cursor: pointer;
    }
    .car-dot:hover { transform: scale(1.4); }
  `
    document.head.appendChild(el)
}

function ChevLeft() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15,18 9,12 15,6" /></svg> }
function ChevRight() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9,18 15,12 9,6" /></svg> }
function IconX() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> }
function IconExpand() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg> }

export default function ImageCarousel({ coverImage, screenshots, projectName }: Props) {
    const [open, setOpen] = useState(false)
    const [idx, setIdx] = useState(0)
    const [errSet, setErrSet] = useState<Set<number>>(new Set())
    const touchX = useRef<number | null>(null)

    useEffect(() => { ensureStyles() }, [])

    // Build the images list: cover first (if provided), then remaining screenshots
    const allImages: string[] = []
    if (coverImage) allImages.push(coverImage)
    if (screenshots) {
        for (const s of screenshots) {
            if (s !== coverImage) allImages.push(s)
        }
    }

    // Nothing to show
    if (allImages.length === 0) return null

    // Filter out errored images
    const validImages = allImages.filter((_, i) => !errSet.has(i))

    const openAt = (i: number) => {
        if (validImages.length === 0) return
        setIdx(i)
        setOpen(true)
    }

    const close = useCallback(() => setOpen(false), [])

    const prev = useCallback(() => setIdx(i => (i - 1 + validImages.length) % validImages.length), [validImages.length])
    const next = useCallback(() => setIdx(i => (i + 1) % validImages.length), [validImages.length])

    // Keyboard
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
            if (e.key === 'ArrowLeft') prev()
            if (e.key === 'ArrowRight') next()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open, close, prev, next])

    // Prevent body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    const handleImgError = (i: number) => {
        setErrSet(prev => { const s = new Set(prev); s.add(i); return s })
        // Advance index if current errored
        if (idx >= validImages.length - 1) setIdx(0)
    }

    const hasMultiple = validImages.length > 1

    // ── Cover thumbnail ────────────────────────────────────────────────
    const coverSrc = allImages[0]
    const coverErrored = errSet.has(0)

    return (
        <>
            {/* Thumbnail strip */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                {/* Primary cover */}
                {!coverErrored && (
                    <div
                        className="car-thumb"
                        onClick={() => openAt(0)}
                        style={{
                            position: 'relative',
                            width: '100%',
                            maxWidth: '360px',
                            aspectRatio: '16/9',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            background: '#0f0f0f',
                            border: '1px solid #1e1e1e',
                        }}
                    >
                        <img
                            src={coverSrc}
                            alt={`${projectName} screenshot`}
                            onError={() => handleImgError(0)}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        {hasMultiple && (
                            <div style={{
                                position: 'absolute', bottom: '8px', right: '8px',
                                background: 'rgba(0,0,0,0.7)', border: '1px solid #333',
                                borderRadius: '5px', padding: '4px 8px',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                fontSize: '11px', color: '#aaa', fontWeight: 500,
                            }}>
                                <IconExpand />
                                {validImages.length} photos
                            </div>
                        )}
                    </div>
                )}

                {/* Remaining thumbnails (max 4 visible) */}
                {hasMultiple && validImages.slice(1, 5).map((src, i) => {
                    const realIdx = i + 1
                    if (errSet.has(realIdx)) return null
                    return (
                        <div
                            key={src}
                            className="car-thumb"
                            onClick={() => openAt(realIdx)}
                            style={{
                                width: '80px',
                                aspectRatio: '1/1',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                background: '#0f0f0f',
                                border: '1px solid #1e1e1e',
                                flexShrink: 0,
                            }}
                        >
                            <img
                                src={src}
                                alt={`${projectName} screenshot ${realIdx + 1}`}
                                onError={() => handleImgError(realIdx)}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        </div>
                    )
                })}

            </div>

            {/* ── Lightbox overlay ──────────────────────────────────────── */}
            {open && validImages.length > 0 && (
                <div
                    className="car-overlay"
                    onClick={close}
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${projectName} image ${idx + 1} of ${validImages.length}`}
                    // Touch swipe
                    onTouchStart={e => { touchX.current = e.touches[0].clientX }}
                    onTouchEnd={e => {
                        if (touchX.current === null) return
                        const diff = touchX.current - e.changedTouches[0].clientX
                        if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
                        touchX.current = null
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={close}
                        style={{
                            position: 'fixed', top: '16px', right: '20px',
                            background: 'rgba(10,10,10,0.8)', border: '1px solid #2a2a2a',
                            color: '#aaa', cursor: 'pointer', borderRadius: '6px',
                            width: '36px', height: '36px', zIndex: 501,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        aria-label="Close"
                    >
                        <IconX />
                    </button>

                    {/* Counter */}
                    {hasMultiple && (
                        <div style={{
                            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                            fontSize: '12px', color: '#555', fontVariantNumeric: 'tabular-nums',
                            fontFamily: 'var(--font-mono)', zIndex: 501,
                        }}>
                            {idx + 1} / {validImages.length}
                        </div>
                    )}

                    {/* Image */}
                    <div
                        className="car-img-wrap"
                        key={idx}
                        onClick={e => e.stopPropagation()}
                        style={{
                            maxWidth: 'min(90vw, 1000px)',
                            maxHeight: '80vh',
                            position: 'relative',
                        }}
                    >
                        <img
                            src={validImages[idx]}
                            alt={`${projectName} screenshot ${idx + 1}`}
                            onError={() => handleImgError(idx)}
                            style={{
                                display: 'block',
                                maxWidth: '100%',
                                maxHeight: '80vh',
                                borderRadius: '10px',
                                border: '1px solid #2a2a2a',
                                objectFit: 'contain',
                            }}
                        />
                    </div>

                    {/* Prev / Next */}
                    {hasMultiple && (
                        <>
                            <button
                                className="car-nav-btn"
                                onClick={e => { e.stopPropagation(); prev() }}
                                style={{ left: 'max(12px, 2vw)' }}
                                aria-label="Previous image"
                            >
                                <ChevLeft />
                            </button>
                            <button
                                className="car-nav-btn"
                                onClick={e => { e.stopPropagation(); next() }}
                                style={{ right: 'max(12px, 2vw)' }}
                                aria-label="Next image"
                            >
                                <ChevRight />
                            </button>
                        </>
                    )}

                    {/* Dot indicators */}
                    {hasMultiple && (
                        <div style={{
                            position: 'fixed', bottom: '24px', left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex', gap: '7px', alignItems: 'center', zIndex: 501,
                        }}>
                            {validImages.map((_, i) => (
                                <div
                                    key={i}
                                    className="car-dot"
                                    onClick={e => { e.stopPropagation(); setIdx(i) }}
                                    style={{ background: i === idx ? '#f2f2f2' : '#333' }}
                                />
                            ))}
                        </div>
                    )}

                </div>
            )}
        </>
    )
}
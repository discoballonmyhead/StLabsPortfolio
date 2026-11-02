/**
 * orbControls.ts
 * src/components/orb/orbControls.ts
 *
 * The orb's keyboard layer: which key does what, which orb is listening, and
 * what happens when a key is held down.
 *
 * ─── WHAT WAS WRONG WITH THE OLD VERSION ────────────────────────────────────
 *
 * Six things, and they were all in the same thirty lines.
 *
 *   1. The active orb was claimed inside the keyboard effect, whose dependency
 *      array included several useCallback values. Any re-render that changed
 *      one of those callbacks re-ran the effect, and an older orb could quietly
 *      take the keyboard back off a newer one.
 *
 *   2. On unmount it ran `if (ACTIVE_ORB === orbId) ACTIVE_ORB = null`. Closing
 *      the orb that happened to hold focus left no orb listening at all, so
 *      with a second orb still open on screen the keyboard went dead until you
 *      moved the mouse over it. There is now a stack, and closing the top orb
 *      hands the keyboard to the one underneath.
 *
 *   3. With a single orb open, keys only worked once the pointer had been over
 *      it. One orb should simply have the keyboard.
 *
 *   4. Shake was bound by a hardcoded `case 'j'` in the switch, and then pushed
 *      into the help panel through `as any` with a comment admitting it was a
 *      fallback. Two sources of truth, one of them a cast.
 *
 *   5. The switch matched on config values as case labels. If two actions were
 *      ever given the same key, one branch became silently unreachable: no
 *      error, no warning, just a control that stopped working. Conflicts are
 *      now detected and reported in development.
 *
 *   6. No `event.repeat` guard. Holding E ripped through every shape in a
 *      fraction of a second, which is not a shape browser, it is a strobe.
 *
 * ─── WHAT IS DELIBERATE ─────────────────────────────────────────────────────
 *
 * Only actions with a handler get bound. The binding table can describe more
 * controls than a given orb implements, and the help panel lists what is
 * actually wired rather than what the config aspires to. That means a control
 * can be added to the table ahead of the code without putting a dead key in
 * front of anybody.
 */


import { useEffect, useMemo, useRef } from 'react'
import { OrbBinding, OrbBindingTable } from '../../config/site.config.orb'


// Re-exported so a component can import the binding types from the module it
// is already importing the hook from. The declarations live in site.config.ts,
// next to the table itself, so there is one definition rather than two that can
// drift.
export type { OrbBinding, OrbBindingTable }

/** One function per action the orb implements. */
export type OrbHandlers = Record<string, (() => void) | undefined>

// ── Which orb has the keyboard ────────────────────────────────────────────────
//
// A stack rather than a single id. The top of the stack listens; mounting
// pushes, unmounting removes, and pointing at an orb moves it to the top. The
// stack is module scope because it is shared across every mounted orb, which is
// the one thing here that genuinely is global state.

const orbStack: number[] = []
let seq = 0

export function nextOrbId(): number {
    return ++seq
}

export function pushOrb(id: number): void {
    const at = orbStack.indexOf(id)
    if (at >= 0) orbStack.splice(at, 1)
    orbStack.push(id)
}

export function removeOrb(id: number): void {
    const at = orbStack.indexOf(id)
    if (at >= 0) orbStack.splice(at, 1)
}

export function isActiveOrb(id: number): boolean {
    return orbStack.length > 0 && orbStack[orbStack.length - 1] === id
}

// ── Binding resolution ────────────────────────────────────────────────────────

export interface ResolvedBindings {
    /** key -> action name. */
    byKey: Map<string, string>
    /** Keys claimed by more than one action, with the actions that wanted them. */
    conflicts: { key: string; actions: string[] }[]
}

/**
 * Flatten the binding table into a key lookup, and report collisions.
 *
 * First declaration wins, so the conflict list is advisory rather than fatal: a
 * typo in the config should cost you one control, not the whole orb.
 */
export function resolveBindings(table: OrbBindingTable): ResolvedBindings {
    const byKey = new Map<string, string>()
    const claimed = new Map<string, string[]>()

    for (const [action, binding] of Object.entries(table)) {
        for (const raw of binding.keys) {
            const key = raw.toLowerCase()
            const seenBy = claimed.get(key)
            if (seenBy) {
                seenBy.push(action)
                continue
            }
            claimed.set(key, [action])
            byKey.set(key, action)
        }
    }

    const conflicts = [...claimed.entries()]
        .filter(([, actions]) => actions.length > 1)
        .map(([key, actions]) => ({ key, actions }))

    return { byKey, conflicts }
}

/**
 * Is this event coming from somewhere that owns its own keys?
 *
 * The orb's own title field is the case that matters: typing "e" in it should
 * put an e in the field, not step the shape. Checked against the event target
 * rather than document.activeElement, because the two can disagree during a
 * focus transition, and the target is the one that is actually receiving the
 * character.
 */
function fromTextEntry(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    const tag = target.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
    if (target.isContentEditable) return true
    // A combobox or listbox built out of divs handles its own arrows.
    const role = target.getAttribute('role')
    if (role === 'textbox' || role === 'combobox' || role === 'listbox') return true
    return false
}

export interface UseOrbKeysOptions {
    orbId: number
    bindings: OrbBindingTable
    handlers: OrbHandlers
    /** Set false to detach, for instance while a modal is open over the orb. */
    enabled?: boolean
    /** Minimum gap between repeats of a held key. */
    repeatMs?: number
}

/**
 * Wire the keyboard up to one orb.
 *
 * The handlers object is read through a ref, so changing a handler does not
 * detach and reattach the listener. That is what made the old version's focus
 * stealing possible: the effect re-ran whenever a callback identity changed,
 * and re-running it re-claimed the keyboard.
 */
export function useOrbKeys({
    orbId, bindings, handlers, enabled = true, repeatMs = 110,
}: UseOrbKeysOptions): void {
    const handlersRef = useRef(handlers)
    handlersRef.current = handlers

    const resolved = useMemo(() => resolveBindings(bindings), [bindings])

    // Conflicts are a config mistake, so say so once, loudly, in development.
    useEffect(() => {
        if (!isDev() || resolved.conflicts.length === 0) return
        for (const c of resolved.conflicts) {
            console.warn(
                `[orb] Key "${c.key}" is bound to more than one action: ` +
                `${c.actions.join(', ')}. Only "${c.actions[0]}" will fire. ` +
                'Fix the duplicate in ORB_KEYS in site.config.ts.',
            )
        }
    }, [resolved])

    // Claim the keyboard on mount, and only on mount. Empty dependency array on
    // purpose: see the note at the top of the file.
    useEffect(() => {
        pushOrb(orbId)
        return () => { removeOrb(orbId) }
    }, [orbId])

    const lastFired = useRef(new Map<string, number>())

    useEffect(() => {
        if (!enabled) return

        const onKey = (e: KeyboardEvent) => {
            if (!isActiveOrb(orbId)) return
            // Leave browser and OS shortcuts alone. Shift is allowed through,
            // because a shifted letter is still that letter.
            if (e.metaKey || e.ctrlKey || e.altKey) return
            if (fromTextEntry(e.target)) return

            const action = resolved.byKey.get(e.key.toLowerCase())
            if (!action) return

            const handler = handlersRef.current[action]
            if (!handler) return      // described in the table, not implemented here

            if (e.repeat) {
                if (!bindings[action]?.repeatable) return
                const now = performance.now()
                const prev = lastFired.current.get(action) ?? 0
                if (now - prev < repeatMs) return
                lastFired.current.set(action, now)
            }

            // Only once there is definitely something to do. Calling
            // preventDefault on a key nothing handles breaks the browser's own
            // shortcuts for no reason.
            e.preventDefault()
            handler()
        }

        window.addEventListener('keydown', onKey)
        return () => { window.removeEventListener('keydown', onKey) }
    }, [orbId, resolved, bindings, enabled, repeatMs])
}

/**
 * The bindings to show in the help panel: the ones this orb actually
 * implements, in table order, grouped.
 */
export function visibleBindings(
    bindings: OrbBindingTable, handlers: OrbHandlers,
): { action: string; binding: OrbBinding }[] {
    return Object.entries(bindings)
        .filter(([action]) => typeof handlers[action] === 'function')
        .map(([action, binding]) => ({ action, binding }))
}

export const ORB_GROUP_LABELS: Record<OrbBinding['group'], string> = {
    shape: 'Shape',
    look: 'Look',
    audio: 'Audio',
    window: 'Window',
}

function isDev(): boolean {
    return (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true
}
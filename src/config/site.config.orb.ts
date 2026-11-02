// ─────────────────────────────────────────────────────────────────────────────
// ORB CONTROLS
//
// REPLACES the previous ORB_KEYS / OrbBinding / ORB_KEY_LIST block in
// site.config.ts. Delete those three and paste this in their place.
//
// WHAT CHANGED AND WHY
//
//   `key: string` became `keys: string[]`. One action can now answer to more
//   than one key, which is how the arrows work alongside the letters without a
//   second table. The old shape had no room for that, which is part of why
//   shake ended up hardcoded in the component with an `as any` push into the
//   help panel.
//
//   `group` is new. The help panel was a flat list of eleven rows, which is
//   where a key list stops being readable. It is now four short sections.
//
//   `repeatable` is new. Without it, holding E stepped through every shape in
//   about a quarter of a second. Stepping actions repeat on a throttle; toggles
//   do not repeat at all, because a toggle held down flips sixty times a second
//   and lands wherever it lands.
//
//   ORB_KEY_LIST is gone. The help panel is now built from the actions the orb
//   actually implements, so a control described here but not yet wired up does
//   not appear as a dead key in front of a visitor. If you still import
//   ORB_KEY_LIST somewhere, replace it with visibleBindings(ORB_KEYS, handlers)
//   from components/orb/orbControls.ts.
//
// EDITING THIS
//
//   Keys are matched against `event.key` lower cased, so write them lower case:
//   'e', 'arrowleft', 'escape', '[', '/'. Bind two actions to the same key and
//   the dev console will say so on mount and tell you which one wins.
//
//   An action here with no handler in the component is simply inert. That is on
//   purpose: it lets a control be written down before it is built.
// ─────────────────────────────────────────────────────────────────────────────

export interface OrbBinding {
    /**
     * Keys that trigger this action, matched against `event.key` lower cased.
     * More than one is allowed, so a control can have both a letter and an arrow.
     */
    keys: string[]
    /** What the help panel prints in the key slot. */
    display: string
    /** What the help panel prints as the description. */
    label: string
    /** Which section of the help panel this row lands in. */
    group: 'shape' | 'look' | 'audio' | 'window'
    /**
     * May fire repeatedly while held, on a throttle. True for stepping, false for
     * anything that toggles.
     */
    repeatable?: boolean
}

export type OrbBindingTable = Record<string, OrbBinding>

export const ORB_KEYS: OrbBindingTable = {
    // ── Shape ──────────────────────────────────────────────────────────────────
    nextShape: { keys: ['e', 'arrowright'], display: 'E', label: 'Next shape', group: 'shape', repeatable: true },
    prevShape: { keys: ['q', 'arrowleft'], display: 'Q', label: 'Previous shape', group: 'shape', repeatable: true },
    randomShape: { keys: ['f'], display: 'F', label: 'Random shape', group: 'shape' },
    toggleAuto: { keys: ['c'], display: 'C', label: 'Auto cycle', group: 'shape' },

    // ── Look ───────────────────────────────────────────────────────────────────
    toggleSpin: { keys: ['z'], display: 'Z', label: 'Spin', group: 'look' },
    spinFaster: { keys: [']', 'arrowup'], display: ']', label: 'Spin faster', group: 'look', repeatable: true },
    spinSlower: { keys: ['[', 'arrowdown'], display: '[', label: 'Spin slower', group: 'look', repeatable: true },
    nextColor: { keys: ['x'], display: 'X', label: 'Next colour', group: 'look', repeatable: true },
    prevColor: { keys: ['w'], display: 'W', label: 'Previous colour', group: 'look', repeatable: true },
    toggleShake: { keys: ['j'], display: 'J', label: 'Shake', group: 'look' },

    // ── Audio ──────────────────────────────────────────────────────────────────
    toggleMic: { keys: ['m'], display: 'M', label: 'Mic reactivity', group: 'audio' },
    toggleRec: { keys: ['r'], display: 'R', label: 'Record', group: 'audio' },

    // ── Window ─────────────────────────────────────────────────────────────────
    reset: { keys: ['g'], display: 'G', label: 'Reset to defaults', group: 'window' },
    toggleInfo: { keys: ['i', '/'], display: 'I', label: 'Show or hide keys', group: 'window' },
    close: { keys: ['escape'], display: 'Esc', label: 'Close the orb', group: 'window' },
}
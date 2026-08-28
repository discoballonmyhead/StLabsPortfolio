/**
 * Pure math for turning a Strudel note value + cycle position into a canvas
 * coordinate. No Strudel/canvas/React imports on purpose — verified against
 * known note names before this ever touches a <canvas>.
 */

/** Strudel note values come back as either a MIDI number or a note-name
 *  string (e.g. "cs4", "ef3" — letter + s/f or #/b accidental + octave). */
export function toMidi(value: string | number): number {
    if (typeof value === 'number') return value;
    const m = /^([a-gA-G])([sf#b]*)(-?\d+)?$/.exec(String(value).trim());
    if (!m) return 60; // fallback: middle C — shouldn't normally hit this
    const letters: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
    let semitone = letters[m[1].toLowerCase()];
    for (const ch of m[2]) {
        if (ch === 's' || ch === '#') semitone += 1;
        if (ch === 'f' || ch === 'b') semitone -= 1;
    }
    const octave = m[3] !== undefined ? parseInt(m[3], 10) : 5;
    return (octave + 1) * 12 + semitone;
}

/** Higher pitch -> smaller y (higher on screen). Clamps to the given range
 *  so a stray extreme note doesn't fly off the canvas. */
export function midiToY(midi: number, minMidi: number, maxMidi: number, height: number): number {
    const clamped = Math.min(maxMidi, Math.max(minMidi, midi));
    const t = (clamped - minMidi) / (maxMidi - minMidi || 1);
    return height * (1 - t);
}

/** Maps the fractional position *within the current cycle* (0..1) to an x
 *  coordinate, so notes sweep left-to-right as each cycle plays. */
export function cycleFractionToX(cyclePosition: number, width: number): number {
    const frac = cyclePosition - Math.floor(cyclePosition);
    return frac * width;
}
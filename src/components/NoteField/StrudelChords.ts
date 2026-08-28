/**
 * Chord progression data + pure timing math for the background chord player.
 * No Strudel or React imports here on purpose — this file is just numbers
 * and string-building, so it's trivial to unit test and safe to tweak.
 */

export interface ChordStep {
    /** Strudel chord symbol, fed straight into chord(). e.g. "Dadd9", "Dm7" */
    symbol: string;
    /** What the UI shows for this chip. Defaults to `symbol` if omitted. */
    label?: string;
    /** How many cycles (bars, at `beatsPerCycle` each) this chord holds. */
    bars: number;
}

export interface ProgressionConfig {
    bpm: number;
    /** 4 = standard 4/4 time. Change if the source track isn't in 4/4. */
    beatsPerCycle: number;
    /** Strudel instrument/synth name, e.g. "gm_epiano1", "sawtooth". */
    instrument: string;
    steps: ChordStep[];
}

/**
 * Intro of "Rare" — Going Quantum x Psychic Type (Monstercat).
 * Best-effort transcription of the pad section before the drop (0:00–0:16),
 * from chroma analysis, not a human ear — confident about the Dadd9 <-> Dm7
 * alternation and the ~80bpm half-time feel, less confident about the exact
 * extensions. Edit `symbol`/`bars` below once you've listened against it.
 */
export const RARE_INTRO: ProgressionConfig = {
    bpm: 80,
    beatsPerCycle: 4,
    instrument: 'gm_epiano1',
    steps: [
        { symbol: 'Dadd9', bars: 2 },
        { symbol: 'Dm7', bars: 2 },
    ],
};

/** Turns steps into a Strudel mini-notation alternation string, e.g. "<Dadd9 Dadd9 Dm7 Dm7>" */
export function buildPatternString(steps: ChordStep[]): string {
    const slots = steps.flatMap((step) => Array(Math.max(1, Math.round(step.bars))).fill(step.symbol));
    return `<${slots.join(' ')}>`;
}

export function totalCycles(steps: ChordStep[]): number {
    return steps.reduce((sum, step) => sum + step.bars, 0);
}

export function cycleSeconds(bpm: number, beatsPerCycle: number): number {
    return 60 / (bpm / beatsPerCycle);
}

/** Strudel's scheduler always runs at this rate — @strudel/web's initStrudel()
 *  doesn't expose a working setcpm() outside its string-eval REPL path, so
 *  this is the one clock we actually have. We don't fight it; we slow the
 *  pattern to match the tempo we want instead. */
export const DEFAULT_CPS = 0.5;

/** How much to .slow() the built pattern so that one mini-notation "slot"
 *  takes cycleSeconds(bpm, beatsPerCycle) of real time, given the scheduler
 *  is fixed at DEFAULT_CPS. */
export function slotSlowFactor(bpm: number, beatsPerCycle: number): number {
    const schedulerSecondsPerCycle = 1 / DEFAULT_CPS;
    return cycleSeconds(bpm, beatsPerCycle) / schedulerSecondsPerCycle;
}

/**
 * Given elapsed seconds since playback started, returns the index into
 * `steps` that should currently be highlighted. Pure function of time —
 * doesn't touch Strudel's internal scheduler, so it can't drift out of sync
 * with what the hook *thinks* is playing (only with real playback latency,
 * which is sub-frame in practice).
 */
export function getActiveStepIndex(
    elapsedSeconds: number,
    steps: ChordStep[],
    bpm: number,
    beatsPerCycle: number,
): number {
    const secsPerCycle = cycleSeconds(bpm, beatsPerCycle);
    const total = totalCycles(steps);
    if (total === 0 || secsPerCycle <= 0 || steps.length === 0) return 0;

    const elapsedCycles = elapsedSeconds / secsPerCycle;
    const posInLoop = ((elapsedCycles % total) + total) % total; // handles any float weirdness safely

    let cursor = 0;
    for (let i = 0; i < steps.length; i++) {
        cursor += steps[i].bars;
        if (posInLoop < cursor) return i;
    }
    return steps.length - 1;
}
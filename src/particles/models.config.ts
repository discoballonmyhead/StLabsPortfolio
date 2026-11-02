/**
 * models.config.ts
 * src/particles/models.config.ts
 *
 * Every .glb model the site can render as dots, and how each one should be
 * tuned. This is the only file you edit to add a model.
 *
 * ─── ADDING A MODEL, IN FULL ─────────────────────────────────────────────────
 *
 *   1. Drop the file in `public/models/`, for example
 *      `public/models/mascot.glb`. Files in public/ are served from the site
 *      root, so the url below is `/models/mascot.glb`. Note the leading slash
 *      and the file name: a directory path will not resolve.
 *
 *   2. Add an entry to `modelRegistry` below.
 *
 *   3. Render it: `<ModelField model="mascot" />`, or put it in a morph
 *      sequence as the shape name `'model:mascot'` once it is registered with
 *      the shape system (see useModelShape in glb/useModelShape.ts).
 *
 * That is the whole process. No loader setup, no three.js, no scene graph.
 *
 * ─── EXPORTING FROM BLENDER ──────────────────────────────────────────────────
 *
 * File, Export, glTF 2.0 (.glb), and then in the panel:
 *
 *   Format               glTF Binary (.glb). One self-contained file.
 *   Compression          OFF. Draco compression needs its own decoder, which
 *                        is a large dependency this engine deliberately does
 *                        not carry. The loader will tell you if you forget.
 *   Include              Selected Objects if you only want part of the scene.
 *   Data, Mesh           Apply Modifiers on. Normals on: without them the
 *                        engine falls back to flat face normals, which is
 *                        fine but loses smooth shading information.
 *   Data, Armature       Export Deformation Bones Only is a good default and
 *                        cuts the bone count substantially.
 *   Animation            On, with Sampling if the rig uses constraints or
 *                        drivers, since those do not survive as raw keyframes.
 *
 * Textures and materials are not read at all. Colour comes from `accent`
 * below, which keeps every model on the site's palette instead of dragging in
 * whatever the asset happened to ship with.
 *
 * ─── PICKING A DOT BUDGET ────────────────────────────────────────────────────
 *
 * The budget, not the mesh, decides the cost. A 400-triangle prop and a
 * 300,000-triangle character at the same budget cost the same per frame.
 *
 *   400 to 700     a small accent somewhere in a section
 *   900 to 1,400   a recognisable object at a reasonable size
 *   1,600 to 2,400 the focus of a full-bleed hero
 *   past 3,000     the dots start to merge into a solid and you lose the look
 *
 * `countMobile` applies under 760px wide and defaults to 55% of `count`.
 * Budgets are also scaled down on a small viewport, never up.
 *
 * ─── ORIENTATION ─────────────────────────────────────────────────────────────
 *
 * glTF is Y-up. Blender is Z-up and its exporter converts for you, so a model
 * that looked right in Blender usually needs nothing here. Models from a CAD
 * tool or a game asset pack often arrive lying on their back, which is
 * `rotateX: -90`. The rotation is applied once at load and baked into the
 * sampled positions, so it costs nothing per frame.
 */

export interface ModelEntry {
    /** Served path. Starts with a slash, ends with the file name. */
    url: string
    /** Shown in dev logging and the orb's shape label. */
    label: string
    /** Dot budget on a normal viewport. */
    count: number
    /** Dot budget under 760px wide. Defaults to 55% of `count`. */
    countMobile?: number
    /**
     * Degrees. Edges where two faces meet more sharply than this become the
     * structure wireframe. Lower catches more: 20 traces a hard-surface model
     * heavily, 50 only its silhouette. Set edgeBudget to 0 to turn the
     * wireframe off entirely for an organic shape.
     */
    edgeAngle?: number
    /** Share of the budget the wireframe may use. 0 disables it. */
    edgeBudget?: number
    /** One-time orientation fix, in degrees. */
    rotateX?: number
    rotateY?: number
    rotateZ?: number
    /** Multiplies the fitted size. 1 fills the same volume as the other shapes. */
    scale?: number
    /** Degrees per second of automatic rotation. 0 holds still. */
    spin?: number
    /** Which animation clip to play. -1 holds the rest pose. */
    clip?: number
    /** Near colour. Dots fade from the page background to this with depth. */
    accent?: string
    /** Sampling seed, so a model's dot layout is identical every load. */
    seed?: number
}

/** Fallbacks for anything an entry leaves out. */
export const modelDefaults = {
    count: 1200,
    edgeAngle: 35,
    edgeBudget: 0.3,
    spin: 6,
    accent: '#FF8C55',
}

/**
 * The registry.
 *
 * The entries below are commented out because the files do not exist yet.
 * Uncomment one, drop the .glb in `public/models/`, and it works. They are
 * left here as worked examples of the three cases that actually come up.
 */
export const modelRegistry: Record<string, ModelEntry> = {
    // ── A hard-surface object ────────────────────────────────────────────────
    // Low edge angle, generous wireframe budget: panel lines and corners are
    // most of what makes a built object read as built.
    //
    // 'chassis': {
    //   url: '/models/chassis.glb',
    //   label: 'Chassis',
    //   count: 1600,
    //   edgeAngle: 22,
    //   edgeBudget: 0.38,
    //   spin: 8,
    //   accent: '#FF8C55',
    // },

    // ── An organic shape ─────────────────────────────────────────────────────
    // Wireframe off. A smooth surface has no sharp edges to trace, so the edge
    // pass would either find nothing or find triangulation noise.
    //
    // 'mascot': {
    //   url: '/models/mascot.glb',
    //   label: 'Mascot',
    //   count: 1400,
    //   countMobile: 700,
    //   edgeBudget: 0,
    //   spin: 5,
    //   accent: '#7AB8FF',
    // },

    // ── A rigged, animated character ─────────────────────────────────────────
    // clip 0 is the first animation in the file. Spin usually wants to be low
    // or zero, because the animation is already providing the movement and the
    // two together read as seasickness.
    //
    // 'walker': {
    //   url: '/models/walker.glb',
    //   label: 'Walker',
    //   count: 1800,
    //   countMobile: 900,
    //   edgeAngle: 45,
    //   edgeBudget: 0.15,
    //   clip: 0,
    //   spin: 0,
    //   rotateY: 180,
    //   accent: '#A07AFF',
    // },
}

/** Ids in a stable order, for anything that cycles through them. */
export const MODEL_IDS: string[] = Object.keys(modelRegistry)

/**
 * The shape name a registered model answers to inside a morph sequence.
 *
 * `'model:mascot'` can sit in a `shapes` array next to `'icosphere'` and
 * `'trefoil'` and the engine will morph to it like any other shape, once
 * useModelShape has registered it.
 */
export function modelShapeName(id: string): `model:${string}` {
    return `model:${id}`
}
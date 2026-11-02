/**
 * glb-math.ts
 * src/particles/glb/glb-math.ts
 *
 * The matrix and quaternion maths the GLB engine needs, and nothing else.
 *
 * Two rules in this file, both of which exist because this code runs inside a
 * 60fps loop:
 *
 *   1. Nothing allocates. Every function writes into an output array you pass
 *      in. There are no return-a-new-Float32Array helpers, because a helper
 *      like that called once per bone per frame is a few thousand allocations
 *      a second and the garbage collector shows up as stutter.
 *
 *   2. Matrices are column-major 16-element Float32Arrays, the same layout
 *      glTF uses for its accessor data and the same layout WebGL uses. So a
 *      matrix read straight out of a .glb file needs no transposing, and the
 *      index arithmetic matches every reference you will look up.
 *
 * Column-major means element m[12], m[13], m[14] is the translation, which
 * looks wrong if you are used to the maths-textbook layout. It is not wrong,
 * it is the other convention.
 */

/** Column-major 4x4. */
export type Mat4 = Float32Array
/** x, y, z, w. glTF stores quaternions in exactly this order. */
export type Quat = Float32Array
export type Vec3 = Float32Array

export function mat4(): Mat4 {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
}

export function mat4Identity(out: Mat4): Mat4 {
    out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0
    out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0
    out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0
    out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1
    return out
}

export function mat4Copy(out: Mat4, a: ArrayLike<number>, aOff = 0): Mat4 {
    for (let i = 0; i < 16; i++) out[i] = a[aOff + i]
    return out
}

/**
 * out = a * b, in the sense that applying `out` to a point is the same as
 * applying b first and then a. That is the order you want for a node
 * hierarchy: world = parentWorld * local.
 *
 * Written out rather than looped. The loop version is shorter and measurably
 * slower, and this is called once per node per frame.
 */
export function mat4Mul(out: Mat4, a: Mat4, b: Mat4): Mat4 {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3]
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7]
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11]
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15]

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3]
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7]
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11]
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15]
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33
    return out
}

/**
 * Compose a local matrix from a glTF node's translation, rotation and scale.
 *
 * glTF applies them in the order T * R * S, which is the only order that makes
 * non-uniform scale behave sanely under rotation. Getting this order wrong
 * produces a model that shears as it animates, which is a distinctive and
 * confusing failure, so it is worth stating.
 */
export function mat4FromTRS(out: Mat4, t: Vec3, r: Quat, s: Vec3): Mat4 {
    const x = r[0], y = r[1], z = r[2], w = r[3]
    const x2 = x + x, y2 = y + y, z2 = z + z
    const xx = x * x2, xy = x * y2, xz = x * z2
    const yy = y * y2, yz = y * z2, zz = z * z2
    const wx = w * x2, wy = w * y2, wz = w * z2
    const sx = s[0], sy = s[1], sz = s[2]

    out[0] = (1 - (yy + zz)) * sx
    out[1] = (xy + wz) * sx
    out[2] = (xz - wy) * sx
    out[3] = 0
    out[4] = (xy - wz) * sy
    out[5] = (1 - (xx + zz)) * sy
    out[6] = (yz + wx) * sy
    out[7] = 0
    out[8] = (xz + wy) * sz
    out[9] = (yz - wx) * sz
    out[10] = (1 - (xx + yy)) * sz
    out[11] = 0
    out[12] = t[0]
    out[13] = t[1]
    out[14] = t[2]
    out[15] = 1
    return out
}

/** Transform a point. Writes 3 floats into out at outOff. */
export function mat4XformPoint(
    out: Float32Array, outOff: number,
    m: Mat4,
    x: number, y: number, z: number,
): void {
    out[outOff] = m[0] * x + m[4] * y + m[8] * z + m[12]
    out[outOff + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
    out[outOff + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
}

/**
 * Transform a direction, ignoring translation.
 *
 * Strictly a normal should go through the inverse transpose, which differs
 * from this whenever there is non-uniform scale. For dot shading the error is
 * a slight brightness shift on a squashed model and is not worth a matrix
 * inversion per node per frame, so this is deliberate.
 */
export function mat4XformDir(
    out: Float32Array, outOff: number,
    m: Mat4,
    x: number, y: number, z: number,
): void {
    out[outOff] = m[0] * x + m[4] * y + m[8] * z
    out[outOff + 1] = m[1] * x + m[5] * y + m[9] * z
    out[outOff + 2] = m[2] * x + m[6] * y + m[10] * z
}

// ── Quaternions ───────────────────────────────────────────────────────────────

/**
 * Spherical linear interpolation, with the short-way-round fix.
 *
 * If the dot product is negative the two quaternions describe the same pair of
 * orientations but the interpolation would take the long way round, spinning a
 * limb most of the way through a circle to reach a pose next door. Negating one
 * input fixes it. Animation exporters do not normalise for this, so the check
 * is not optional.
 *
 * Near-parallel inputs fall back to a straight lerp, because sin(theta)
 * approaches zero and the division blows up.
 */
export function quatSlerp(
    out: Quat, outOff: number,
    a: ArrayLike<number>, aOff: number,
    b: ArrayLike<number>, bOff: number,
    t: number,
): void {
    let ax = a[aOff], ay = a[aOff + 1], az = a[aOff + 2], aw = a[aOff + 3]
    const bx = b[bOff], by = b[bOff + 1], bz = b[bOff + 2], bw = b[bOff + 3]

    let cos = ax * bx + ay * by + az * bz + aw * bw
    if (cos < 0) {
        cos = -cos
        ax = -ax; ay = -ay; az = -az; aw = -aw
    }

    let s0: number, s1: number
    if (cos > 0.9995) {
        s0 = 1 - t
        s1 = t
    } else {
        const theta = Math.acos(cos)
        const sin = Math.sin(theta)
        s0 = Math.sin((1 - t) * theta) / sin
        s1 = Math.sin(t * theta) / sin
    }

    let x = s0 * ax + s1 * bx
    let y = s0 * ay + s1 * by
    let z = s0 * az + s1 * bz
    let w = s0 * aw + s1 * bw

    // Renormalise. The lerp fallback above does not preserve length, and an
    // unnormalised quaternion in mat4FromTRS scales the whole node.
    const len = Math.sqrt(x * x + y * y + z * z + w * w) || 1
    x /= len; y /= len; z /= len; w /= len

    out[outOff] = x; out[outOff + 1] = y; out[outOff + 2] = z; out[outOff + 3] = w
}

export function quatNormalize(out: Quat, off: number): void {
    const x = out[off], y = out[off + 1], z = out[off + 2], w = out[off + 3]
    const len = Math.sqrt(x * x + y * y + z * z + w * w)
    if (len === 0) {
        out[off] = 0; out[off + 1] = 0; out[off + 2] = 0; out[off + 3] = 1
        return
    }
    out[off] = x / len; out[off + 1] = y / len; out[off + 2] = z / len; out[off + 3] = w / len
}

// ── Scalar helpers ────────────────────────────────────────────────────────────

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function clamp(v: number, lo: number, hi: number): number {
    return v < lo ? lo : v > hi ? hi : v
}

/**
 * Cubic Hermite, for glTF's CUBICSPLINE interpolation.
 *
 * glTF stores cubic spline keyframes as triples: in-tangent, value,
 * out-tangent. The tangents are scaled by the keyframe delta, which is why
 * `dt` is a parameter rather than baked into the tangents.
 */
export function hermite(
    p0: number, m0: number, p1: number, m1: number,
    t: number, dt: number,
): number {
    const t2 = t * t
    const t3 = t2 * t
    return (
        (2 * t3 - 3 * t2 + 1) * p0 +
        (t3 - 2 * t2 + t) * dt * m0 +
        (-2 * t3 + 3 * t2) * p1 +
        (t3 - t2) * dt * m1
    )
}
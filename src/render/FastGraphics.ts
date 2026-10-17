import Phaser from 'phaser';

/**
 * Cheaper Graphics fills.
 *
 * Profiling a plain 1v1 showed ~75% of every frame inside Phaser's WebGL
 * Graphics path, not game code: every `arc` (so every fillCircle /
 * strokeCircle) becomes a fixed 100-point polygon whatever its radius, and
 * every fill runs that polygon through Earcut, a general concave
 * triangulator. Rigs and ability art redraw dozens of circles per frame.
 *
 * Two patches, both pixel-equivalent at our render scale:
 * - `arc` emits a radius-adaptive number of LINE_TO points (chord error held
 *   under ~0.15 logical px, capped at Phaser's own 100).
 * - `batchFillPath` fan-triangulates convex polygons (circles, ellipses,
 *   rects, most blobs) in O(n); anything concave still goes to Earcut.
 */

type Pt = { x: number; y: number };
type Matrix = Phaser.GameObjects.Components.TransformMatrix;
type FillPipeline = {
  renderer: Phaser.Renderer.WebGL.WebGLRenderer;
  calcMatrix: Matrix;
  fillTint: { TL: number; TR: number; BL: number };
  batchTri(...args: unknown[]): boolean;
  batchFillPath(path: Pt[], currentMatrix: Matrix, parentMatrix?: Matrix): void;
};

const PI2 = Math.PI * 2;
const MAX_SEGMENTS = 100;
const MIN_SEGMENTS = 12;

/** Segments for a full circle so the chord sagitta stays under ~0.15px. */
function fullCircleSegments(radius: number): number {
  const n = Math.ceil(5.7 * Math.sqrt(Math.abs(radius)));
  return n < MIN_SEGMENTS ? MIN_SEGMENTS : n > MAX_SEGMENTS ? MAX_SEGMENTS : n;
}

/**
 * True when `path` is a simple convex polygon (collinear and repeated points
 * allowed). Every turn must share one sign, and the edge direction may only
 * reverse twice per axis — that second test rejects self-overlapping stars,
 * whose turns all agree too.
 */
function isConvex(path: Pt[]): boolean {
  const n = path.length;
  let turn = 0;
  let xFlips = 0, yFlips = 0;
  let firstSx = 0, firstSy = 0, lastSx = 0, lastSy = 0;
  let pdx = 0, pdy = 0, havePrev = false, firstDx = 0, firstDy = 0;
  for (let i = 0; i <= n; i++) {
    const a = path[i % n], b = path[(i + 1) % n];
    const dx = b.x - a.x, dy = b.y - a.y;
    if (dx === 0 && dy === 0) continue;
    if (i < n) {
      const sx = dx > 0 ? 1 : dx < 0 ? -1 : 0;
      const sy = dy > 0 ? 1 : dy < 0 ? -1 : 0;
      if (sx !== 0) { if (lastSx !== 0 && sx !== lastSx) xFlips++; if (firstSx === 0) firstSx = sx; lastSx = sx; }
      if (sy !== 0) { if (lastSy !== 0 && sy !== lastSy) yFlips++; if (firstSy === 0) firstSy = sy; lastSy = sy; }
    }
    if (havePrev) {
      const cross = pdx * dy - pdy * dx;
      const tol = 1e-9 * (Math.abs(pdx) + Math.abs(pdy)) * (Math.abs(dx) + Math.abs(dy));
      if (cross > tol) { if (turn < 0) return false; turn = 1; }
      else if (cross < -tol) { if (turn > 0) return false; turn = -1; }
    } else {
      firstDx = dx; firstDy = dy;
    }
    pdx = dx; pdy = dy; havePrev = true;
  }
  // Close the turn loop: last edge into the first.
  if (havePrev) {
    const cross = pdx * firstDy - pdy * firstDx;
    const tol = 1e-9 * (Math.abs(pdx) + Math.abs(pdy)) * (Math.abs(firstDx) + Math.abs(firstDy));
    if ((cross > tol && turn < 0) || (cross < -tol && turn > 0)) return false;
  }
  if (lastSx !== 0 && firstSx !== 0 && lastSx !== firstSx) xFlips++;
  if (lastSy !== 0 && firstSy !== 0 && lastSy !== firstSy) yFlips++;
  return xFlips <= 2 && yFlips <= 2;
}

// Reused vertex scratch for the fan, so a fill allocates nothing.
let scratch = new Float32Array(256);

/** Patches Graphics and the WebGL fill pipeline. Must run before `new Phaser.Game()`. */
export function installFastGraphics(): void {
  const gfxProto = Phaser.GameObjects.Graphics.prototype as unknown as {
    arc(this: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, startAngle: number, endAngle: number, anticlockwise?: boolean, overshoot?: number): Phaser.GameObjects.Graphics;
  };

  // Same sweep normalisation and point order as Phaser's WebGL ARC command,
  // just with fewer points on small radii. LINE_TO starts a path when none is
  // open and extends it otherwise — exactly how ARC behaves.
  gfxProto.arc = function (x, y, radius, startAngle, endAngle, anticlockwise = false, overshoot = 0) {
    let sweep = endAngle - startAngle;
    if (anticlockwise) {
      if (sweep < -PI2) sweep = -PI2;
      else if (sweep > 0) sweep = -PI2 + (sweep % PI2);
    } else if (sweep > PI2) sweep = PI2;
    else if (sweep < 0) sweep = PI2 + (sweep % PI2);

    const segs = Math.max(2, Math.ceil(fullCircleSegments(radius) * Math.abs(sweep) / PI2));
    const step = 1 / segs;
    this.lineTo(x + Math.cos(startAngle) * radius, y + Math.sin(startAngle) * radius);
    for (let t = step; t < 1 + overshoot - 1e-9; t += step) {
      const a = startAngle + sweep * t;
      this.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    const end = startAngle + sweep;
    this.lineTo(x + Math.cos(end) * radius, y + Math.sin(end) * radius);
    return this;
  };

  const pipeProto = Phaser.Renderer.WebGL.Pipelines.MultiPipeline.prototype as unknown as FillPipeline;
  const earcutFill = pipeProto.batchFillPath;
  pipeProto.batchFillPath = function (path, currentMatrix, parentMatrix) {
    const n = path.length;
    if (n < 3 || !isConvex(path)) {
      earcutFill.call(this, path, currentMatrix, parentMatrix);
      return;
    }
    this.renderer.pipelines.set(this as unknown as Phaser.Renderer.WebGL.WebGLPipeline);
    const m = this.calcMatrix;
    if (parentMatrix) parentMatrix.multiply(currentMatrix, m);
    if (scratch.length < n * 2) scratch = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const p = path[i];
      scratch[i * 2] = m.getX(p.x, p.y);
      scratch[i * 2 + 1] = m.getY(p.x, p.y);
    }
    const { TL, TR, BL } = this.fillTint;
    const x0 = scratch[0], y0 = scratch[1];
    for (let i = 1; i < n - 1; i++) {
      this.batchTri(null, x0, y0, scratch[i * 2], scratch[i * 2 + 1], scratch[i * 2 + 2], scratch[i * 2 + 3], 0, 0, 1, 1, TL, TR, BL, 2);
    }
  };
}

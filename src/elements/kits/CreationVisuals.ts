import Phaser from 'phaser';
import { AvatarSpec, BaseAvatar, ColorFn, FxBase, TAU, easeIn, easeOut } from './ElementVisuals';

/**
 * Shared drawing kit for everything Creation renders: the artisan avatar (forge-hot ball
 * hands, a hammer it actually grips, and a gear crown), the Nexus machine sitting at the
 * centre of the arena, the persistent workshop aura, and every one-shot effect its abilities
 * throw off.
 *
 * The generic halves — the tween-backed animation runner and the character rig — live in
 * ElementVisuals.ts and are shared with the other elements. What stays here is what makes
 * Creation Creation: the forged shard, the riveted plank, the gear, and the palette.
 *
 * Colours must come from the CREATION palette below. There is no Creation colour cosmetic
 * yet, but every call still routes through the owner's `creationColor` mapper, so the day one
 * lands it is a table edit in CosmeticsKit rather than a sweep through this file.
 *
 * The one deliberate exception is the six potion colours: those are recipe identity (they key
 * the status tray and the info panel too), not element palette, so they are passed through raw.
 */

/** `(base) => displayed` — CosmeticsKit.creationColor bound to one owner. */
export type CreationColorFn = ColorFn;

export type { ArmGesture, ArmHold } from './ElementVisuals';

export const CREATION = {
  soot:     0x2a1206,
  iron:     0x4a2c14,
  timber:   0x6b4a2a,
  bronze:   0x8a4a1c,
  wood:     0x8a5a2a,
  rust:     0xa8551f,
  copper:   0xcc6622,
  tan:      0xcc8844,
  ember:    0xee8833,
  brass:    0xffaa44,
  gold:     0xffdd22,
  spark:    0xffee99,
  steel:    0x8891a8,
  silver:   0xccccdd,
  nexus:    0xff3399,
  nexusLit: 0xff88cc,
  white:    0xffffff,
} as const;

/** Bolt tier → the metal it was forged from. */
export const CREATION_TIER_COLORS: Record<'copper' | 'silver' | 'gold', number> = {
  copper: CREATION.copper,
  silver: CREATION.silver,
  gold: CREATION.gold,
};

// ── Primitives ────────────────────────────────────────────────────────────

/**
 * A forged shard: a chamfered metal splinter, squared off and riveted at the root, drawn out
 * to a chisel point. This is the primitive every Creation shape is built from — dagger blades,
 * shrapnel, sparks off the anvil, the wreath spikes and the avatar's crown all call it.
 *
 * `bend` pushes the tip sideways so a ring of shards reads as scattered debris rather than a
 * mechanically perfect starburst.
 */
export function forgedShard(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  bend = 0,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const at = (f: number, off: number) => ({
    x: cx + cos * len * f + px * (off + bend * f * f),
    y: cy + sin * len * f + py * (off + bend * f * f),
  });

  // Chamfered root, straight flanks, chisel tip. Six points a side, so the silhouette reads
  // as something that was cut and ground rather than something that grew.
  const pts = [
    at(0, halfW * 0.5), at(0.12, halfW), at(0.58, halfW * 0.78), at(0.9, halfW * 0.24),
    at(1, 0),
    at(0.9, -halfW * 0.24), at(0.58, -halfW * 0.78), at(0.12, -halfW), at(0, -halfW * 0.5),
  ];
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

/** Layered shard: sooty iron shell, copper body, and a hot bevel along one ground edge. */
export function forgedShardLayered(
  g: Phaser.GameObjects.Graphics,
  tint: CreationColorFn,
  cx: number, cy: number,
  angle: number, len: number, halfW: number,
  bend: number, alpha: number,
): void {
  g.fillStyle(tint(CREATION.soot), alpha * 0.6);
  forgedShard(g, cx, cy, angle, len, halfW, bend);
  g.fillStyle(tint(CREATION.copper), alpha * 0.9);
  forgedShard(g, cx, cy, angle, len * 0.88, halfW * 0.7, bend * 0.8);
  // The bevel: a thin bright wedge along the upper flank. Without it a shard is a grey lump;
  // with it, it catches the forge light and reads as ground steel.
  const px = -Math.sin(angle), py = Math.cos(angle);
  g.fillStyle(tint(CREATION.spark), alpha * 0.85);
  forgedShard(
    g, cx + px * halfW * 0.34, cy + py * halfW * 0.34,
    angle, len * 0.72, halfW * 0.2, bend * 0.5,
  );
}

/** A stud with a lit corner — the punctuation that makes anything read as fabricated. */
export function rivet(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn,
  x: number, y: number, r: number, alpha = 1,
): void {
  g.fillStyle(tint(CREATION.soot), alpha * 0.9);
  g.fillCircle(x, y, r);
  g.fillStyle(tint(CREATION.brass), alpha);
  g.fillCircle(x, y, r * 0.72);
  g.fillStyle(tint(CREATION.spark), alpha * 0.9);
  g.fillCircle(x - r * 0.26, y - r * 0.28, r * 0.3);
}

/** A beveled bar with a rivet at each end — the stock Creation builds walls out of. */
export function craftPlank(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn,
  cx: number, cy: number, angle: number, len: number, halfW: number, alpha = 1,
): void {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  const px = -sin, py = cos;
  const quad = (f0: number, f1: number, w0: number, w1: number) => {
    g.beginPath();
    g.moveTo(cx + cos * len * f0 + px * w0, cy + sin * len * f0 + py * w0);
    g.lineTo(cx + cos * len * f1 + px * w1, cy + sin * len * f1 + py * w1);
    g.lineTo(cx + cos * len * f1 - px * w1, cy + sin * len * f1 - py * w1);
    g.lineTo(cx + cos * len * f0 - px * w0, cy + sin * len * f0 - py * w0);
    g.closePath();
    g.fillPath();
  };
  g.fillStyle(tint(CREATION.timber), alpha);
  quad(-0.5, 0.5, halfW, halfW);
  // Lit top edge, shadowed underside — a flat bar has no weight without both.
  g.fillStyle(tint(CREATION.tan), alpha * 0.9);
  quad(-0.5, 0.5, halfW, halfW * 0.55);
  g.fillStyle(tint(CREATION.soot), alpha * 0.5);
  quad(-0.5, 0.5, -halfW * 0.62, -halfW);
  rivet(g, tint, cx - cos * len * 0.4, cy - sin * len * 0.4, halfW * 0.42, alpha);
  rivet(g, tint, cx + cos * len * 0.4, cy + sin * len * 0.4, halfW * 0.42, alpha);
}

/** Toothed circle. Used by the avatar's crown, the Nexus rings and every gear-flavoured pulse. */
export function gearPath(
  g: Phaser.GameObjects.Graphics,
  cx: number, cy: number, r: number, teeth: number, rot: number,
  toothDepth = 0.26,
): void {
  const outer = r * (1 + toothDepth);
  const step = TAU / teeth;
  g.beginPath();
  for (let i = 0; i < teeth; i++) {
    const a0 = rot + i * step;
    // Root → tooth flank → tooth crown → flank → root: a square-ish tooth profile.
    const pts: Array<[number, number]> = [
      [a0, r], [a0 + step * 0.18, outer], [a0 + step * 0.38, outer], [a0 + step * 0.56, r],
      [a0 + step, r],
    ];
    for (const [a, rr] of pts) {
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0 && a === a0) g.moveTo(x, y); else g.lineTo(x, y);
    }
  }
  g.closePath();
}

/** Filled gear with a bore and a lit rim. */
export function drawGear(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn,
  cx: number, cy: number, r: number, teeth: number, rot: number,
  body: number, rim: number, alpha = 1,
): void {
  g.fillStyle(tint(body), alpha);
  gearPath(g, cx, cy, r, teeth, rot);
  g.fillPath();
  g.lineStyle(Math.max(1, r * 0.1), tint(rim), alpha * 0.95);
  gearPath(g, cx, cy, r, teeth, rot);
  g.strokePath();
  g.fillStyle(tint(CREATION.soot), alpha * 0.85);
  g.fillCircle(cx, cy, r * 0.3);
  g.lineStyle(Math.max(1, r * 0.08), tint(rim), alpha * 0.7);
  g.strokeCircle(cx, cy, r * 0.52);
}

/**
 * A wall face built out of riveted planks: backing board, horizontal boards with grain and a
 * lit top bevel each, corner studs, and a copper frame. Drawn centred on the origin so the
 * caller can hold one Graphics per wall and just move it.
 */
export function plankPanel(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn,
  w: number, h: number, alpha = 1,
  opts: { boardH?: number; frame?: number } = {},
): void {
  const hw = w / 2, hh = h / 2;
  g.fillStyle(tint(CREATION.soot), alpha * 0.95);
  g.fillRect(-hw, -hh, w, h);

  const boardH = opts.boardH ?? 15;
  const rows = Phaser.Math.Clamp(Math.round(h / boardH), 1, 12);
  const bh = h / rows;
  for (let i = 0; i < rows; i++) {
    const y = -hh + i * bh;
    const tone = i % 2 === 0 ? CREATION.wood : CREATION.timber;
    g.fillStyle(tint(tone), alpha);
    g.fillRect(-hw + 1.5, y + 1, w - 3, bh - 2);
    // Lit bevel across the top of the board, shadow under it.
    g.fillStyle(tint(CREATION.tan), alpha * 0.75);
    g.fillRect(-hw + 1.5, y + 1, w - 3, Math.min(2.5, bh * 0.22));
    g.fillStyle(tint(CREATION.soot), alpha * 0.45);
    g.fillRect(-hw + 1.5, y + bh - 2.5, w - 3, 1.5);
    // Two grain runs per board, offset so no two rows look stamped from the same die.
    g.lineStyle(1, tint(CREATION.soot), alpha * 0.3);
    for (let k = 0; k < 2; k++) {
      const gy = y + bh * (0.36 + k * 0.3);
      g.lineBetween(-hw + 4 + (i % 3) * 6, gy, hw - 4 - ((i + k) % 3) * 7, gy);
    }
  }

  g.lineStyle(opts.frame ?? 2, tint(CREATION.copper), alpha * 0.95);
  g.strokeRect(-hw, -hh, w, h);
  const rr = Math.min(3.4, Math.min(w, h) * 0.16);
  if (rr > 1.2) {
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        rivet(g, tint, sx * (hw - rr - 2), sy * (hh - rr - 2), rr, alpha);
      }
    }
  }
}

/**
 * The dashed drafting frame every Creation build starts life as: corner brackets, a faint
 * grid, dimension ticks along two edges, and a marching-ants outline. `phase` animates the
 * dashes so a held preview looks like it is being drawn rather than sitting there.
 */
export function blueprintFrame(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn,
  w: number, h: number, alpha: number, phase: number,
): void {
  const hw = w / 2, hh = h / 2;
  g.fillStyle(tint(CREATION.copper), alpha * 0.12);
  g.fillRect(-hw, -hh, w, h);

  // Grid: a drafting sheet under the shape being sized.
  g.lineStyle(1, tint(CREATION.brass), alpha * 0.18);
  for (let x = -hw + 16; x < hw; x += 16) g.lineBetween(x, -hh, x, hh);
  for (let y = -hh + 16; y < hh; y += 16) g.lineBetween(-hw, y, hw, y);

  // Marching dashes around the perimeter.
  g.lineStyle(2, tint(CREATION.gold), alpha * 0.85);
  const per = 2 * (w + h);
  const dash = 9, gap = 7;
  for (let d = (phase * (dash + gap)) % (dash + gap); d < per; d += dash + gap) {
    const p0 = perimeterPoint(d, w, h), p1 = perimeterPoint(Math.min(d + dash, per), w, h);
    // Skip the segment that wraps a corner — a straight line across it looks like a crack.
    if (Math.abs(p0.side - p1.side) < 0.5) g.lineBetween(p0.x, p0.y, p1.x, p1.y);
  }

  // Corner brackets and dimension ticks.
  const arm = Math.min(12, Math.min(w, h) * 0.35);
  g.lineStyle(2.5, tint(CREATION.spark), alpha * 0.9);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      g.lineBetween(sx * hw, sy * hh, sx * (hw - arm), sy * hh);
      g.lineBetween(sx * hw, sy * hh, sx * hw, sy * (hh - arm));
    }
  }
  g.lineStyle(1.5, tint(CREATION.brass), alpha * 0.6);
  g.lineBetween(-hw, hh + 5, hw, hh + 5);
  g.lineBetween(-hw, hh + 2, -hw, hh + 8);
  g.lineBetween(hw, hh + 2, hw, hh + 8);
  g.lineBetween(hw + 5, -hh, hw + 5, hh);
  g.lineBetween(hw + 2, -hh, hw + 8, -hh);
  g.lineBetween(hw + 2, hh, hw + 8, hh);
}

/** Walks a centred rectangle's perimeter; `side` identifies which edge so dashes never wrap. */
function perimeterPoint(d: number, w: number, h: number): { x: number; y: number; side: number } {
  const hw = w / 2, hh = h / 2;
  if (d < w) return { x: -hw + d, y: -hh, side: 0 };
  if (d < w + h) return { x: hw, y: -hh + (d - w), side: 1 };
  if (d < 2 * w + h) return { x: hw - (d - w - h), y: hh, side: 2 };
  return { x: -hw, y: hh - (d - 2 * w - h), side: 3 };
}

// ── Part painters ─────────────────────────────────────────────────────────
//
// Each draws one persistent world object into a Graphics at the local origin, pointing along
// +x where direction matters, so the kit can hold one Graphics per object and just move and
// rotate it. Redrawing every frame would be wasted work — these shapes never change.

/** A throwing dagger: ground blade with a fuller, brass crossguard, wrapped grip, pommel. */
export function drawDagger(g: Phaser.GameObjects.Graphics, tint: CreationColorFn): void {
  g.clear();
  g.fillStyle(tint(CREATION.soot), 0.9);
  forgedShard(g, -2, 0, 0, 20, 3.4);
  g.fillStyle(tint(CREATION.silver), 1);
  forgedShard(g, -2, 0, 0, 19, 2.8);
  // The fuller — the groove down the middle of the blade.
  g.fillStyle(tint(CREATION.steel), 0.95);
  g.fillRect(1, -0.7, 12, 1.4);
  g.fillStyle(tint(CREATION.white), 0.85);
  g.fillRect(0, -2.2, 14, 0.9);
  // Crossguard, grip, pommel.
  g.fillStyle(tint(CREATION.brass), 1);
  g.fillRect(-4, -4.5, 2.6, 9);
  g.fillStyle(tint(CREATION.iron), 1);
  g.fillRect(-9, -2, 5.2, 4);
  g.lineStyle(1, tint(CREATION.soot), 0.8);
  g.lineBetween(-8, -2, -8, 2);
  g.lineBetween(-6.2, -2, -6.2, 2);
  rivet(g, tint, -10, 0, 2.2);
}

/** A charged bolt: a forged cartridge with a tier-coloured jacket and a hot tail. */
export function drawBolt(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn,
  tier: 'copper' | 'silver' | 'gold',
): void {
  g.clear();
  const metal = CREATION_TIER_COLORS[tier];
  g.fillStyle(tint(CREATION.soot), 0.85);
  forgedShard(g, -8, 0, 0, 18, 5.4);
  g.fillStyle(tint(metal), 1);
  forgedShard(g, -8, 0, 0, 17, 4.4);
  // Driving bands, then the lit crown along the top flank.
  g.fillStyle(tint(CREATION.iron), 0.9);
  g.fillRect(-6, -4.2, 1.8, 8.4);
  g.fillRect(-2.5, -3.8, 1.6, 7.6);
  g.fillStyle(tint(CREATION.white), 0.55);
  forgedShard(g, -7, -1.3, 0, 13, 1.1);
  // Hot tail where the charge is still burning off.
  g.fillStyle(tint(CREATION.ember), 0.8);
  g.fillCircle(-8.5, 0, 3);
  g.fillStyle(tint(CREATION.spark), 0.9);
  g.fillCircle(-8.5, 0, 1.5);
}

/** A war scythe: crescent blade on a riveted haft, drawn spinning about its balance point. */
export function drawScythe(g: Phaser.GameObjects.Graphics, tint: CreationColorFn): void {
  g.clear();
  // Shift the whole shape back over the local origin so the scythe spins about its balance
  // point rather than swinging round on an invisible tether.
  g.translateCanvas(-8, 0);
  // Haft.
  g.fillStyle(tint(CREATION.iron), 1);
  g.fillRect(-14, -2, 26, 4);
  g.fillStyle(tint(CREATION.timber), 1);
  g.fillRect(-13, -1.4, 24, 2.2);
  rivet(g, tint, -11, 0, 2.2);
  rivet(g, tint, 6, 0, 2.2);
  // Crescent blade: an outer sweep minus an inner sweep, so the edge is a true curve.
  const arc = (r: number, spread: number, color: number, alpha: number) => {
    g.fillStyle(tint(color), alpha);
    g.beginPath();
    for (let i = 0; i <= 16; i++) {
      const a = -1.5 + (i / 16) * 2.5;
      const px = 12 + Math.cos(a) * r, py = Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    for (let i = 16; i >= 0; i--) {
      const a = -1.5 + (i / 16) * 2.5;
      g.lineTo(12 + Math.cos(a) * (r - spread), Math.sin(a) * (r - spread));
    }
    g.closePath();
    g.fillPath();
  };
  arc(17, 8, CREATION.nexus, 0.95);
  arc(17, 3.4, CREATION.nexusLit, 0.95);
  arc(17, 1.4, CREATION.white, 0.85);
  g.fillStyle(tint(CREATION.brass), 1);
  g.fillRect(8, -4, 6, 8);
  rivet(g, tint, 11, 0, 2.4);
}

/** A nail: flat head, tapering shaft, ground point. */
export function drawNail(g: Phaser.GameObjects.Graphics, tint: CreationColorFn): void {
  g.clear();
  g.fillStyle(tint(CREATION.steel), 1);
  forgedShard(g, -6, 0, 0, 16, 2.2);
  g.fillStyle(tint(CREATION.silver), 1);
  g.fillRect(-7.5, -3.4, 3, 6.8);
  g.fillStyle(tint(CREATION.white), 0.7);
  g.fillRect(-7.5, -3.4, 3, 1.6);
  g.fillStyle(tint(CREATION.white), 0.5);
  g.fillRect(-4, -0.8, 10, 0.9);
}

/** A circular saw blade: hardened teeth, a scored plate and an arbor collar. */
export function drawSaw(g: Phaser.GameObjects.Graphics, tint: CreationColorFn, r = 22): void {
  g.clear();
  const teeth = 12;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * TAU;
    g.fillStyle(tint(CREATION.silver), 1);
    forgedShard(g, Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, a, r * 0.5, r * 0.14, r * 0.12);
  }
  g.fillStyle(tint(CREATION.steel), 1);
  g.fillCircle(0, 0, r * 0.66);
  g.lineStyle(1.5, tint(CREATION.soot), 0.5);
  for (let i = 0; i < 3; i++) g.strokeCircle(0, 0, r * (0.28 + i * 0.16));
  // Three lightening slots — a plain disc looks like a coin, slots make it a blade.
  g.fillStyle(tint(CREATION.soot), 0.85);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU;
    forgedShard(g, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, a + 1.2, r * 0.3, r * 0.07);
  }
  g.fillStyle(tint(CREATION.brass), 1);
  g.fillCircle(0, 0, r * 0.2);
  rivet(g, tint, 0, 0, r * 0.13);
}

/** The R+ mech: a riveted chassis whose armour and rocket pods grow with the build stage. */
export function drawMech(g: Phaser.GameObjects.Graphics, tint: CreationColorFn, stage: 1 | 2 | 3): void {
  g.clear();
  const w = 14 + stage * 4;
  // Legs first, so the chassis sits over them.
  g.fillStyle(tint(CREATION.iron), 1);
  for (const sx of [-1, 1]) {
    g.fillRect(sx * w * 0.55 - 3, 8, 6, 10);
    g.fillRect(sx * w * 0.55 - 5, 16, 10, 4);
  }
  // Chassis.
  g.fillStyle(tint(CREATION.soot), 1);
  g.fillRect(-w, -12, w * 2, 22);
  g.fillStyle(tint(CREATION.bronze), 1);
  g.fillRect(-w + 2, -10, w * 2 - 4, 18);
  g.fillStyle(tint(CREATION.copper), 1);
  g.fillRect(-w + 2, -10, w * 2 - 4, 5);
  // Visor.
  g.fillStyle(tint(CREATION.soot), 1);
  g.fillRect(-w * 0.6, -6, w * 1.2, 6);
  g.fillStyle(tint(stage === 3 ? CREATION.nexus : CREATION.gold), 1);
  g.fillRect(-w * 0.5, -5, w, 3.4);
  g.fillStyle(tint(CREATION.white), 0.8);
  g.fillRect(-w * 0.5, -5, w * 0.3, 1.4);
  // Rocket pods — one per side from stage 1, doubled tubes at stage 3.
  for (const sx of [-1, 1]) {
    g.fillStyle(tint(CREATION.steel), 1);
    g.fillRect(sx * w - (sx > 0 ? 0 : 7), -9, 7, 8);
    g.fillStyle(tint(CREATION.ember), 0.95);
    g.fillCircle(sx * (w + 3.5), -5, 2);
    if (stage === 3) {
      g.fillStyle(tint(CREATION.steel), 1);
      g.fillRect(sx * w - (sx > 0 ? 0 : 7), 0, 7, 7);
      g.fillStyle(tint(CREATION.ember), 0.95);
      g.fillCircle(sx * (w + 3.5), 3.5, 2);
    }
  }
  // Plating studs.
  for (const sx of [-1, 1]) {
    rivet(g, tint, sx * (w - 4), -8, 2.2);
    rivet(g, tint, sx * (w - 4), 6, 2.2);
  }
  if (stage >= 2) {
    // Stage 2+ bolts on a chest plate with the stage stamped as pips.
    g.fillStyle(tint(CREATION.brass), 1);
    g.fillRect(-6, 0, 12, 7);
    g.fillStyle(tint(CREATION.soot), 0.85);
    for (let i = 0; i < stage; i++) g.fillCircle(-3 + i * 3, 3.5, 1.2);
  }
}

/**
 * An Automaton: a squat clockwork drum on two stubby legs, with a single lit eye and a
 * wind-up key turning on its back. Redrawn each frame — `t` drives the waddle and the key.
 */
export function drawAutomaton(g: Phaser.GameObjects.Graphics, tint: CreationColorFn, t: number): void {
  g.clear();
  const step = Math.sin(t * 7);
  // Legs, waddling out of phase.
  g.fillStyle(tint(CREATION.iron), 1);
  for (const sx of [-1, 1]) {
    const lift = Math.max(0, sx * step) * 3;
    g.fillRect(sx * 5 - 2.4, 8 - lift, 4.8, 6);
    g.fillRect(sx * 5 - 4, 13 - lift, 8, 3);
  }
  // Wind-up key, always turning.
  drawGear(g, tint, 0, -13, 5.5, 6, t * 4, CREATION.bronze, CREATION.brass, 1);
  // Drum body with hoops.
  g.fillStyle(tint(CREATION.soot), 1);
  g.fillRoundedRect(-11, -10 + step * 0.8, 22, 20, 5);
  g.fillStyle(tint(CREATION.bronze), 1);
  g.fillRoundedRect(-9.5, -8.5 + step * 0.8, 19, 17, 4);
  g.fillStyle(tint(CREATION.copper), 1);
  g.fillRect(-9.5, -8.5 + step * 0.8, 19, 4);
  g.lineStyle(1.4, tint(CREATION.soot), 0.5);
  g.strokeRoundedRect(-9.5, -8.5 + step * 0.8, 19, 17, 4);
  // Eye, and the rivets holding the plate on.
  g.fillStyle(tint(CREATION.soot), 1);
  g.fillCircle(0, -1 + step * 0.8, 5);
  g.fillStyle(tint(CREATION.nexus), 0.95);
  g.fillCircle(0, -1 + step * 0.8, 3.4);
  g.fillStyle(tint(CREATION.white), 0.9);
  g.fillCircle(-1, -2 + step * 0.8, 1.3);
  for (const sx of [-1, 1]) rivet(g, tint, sx * 7, 5 + step * 0.8, 2);
}

/** A Springboard / speed pad: a sprung steel plate with launch chevrons and end coils. */
export function drawSpeedPad(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn, w: number, h: number,
): void {
  g.clear();
  const hw = w / 2, hh = h / 2;
  g.fillStyle(tint(CREATION.soot), 0.95);
  g.fillRect(-hw, -hh, w, h);
  g.fillStyle(tint(CREATION.steel), 0.95);
  g.fillRect(-hw + 1.5, -hh + 1.5, w - 3, h - 3);
  g.fillStyle(tint(CREATION.silver), 0.9);
  g.fillRect(-hw + 1.5, -hh + 1.5, w - 3, Math.max(2, h * 0.22));
  // Chevrons pointing along the pad — the read for "this throws you".
  const rows = Math.max(1, Math.floor(w / 14));
  g.lineStyle(2.2, tint(CREATION.spark), 0.9);
  for (let i = 0; i < rows; i++) {
    const x = -hw + 6 + i * (w - 10) / rows;
    g.lineBetween(x, hh - 3, x + 5, 0);
    g.lineBetween(x + 5, 0, x, -hh + 3);
  }
  // Compression coils under each end.
  g.lineStyle(1.6, tint(CREATION.brass), 0.9);
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      g.lineBetween(sx * (hw - 5), -hh + 2 + i * (h - 4) / 3, sx * (hw - 1), -hh + 4 + i * (h - 4) / 3);
    }
  }
  g.lineStyle(2, tint(CREATION.copper), 0.95);
  g.strokeRect(-hw, -hh, w, h);
}

/** A spiked block: a plank crate with ground spikes driven out through every face. */
export function drawSpikedPanel(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn, w: number, h: number, invincible: boolean,
): void {
  g.clear();
  const hw = w / 2, hh = h / 2;
  // Spikes first so their roots vanish under the crate face.
  const perSide = Math.max(2, Math.round(w / 18));
  for (let i = 0; i < perSide; i++) {
    const f = (i + 0.5) / perSide;
    const spikes: Array<[number, number, number]> = [
      [-hw + f * w, -hh, -Math.PI / 2],
      [-hw + f * w, hh, Math.PI / 2],
      [-hw, -hh + f * h, Math.PI],
      [hw, -hh + f * h, 0],
    ];
    for (const [sx, sy, sa] of spikes) {
      g.fillStyle(tint(CREATION.soot), 0.9);
      forgedShard(g, sx, sy, sa, 13, 3.4);
      g.fillStyle(tint(CREATION.silver), 1);
      forgedShard(g, sx, sy, sa, 11, 2.4);
      g.fillStyle(tint(CREATION.white), 0.7);
      forgedShard(g, sx, sy, sa, 7, 0.9);
    }
  }
  plankPanel(g, tint, w, h, 1, { boardH: 17 });
  // Hazard banding across the face. Drawn as a staircase of clipped slices rather than true
  // diagonals — Graphics does not clip, and honest diagonals spill out past the crate.
  g.fillStyle(tint(invincible ? CREATION.nexus : CREATION.rust), invincible ? 0.55 : 0.45);
  const slices = 8;
  const sh = h / slices;
  for (let r = 0; r < slices; r++) {
    for (let x = -hw - h + r * sh; x < hw; x += 15) {
      const x0 = Math.max(-hw, x), x1 = Math.min(hw, x + 7);
      if (x1 > x0) g.fillRect(x0, hh - (r + 1) * sh, x1 - x0, sh);
    }
  }
  g.lineStyle(2, tint(invincible ? CREATION.nexusLit : CREATION.ember), 0.95);
  g.strokeRect(-hw, -hh, w, h);
}

/** A brewed potion resting on the Nexus: shouldered flask, cork, liquid line, bubbles. */
export function drawFlask(
  g: Phaser.GameObjects.Graphics, tint: CreationColorFn, color: number, t: number,
): void {
  g.clear();
  // Glass body.
  g.fillStyle(tint(CREATION.white), 0.16);
  g.fillCircle(0, 2, 11);
  g.fillRect(-3.6, -13, 7.2, 12);
  // Liquid, with a meniscus that rocks as the bottle bobs.
  g.fillStyle(color, 0.95);
  g.fillCircle(0, 2, 9.2);
  g.fillRect(-2.8, -5 + Math.sin(t * 2.4) * 0.8, 5.6, 8);
  g.fillStyle(color, 0.45);
  g.fillCircle(0, 2, 12.5);
  // Bubbles rising through it.
  for (let i = 0; i < 3; i++) {
    const p = (t * 0.5 + i / 3) % 1;
    g.fillStyle(tint(CREATION.white), 0.5 * (1 - p));
    g.fillCircle(-3 + i * 3, 7 - p * 11, 1.4 * (1 - p * 0.5));
  }
  // Neck collar, cork, and the specular streak that makes it read as glass.
  g.fillStyle(tint(CREATION.brass), 1);
  g.fillRect(-4.6, -13.5, 9.2, 3);
  g.fillStyle(tint(CREATION.timber), 1);
  g.fillRect(-4, -18, 8, 5);
  g.fillStyle(tint(CREATION.tan), 1);
  g.fillRect(-4, -18, 8, 1.6);
  g.fillStyle(tint(CREATION.white), 0.7);
  g.fillEllipse(-4, 0, 3, 9);
  g.fillRect(-2.6, -11, 1.4, 6);
}

// ── CreationFx ────────────────────────────────────────────────────────────

export interface CreationExplosionOpts {
  /** Forged shrapnel flung outward. Defaults to radius/6. */
  shards?: number;
  /** Smoke puffs off the blast. Defaults to radius/26. */
  smoke?: number;
  /** Leave a scrap-litter mark on the ground. Default true. */
  debris?: boolean;
  depth?: number;
  duration?: number;
  /** Recolour the fireball core — mortar shells burn the potion's own colour. */
  core?: number;
}

/**
 * One-shot Creation effects. Cheap to construct — build one per owner and hand it that
 * owner's colour mapper.
 */
export class CreationFx extends FxBase {
  constructor(scene: Phaser.Scene, tint: CreationColorFn = (c) => c) {
    super(scene, tint);
  }

  /** Expanding shock front, stroked as a jittered polygon so it reads as dust, not as UI. */
  ring(x: number, y: number, fromR: number, toR: number, color: number, duration: number, width = 5, depth = 6): void {
    const c = this.tint(color);
    const segs = Phaser.Math.Clamp(Math.round(toR / 3.5), 36, 110);
    const jitter = Array.from({ length: segs }, () => 0.94 + Math.random() * 0.12);
    this.anim(depth, duration, (g, t) => {
      const r = fromR + (toR - fromR) * easeOut(t);
      g.lineStyle(Math.max(0.5, width * (1 - t)), c, 0.9 * (1 - t * t));
      g.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i % segs) / segs * TAU;
        const rr = r * (1 + (jitter[i % segs] - 1) * (1 - t * 0.6));
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.strokePath();
    });
  }

  /** Blown-out core — the first two frames of any real impact. */
  flash(x: number, y: number, radius: number, depth = 7): void {
    this.flashIn(x, y, radius, CREATION.white, CREATION.spark, depth);
  }

  /**
   * Forge sparks: white-hot chips that fly out fast, arc under gravity, cool through gold to
   * copper, and wink out. Each keeps a short streak behind it, which is what separates a spark
   * from a dot.
   */
  sparks(
    x: number, y: number, count: number,
    opts: { speed?: number; spread?: number; angle?: number; size?: number; life?: number; depth?: number; gravity?: number } = {},
  ): void {
    const speed = opts.speed ?? 150;
    const spread = opts.spread ?? Math.PI;
    const baseAngle = opts.angle ?? 0;
    const size = opts.size ?? 2.4;
    const life = opts.life ?? 480;
    const depth = opts.depth ?? 6;
    const grav = opts.gravity ?? 220;

    const parts = Array.from({ length: count }, () => {
      const a = baseAngle + (Math.random() - 0.5) * spread * 2;
      const v = speed * (0.4 + Math.random() * 0.95);
      return {
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        r: size * (0.55 + Math.random() * 0.8),
        hot: Math.random() < 0.5,
        delay: Math.random() * 0.16,
      };
    });

    this.anim(depth, life, (g, t) => {
      const secs = life / 1000;
      for (const p of parts) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        const tt = lt * secs;
        const ex = x + p.vx * tt;
        const ey = y + p.vy * tt + 0.5 * grav * tt * tt;
        // Streak: where it was two frames ago, drawn as a thinning tail.
        const bt = Math.max(0, tt - 0.045);
        const bx = x + p.vx * bt, by = y + p.vy * bt + 0.5 * grav * bt * bt;
        const fade = 1 - lt;
        g.lineStyle(p.r * fade, this.tint(p.hot ? CREATION.gold : CREATION.ember), 0.7 * fade);
        g.lineBetween(bx, by, ex, ey);
        g.fillStyle(this.tint(p.hot ? CREATION.spark : CREATION.brass), 0.95 * fade);
        g.fillCircle(ex, ey, p.r * fade);
        g.fillStyle(this.tint(CREATION.white), 0.6 * fade * fade);
        g.fillCircle(ex, ey, p.r * fade * 0.45);
      }
    });
  }

  /** Forge smoke: greasy puffs that swell and lift off the blast. */
  smoke(x: number, y: number, count: number, radius: number, depth = 4): void {
    const puffs = Array.from({ length: count }, () => ({
      ox: (Math.random() - 0.5) * radius * 1.2,
      oy: (Math.random() - 0.5) * radius * 0.8,
      r: radius * (0.25 + Math.random() * 0.3),
      drift: (Math.random() - 0.5) * 30,
      delay: Math.random() * 0.3,
    }));
    this.anim(depth, 1100, (g, t) => {
      for (const p of puffs) {
        const lt = (t - p.delay) / (1 - p.delay);
        if (lt <= 0) continue;
        g.fillStyle(this.tint(CREATION.soot), 0.32 * (1 - lt));
        g.fillCircle(x + p.ox + p.drift * lt, y + p.oy - 44 * lt, p.r * (0.6 + lt * 1.1));
      }
    });
  }

  /**
   * What a Creation blast leaves behind: scattered offcuts and bent nails, not a scorch. Reads
   * as "something was taken apart here" for a couple of seconds and then gets swept away.
   */
  debris(x: number, y: number, radius: number, depth = 1): void {
    const bits = Array.from({ length: 9 }, () => {
      const a = Math.random() * TAU;
      const d = Math.random() * radius * 0.8;
      return {
        x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7,
        ang: Math.random() * TAU,
        len: radius * (0.12 + Math.random() * 0.16),
      };
    });
    this.anim(depth, 2400, (g, t) => {
      const a = t < 0.08 ? t / 0.08 : 1 - (t - 0.08) / 0.92;
      g.fillStyle(this.tint(CREATION.soot), 0.16 * a);
      g.fillEllipse(x, y, radius * 1.9, radius * 1.4);
      for (const b of bits) {
        g.fillStyle(this.tint(CREATION.timber), 0.5 * a);
        forgedShard(g, b.x, b.y, b.ang, b.len, b.len * 0.22);
      }
    });
  }

  /**
   * The body of a Creation detonation: a boiling ball of hot slag with overlapping lobes,
   * which reads as volume where one expanding disc always reads as placeholder.
   */
  slagball(x: number, y: number, radius: number, duration: number, core: number, depth = 6): void {
    const lobes = Array.from({ length: 9 }, (_, i) => ({
      ang: (i / 9) * TAU + Math.random() * 0.5,
      off: 0.25 + Math.random() * 0.4,
      r: 0.4 + Math.random() * 0.28,
      phase: Math.random() * TAU,
    }));
    this.anim(depth, duration, (g, t) => {
      const grow = 0.35 + easeOut(Math.min(1, t * 1.5)) * 0.75;
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      const wob = t * 9;
      const shell = [
        { c: CREATION.soot, s: 1.05, a: 0.5 },
        { c: CREATION.rust, s: 0.86, a: 0.78 },
        { c: CREATION.ember, s: 0.62, a: 0.85 },
        { c: core, s: 0.36, a: 0.9 },
      ];
      for (const layer of shell) {
        g.fillStyle(this.tint(layer.c), layer.a * fade);
        g.fillCircle(x, y, radius * grow * layer.s);
        for (const l of lobes) {
          const lr = radius * grow * layer.s * l.r * (0.85 + Math.sin(wob + l.phase) * 0.15);
          const ld = radius * grow * layer.s * l.off;
          g.fillCircle(x + Math.cos(l.ang) * ld, y + Math.sin(l.ang) * ld, lr);
        }
      }
      if (t < 0.5) {
        g.fillStyle(this.tint(CREATION.white), (1 - t / 0.5) * 0.85);
        g.fillCircle(x, y, radius * grow * 0.22);
      }
    });
  }

  /** Forged shrapnel: shards that spin as they fly and tumble to a stop. */
  shrapnel(x: number, y: number, count: number, radius: number, depth = 6, angle?: number, spread = Math.PI): void {
    const bits = Array.from({ length: count }, () => {
      const a = (angle ?? 0) + (Math.random() - 0.5) * spread * 2;
      return {
        ang: a,
        spin: (Math.random() - 0.5) * 22,
        dist: radius * (0.6 + Math.random() * 1.1),
        len: 7 + Math.random() * 9,
        w: 1.8 + Math.random() * 1.6,
        delay: Math.random() * 0.15,
      };
    });
    this.anim(depth, 620, (g, t) => {
      for (const b of bits) {
        const lt = (t - b.delay) / (1 - b.delay);
        if (lt <= 0) continue;
        const d = b.dist * easeOut(lt);
        const bx = x + Math.cos(b.ang) * d;
        const by = y + Math.sin(b.ang) * d + 40 * lt * lt;
        forgedShardLayered(g, this.tint, bx, by, b.ang + b.spin * lt, b.len, b.w, 0, 0.95 * (1 - lt));
      }
    });
  }

  /** Flash + slagball + stacked rings + shrapnel + sparks + smoke + debris. The whole package. */
  explosion(x: number, y: number, radius: number, opts: CreationExplosionOpts = {}): void {
    const shards = opts.shards ?? Math.round(radius / 6);
    const smokeCount = opts.smoke ?? Math.round(radius / 26);
    const dur = opts.duration ?? Math.round(320 + radius * 1.5);
    const depth = opts.depth ?? 6;
    const core = opts.core ?? CREATION.gold;

    if (opts.debris !== false) this.debris(x, y, radius * 0.6);
    this.slagball(x, y, radius * 0.72, dur, core, depth);
    this.flash(x, y, radius * 0.4, depth + 1);
    this.ring(x, y, radius * 0.2, radius * 1.12, CREATION.spark, Math.round(dur * 0.75), 6, depth);
    this.scene.time.delayedCall(70, () => this.ring(x, y, radius * 0.15, radius * 1.35, CREATION.brass, dur, 4, depth));
    this.scene.time.delayedCall(150, () => this.ring(x, y, radius * 0.1, radius * 1.5, CREATION.copper, dur, 3, depth));
    this.shrapnel(x, y, shards, radius * 0.9, depth);
    this.sparks(x, y, shards + 4, { speed: radius * 2.2, size: 2.6 + radius / 60, life: Math.round(dur * 1.3), depth });
    if (smokeCount > 0) this.smoke(x, y, smokeCount, radius * 0.85, depth - 2);
  }

  /**
   * A hammer head swinging down onto a point and throwing a spray of sparks off the strike.
   * Everything Creation "makes" lands on one of these — it is the element's punctuation mark.
   */
  hammerStrike(x: number, y: number, angle: number, scale = 1, depth = 7): void {
    const swing = 1.15;
    this.anim(depth, 260, (g, t) => {
      // Falls fast through the first third, then rebounds and fades.
      const drop = t < 0.35 ? easeIn(t / 0.35) : 1;
      const lift = t < 0.35 ? 0 : easeOut((t - 0.35) / 0.65) * 0.45;
      const a = angle - swing * (1 - drop) + swing * 0.4 * lift;
      const d = (34 - 20 * drop + 16 * lift) * scale;
      const hx = x + Math.cos(a) * d, hy = y + Math.sin(a) * d;
      const fade = t < 0.35 ? 1 : 1 - (t - 0.35) / 0.65;
      // Haft.
      g.lineStyle(4 * scale, this.tint(CREATION.timber), fade);
      g.lineBetween(hx + Math.cos(a) * 22 * scale, hy + Math.sin(a) * 22 * scale, hx, hy);
      // Head: a chamfered block with a lit face and a peen on the back.
      g.fillStyle(this.tint(CREATION.soot), fade);
      forgedShard(g, hx + Math.cos(a) * 9 * scale, hy + Math.sin(a) * 9 * scale, a + Math.PI, 20 * scale, 8 * scale);
      g.fillStyle(this.tint(CREATION.steel), fade);
      forgedShard(g, hx + Math.cos(a) * 8 * scale, hy + Math.sin(a) * 8 * scale, a + Math.PI, 17 * scale, 6.4 * scale);
      g.fillStyle(this.tint(CREATION.silver), fade * 0.9);
      forgedShard(g, hx + Math.cos(a) * 6 * scale, hy + Math.sin(a) * 6 * scale, a + Math.PI, 11 * scale, 2.4 * scale);
      if (t >= 0.3 && t < 0.5) {
        g.fillStyle(this.tint(CREATION.white), (1 - (t - 0.3) / 0.2) * 0.8);
        g.fillCircle(x, y, 11 * scale);
      }
    });
    this.scene.time.delayedCall(92, () => {
      this.sparks(x, y, Math.round(8 * scale), { speed: 190 * scale, size: 2.4 * scale, life: 420, depth });
      this.ring(x, y, 4 * scale, 26 * scale, CREATION.spark, 260, 3, depth - 1);
    });
  }

  /** Recoil flare at the barrel — sells that a bolt was actually thrown. */
  muzzleFlash(x: number, y: number, angle: number, scale = 1, depth = 6): void {
    this.anim(depth, 140, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(CREATION.spark), 0.75 * fade);
      forgedShard(g, x, y, angle, 24 * scale * (0.6 + t * 0.9), 8 * scale * fade);
      for (const s of [-1, 1]) {
        g.fillStyle(this.tint(CREATION.brass), 0.6 * fade);
        forgedShard(g, x, y, angle + s * 0.8, 13 * scale * (0.6 + t), 4 * scale * fade);
      }
      g.fillStyle(this.tint(CREATION.white), 0.85 * fade);
      g.fillCircle(x, y, 5.5 * scale * (1 - t * 0.4));
    });
    this.sparks(x, y, 4, { angle, spread: 0.6, speed: 140, size: 2, life: 320, depth });
  }

  /** Comet streak left behind a dash: sawdust and sparks kicked up along the path. */
  dashTrail(x1: number, y1: number, x2: number, y2: number, depth = 4): void {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2);
    const puffs = Math.max(3, Math.round(dist / 26));
    this.anim(depth, 380, (g, t) => {
      const fade = 1 - t;
      for (let i = 0; i < puffs; i++) {
        const f = i / (puffs - 1 || 1);
        const px = x1 + (x2 - x1) * f, py = y1 + (y2 - y1) * f;
        const local = Math.max(0, fade - f * 0.35);
        const r = (4 + (1 - f) * 11) * local;
        if (r <= 0) continue;
        g.fillStyle(this.tint(CREATION.timber), 0.45 * local);
        g.fillCircle(px, py, r * 1.3);
        g.fillStyle(this.tint(CREATION.tan), 0.55 * local);
        g.fillCircle(px, py, r * 0.7);
      }
    });
    this.sparks(x1, y1, 8, { angle: angle + Math.PI, spread: 0.8, speed: 170, size: 2.4, life: 460, depth });
  }

  /**
   * Something coming apart into its parts: a ring of shards and planks thrown outward from a
   * point, over a settling dust pool. Used where a construct breaks or a burst erupts.
   */
  bloom(x: number, y: number, radius: number, petals = 10, depth = 4): void {
    const seeds = Array.from({ length: petals }, (_, i) => ({
      // Uneven lengths, staggered roots and per-petal delays: a ring of identical shards fired
      // from one point at one length reads as a starburst, so every one is out of step.
      ang: (i / petals) * TAU + (Math.random() - 0.5) * 0.9,
      root: radius * (0.1 + Math.random() * 0.3),
      len: radius * (0.32 + Math.random() * 0.6),
      w: radius * (0.09 + Math.random() * 0.08),
      bend: (Math.random() - 0.5) * radius * 0.35,
      delay: Math.random() * 0.3,
      plank: Math.random() < 0.35,
    }));
    this.anim(depth, 460, (g, t) => {
      const pool = 1 - easeIn(t);
      g.fillStyle(this.tint(CREATION.rust), 0.4 * pool);
      g.fillCircle(x, y, radius * 0.42 * easeOut(t));
      g.fillStyle(this.tint(CREATION.brass), 0.45 * pool);
      g.fillCircle(x, y, radius * 0.26 * easeOut(t));
      for (const s of seeds) {
        const lt = Math.max(0, (t - s.delay) / (1 - s.delay));
        const grow = easeOut(lt);
        const fade = 1 - easeIn(lt);
        const rx = x + Math.cos(s.ang) * s.root * grow;
        const ry = y + Math.sin(s.ang) * s.root * grow;
        if (s.plank) craftPlank(g, this.tint, rx, ry, s.ang, s.len * grow, s.w, 0.8 * fade);
        else forgedShardLayered(g, this.tint, rx, ry, s.ang, s.len * grow, s.w * (1 - lt * 0.4), s.bend * lt, 0.85 * fade);
      }
    });
    this.ring(x, y, radius * 0.15, radius, CREATION.brass, 400, 4, depth);
  }

  /**
   * Winding up: raw stock spirals inward onto a swelling ingot while a containment ring closes,
   * and a gear turns behind the whole thing. `follow` lets it track a moving caster.
   */
  channelCharge(
    x: number, y: number, radius: number, duration: number,
    follow?: () => { x: number; y: number } | null,
    depth = 6,
  ): void {
    const streaks = Array.from({ length: 12 }, (_, i) => ({
      ang: (i / 12) * TAU,
      spin: 1.5 + Math.random() * 1.3,
      phase: Math.random(),
      len: 8 + Math.random() * 7,
    }));
    this.anim(depth, duration, (g, t) => {
      const pos = follow?.() ?? null;
      const cx = pos ? pos.x : x;
      const cy = pos ? pos.y : y;
      const pulse = 0.86 + Math.sin(t * 30) * 0.14;

      drawGear(g, this.tint, cx, cy, radius * 0.8, 10, t * 3, CREATION.iron, CREATION.bronze, 0.35);

      for (const s of streaks) {
        const lt = (t * (1 + s.phase) + s.phase) % 1;
        const r = radius * (1 - easeIn(lt));
        const a = s.ang + t * s.spin * TAU;
        g.fillStyle(this.tint(CREATION.brass), 0.8 * (1 - lt * 0.6));
        forgedShard(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a + Math.PI, s.len * (1 - lt * 0.4), 2.2 * (1 - lt));
      }

      // The ingot taking shape at the centre.
      const cr = radius * (0.1 + easeIn(t) * 0.34) * pulse;
      g.fillStyle(this.tint(CREATION.soot), 0.55);
      g.fillCircle(cx, cy, cr * 1.4);
      g.fillStyle(this.tint(CREATION.rust), 0.8);
      g.fillCircle(cx, cy, cr);
      g.fillStyle(this.tint(CREATION.brass), 0.9);
      g.fillCircle(cx, cy, cr * 0.6);
      g.fillStyle(this.tint(CREATION.spark), 0.9 * easeIn(t));
      g.fillCircle(cx, cy, cr * 0.28);

      g.lineStyle(3, this.tint(CREATION.copper), 0.5 + 0.4 * easeIn(t));
      g.strokeCircle(cx, cy, radius * (1 - easeIn(t) * 0.55) * pulse);
    });
  }

  /**
   * Assembly: a blueprint frame snaps in, then boards drop into it one by one and a rivet is
   * driven at each corner. This is what "I built that" looks like — the alternative, a rect
   * that fades in, looks like a rendering bug.
   */
  assemble(x: number, y: number, w: number, h: number, duration = 340, depth = 5): void {
    const rows = Phaser.Math.Clamp(Math.round(h / 15), 1, 12);
    const order = Array.from({ length: rows }, (_, i) => i).sort(() => Math.random() - 0.5);
    this.anim(depth, duration, (g, t) => {
      g.setPosition(x, y);
      const frame = t < 0.25 ? t / 0.25 : 1 - Math.max(0, (t - 0.6) / 0.4);
      blueprintFrame(g, this.tint, w, h, frame * 0.9, t * 26);
      const bh = h / rows;
      for (let i = 0; i < rows; i++) {
        const slot = order.indexOf(i);
        const lt = Phaser.Math.Clamp((t - 0.15 - slot / rows * 0.6) / 0.3, 0, 1);
        if (lt <= 0) continue;
        // Board slides in from whichever side it is nearer, and settles.
        const from = (i % 2 === 0 ? -1 : 1) * w * (1 - easeOut(lt));
        craftPlank(g, this.tint, from, -h / 2 + i * bh + bh / 2, 0, w - 3, bh * 0.42, lt);
      }
      if (t > 0.75) {
        const rr = Math.min(3.4, Math.min(w, h) * 0.16);
        for (const sx of [-1, 1]) {
          for (const sy of [-1, 1]) rivet(g, this.tint, sx * (w / 2 - rr - 2), sy * (h / 2 - rr - 2), rr);
        }
      }
    });
    this.scene.time.delayedCall(Math.round(duration * 0.7), () => {
      this.sparks(x, y, 6, { speed: Math.max(w, h) * 1.6, size: 2.2, life: 380, depth: depth + 1 });
    });
  }

  /** A gear that spins up out of nothing and fades — a machine turning over somewhere. */
  gearPulse(x: number, y: number, radius: number, duration = 520, color: number = CREATION.brass, depth = 6): void {
    const teeth = Phaser.Math.Clamp(Math.round(radius / 4), 8, 20);
    this.anim(depth, duration, (g, t) => {
      const grow = easeOut(Math.min(1, t * 1.6));
      const fade = 1 - easeIn(t);
      drawGear(g, this.tint, x, y, radius * grow, teeth, t * 5, CREATION.iron, color, 0.75 * fade);
      g.lineStyle(2, this.tint(color), 0.5 * fade);
      g.strokeCircle(x, y, radius * grow * 1.5);
    });
  }

  /**
   * A short spark plume out of the back of a moving thing. Called on an accumulator from the
   * kit's update so a projectile leaves a live trail rather than a static streak.
   */
  emberTrail(x: number, y: number, angle: number, color: number, depth = 5): void {
    this.anim(depth, 260, (g, t) => {
      const fade = 1 - t;
      g.fillStyle(this.tint(color), 0.55 * fade);
      forgedShard(g, x, y, angle, 14 * (0.5 + t), 3 * fade);
      g.fillStyle(this.tint(CREATION.spark), 0.7 * fade * fade);
      g.fillCircle(x, y, 2.4 * fade);
    });
  }

  /** Launch chevrons pointing where a stack of built things is about to be thrown. */
  launchMarker(x: number, y: number, angle: number, duration: number, depth = 12): void {
    this.anim(depth, duration, (g, t) => {
      const pulse = 0.5 + 0.5 * Math.sin(t * 40);
      const cos = Math.cos(angle), sin = Math.sin(angle);
      const px = -sin, py = cos;
      for (let i = 0; i < 3; i++) {
        const f = ((t * 2 + i / 3) % 1);
        const d = -6 + f * 22;
        g.lineStyle(3, this.tint(CREATION.gold), (0.4 + pulse * 0.5) * (1 - f * 0.5));
        g.beginPath();
        g.moveTo(x + cos * d - px * 8, y + sin * d - py * 8);
        g.lineTo(x + cos * (d + 9), y + sin * (d + 9));
        g.lineTo(x + cos * d + px * 8, y + sin * d + py * 8);
        g.strokePath();
      }
    });
  }

  /** A shell tumbling through the air toward a target — the mortar's flight body. */
  mortarShell(
    fromX: number, fromY: number, toX: number, toY: number,
    color: number, duration: number, depth = 9,
  ): void {
    const spin = 9 + Math.random() * 6;
    const arc = 70 + Phaser.Math.Distance.Between(fromX, fromY, toX, toY) * 0.22;
    this.anim(depth, duration, (g, t) => {
      const x = fromX + (toX - fromX) * t;
      // Parabolic lob, so a mortar reads as lobbed rather than fired flat.
      const y = fromY + (toY - fromY) * t - arc * Math.sin(Math.PI * t);
      const a = t * spin;
      g.fillStyle(this.tint(CREATION.soot), 0.85);
      forgedShard(g, x, y, a, 17, 6);
      g.fillStyle(color, 0.95);
      forgedShard(g, x, y, a, 14, 4.6);
      g.fillStyle(this.tint(CREATION.brass), 0.95);
      g.fillRect(x - 6, y - 2, 3, 4);
      g.fillStyle(this.tint(CREATION.white), 0.6);
      g.fillCircle(x - 2, y - 2, 1.6);
      // Smoke thread hanging behind it.
      for (let i = 1; i <= 4; i++) {
        const bt = Math.max(0, t - i * 0.05);
        const bx = fromX + (toX - fromX) * bt;
        const by = fromY + (toY - fromY) * bt - arc * Math.sin(Math.PI * bt);
        g.fillStyle(this.tint(CREATION.soot), 0.22 * (1 - i / 5));
        g.fillCircle(bx, by, 3 + i * 1.4);
      }
    });
  }

  /** A sheet of sawdust motes drifting across a region — the Workshop's air. */
  sawdust(x: number, y: number, w: number, h: number, count: number, depth = 1): void {
    const motes = Array.from({ length: count }, () => ({
      x: x + (Math.random() - 0.5) * w,
      y: y + (Math.random() - 0.5) * h,
      r: 1 + Math.random() * 2,
      vx: (Math.random() - 0.5) * 22,
      vy: -8 - Math.random() * 20,
      delay: Math.random() * 0.4,
    }));
    this.anim(depth, 1600, (g, t) => {
      for (const m of motes) {
        const lt = (t - m.delay) / (1 - m.delay);
        if (lt <= 0) continue;
        const fade = Math.sin(lt * Math.PI);
        g.fillStyle(this.tint(CREATION.tan), 0.4 * fade);
        g.fillCircle(m.x + m.vx * lt * 1.6, m.y + m.vy * lt * 1.6, m.r);
      }
    });
  }
}

// ── CreationForge ─────────────────────────────────────────────────────────

/**
 * The persistent ring of forge heat and orbiting stock around a fighter — worn by whoever has
 * the Workshop up. Driven by whoever owns it: call `update` every frame with the position.
 */
export class CreationForge {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private sparkAccum = 0;
  private parts: { ang: number; dist: number; len: number; w: number; speed: number; plank: boolean }[];

  constructor(
    private scene: Phaser.Scene,
    private tint: CreationColorFn,
    private radius: number,
    private intensity: number,
    depth = 3,
    count = 9,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
    this.parts = Array.from({ length: count }, (_, i) => ({
      ang: (i / count) * TAU,
      dist: 0.75 + Math.random() * 0.35,
      len: 0.5 + Math.random() * 0.4,
      w: 0.09 + Math.random() * 0.05,
      speed: 0.7 + Math.random() * 0.6,
      plank: i % 3 === 0,
    }));
  }

  setIntensity(v: number): void { this.intensity = v; }

  update(delta: number, x: number, y: number, alpha = 1): void {
    if (!this.g.active) return;
    this.t += delta / 1000;
    const g = this.g;
    g.clear();
    if (alpha <= 0.02) return;

    const spin = this.t * 0.85;
    g.fillStyle(this.tint(CREATION.copper), 0.18 * this.intensity * alpha);
    g.fillCircle(x, y, this.radius * (0.9 + Math.sin(this.t * 4) * 0.05));

    // Stock orbiting the smith, waiting to be used.
    for (const p of this.parts) {
      const a = p.ang + spin * p.speed;
      const wob = Math.sin(this.t * 3 + p.ang);
      const d = this.radius * p.dist * (1 + wob * 0.06);
      const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * 0.72;
      const len = this.radius * p.len * this.intensity;
      if (p.plank) craftPlank(g, this.tint, px, py, a + Math.PI / 2, len, this.radius * p.w, 0.7 * alpha);
      else forgedShardLayered(g, this.tint, px, py, a + Math.PI / 2, len, this.radius * p.w, wob * 4, 0.7 * alpha);
    }

    this.sparkAccum += delta;
    const interval = 300 / Math.max(0.4, this.intensity);
    if (this.sparkAccum >= interval) {
      this.sparkAccum = 0;
      new CreationFx(this.scene, this.tint).sparks(
        x + (Math.random() - 0.5) * this.radius * 1.2,
        y + (Math.random() - 0.5) * this.radius * 0.7,
        1, { speed: 26, size: 2, life: 620, gravity: -60, depth: 4 },
      );
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── CreationNexus ─────────────────────────────────────────────────────────

/**
 * The Nexus: the brewing machine parked at the arena centre for the whole match. A riveted
 * iron plinth carrying two counter-rotating gears around a caged energy core, with arcs that
 * crackle between the cage bars while it is brewing.
 *
 * It is on screen every second of a Creation match, so it is the one thing that has to hold up
 * to being looked at — hence its own class with its own clock rather than a stack of tweens.
 */
export class CreationNexus {
  private g: Phaser.GameObjects.Graphics;
  private t = 0;
  private brewing = false;
  private load = 0;
  private arcSeeds = Array.from({ length: 6 }, () => Math.random());

  constructor(
    scene: Phaser.Scene,
    private tint: CreationColorFn,
    public readonly x: number,
    public readonly y: number,
    depth = 3,
  ) {
    this.g = scene.add.graphics().setDepth(depth);
  }

  /** Brewing spins the gears up and lights the cage. */
  setBrewing(on: boolean): void { this.brewing = on; }
  /** 0–2 bolts loaded — the core burns brighter as the recipe fills up. */
  setLoad(n: number): void { this.load = n; }

  update(delta: number): void {
    if (!this.g.active) return;
    const speed = this.brewing ? 3.4 : 1;
    this.t += (delta / 1000) * speed;
    const g = this.g;
    const { x, y } = this;
    g.clear();

    // Plinth: an octagonal iron base with a copper bevel and four corner studs.
    g.fillStyle(this.tint(CREATION.soot), 1);
    this.octagon(g, x, y, 40);
    g.fillPath();
    g.fillStyle(this.tint(CREATION.iron), 1);
    this.octagon(g, x, y, 35);
    g.fillPath();
    g.lineStyle(3, this.tint(CREATION.copper), 0.95);
    this.octagon(g, x, y, 37);
    g.strokePath();
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) rivet(g, this.tint, x + sx * 26, y + sy * 26, 4);
    }

    // Counter-rotating gears — the machine is visibly running even when idle.
    drawGear(g, this.tint, x, y, 28, 14, this.t * 0.9, CREATION.bronze, CREATION.brass, 0.95);
    drawGear(g, this.tint, x, y, 18, 10, -this.t * 1.5, CREATION.iron, CREATION.copper, 0.95);

    // Cage bars standing around the core.
    const glow = 0.5 + this.load * 0.2 + (this.brewing ? 0.3 : 0) + Math.sin(this.t * 6) * 0.1;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + this.t * 0.3;
      craftPlank(g, this.tint, x + Math.cos(a) * 13, y + Math.sin(a) * 13, a + Math.PI / 2, 13, 2.2, 0.9);
    }

    // The core.
    const cr = 8 + this.load * 1.6 + Math.sin(this.t * 7) * 1.4;
    g.fillStyle(this.tint(CREATION.nexus), 0.35 * glow);
    g.fillCircle(x, y, cr * 2.1);
    g.fillStyle(this.tint(CREATION.nexus), 0.95);
    g.fillCircle(x, y, cr);
    g.fillStyle(this.tint(CREATION.nexusLit), 0.95);
    g.fillCircle(x, y, cr * 0.62);
    g.fillStyle(this.tint(CREATION.white), 0.9);
    g.fillCircle(x - cr * 0.2, y - cr * 0.24, cr * 0.28);

    // Arcs crackling between cage and core while a brew runs.
    if (this.brewing) {
      g.lineStyle(1.6, this.tint(CREATION.nexusLit), 0.85);
      for (let i = 0; i < this.arcSeeds.length; i++) {
        const a = this.arcSeeds[i] * TAU + this.t * 1.3;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 1; k <= 3; k++) {
          const r = (13 / 3) * k;
          const jitter = (Math.random() - 0.5) * 5;
          g.lineTo(x + Math.cos(a + jitter * 0.06) * r, y + Math.sin(a + jitter * 0.06) * r);
        }
        g.strokePath();
      }
    }
  }

  private octagon(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number): void {
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath();
  }

  destroy(): void {
    this.g.destroy();
  }
}

// ── CreationAvatar ────────────────────────────────────────────────────────

/** Concentric discs of one forge-hot ball hand, outermost first. */
const CREATION_AVATAR: AvatarSpec = {
  hands: [
    { r: 10, color: CREATION.copper, alpha: 0.26 },
    { r: 6.6, color: CREATION.bronze, alpha: 0.95 },
    { r: 3.8, color: CREATION.ember, alpha: 1 },
    { r: 1.6, color: CREATION.spark, alpha: 0.95, ox: -1.4, oy: -1.4 },
  ],
  eyeWhite: CREATION.spark,
  eyePupil: 0x1c0d04,
  // Working hands: quick, and they smear along the swing.
  squash: { div: 12, x: 0.55, y: 0.3 },
};

/**
 * The Creation character rig: an artisan with two forge-hot ball hands, a hammer gripped in
 * the leading one, and a gear turning over the crown. Hands, eyes and gestures come from
 * BaseAvatar; what Creation adds is the tool it holds, the gearworks above it, and the forge
 * glow pooling at its feet.
 */
export class CreationAvatar extends BaseAvatar {
  private fx: CreationFx;
  /** Rises toward 1 while a build is being held, tilting the hammer up ready to strike. */
  private cocked = 0;

  constructor(scene: Phaser.Scene, tint: CreationColorFn, depth = 6) {
    super(scene, tint, depth, CREATION_AVATAR);
    this.fx = new CreationFx(scene, tint);
  }

  /**
   * Mastery tell — a permanent, readable upgrade to the character, so a mastered Creation user
   * is identifiable before they cast anything: white-hot eyes, a wider forge corona with a
   * brass rim on each hand, and (in `drawExtras`) a three-gear crown running nexus-pink with a
   * heavier hammer. Shape changes, not just a brighter tint.
   */
  protected applyMastery(on: boolean): void {
    this.setEyeWhite(on ? CREATION.white : CREATION.spark);
    this.forEachHandLayer(0, (halo) => {
      halo.setRadius(on ? 14 : 10);
      halo.setFillStyle(this.tint(on ? CREATION.brass : CREATION.copper), on ? 0.34 : 0.26);
    });
    this.forEachHandLayer(1, (shell) => {
      if (on) shell.setStrokeStyle(1.6, this.tint(CREATION.gold), 0.9);
      else shell.setStrokeStyle();
    });
  }

  /** Fast-moving hands throw sparks off whatever they are working. */
  protected emitTrail(x: number, y: number): void {
    this.fx.sparks(x, y, 1, { speed: 20, size: 2, life: 460, gravity: 40, depth: 5 });
  }

  /** Forge light pooling at the smith's feet, with heat rippling off it. */
  protected drawGlow(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number): void {
    g.fillStyle(this.tint(CREATION.copper), a * 0.3 * this.intensity);
    g.fillEllipse(x, y + 6, 52 * this.intensity, 22 * this.intensity);
    g.fillStyle(this.tint(CREATION.ember), a * 0.22 * this.intensity);
    g.fillEllipse(x, y + 5, 32 * this.intensity, 13 * this.intensity);
    // Heat ripples lifting off the pool.
    for (let i = 0; i < 3; i++) {
      const p = (this.t * 0.7 + i / 3) % 1;
      g.lineStyle(1.6, this.tint(CREATION.brass), a * 0.3 * (1 - p));
      g.strokeCircle(x, y + 6, 12 + p * 26);
    }
  }

  /**
   * The hammer the character actually grips, plus the gear crown above it. The hammer is
   * anchored to the leading hand's live position, so every gesture swings it for free. The
   * gears are rooted at the crown (`y - 22`) and drawn over the sprite, so the near teeth pass
   * in front of the head — which is what sells them as machinery rather than a halo.
   */
  protected drawExtras(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, alpha: number): void {
    const m = this.mastered ? 1 : 0;
    // Cock the hammer while a hold is running (building, charging), relax otherwise.
    const want = this.hold ? 1 : 0;
    this.cocked += (want - this.cocked) * 0.08;

    // ── The hammer ──
    const hx = this.armX[1], hy = this.armY[1];
    const grip = Math.atan2(hy - y, hx - x) - 0.5 - this.cocked * 0.7;
    const scale = (this.mastered ? 1.25 : 1) * (0.95 + this.intensity * 0.08);
    const cos = Math.cos(grip), sin = Math.sin(grip);
    // Haft runs back through the fist; the head sits out past the knuckles.
    g.lineStyle(4.2 * scale, this.tint(CREATION.timber), alpha * 0.95);
    g.lineBetween(hx - cos * 9 * scale, hy - sin * 9 * scale, hx + cos * 12 * scale, hy + sin * 12 * scale);
    g.fillStyle(this.tint(CREATION.soot), alpha);
    forgedShard(g, hx + cos * 20 * scale, hy + sin * 20 * scale, grip + Math.PI, 19 * scale, 7 * scale);
    g.fillStyle(this.tint(CREATION.steel), alpha);
    forgedShard(g, hx + cos * 19 * scale, hy + sin * 19 * scale, grip + Math.PI, 16 * scale, 5.4 * scale);
    g.fillStyle(this.tint(m ? CREATION.nexusLit : CREATION.silver), alpha * 0.9);
    forgedShard(g, hx + cos * 17 * scale, hy + sin * 17 * scale, grip + Math.PI, 10 * scale, 2 * scale);
    rivet(g, this.tint, hx + cos * 11 * scale, hy + sin * 11 * scale, 2.2 * scale, alpha);

    // ── The gear crown ──
    const rootY = y - 22;
    const gears = this.mastered ? 3 : 1;
    const rim = this.mastered ? CREATION.nexusLit : CREATION.brass;
    for (let i = 0; i < gears; i++) {
      // Interlocking: each extra gear sits on the previous one's pitch circle and counter-turns.
      const ang = Math.PI + i * 2.1;
      const r = (11 - i * 2.2) * scale;
      const gx = x + (i === 0 ? 0 : Math.cos(ang) * (13 + i * 2) * scale);
      const gy = rootY + (i === 0 ? 0 : Math.sin(ang) * 6 * scale);
      drawGear(g, this.tint, gx, gy, r, 9 - i, this.t * (i % 2 === 0 ? 1.6 : -2.2) * (1 + this.intensity * 0.4),
        CREATION.bronze, rim, alpha * 0.95);
    }

    // Sparks lifting off the crown, more of them the harder the character is working.
    const plumes = this.mastered ? 4 : 3;
    for (let i = 0; i < plumes; i++) {
      const p = (this.t * 1.4 + i / plumes) % 1;
      const px = x + Math.sin(this.t * 2 + i * 2.3) * 12 * scale;
      const py = rootY - 6 - p * 20 * this.intensity;
      g.fillStyle(this.tint(p < 0.5 ? CREATION.spark : CREATION.brass), a * (1 - p) * 0.9);
      g.fillCircle(px, py, (2.4 - p * 1.4) * scale);
    }

    // Mastery: rivets orbiting the head on a shallow ellipse, so the mastered silhouette reads
    // even when the gears are edge-on.
    if (this.mastered) {
      for (let i = 0; i < 3; i++) {
        const p = this.t * 1.4 + (i / 3) * TAU;
        rivet(g, this.tint, x + Math.cos(p) * 23, rootY - 4 + Math.sin(p) * 6, 3, alpha * 0.95);
      }
    }
  }
}

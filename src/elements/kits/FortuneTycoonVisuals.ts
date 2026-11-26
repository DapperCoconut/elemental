import Phaser from 'phaser';
import { TAU } from './ElementVisuals';
import { FOR, FortuneColorFn, jitter, mix } from './FortuneVisuals';
import {
  BELT_SPEED, BELT_X0, BELT_X1, BELT_Y, DROPPER_X, DropperId, Ore, PAD_H, PAD_W, REFINER_X, SPOUT_Y,
  TYCOON_H, TYCOON_W, Tycoon, TycoonPad, UPGRADER_X, UpgraderId, PadId,
} from './FortuneTycoon';

/**
 * Gold's tycoon, billiards and blood, drawn.
 *
 * The tycoon is a toy factory bolted along the top of the arena: a studded baseplate, brass
 * droppers with a spout each, a rubber belt on rollers, arches the ore rides under, and a refiner
 * with a chimney at the far end. Everything still unbought is a flat coloured **pad** in the row
 * under the belt — green when the purse covers it, dull red when it does not, blue for the one
 * that takes shards.
 */

/** Machine colours that are not gold. Gold itself comes from `FOR`. */
export const TY = {
  plate: 0x2b2f38,
  plateLit: 0x3d4350,
  stud: 0x4a5160,
  belt: 0x1b1d22,
  beltLit: 0x34383f,
  steel: 0x6c7482,
  steelLit: 0xaab2c0,
  padGo: 0x3fc463,
  padGoLit: 0x9af0a8,
  padNo: 0x8a3a3a,
  padNoLit: 0xc26a6a,
  shard: 0x4fb8ff,
  shardLit: 0xbfe8ff,
  flame: 0xff7a2a,
  flameLit: 0xffd27a,
  dragon: 0x3f8a4a,
  dragonLit: 0x86d48a,
  felt: 0x1d6b3a,
};

const P = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(x, y);
type G = Phaser.GameObjects.Graphics;

function glint(g: G, color: number, x: number, y: number, r: number, alpha: number): void {
  if (alpha <= 0.01 || r <= 0.2) return;
  g.fillStyle(color, alpha);
  g.fillPoints([P(x, y - r), P(x + r * 0.22, y - r * 0.22), P(x + r, y), P(x + r * 0.22, y + r * 0.22),
    P(x, y + r), P(x - r * 0.22, y + r * 0.22), P(x - r, y), P(x - r * 0.22, y - r * 0.22)], true);
}

// ── Ore ──────────────────────────────────────────────────────────────────────

/** One piece of ore: a faceted nugget, brighter with every upgrader it has been under. */
export function orePiece(g: G, tint: FortuneColorFn, x: number, y: number, o: Ore, t: number, alpha: number): void {
  const r = o.kind === 'big' ? 5 : o.kind === 'midas' ? 4.6 : o.kind === 'drill' ? 1.9 : 3.5;
  const k = Math.min(1, o.tier / 3);
  const dark = mix(FOR.soot, FOR.brass, 0.4 + k * 0.6);
  const body = o.kind === 'midas' ? FOR.goldLit : mix(FOR.brass, FOR.goldLit, 0.25 + k * 0.75);
  const n = o.kind === 'drill' ? 4 : 6;
  const pts: Phaser.Geom.Point[] = [];
  const inner: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + jitter(o.seed, i) * 0.5;
    const rr = r * (0.78 + jitter(o.seed, i + 9) * 0.34);
    pts.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86));
    inner.push(P(x + Math.cos(a) * rr * 0.62 - r * 0.14, y + Math.sin(a) * rr * 0.52 - r * 0.18));
  }
  g.fillStyle(tint(FOR.ink), alpha * 0.4);
  g.fillEllipse(x, y + r * 0.9, r * 1.9, r * 0.6);
  g.fillStyle(tint(dark), alpha);
  g.fillPoints(pts, true);
  g.fillStyle(tint(body), alpha);
  g.fillPoints(inner, true);
  if (o.kind === 'drill') return;
  g.fillStyle(tint(FOR.hot), alpha * (0.5 + k * 0.4));
  g.fillCircle(x - r * 0.3, y - r * 0.32, Math.max(0.6, r * 0.2));
  if (o.kind === 'midas' || o.tier >= 2) {
    const tw = 0.5 + 0.5 * Math.sin(t * 7 + o.seed);
    glint(g, tint(FOR.hot), x + r * 0.3, y - r * 0.5, r * (0.5 + tw * 0.5), alpha * (0.4 + tw * 0.6));
  }
}

// ── Machines ─────────────────────────────────────────────────────────────────

function baseplate(g: G, tint: FortuneColorFn, x: number, y: number, alpha: number): void {
  g.fillStyle(tint(FOR.ink), alpha * 0.55);
  g.fillRoundedRect(x - 2, y + 2, TYCOON_W + 4, TYCOON_H + 2, 7);
  g.fillStyle(tint(TY.plate), alpha * 0.94);
  g.fillRoundedRect(x, y, TYCOON_W, TYCOON_H, 6);
  g.fillStyle(tint(TY.plateLit), alpha * 0.9);
  g.fillRoundedRect(x + 2, y + 2, TYCOON_W - 4, 5, 3);
  // Studs: the baseplate every tycoon is built on.
  g.fillStyle(tint(TY.stud), alpha * 0.8);
  for (let sx = x + 9; sx < x + TYCOON_W - 4; sx += 12) {
    g.fillCircle(sx, y + TYCOON_H - 4.5, 1.7);
  }
  g.lineStyle(1.4, tint(FOR.brass), alpha * 0.9);
  g.strokeRoundedRect(x, y, TYCOON_W, TYCOON_H, 6);
}

function conveyor(g: G, tint: FortuneColorFn, x: number, y: number, t: number, alpha: number): void {
  const x0 = x + BELT_X0;
  const w = BELT_X1 - BELT_X0;
  const by = y + BELT_Y;
  // Frame, belt, and the lit top lip the ore rides on.
  g.fillStyle(tint(TY.steel), alpha);
  g.fillRoundedRect(x0 - 3, by - 1, w + 6, 11, 4);
  g.fillStyle(tint(TY.belt), alpha);
  g.fillRoundedRect(x0, by, w, 8, 3);
  g.fillStyle(tint(TY.beltLit), alpha);
  g.fillRect(x0 + 2, by, w - 4, 1.6);
  // Chevrons that run with the belt.
  const off = (t * BELT_SPEED) % 14;
  g.lineStyle(1.2, tint(TY.steel), alpha * 0.75);
  for (let cx = x0 + 4 + off; cx < x0 + w - 6; cx += 14) {
    g.beginPath();
    g.moveTo(cx, by + 2.4);
    g.lineTo(cx + 3, by + 4.4);
    g.lineTo(cx, by + 6.4);
    g.strokePath();
  }
  // End rollers, turning.
  for (const rx of [x0 + 1, x0 + w - 1]) {
    g.fillStyle(tint(TY.steelLit), alpha);
    g.fillCircle(rx, by + 4, 4.4);
    g.fillStyle(tint(TY.belt), alpha);
    g.fillCircle(rx, by + 4, 2.4);
    const a = t * (BELT_SPEED / 4.4);
    g.lineStyle(1, tint(TY.steelLit), alpha);
    g.lineBetween(rx - Math.cos(a) * 2.2, by + 4 - Math.sin(a) * 2.2, rx + Math.cos(a) * 2.2, by + 4 + Math.sin(a) * 2.2);
  }
  // Legs.
  g.fillStyle(tint(TY.steel), alpha * 0.9);
  for (let lx = x0 + 20; lx < x0 + w; lx += 62) g.fillRect(lx, by + 9, 2.4, 6);
}

/** A dropper: a hopper box on a bracket with a spout over the belt. */
function dropper(
  g: G, tint: FortuneColorFn, x: number, y: number, id: DropperId, tripled: boolean, flash: number, t: number, alpha: number,
): void {
  const top = y + 9;
  const heavy = id === 'drop4';
  const w = heavy ? 24 : 20;
  const h = heavy ? 13 : 11;
  const body = id === 'midas' ? FOR.gold : heavy ? TY.steel : FOR.brass;
  const lit = id === 'midas' ? FOR.hot : heavy ? TY.steelLit : FOR.goldLit;
  // Bracket down to the baseplate behind the belt.
  g.fillStyle(tint(TY.steel), alpha * 0.9);
  g.fillRect(x - w / 2 + 1, top + h - 1, 2, y + BELT_Y - (top + h) + 1);
  g.fillRect(x + w / 2 - 3, top + h - 1, 2, y + BELT_Y - (top + h) + 1);

  if (id === 'drill') {
    // Mega Drill: a motor block and a spinning bit that never stops.
    g.fillStyle(tint(FOR.ink), alpha * 0.5);
    g.fillRoundedRect(x - 9, top + 1, 20, 10, 2);
    g.fillStyle(tint(TY.steel), alpha);
    g.fillRoundedRect(x - 10, top, 20, 10, 2);
    g.fillStyle(tint(TY.steelLit), alpha);
    g.fillRect(x - 8, top + 1.5, 16, 1.6);
    g.fillStyle(tint(FOR.gold), alpha);
    g.fillRect(x - 10, top + 6, 20, 2);
    const spin = t * 26;
    const tipY = y + SPOUT_Y + 6;
    g.fillStyle(tint(TY.steelLit), alpha);
    g.fillPoints([P(x - 5, top + 10), P(x + 5, top + 10), P(x, tipY)], true);
    g.lineStyle(1.1, tint(TY.belt), alpha);
    for (let i = 0; i < 4; i++) {
      const u = ((i / 4) + (spin % 1) / 4) % 1;
      const yy = top + 10 + u * (tipY - top - 10);
      const half = 5 * (1 - u);
      g.lineBetween(x - half, yy, x + half, yy + 1.6);
    }
    for (let i = 0; i < 3; i++) {
      const a = spin + i * 2.1;
      g.fillStyle(tint(FOR.brass), alpha * 0.8);
      g.fillCircle(x + Math.cos(a) * 5, tipY + 2 + Math.abs(Math.sin(a)) * 3, 0.9);
    }
    return;
  }

  // Hopper.
  g.fillStyle(tint(FOR.ink), alpha * 0.5);
  g.fillRoundedRect(x - w / 2 + 1, top + 1, w, h, 2);
  g.fillStyle(tint(body), alpha);
  g.fillRoundedRect(x - w / 2, top, w, h, 2);
  g.fillStyle(tint(lit), alpha * 0.9);
  g.fillRect(x - w / 2 + 2, top + 1.4, w - 4, 1.6);
  g.fillStyle(tint(FOR.ink), alpha * 0.55);
  g.fillRoundedRect(x - w / 2 + 3, top + 4.4, w - 6, 3.6, 1);
  // Ore heaped in the window.
  g.fillStyle(tint(id === 'midas' ? FOR.hot : FOR.gold), alpha);
  for (let i = 0; i < (heavy ? 4 : 3); i++) g.fillCircle(x - (heavy ? 6 : 4) + i * 4, top + 6.6, heavy ? 1.9 : 1.5);
  // Rivets.
  g.fillStyle(tint(FOR.ink), alpha * 0.7);
  g.fillCircle(x - w / 2 + 2, top + h - 2, 0.8);
  g.fillCircle(x + w / 2 - 2, top + h - 2, 0.8);
  // Spout, and the flare as a piece leaves it.
  g.fillStyle(tint(body), alpha);
  g.fillPoints([P(x - 5, top + h), P(x + 5, top + h), P(x + 2.4, y + SPOUT_Y + 1), P(x - 2.4, y + SPOUT_Y + 1)], true);
  g.fillStyle(tint(FOR.ink), alpha * 0.7);
  g.fillRect(x - 2.4, y + SPOUT_Y, 4.8, 1.6);
  if (flash > 0) {
    g.fillStyle(tint(FOR.hot), alpha * flash * 0.8);
    g.fillCircle(x, y + SPOUT_Y + 2, 3 + flash * 3);
  }
  if (id === 'midas') {
    // A crown on the lid.
    g.fillStyle(tint(FOR.goldLit), alpha);
    g.fillPoints([P(x - 6, top), P(x - 6, top - 5), P(x - 3, top - 2.4), P(x, top - 6), P(x + 3, top - 2.4),
      P(x + 6, top - 5), P(x + 6, top)], true);
    g.fillStyle(tint(FOR.blood), alpha);
    g.fillCircle(x, top - 1.6, 1.1);
    glint(g, tint(FOR.hot), x, top - 6, 2.4, alpha * (0.5 + 0.5 * Math.sin(t * 5)));
  }
  if (tripled) {
    // The shard pad's work: three blue crystals set in the lid, and a ×3 the eye can count.
    for (let i = -1; i <= 1; i++) {
      const cx = x + i * 5;
      g.fillStyle(tint(TY.shard), alpha);
      g.fillPoints([P(cx, top - 5.5 - Math.abs(i) * -1), P(cx + 2.2, top - 1.6), P(cx, top + 0.6), P(cx - 2.2, top - 1.6)], true);
      g.fillStyle(tint(TY.shardLit), alpha);
      g.fillPoints([P(cx, top - 4.6), P(cx + 1, top - 1.8), P(cx - 1.2, top - 1.8)], true);
    }
    glint(g, tint(TY.shardLit), x + 5, top - 4, 2, alpha * (0.4 + 0.6 * Math.abs(Math.sin(t * 3))));
  }
}

/** The mark an upgrader wears: a plus, a cross, or nothing. */
function glyph(g: G, color: number, x: number, y: number, r: number, kind: 'plus' | 'times', alpha: number): void {
  g.lineStyle(1.6, color, alpha);
  if (kind === 'plus') {
    g.lineBetween(x - r, y, x + r, y);
    g.lineBetween(x, y - r, x, y + r);
  } else {
    g.lineBetween(x - r * 0.75, y - r * 0.75, x + r * 0.75, y + r * 0.75);
    g.lineBetween(x - r * 0.75, y + r * 0.75, x + r * 0.75, y - r * 0.75);
  }
}

/** An upgrader: an arch the ore passes under. */
function upgrader(g: G, tint: FortuneColorFn, x: number, y: number, id: UpgraderId, flash: number, t: number, alpha: number): void {
  const by = y + BELT_Y;
  if (id === 'tunnel') {
    // Tunnel of Fortune: a long gilded shed over the belt, three lamps in a row along its roof.
    const w = 30;
    const top = by - 22;
    g.fillStyle(tint(FOR.ink), alpha * 0.5);
    g.fillRoundedRect(x - w / 2 + 1, top + 1, w, 22, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.fillStyle(tint(FOR.brass), alpha);
    g.fillRoundedRect(x - w / 2, top, w, 22, { tl: 9, tr: 9, bl: 0, br: 0 });
    g.fillStyle(tint(FOR.gold), alpha);
    g.fillRoundedRect(x - w / 2 + 2, top + 2, w - 4, 6, { tl: 7, tr: 7, bl: 0, br: 0 });
    // The mouth the ore goes in by, dark, with light inside when a piece is under it.
    g.fillStyle(tint(FOR.ink), alpha * 0.9);
    g.fillRoundedRect(x - w / 2 + 3, by - 11, w - 6, 11, { tl: 5, tr: 5, bl: 0, br: 0 });
    g.fillStyle(tint(FOR.hot), alpha * (0.12 + flash * 0.6));
    g.fillRoundedRect(x - w / 2 + 4, by - 10, w - 8, 10, { tl: 4, tr: 4, bl: 0, br: 0 });
    const kinds: ('plus' | 'times')[] = ['plus', 'plus', 'times'];
    for (let i = 0; i < 3; i++) {
      const lx = x - 9 + i * 9;
      const on = 0.5 + 0.5 * Math.sin(t * 6 - i * 1.2);
      g.fillStyle(tint(i === 2 ? FOR.bloodLit : TY.padGoLit), alpha * (0.5 + on * 0.5));
      g.fillCircle(lx, top + 5, 2.6);
      glyph(g, tint(FOR.ink), lx, top + 5, 1.5, kinds[i], alpha);
    }
    return;
  }
  if (id === 'dragon') {
    // Dragon Upgrader: a green head hung over the belt, jaw open, breathing on every piece.
    const hy = by - 17;
    g.fillStyle(tint(TY.steel), alpha);
    g.fillRect(x - 12, hy + 4, 2.4, by + 8 - hy - 4);
    g.fillRect(x + 10, hy + 4, 2.4, by + 8 - hy - 4);
    g.fillStyle(tint(FOR.ink), alpha * 0.5);
    g.fillEllipse(x + 1, hy + 2, 26, 15);
    g.fillStyle(tint(TY.dragon), alpha);
    g.fillEllipse(x, hy, 26, 14);
    // Horns and brow ridge.
    g.fillStyle(tint(FOR.goldLit), alpha);
    g.fillPoints([P(x - 9, hy - 5), P(x - 13, hy - 12), P(x - 5, hy - 6)], true);
    g.fillPoints([P(x + 9, hy - 5), P(x + 13, hy - 12), P(x + 5, hy - 6)], true);
    g.fillStyle(tint(TY.dragonLit), alpha);
    g.fillEllipse(x - 2, hy - 2.6, 16, 5);
    // Eyes: slits that light when it breathes.
    for (const s of [-1, 1]) {
      g.fillStyle(tint(mix(FOR.gold, FOR.bloodLit, flash)), alpha);
      g.fillEllipse(x + s * 6, hy - 1, 4.4, 3);
      g.fillStyle(tint(FOR.ink), alpha);
      g.fillRect(x + s * 6 - 0.5, hy - 2.4, 1, 2.8);
    }
    // Lower jaw, teeth.
    g.fillStyle(tint(TY.dragon), alpha);
    g.fillPoints([P(x - 9, hy + 5), P(x + 9, hy + 5), P(x + 5, hy + 10), P(x - 5, hy + 10)], true);
    g.fillStyle(tint(FOR.hot), alpha);
    for (let i = -2; i <= 2; i++) g.fillPoints([P(x + i * 3 - 1, hy + 5), P(x + i * 3 + 1, hy + 5), P(x + i * 3, hy + 7.4)], true);
    // The breath.
    const idle = 0.25 + 0.15 * Math.sin(t * 9);
    const f = Math.max(idle, flash);
    for (let i = 0; i < 4; i++) {
      const fy = hy + 10 + i * 2.6;
      const fw = (5 - i) * (0.7 + f);
      g.fillStyle(tint(i < 2 ? TY.flameLit : TY.flame), alpha * f * (1 - i * 0.18));
      g.fillEllipse(x + Math.sin(t * 14 + i) * 1.2, fy, fw, 3.4);
    }
    return;
  }
  // The three bought arches: two posts, a lintel, and a lamp that says what it does.
  const mult = id === 'up3';
  const top = by - (mult ? 22 : 19);
  const w = mult ? 22 : 18;
  const frame = mult ? FOR.gold : TY.steel;
  const frameLit = mult ? FOR.hot : TY.steelLit;
  g.fillStyle(tint(FOR.ink), alpha * 0.45);
  g.fillRect(x - w / 2 + 1, top + 1, 3, by + 8 - top);
  g.fillRect(x + w / 2 - 2, top + 1, 3, by + 8 - top);
  g.fillStyle(tint(frame), alpha);
  g.fillRect(x - w / 2, top, 3, by + 8 - top);
  g.fillRect(x + w / 2 - 3, top, 3, by + 8 - top);
  g.fillRoundedRect(x - w / 2, top, w, 8, 2);
  g.fillStyle(tint(frameLit), alpha * 0.9);
  g.fillRect(x - w / 2 + 2, top + 1, w - 4, 1.4);
  // The curtain of light the ore passes through.
  const beam = mult ? FOR.bloodLit : TY.padGoLit;
  g.fillStyle(tint(beam), alpha * (0.14 + flash * 0.55));
  g.fillRect(x - w / 2 + 3, top + 8, w - 6, by - top - 8);
  g.lineStyle(1, tint(beam), alpha * (0.35 + flash * 0.6));
  for (let i = 0; i < 3; i++) {
    const lx = x - w / 2 + 5 + i * ((w - 10) / 2);
    g.lineBetween(lx, top + 8, lx, by);
  }
  g.fillStyle(tint(mult ? FOR.blood : TY.padGo), alpha);
  g.fillCircle(x, top + 4, 3.4);
  g.fillStyle(tint(beam), alpha * (0.6 + flash * 0.4));
  g.fillCircle(x, top + 4, 2.6);
  glyph(g, tint(FOR.ink), x, top + 4, 1.9, mult ? 'times' : 'plus', alpha);
  if (mult) {
    const a = t * 2.4;
    g.lineStyle(1, tint(FOR.goldLit), alpha * 0.8);
    g.beginPath();
    g.arc(x, top + 4, 5.4, a, a + 2.2, false);
    g.strokePath();
  }
}

/** The refiner: where ore turns into money. Wears its level, and whatever a rebirth bolted on. */
function refiner(g: G, tint: FortuneColorFn, x: number, y: number, ty: Tycoon, t: number, alpha: number): void {
  const cx = x + REFINER_X;
  const top = y + 13;
  const w = 46;
  const h = 44;
  const left = cx - w / 2;
  const level = ty.refinerLevel;
  const flash = ty.refineFlash;
  const life = ty.lifeSupport;
  const body = level >= 3 ? FOR.gold : level === 2 ? FOR.brass : TY.steel;
  const lit = level >= 3 ? FOR.hot : level === 2 ? FOR.goldLit : TY.steelLit;
  // Chimney and its smoke — or, on life-support, a slow red pulse.
  g.fillStyle(tint(TY.steel), alpha);
  g.fillRect(cx + 9, top - 8, 7, 10);
  g.fillStyle(tint(TY.steelLit), alpha);
  g.fillRect(cx + 8, top - 9, 9, 2.4);
  for (let i = 0; i < 3; i++) {
    const u = ((t * 0.7 + i / 3) % 1);
    g.fillStyle(tint(life ? FOR.bloodLit : FOR.dust), alpha * (1 - u) * 0.4);
    g.fillCircle(cx + 12.5 + Math.sin(u * 5 + i) * 2, top - 10 - u * 9, 1.6 + u * 2.4);
  }
  g.fillStyle(tint(FOR.ink), alpha * 0.5);
  g.fillRoundedRect(left + 2, top + 2, w, h, 4);
  g.fillStyle(tint(body), alpha);
  g.fillRoundedRect(left, top, w, h, 4);
  g.fillStyle(tint(lit), alpha * 0.9);
  g.fillRoundedRect(left + 2, top + 2, w - 4, 3, 2);
  // Mouth, on the belt side.
  const my = y + BELT_Y - 9;
  g.fillStyle(tint(FOR.ink), alpha * 0.92);
  g.fillRoundedRect(left - 1, my, 13, 18, 3);
  g.fillStyle(tint(life ? FOR.bloodLit : FOR.hot), alpha * (0.15 + flash * 0.75));
  g.fillRoundedRect(left, my + 1, 11, 16, 3);
  if (ty.glory.has('shredder')) {
    // Shredder: two toothed drums turning into each other in the mouth.
    for (const s of [0, 1]) {
      const dy = my + 5 + s * 8;
      const a = t * 9 * (s ? -1 : 1);
      g.fillStyle(tint(TY.steelLit), alpha);
      g.fillCircle(left + 5, dy, 4);
      g.fillStyle(tint(TY.belt), alpha);
      g.fillCircle(left + 5, dy, 1.6);
      g.fillStyle(tint(TY.steelLit), alpha);
      for (let i = 0; i < 6; i++) {
        const aa = a + (i / 6) * TAU;
        g.fillPoints([P(left + 5 + Math.cos(aa - 0.3) * 3.6, dy + Math.sin(aa - 0.3) * 3.6),
          P(left + 5 + Math.cos(aa) * 6, dy + Math.sin(aa) * 6),
          P(left + 5 + Math.cos(aa + 0.3) * 3.6, dy + Math.sin(aa + 0.3) * 3.6)], true);
      }
    }
  }
  // The gear on the face, turning faster as a piece goes through.
  const gx = cx + 5;
  const gy = top + 20;
  const ga = t * (1.4 + flash * 6);
  g.fillStyle(tint(FOR.ink), alpha * 0.55);
  g.fillCircle(gx, gy, 9.4);
  g.fillStyle(tint(lit), alpha);
  for (let i = 0; i < 8; i++) {
    const a = ga + (i / 8) * TAU;
    g.fillPoints([P(gx + Math.cos(a - 0.2) * 6, gy + Math.sin(a - 0.2) * 6), P(gx + Math.cos(a - 0.12) * 9, gy + Math.sin(a - 0.12) * 9),
      P(gx + Math.cos(a + 0.12) * 9, gy + Math.sin(a + 0.12) * 9), P(gx + Math.cos(a + 0.2) * 6, gy + Math.sin(a + 0.2) * 6)], true);
  }
  g.fillCircle(gx, gy, 6.6);
  g.fillStyle(tint(body), alpha);
  g.fillCircle(gx, gy, 4.6);
  if (life) {
    // Life-support: the coin on the hub becomes a red cross, and the whole face breathes red.
    const pulse = 0.6 + 0.4 * Math.sin(t * 5);
    g.fillStyle(tint(FOR.hot), alpha);
    g.fillCircle(gx, gy, 4.4);
    g.fillStyle(tint(FOR.blood), alpha);
    g.fillRect(gx - 1.2, gy - 3.4, 2.4, 6.8);
    g.fillRect(gx - 3.4, gy - 1.2, 6.8, 2.4);
    g.lineStyle(1.6, tint(FOR.bloodLit), alpha * pulse);
    g.strokeRoundedRect(left - 1, top - 1, w + 2, h + 2, 5);
  } else {
    g.fillStyle(tint(FOR.goldLit), alpha);
    g.fillCircle(gx, gy, 3);
    g.fillStyle(tint(FOR.brass), alpha);
    g.fillRect(gx - 0.6, gy - 2, 1.2, 4);
  }
  // Level pips along the bottom.
  for (let i = 0; i < 3; i++) {
    g.fillStyle(tint(i < level ? FOR.hot : FOR.ink), alpha * (i < level ? 1 : 0.5));
    g.fillRoundedRect(cx - 4 + i * 7, top + h - 7, 5, 3.4, 1);
  }
  if (ty.glory.has('furnace')) {
    // Flaming Furnace: a firebox under the gear, its window as bright as the furnace is hot.
    const fx = left + 15;
    const fy = top + 31;
    g.fillStyle(tint(FOR.ink), alpha * 0.9);
    g.fillRoundedRect(fx, fy, 24, 8, 2);
    g.fillStyle(tint(mix(FOR.blood, TY.flameLit, ty.heat)), alpha * (0.35 + ty.heat * 0.65));
    g.fillRoundedRect(fx + 1, fy + 1, 22 * Math.max(0.08, ty.heat), 6, 2);
    const n = 2 + Math.round(ty.heat * 4);
    for (let i = 0; i < n; i++) {
      const u = ((t * 1.6 + i * 0.37) % 1);
      const px = fx + 3 + ((i * 7.3) % 18);
      g.fillStyle(tint(u < 0.5 ? TY.flameLit : TY.flame), alpha * (1 - u) * (0.5 + ty.heat * 0.5));
      g.fillEllipse(px, fy - u * (4 + ty.heat * 8), 3 - u * 2, 4.4 - u * 2);
    }
    g.lineStyle(1, tint(FOR.brass), alpha);
    g.strokeRoundedRect(fx, fy, 24, 8, 2);
  }
  if (flash > 0) glint(g, tint(life ? FOR.bloodLit : FOR.hot), left + 5, my + 9, 4 + flash * 5, alpha * flash);
}

/** A pad: a flat button on the baseplate. Green if it can be paid for, red if not, blue for shards. */
export function buyPad(
  g: G, tint: FortuneColorFn, x: number, y: number, pad: TycoonPad, affordable: boolean, hover: boolean, t: number, alpha: number,
): void {
  const shards = pad.currency === 'shards';
  const base = shards ? TY.shard : affordable ? TY.padGo : TY.padNo;
  const lit = shards ? TY.shardLit : affordable ? TY.padGoLit : TY.padNoLit;
  const press = hover && affordable ? 1 : 0;
  const pulse = affordable ? 0.5 + 0.5 * Math.sin(t * 5) : 0;
  const px = x - PAD_W / 2;
  const py = y - PAD_H / 2;
  g.fillStyle(tint(FOR.ink), alpha * 0.7);
  g.fillRoundedRect(px - 1, py + 1, PAD_W + 2, PAD_H + 1, 4);
  g.fillStyle(tint(mix(base, FOR.ink, 0.45)), alpha);
  g.fillRoundedRect(px, py + 2, PAD_W, PAD_H - 1, 4);
  g.fillStyle(tint(mix(base, lit, hover ? 0.5 : pulse * 0.25)), alpha * (affordable || shards ? 1 : 0.8));
  g.fillRoundedRect(px, py + press, PAD_W, PAD_H - 2, 4);
  g.fillStyle(tint(lit), alpha * 0.55);
  g.fillRoundedRect(px + 2, py + 1 + press, PAD_W - 4, 2.4, 2);
  if (affordable) {
    g.lineStyle(1.2, tint(lit), alpha * (0.4 + pulse * 0.6));
    g.strokeRoundedRect(px - 1.5, py - 1.5 + press, PAD_W + 3, PAD_H + 1, 5);
  }
}

/**
 * The whole strip at `(x, y)`: baseplate, every machine built, the ore on the belt, and the pads.
 * `canPay(pad)` decides each pad's colour; `hover` is the pad under the cursor, if any.
 */
export function paintTycoon(
  g: G, tint: FortuneColorFn, ty: Tycoon, x: number, y: number, t: number, alpha: number,
  pads: TycoonPad[], canPay: (pad: TycoonPad) => boolean, hover: PadId | null,
): void {
  if (alpha <= 0.01) return;
  baseplate(g, tint, x, y, alpha);
  conveyor(g, tint, x, y, t, alpha);
  // Ore first, so it passes *under* the arches and into the refiner's mouth.
  for (const o of ty.ores) {
    const p = Tycoon.orePos(o);
    orePiece(g, tint, x + p.x, y + p.y, o, t, alpha);
  }
  for (const id of ty.droppers()) {
    dropper(g, tint, x + DROPPER_X[id], y, id, id === 'base' && ty.shardDropper, ty.dropFlash[id] ?? 0, t, alpha);
  }
  for (const id of ty.upgraders()) upgrader(g, tint, x + UPGRADER_X[id], y, id, ty.upFlash[id] ?? 0, t, alpha);
  refiner(g, tint, x, y, ty, t, alpha);
  for (const pad of pads) buyPad(g, tint, x + pad.x, y + pad.y, pad, canPay(pad), hover === pad.id, t, alpha);
}

// ── Billiards (R) ────────────────────────────────────────────────────────────

/** A golden pool ball: polished sphere, a white number disc that turns as it rolls, a hard highlight. */
export function poolBall(
  g: G, tint: FortuneColorFn, x: number, y: number, r: number, n: number, roll: number, alpha: number, lift = 0,
): void {
  if (alpha <= 0.01) return;
  g.fillStyle(tint(FOR.ink), alpha * 0.4);
  g.fillEllipse(x + 1, y + r * 0.85, r * 2 * (1 - lift * 0.3), r * 0.7 * (1 - lift * 0.3));
  const yy = y - lift * 26;
  g.fillStyle(tint(FOR.brass), alpha);
  g.fillCircle(x, yy, r);
  g.fillStyle(tint(FOR.gold), alpha);
  g.fillCircle(x - r * 0.12, yy - r * 0.12, r * 0.84);
  // Striped balls (9 and up) wear a pale band; the band and the disc ride the roll.
  const dx = Math.cos(roll) * r * 0.36;
  const dy = Math.sin(roll * 0.7) * r * 0.3;
  if (n > 8) {
    g.fillStyle(tint(FOR.hot), alpha * 0.9);
    g.fillEllipse(x + dx * 0.4, yy + dy * 0.4, r * 1.9, r * 0.8);
    g.fillStyle(tint(FOR.gold), alpha);
    g.fillEllipse(x + dx * 0.4, yy + dy * 0.4 - r * 0.55, r * 1.5, r * 0.45);
  }
  g.fillStyle(tint(FOR.hot), alpha);
  g.fillCircle(x + dx, yy + dy, r * 0.42);
  g.fillStyle(tint(FOR.ink), alpha * 0.85);
  // The number, as pips: enough to tell one ball from another at this size.
  const pips = ((n - 1) % 3) + 1;
  for (let i = 0; i < pips; i++) g.fillCircle(x + dx + (i - (pips - 1) / 2) * r * 0.26, yy + dy, r * 0.09);
  g.fillStyle(tint(FOR.goldLit), alpha * 0.9);
  g.fillEllipse(x - r * 0.36, yy - r * 0.42, r * 0.6, r * 0.36);
  g.fillStyle(tint(FOR.hot), alpha);
  g.fillCircle(x - r * 0.42, yy - r * 0.48, r * 0.14);
  g.lineStyle(0.8, tint(FOR.soot), alpha * 0.6);
  g.strokeCircle(x, yy, r);
}

/**
 * The line a cue shot is aimed along: a dashed sight from the tip, a ghost ring on the ball it
 * would strike, and a power gauge of ticks behind the hand that fills as the cane is drawn back.
 */
export function cueSight(
  g: G, tint: FortuneColorFn, x: number, y: number, ang: number, reach: number, power: number,
  ball: { x: number; y: number; r: number } | null, alpha: number, t: number,
): void {
  if (alpha <= 0.01) return;
  const cx = Math.cos(ang);
  const cy = Math.sin(ang);
  const len = ball ? Math.max(20, Math.hypot(ball.x - x, ball.y - y)) : reach;
  g.lineStyle(1.2, tint(FOR.goldLit), alpha * 0.55);
  const off = (t * 26) % 9;
  for (let d = 22 + off; d < len - 2; d += 9) {
    g.lineBetween(x + cx * d, y + cy * d, x + cx * Math.min(len, d + 4), y + cy * Math.min(len, d + 4));
  }
  if (ball) {
    g.lineStyle(1.4, tint(FOR.hot), alpha * 0.9);
    g.strokeCircle(ball.x, ball.y, ball.r + 3 + Math.sin(t * 8) * 0.8);
    // Where it will go.
    const run = 40 + power * 120;
    g.lineStyle(1.6, tint(FOR.hot), alpha * (0.35 + power * 0.5));
    g.lineBetween(ball.x + cx * (ball.r + 4), ball.y + cy * (ball.r + 4), ball.x + cx * run, ball.y + cy * run);
    g.fillStyle(tint(FOR.hot), alpha * (0.35 + power * 0.5));
    g.fillPoints([P(ball.x + cx * (run + 7), ball.y + cy * (run + 7)),
      P(ball.x + cx * run - cy * 4, ball.y + cy * run + cx * 4),
      P(ball.x + cx * run + cy * 4, ball.y + cy * run - cx * 4)], true);
  }
  // Power: seven ticks behind the hand.
  for (let i = 0; i < 7; i++) {
    const on = power * 7 > i + 0.2;
    const d = 16 + i * 5;
    const px = x - cx * d;
    const py = y - cy * d;
    const half = 3 + i * 0.5;
    g.lineStyle(2, tint(on ? mix(FOR.gold, FOR.bloodLit, i / 6) : FOR.soot), alpha * (on ? 1 : 0.45));
    g.lineBetween(px - cy * half, py + cx * half, px + cy * half, py - cx * half);
  }
}

// ── No Pain, No Gain (mastery) ───────────────────────────────────────────────

/**
 * One blot of the splatter. `gild` 0 is wet blood, 1 is solid gold: the gold sets from the middle
 * outward, so for a moment every blot is a gold coin in a red ring.
 */
export function bloodBlot(
  g: G, tint: FortuneColorFn, x: number, y: number, r: number, seed: number, gild: number, t: number, alpha: number,
): void {
  if (alpha <= 0.01 || r <= 0.5) return;
  const n = 10;
  const outer: Phaser.Geom.Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + jitter(seed, i) * 0.4;
    // Lobes and the odd long finger, so it reads as thrown liquid, not a disc.
    const finger = jitter(seed, i + 30) > 0.78 ? 1.45 : 1;
    const rr = r * (0.7 + 0.3 * jitter(seed, i + 12)) * finger;
    outer.push(P(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.86));
  }
  const edge = mix(FOR.blood, FOR.brass, gild);
  const face = mix(FOR.bloodLit, FOR.gold, gild);
  g.fillStyle(tint(edge), alpha * 0.9);
  g.fillPoints(outer, true);
  g.fillStyle(tint(face), alpha * 0.85);
  g.fillPoints(outer.map((p) => P(x + (p.x - x) * 0.72 - 0.6, y + (p.y - y) * 0.68 - 1)), true);
  if (gild > 0 && gild < 1) {
    g.fillStyle(tint(FOR.hot), alpha * Math.sin(gild * Math.PI) * 0.8);
    g.fillEllipse(x, y, r * 1.5 * gild, r * 1.2 * gild);
  }
  // Wet shine on blood; a wandering glint on gold.
  g.fillStyle(tint(mix(FOR.hot, FOR.goldLit, gild)), alpha * (0.3 + gild * 0.2));
  g.fillEllipse(x - r * 0.22, y - r * 0.26, r * 0.6, r * 0.24);
  if (gild >= 1) {
    const gl = Math.sin(t * 0.9 + seed * 3) * 0.5 + 0.5;
    if (gl > 0.8) glint(g, tint(FOR.hot), x + r * 0.25 * Math.cos(seed), y - r * 0.15, 3.6, alpha * (gl - 0.8) * 5);
  }
}

import Phaser from 'phaser';
import { SUB, SubColorFn, banknoteLayered } from './SubterfugeVisuals';

/**
 * Pure painters for Subterfuge's hired crew and everything the crew's money buys: the four
 * hired guns, their rank pips, the "money bar" buttons, the stash sack, grenades, the
 * helicopter, the bomber and its bombs, the flare and the air-strike markings.
 *
 * Nothing here owns a game object. Every function draws one frame into a Graphics the caller
 * owns; every colour goes through `tint` so a skin recolours the lot.
 */

type G = Phaser.GameObjects.Graphics;
interface Pt { x: number; y: number }
type At = (lx: number, ly: number) => Pt;

const TAU = Math.PI * 2;
/** Colours the shared palette lacks. */
const X = {
  burlap: 0xb8975a,
  burlapDark: 0x8a6c3a,
  drab: 0x55603c,
  drabDark: 0x39422a,
  drabHi: 0x76845a,
  enemyBody: 0x9c2230,
  enemyRim: 0x3a1418,
} as const;

// ── Path helpers (module-private copies of the ones in SubterfugeVisuals) ──

function fillPts(g: G, pts: Pt[]): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
}

function strokePts(g: G, pts: Pt[], close = false): void {
  if (pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  if (close) g.closePath();
  g.strokePath();
}

/** Local-to-world for a shape drawn along `angle` at (cx, cy). */
function frame(cx: number, cy: number, angle: number): At {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return (lx, ly) => ({ x: cx + lx * cos - ly * sin, y: cy + lx * sin + ly * cos });
}

/** A local axis-aligned box pushed through a frame. */
function box(g: G, at: At, x0: number, y0: number, x1: number, y1: number): void {
  fillPts(g, [at(x0, y0), at(x1, y0), at(x1, y1), at(x0, y1)]);
}

function seg(g: G, a: Pt, b: Pt): void { g.lineBetween(a.x, a.y, b.x, b.y); }

function clamp01(v: number): number { return v < 0 ? 0 : v > 1 ? 1 : v; }

/** An open arc stroke. */
function arc(g: G, x: number, y: number, r: number, a0: number, a1: number): void {
  g.beginPath();
  g.arc(x, y, r, a0, a1, false);
  g.strokePath();
}

/** A four-point twinkle. */
function twinkle(g: G, x: number, y: number, r: number): void {
  const w = r * 0.28;
  fillPts(g, [{ x: x - r, y }, { x, y: y - w }, { x: x + r, y }, { x, y: y + w }]);
  fillPts(g, [{ x, y: y - r }, { x: x + w, y }, { x, y: y + r }, { x: x - w, y }]);
}

/** One crimson ball hand, matching the avatar's. */
function hand(g: G, tint: SubColorFn, p: Pt, r: number, alpha: number): void {
  g.fillStyle(tint(SUB.wine), alpha);
  g.fillCircle(p.x, p.y, r);
  g.fillStyle(tint(SUB.crimson), alpha);
  g.fillCircle(p.x, p.y, r * 0.68);
  g.fillStyle(tint(SUB.scarlet), alpha);
  g.fillCircle(p.x - r * 0.3, p.y - r * 0.32, r * 0.26);
}

// ── The crew ──────────────────────────────────────────────────────────────

export type CrewType = 'thug' | 'enforcer' | 'sniper' | 'medic';
export interface CrewLook {
  type: CrewType;
  /** 0..3 (F+ bribe rank). */
  level: number;
  reloading: boolean;
  /** On fire (standing flames around him). */
  ignited: boolean;
  /** Belongs to the opponent: wine where the player's crew wears blood. */
  enemy: boolean;
  /** ms since his last shot (muzzle flash + recoil for the first ~90ms); large when idle. */
  firedAgoMs: number;
  /** Currently protected from loyalty loss. */
  shielded: boolean;
  /** Medic only: currently healing someone. */
  healing: boolean;
  /** Riding in a vehicle: no ground shadow and a slightly smaller figure. */
  seated: boolean;
}

/**
 * One hired gun. Centre (x,y), `facing` radians toward his target.
 *
 * He is the Subterfuge player in miniature — crimson orb, two ball hands, eyes down the barrel,
 * a suit front — told apart by his hat and what he is holding: the thug's newsboy cap and drum
 * Tommy gun, the enforcer's riot helmet, shotgun and shield, the sniper's beret and scoped rifle,
 * the medic's white cap, pistol and satchel. Rank is worn in gold.
 */
export function drawCrew(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, facing: number, t: number, alpha: number, look: CrewLook,
): void {
  const s = look.seated ? 0.85 : 1;
  const R = (look.type === 'enforcer' ? 15 : 13) * s;
  const lvl = look.level;
  const house = look.enemy ? SUB.wine : SUB.blood;
  const trim = lvl >= 1 ? SUB.gold : house;
  const cos = Math.cos(facing), sin = Math.sin(facing);
  const side = cos < 0 ? -1 : 1;
  const fired = look.firedAgoMs >= 0 && look.firedAgoMs < 90;
  const kick = fired ? 2 * (1 - look.firedAgoMs / 180) : 0;

  // ── Behind him: fire, shadow, the rank-three aura ──
  if (look.ignited) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + t * 3;
      const h = R * (1.1 + 0.6 * Math.abs(Math.sin(t * 7 + i)));
      g.fillStyle(tint(i % 2 === 0 ? SUB.ember : SUB.flame), alpha * 0.6);
      g.fillTriangle(
        x + Math.cos(a) * R * 1.05, y + Math.sin(a) * R * 0.6 + R * 0.3,
        x + Math.cos(a + 0.5) * R * 1.05, y + Math.sin(a + 0.5) * R * 0.6 + R * 0.3,
        x + Math.cos(a + 0.25) * R * 0.5, y - h,
      );
    }
  }
  if (!look.seated) {
    g.fillStyle(tint(SUB.ink), alpha * 0.3);
    g.fillEllipse(x, y + R * 0.98, R * 1.9, R * 0.5);
  }
  if (lvl >= 3) {
    const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
    g.fillStyle(tint(SUB.gold), alpha * (0.13 + 0.07 * pulse));
    g.fillCircle(x, y, R + 8 + pulse * 2);
    g.lineStyle(1.4, tint(SUB.gold), alpha * (0.55 + 0.3 * pulse));
    g.strokeCircle(x, y, R + 6 + pulse * 1.5);
  }

  // ── The weapon, in a frame along the aim (dipped while reloading) ──
  const dip = look.reloading ? 0.5 * side : 0;
  const at0 = frame(x, y + R * 0.18, facing + dip);
  const off = look.type === 'enforcer' ? 2 : 0;
  // Local +y is always the "under the gun" side, whichever way he is facing.
  const w: At = (lx, ly) => at0((lx + off - kick) * s, ly * side * s);
  const hr = 4.3 * s;
  const gilt = lvl >= 2;
  let muzzle = 30, muzzleY = 0;

  const drawWeapon = (): void => {
    if (look.type === 'thug') {
      muzzle = 34;
      g.fillStyle(tint(SUB.wood), alpha);
      fillPts(g, [w(3, -1.2), w(10, -2), w(10, 2), w(3, 3.4)]);
      box(g, w, 11, 2, 13.5, 6.5);
      box(g, w, 20.5, 2, 23, 6);
      g.fillStyle(tint(SUB.graphite), alpha);
      box(g, w, 9, -2.3, 22.5, 2.3);
      box(g, w, 31, -1.7, 34, 1.7);
      g.fillStyle(tint(SUB.steel), alpha);
      box(g, w, 22.5, -1, 31, 1);
      g.lineStyle(1, tint(gilt ? SUB.gold : SUB.steelHi), alpha * 0.95);
      seg(g, w(9.5, -2.1), w(22, -2.1));
      if (gilt) seg(g, w(31.5, 0), w(33.5, 0));
      if (!look.reloading) {
        const d = w(16.5, 4.8);
        g.fillStyle(tint(SUB.ink), alpha);
        g.fillCircle(d.x, d.y, 4.4 * s);
        g.fillStyle(tint(SUB.steel), alpha);
        g.fillCircle(d.x, d.y, 3.2 * s);
        g.fillStyle(tint(SUB.graphite), alpha);
        g.fillCircle(d.x, d.y, 2.2 * s);
        g.fillStyle(tint(gilt ? SUB.gold : SUB.steelHi), alpha);
        g.fillCircle(d.x, d.y, 1 * s);
        hand(g, tint, w(21.5, 5.2), hr, alpha);
      } else {
        // The empty well, and the drum out in the off hand being wound back up.
        g.fillStyle(tint(SUB.scarlet), alpha * (0.6 + 0.4 * Math.sin(t * 10)));
        const well = w(16.5, 2.8);
        g.fillCircle(well.x, well.y, 1.3 * s);
        const d = w(7 + Math.sin(t * 8) * 1.5, 14 + Math.cos(t * 8) * 1.5);
        hand(g, tint, { x: d.x, y: d.y + 2.5 * s }, hr, alpha);
        g.fillStyle(tint(SUB.ink), alpha);
        g.fillCircle(d.x, d.y, 4.6 * s);
        g.fillStyle(tint(SUB.steel), alpha);
        g.fillCircle(d.x, d.y, 3.4 * s);
        g.fillStyle(tint(gilt ? SUB.gold : SUB.brass), alpha);
        for (let k = 0; k < 4; k++) {
          const ba = t * 6 + (k / 4) * TAU;
          g.fillCircle(d.x + Math.cos(ba) * 2.1 * s, d.y + Math.sin(ba) * 2.1 * s, 0.8 * s);
        }
      }
      hand(g, tint, w(12, 4), hr, alpha);
    } else if (look.type === 'enforcer') {
      muzzle = 30; muzzleY = 4.8;
      // The shotgun, low on the gun side.
      const ms = look.firedAgoMs;
      const pump = ms >= 90 && ms < 330 ? -3.5 * Math.sin(((ms - 90) / 240) * Math.PI) : 0;
      g.fillStyle(tint(SUB.wood), alpha);
      fillPts(g, [w(1, 4), w(9, 4), w(9, 7.2), w(1, 9)]);
      g.fillStyle(tint(SUB.graphite), alpha);
      box(g, w, 9, 3.8, 15, 7.4);
      box(g, w, 15, 5.8, 27, 7.2);
      g.fillStyle(tint(SUB.steel), alpha);
      box(g, w, 15, 4, 30, 5.6);
      g.fillStyle(tint(SUB.wood), alpha);
      box(g, w, 18 + pump, 5.2, 24.5 + pump, 8);
      if (gilt) {
        g.fillStyle(tint(SUB.gold), alpha);
        box(g, w, 28.4, 3.6, 30, 6);
        box(g, w, 10, 3.8, 14, 4.8);
      }
      if (look.reloading) {
        const sh = w(12, 11 + Math.sin(t * 9) * 1.8);
        g.fillStyle(tint(SUB.scarlet), alpha);
        g.fillRect(sh.x - 1.4 * s, sh.y - 3 * s, 2.8 * s, 4.4 * s);
        g.fillStyle(tint(SUB.brass), alpha);
        g.fillRect(sh.x - 1.4 * s, sh.y + 1.4 * s, 2.8 * s, 1.6 * s);
      }
      hand(g, tint, w(11, 7.4), hr, alpha);
      // The riot shield on the off arm, squared up to the target.
      hand(g, tint, w(14.5, -6), hr, alpha);
      g.fillStyle(tint(SUB.ink), alpha * 0.9);
      fillPts(g, [w(15.6, -18), w(19.6, -14.5), w(21.6, -7), w(21, 0), w(17.6, 2.8), w(15.6, 2.4)]);
      g.fillStyle(tint(SUB.navy), alpha);
      fillPts(g, [w(16.6, -17), w(19.8, -14), w(21.6, -7), w(21, -0.4), w(18, 1.8), w(16.6, 1.6)]);
      g.fillStyle(tint(SUB.haze), alpha * 0.85);
      fillPts(g, [w(18.6, -12.6), w(20.6, -11.6), w(21.2, -7.2), w(19, -7.2)]);
      g.fillStyle(tint(SUB.steelHi), alpha * 0.7);
      fillPts(g, [w(18.9, -12), w(19.8, -11.6), w(19.9, -10), w(19, -10)]);
      g.lineStyle(1.1, tint(gilt ? SUB.gold : SUB.haze), alpha * 0.95);
      strokePts(g, [w(19.8, -14.6), w(22.2, -7), w(21.6, -0.2), w(18.2, 2.4)]);
      g.fillStyle(tint(gilt ? SUB.gold : SUB.steel), alpha);
      const r1 = w(19.6, -3.4), r2 = w(18, -15.2);
      g.fillCircle(r1.x, r1.y, 0.9 * s);
      g.fillCircle(r2.x, r2.y, 0.9 * s);
    } else if (look.type === 'sniper') {
      muzzle = 47;
      g.fillStyle(tint(SUB.wood), alpha);
      fillPts(g, [w(0, -1), w(9, -1.9), w(9, 2), w(0, 4.2)]);
      box(g, w, 19, 1.6, 26, 2.8);
      g.fillStyle(tint(SUB.graphite), alpha);
      box(g, w, 9, -1.9, 24, 1.9);
      box(g, w, 43, -1.8, 47, 1.8);
      g.fillStyle(tint(SUB.steel), alpha);
      box(g, w, 24, -0.9, 43, 0.9);
      g.lineStyle(0.8, tint(SUB.steelHi), alpha * 0.9);
      seg(g, w(24, -0.5), w(43, -0.5));
      // The scope, on the upper side, with its mounts.
      g.fillStyle(tint(SUB.ink), alpha);
      box(g, w, 11.5, -5.4, 25, -2.7);
      box(g, w, 23, -6, 26, -2.2);
      g.fillStyle(tint(gilt ? SUB.gold : SUB.steel), alpha);
      box(g, w, 14, -5.7, 15.6, -1.9);
      box(g, w, 20, -5.7, 21.6, -1.9);
      if (gilt) box(g, w, 43, -1.8, 44.2, 1.8);
      const lens = w(26, -4.1);
      g.fillStyle(tint(SUB.haze), alpha);
      g.fillCircle(lens.x, lens.y, 1.7 * s);
      const gl = Math.max(0, Math.sin(t * 2.3 + x * 0.05));
      g.fillStyle(tint(SUB.white), alpha * (0.45 + 0.55 * gl));
      twinkle(g, lens.x, lens.y, (1.6 + gl * 3.2) * s);
      if (look.reloading) {
        // Bolt drawn back, a fresh round on its way in.
        g.fillStyle(tint(SUB.steelHi), alpha);
        box(g, w, 7, -3.2, 12, -2);
        const c = w(14 + Math.sin(t * 9) * 1.5, 9);
        g.fillStyle(tint(SUB.brass), alpha);
        g.fillRect(c.x - 1.1 * s, c.y - 3 * s, 2.2 * s, 5 * s);
        g.fillStyle(tint(SUB.gold), alpha);
        g.fillTriangle(c.x - 1.1 * s, c.y - 3 * s, c.x + 1.1 * s, c.y - 3 * s, c.x, c.y - 5.4 * s);
        hand(g, tint, { x: c.x, y: c.y + 3 * s }, hr, alpha);
      } else {
        hand(g, tint, w(23.5, 3), hr, alpha);
      }
      hand(g, tint, w(11, 3.6), hr, alpha);
    } else {
      muzzle = 25; muzzleY = -0.6;
      g.fillStyle(tint(SUB.graphite), alpha);
      box(g, w, 14.5, 0.4, 21.5, 2);
      box(g, w, 14.5, 1, 17.6, 6);
      g.fillStyle(tint(gilt ? SUB.gold : SUB.steel), alpha);
      box(g, w, 14.5, -1.9, 25, 0.5);
      g.lineStyle(0.8, tint(SUB.steelHi), alpha * 0.9);
      seg(g, w(15, -1.5), w(24.5, -1.5));
      if (look.reloading) {
        const c = w(16, 10 + Math.sin(t * 9) * 1.6);
        g.fillStyle(tint(SUB.ink), alpha);
        g.fillRect(c.x - 1.5 * s, c.y - 3.2 * s, 3 * s, 6.4 * s);
        g.fillStyle(tint(SUB.brass), alpha);
        g.fillRect(c.x - 1.5 * s, c.y - 3.2 * s, 3 * s, 1.5 * s);
      }
      hand(g, tint, w(15.8, 3.6), hr, alpha);
    }
  };

  // Aiming up the screen the gun is on the far side of him, so it goes down first.
  const gunBehind = sin < -0.35;
  if (gunBehind) drawWeapon();

  // ── The orb ──
  g.fillStyle(tint(house), alpha * 0.13);
  g.fillCircle(x, y, R + 5);
  g.fillStyle(tint(look.enemy ? X.enemyRim : SUB.wine), alpha);
  g.fillCircle(x, y, R);
  g.fillStyle(tint(look.enemy ? X.enemyBody : SUB.crimson), alpha);
  g.fillCircle(x, y, R - 1.6 * s);
  g.fillStyle(tint(SUB.scarlet), alpha * 0.45);
  g.fillEllipse(x - R * 0.36, y - R * 0.42, R * 0.62, R * 0.4);

  // ── The suit front ──
  const k = R / 17;
  const top = y + 4 * k;
  g.fillStyle(tint(SUB.charcoal), alpha * 0.95);
  fillPts(g, [{ x: x - 15 * k, y: y + 12.5 * k }, { x: x - 6 * k, y: top }, { x: x - 1 * k, y: y + 16.6 * k }, { x: x - 9 * k, y: y + 15.4 * k }]);
  fillPts(g, [{ x: x + 15 * k, y: y + 12.5 * k }, { x: x + 6 * k, y: top }, { x: x + 1 * k, y: y + 16.6 * k }, { x: x + 9 * k, y: y + 15.4 * k }]);
  g.fillStyle(tint(SUB.paper), alpha * 0.9);
  g.fillTriangle(x - 4.5 * k, top + k, x + 4.5 * k, top + k, x, y + 13 * k);
  g.fillStyle(tint(trim), alpha);
  fillPts(g, [{ x: x - 1.6 * k, y: top + 1.5 * k }, { x: x + 1.6 * k, y: top + 1.5 * k }, { x: x + 2.4 * k, y: y + 14 * k }, { x, y: y + 16.5 * k }, { x: x - 2.4 * k, y: y + 14 * k }]);

  // The medic's satchel: strap across the chest, bag on the hip away from the gun.
  if (look.type === 'medic') {
    const bx = x - side * R * 0.72, by = y + R * 0.6;
    g.lineStyle(1.6 * s, tint(SUB.wood), alpha);
    g.lineBetween(x + side * R * 0.55, y - R * 0.05, bx, by - 2 * s);
    g.fillStyle(tint(SUB.ink), alpha * 0.5);
    g.fillRoundedRect(bx - 5 * s, by - 3.2 * s, 10.6 * s, 9 * s, 2 * s);
    g.fillStyle(tint(SUB.paper), alpha);
    g.fillRoundedRect(bx - 5.4 * s, by - 4 * s, 10.4 * s, 8.6 * s, 2 * s);
    g.fillStyle(tint(lvl >= 1 ? SUB.gold : SUB.paperShade), alpha);
    g.fillRect(bx - 5.4 * s, by - 4 * s, 10.4 * s, 2 * s);
    g.fillStyle(tint(SUB.blood), alpha);
    g.fillRect(bx - 0.9 * s, by - 1.4 * s, 1.8 * s, 5.2 * s);
    g.fillRect(bx - 2.6 * s, by + 0.3 * s, 5.2 * s, 1.8 * s);
    if (!look.reloading) {
      // The free hand: resting on the bag, or raised and glowing while he works.
      const lift = look.healing ? 1 : 0;
      const hp = { x: bx - side * 3 * s, y: by - 1 * s - lift * (R * 0.9 + Math.sin(t * 6) * 1.5) };
      if (look.healing) {
        g.fillStyle(tint(SUB.moneyGreen), alpha * 0.35);
        g.fillCircle(hp.x, hp.y, hr + 3.5);
      }
      hand(g, tint, hp, hr, alpha);
    }
  }

  // ── Eyes, looking down the barrel ──
  const er = R * 0.25;
  const ecx = x + cos * R * 0.3, ecy = y - R * 0.12 + sin * R * 0.22;
  for (let i = -1; i <= 1; i += 2) {
    const ex = ecx + i * R * 0.35;
    if (look.type === 'sniper' && i === -side) {
      // The off eye, shut: he is on the scope.
      g.lineStyle(1.5 * s, tint(SUB.ink), alpha);
      g.lineBetween(ex - er, ecy + 0.4, ex + er, ecy - 0.6);
      continue;
    }
    g.fillStyle(tint(SUB.paper), alpha * 0.97);
    g.fillCircle(ex, ecy, er);
    g.fillStyle(tint(SUB.ink), alpha);
    g.fillCircle(ex + cos * er * 0.42, ecy + sin * er * 0.42, er * 0.52);
  }

  // ── The hat ──
  if (look.type === 'thug') {
    // A flat newsboy cap: wide soft crown, stub of a peak toward the aim.
    g.fillStyle(tint(SUB.charcoal), alpha);
    g.fillEllipse(x + cos * R * 0.72, y - R * 0.66, R * 1.15, R * 0.36);
    g.fillStyle(tint(SUB.slate), alpha);
    g.fillEllipse(x - cos * R * 0.08, y - R * 0.95, R * 1.95, R * 0.82);
    g.fillStyle(tint(SUB.graphite), alpha);
    g.fillEllipse(x - cos * R * 0.2 - R * 0.2, y - R * 1.06, R * 1.1, R * 0.4);
    g.lineStyle(1.7 * s, tint(trim), alpha);
    g.lineBetween(x - R * 0.8, y - R * 0.68, x + R * 0.8, y - R * 0.68);
    g.fillStyle(tint(lvl >= 1 ? SUB.gold : SUB.ink), alpha);
    g.fillCircle(x - cos * R * 0.08, y - R * 1.22, 1.5 * s);
  } else if (look.type === 'enforcer') {
    // A riot helmet: navy dome, crest stripe, clear visor down over the eyes.
    g.fillStyle(tint(SUB.navy), alpha);
    g.beginPath();
    g.arc(x, y - R * 0.34, R * 1.04, Math.PI, TAU, false);
    g.closePath();
    g.fillPath();
    g.fillStyle(tint(SUB.haze), alpha * 0.35);
    g.fillEllipse(x - R * 0.4, y - R * 0.95, R * 0.7, R * 0.4);
    g.fillStyle(tint(trim), alpha);
    g.fillRect(x - 1.6 * s, y - R * 1.38, 3.2 * s, R * 1.02);
    g.fillStyle(tint(SUB.haze), alpha * 0.34);
    g.fillRoundedRect(x - R * 0.86 + cos * R * 0.18, y - R * 0.46, R * 1.72, R * 0.66, 3 * s);
    g.lineStyle(1, tint(SUB.steelHi), alpha * 0.7);
    g.lineBetween(x - R * 0.7 + cos * R * 0.18, y - R * 0.34, x + R * 0.1 + cos * R * 0.18, y - R * 0.34);
    g.lineStyle(1.5 * s, tint(SUB.steel), alpha);
    g.lineBetween(x - R * 1.04, y - R * 0.38, x + R * 1.04, y - R * 0.38);
  } else if (look.type === 'sniper') {
    // A beret, slouched to the side away from the scope.
    g.fillStyle(tint(X.drabDark), alpha);
    g.fillEllipse(x - side * R * 0.62, y - R * 0.8, R * 0.9, R * 0.56);
    g.fillStyle(tint(SUB.olive), alpha);
    g.fillEllipse(x - side * R * 0.14, y - R * 0.98, R * 1.75, R * 0.66);
    g.fillStyle(tint(X.drabHi), alpha * 0.55);
    g.fillEllipse(x - side * R * 0.3, y - R * 1.08, R * 0.9, R * 0.26);
    g.lineStyle(1.6 * s, tint(lvl >= 1 ? SUB.gold : SUB.ink), alpha);
    g.lineBetween(x - R * 0.74, y - R * 0.72, x + R * 0.74, y - R * 0.72);
    g.lineStyle(1.2 * s, tint(SUB.ink), alpha);
    g.lineBetween(x - side * R * 0.1, y - R * 1.28, x - side * R * 0.18, y - R * 1.46);
    g.fillStyle(tint(trim), alpha);
    g.fillCircle(x + side * R * 0.46, y - R * 0.92, 2 * s);
  } else {
    // A white cap with a red cross.
    g.fillStyle(tint(SUB.paperShade), alpha);
    g.fillRoundedRect(x - R * 0.8, y - R * 1.32, R * 1.6, R * 0.7, 3 * s);
    g.fillStyle(tint(SUB.white), alpha);
    g.fillRoundedRect(x - R * 0.76, y - R * 1.36, R * 1.52, R * 0.56, 3 * s);
    g.fillStyle(tint(lvl >= 1 ? SUB.gold : SUB.paperShade), alpha);
    g.fillRect(x - R * 0.8, y - R * 0.8, R * 1.6, 2 * s);
    g.fillStyle(tint(SUB.blood), alpha);
    g.fillRect(x - 1.1 * s, y - R * 1.3, 2.2 * s, R * 0.44);
    g.fillRect(x - R * 0.22, y - R * 1.17, R * 0.44, 2.2 * s);
  }

  // ── Rank three: epaulettes and circling glints ──
  if (lvl >= 3) {
    for (let i = -1; i <= 1; i += 2) {
      const ex = x + i * R * 0.84, ey = y + R * 0.34;
      g.fillStyle(tint(SUB.brass), alpha);
      g.fillEllipse(ex, ey + 1.2 * s, 7.4 * s, 4.4 * s);
      g.fillStyle(tint(SUB.gold), alpha);
      g.fillEllipse(ex, ey, 7 * s, 3.4 * s);
    }
    g.fillStyle(tint(SUB.white), alpha * 0.95);
    for (let i = 0; i < 3; i++) {
      const a = t * 1.7 + (i / 3) * TAU;
      const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 2.2);
      twinkle(g, x + Math.cos(a) * (R + 8), y + Math.sin(a) * (R + 8) * 0.8, 2 + tw * 2.6);
    }
  }

  if (!gunBehind) drawWeapon();

  // ── Muzzle flash ──
  if (fired) {
    const p = 1 - look.firedAgoMs / 90;
    const m0 = w(muzzle + kick, muzzleY - 2.6 * p - 1), m1 = w(muzzle + kick, muzzleY + 2.6 * p + 1);
    const tip = w(muzzle + kick + 7 + 9 * p, muzzleY);
    const up = w(muzzle + kick + 3, muzzleY - 5 - 3 * p), dn = w(muzzle + kick + 3, muzzleY + 5 + 3 * p);
    const c = w(muzzle + kick + 1.5, muzzleY);
    g.fillStyle(tint(SUB.flame), alpha * 0.85 * p);
    g.fillTriangle(m0.x, m0.y, up.x, up.y, c.x, c.y);
    g.fillTriangle(m1.x, m1.y, dn.x, dn.y, c.x, c.y);
    g.fillStyle(tint(SUB.gold), alpha * (0.5 + 0.5 * p));
    g.fillTriangle(m0.x, m0.y, m1.x, m1.y, tip.x, tip.y);
    g.fillStyle(tint(SUB.white), alpha * p);
    g.fillCircle(c.x, c.y, (1.4 + 2 * p) * s);
  }

  // ── Statuses ──
  if (look.shielded) {
    const sr = R + (look.type === 'enforcer' ? 13 : 9);
    const sh = 0.5 + 0.5 * Math.sin(t * 4);
    g.lineStyle(1.7, tint(SUB.haze), alpha * (0.7 + 0.25 * sh));
    arc(g, x, y, sr, facing - 0.95, facing + 0.95);
    g.lineStyle(1, tint(SUB.steelHi), alpha * (0.25 + 0.3 * sh));
    arc(g, x, y, sr + 2.4, facing - 0.6, facing + 0.6);
    g.fillStyle(tint(SUB.haze), alpha * 0.9);
    g.fillCircle(x + Math.cos(facing - 0.95) * sr, y + Math.sin(facing - 0.95) * sr, 1.4);
    g.fillCircle(x + Math.cos(facing + 0.95) * sr, y + Math.sin(facing + 0.95) * sr, 1.4);
  }
  if (look.type === 'medic' && look.healing) {
    for (let i = 0; i < 3; i++) {
      const p = (t * 0.8 + i / 3) % 1;
      const px = x + Math.sin(i * 2.1 + t * 1.3) * R * 0.9, py = y - R * 0.9 - p * 22;
      const sz = (2.2 + (1 - p) * 1.4) * s;
      g.fillStyle(tint(SUB.moneyGreen), alpha * (1 - p) * 0.95);
      g.fillRect(px - sz, py - sz * 0.3, sz * 2, sz * 0.6);
      g.fillRect(px - sz * 0.3, py - sz, sz * 0.6, sz * 2);
    }
  }
}

/** Rank pips above a crew member's loyalty bar: `level` (1..3) gold chevrons centred on (x,y). Draws nothing at 0. */
export function drawCrewRank(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, level: number, t: number, alpha: number,
): void {
  const n = Math.min(3, Math.floor(level));
  if (n <= 0) return;
  const step = 7;
  const x0 = x - ((n - 1) * step) / 2;
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * step;
      const lit = n >= 3 ? 0.5 + 0.5 * Math.sin(t * 5 - i * 0.9) : 0;
      if (pass === 0) g.lineStyle(3.4, tint(SUB.ink), alpha * 0.85);
      else g.lineStyle(1.6, tint(lit > 0.75 ? SUB.white : SUB.gold), alpha);
      strokePts(g, [{ x: cx - 2.8, y: y + 2 }, { x: cx, y: y - 2 }, { x: cx + 2.8, y: y + 2 }]);
    }
  }
  if (n >= 3) {
    g.fillStyle(tint(SUB.gold), alpha * (0.14 + 0.08 * Math.sin(t * 5)));
    g.fillEllipse(x, y, step * 3 + 8, 10);
  }
}

// ── Money buttons ─────────────────────────────────────────────────────────

export type MoneyIcon = 'daggers' | 'luxury' | 'crew' | 'enforcer' | 'sniper' | 'medic' | 'bard' | 'stash' | 'retainer' | 'reload' | 'chopper' | 'airstrike' | 'savior';
export interface MoneyButtonLook {
  /** 1..3 — this many tiny banknotes on the left. */
  cost: number;
  /** Dim and grey when false. */
  affordable: boolean;
  /** Brighter rim when true. */
  hover: boolean;
  /** -1 = idle; 0..1 = an active timer/charge filling the plate left to right. */
  progress: number;
  /** The drawn glyph on the right. */
  icon: MoneyIcon;
  /** The button's fan menu is open (lights a small up-chevron). */
  open?: boolean;
}

/** Drain a colour toward its own grey — what a button you cannot pay for looks like. */
function greyOf(c: number): number {
  const r = (c >> 16) & 0xff, gr = (c >> 8) & 0xff, b = c & 0xff;
  const l = r * 0.3 + gr * 0.59 + b * 0.11;
  const m = (v: number): number => Math.round((v * 0.18 + l * 0.82) * 0.7);
  return (m(r) << 16) | (m(gr) << 8) | m(b);
}

/** One button glyph, centred on (cx,cy), fitting a box of half-size `s`. */
function moneyGlyph(g: G, c: SubColorFn, icon: MoneyIcon, cx: number, cy: number, s: number, t: number, a: number): void {
  const lw = Math.max(0.8, s * 0.22);
  switch (icon) {
    case 'daggers': {
      // Five blades fanned out of one fist.
      for (let i = -2; i <= 2; i++) {
        const an = -Math.PI / 2 + i * 0.42;
        const ex = cx + Math.cos(an) * s * 1.5, ey = cy + s * 0.8 + Math.sin(an) * s * 1.7;
        g.lineStyle(lw, c(i === 0 ? SUB.steelHi : SUB.steel), a);
        g.lineBetween(cx + Math.cos(an) * s * 0.35, cy + s * 0.8 + Math.sin(an) * s * 0.35, ex, ey);
      }
      g.fillStyle(c(SUB.blood), a);
      g.fillCircle(cx, cy + s * 0.8, s * 0.36);
      break;
    }
    case 'luxury': {
      // A gold bullet, standing on its base.
      g.fillStyle(c(SUB.brass), a);
      g.fillRect(cx - s * 0.42, cy - s * 0.15, s * 0.84, s * 1.05);
      g.fillStyle(c(SUB.gold), a);
      g.fillTriangle(cx - s * 0.42, cy - s * 0.15, cx + s * 0.42, cy - s * 0.15, cx, cy - s * 1.05);
      g.fillRect(cx - s * 0.52, cy + s * 0.72, s * 1.04, s * 0.24);
      g.fillStyle(c(SUB.white), a * 0.8);
      g.fillRect(cx - s * 0.26, cy - s * 0.1, s * 0.16, s * 0.76);
      break;
    }
    case 'crew': {
      // A head in a fedora.
      g.fillStyle(c(SUB.crimson), a);
      g.fillCircle(cx, cy + s * 0.32, s * 0.68);
      g.fillStyle(c(SUB.graphite), a);
      g.fillEllipse(cx, cy - s * 0.18, s * 2.1, s * 0.5);
      g.fillRect(cx - s * 0.6, cy - s * 0.95, s * 1.2, s * 0.78);
      g.fillStyle(c(SUB.blood), a);
      g.fillRect(cx - s * 0.6, cy - s * 0.48, s * 1.2, s * 0.26);
      break;
    }
    case 'enforcer': {
      // A riot helmet and visor.
      g.fillStyle(c(SUB.crimson), a);
      g.fillCircle(cx, cy + s * 0.25, s * 0.66);
      g.fillStyle(c(SUB.haze), a);
      g.beginPath();
      g.arc(cx, cy + s * 0.05, s * 0.95, Math.PI, TAU, false);
      g.closePath();
      g.fillPath();
      g.fillStyle(c(SUB.steelHi), a * 0.85);
      g.fillRect(cx - s * 0.8, cy + s * 0.05, s * 1.6, s * 0.4);
      break;
    }
    case 'sniper': {
      g.lineStyle(lw, c(SUB.scarlet), a);
      g.strokeCircle(cx, cy, s * 0.72);
      g.lineBetween(cx - s * 1.1, cy, cx - s * 0.36, cy);
      g.lineBetween(cx + s * 0.36, cy, cx + s * 1.1, cy);
      g.lineBetween(cx, cy - s * 1.1, cx, cy - s * 0.36);
      g.lineBetween(cx, cy + s * 0.36, cx, cy + s * 1.1);
      g.fillStyle(c(SUB.white), a);
      g.fillCircle(cx, cy, s * 0.16);
      break;
    }
    case 'medic': {
      g.fillStyle(c(SUB.white), a);
      g.fillCircle(cx, cy, s * 0.98);
      g.fillStyle(c(SUB.blood), a);
      g.fillRect(cx - s * 0.2, cy - s * 0.68, s * 0.4, s * 1.36);
      g.fillRect(cx - s * 0.68, cy - s * 0.2, s * 1.36, s * 0.4);
      break;
    }
    case 'bard': {
      // A horn, bell to the right, one note leaving it.
      g.fillStyle(c(SUB.brass), a);
      g.fillTriangle(cx - s * 1.05, cy, cx + s * 0.45, cy - s * 0.62, cx + s * 0.45, cy + s * 0.62);
      g.fillStyle(c(SUB.gold), a);
      g.fillRect(cx + s * 0.45, cy - s * 0.86, s * 0.26, s * 1.72);
      const p = (t * 0.9) % 1;
      g.fillStyle(c(SUB.gold), a * (1 - p * 0.7));
      g.fillCircle(cx + s * 0.95 + p * s * 0.2, cy - s * 0.5 - p * s * 0.4, s * 0.17);
      break;
    }
    case 'stash': {
      // A tied sack.
      g.fillStyle(c(X.burlapDark), a);
      g.fillTriangle(cx - s * 0.5, cy - s * 1.02, cx + s * 0.5, cy - s * 1.02, cx, cy - s * 0.3);
      g.fillStyle(c(X.burlap), a);
      g.fillEllipse(cx, cy + s * 0.26, s * 1.7, s * 1.5);
      g.fillStyle(c(SUB.gold), a);
      g.fillRect(cx - s * 0.36, cy - s * 0.52, s * 0.72, s * 0.2);
      g.fillStyle(c(SUB.olive), a);
      g.fillCircle(cx, cy + s * 0.32, s * 0.36);
      break;
    }
    case 'retainer': {
      // A contract: rolled scroll, two lines of small print, a wax seal.
      g.fillStyle(c(SUB.paper), a);
      g.fillRect(cx - s * 0.7, cy - s * 0.86, s * 1.4, s * 1.72);
      g.fillStyle(c(SUB.paperShade), a);
      g.fillRect(cx - s * 0.86, cy - s * 1.0, s * 1.72, s * 0.3);
      g.fillRect(cx - s * 0.86, cy + s * 0.72, s * 1.72, s * 0.3);
      g.lineStyle(Math.max(0.6, s * 0.12), c(SUB.graphite), a);
      g.lineBetween(cx - s * 0.46, cy - s * 0.42, cx + s * 0.46, cy - s * 0.42);
      g.lineBetween(cx - s * 0.46, cy - s * 0.08, cx + s * 0.2, cy - s * 0.08);
      g.fillStyle(c(SUB.blood), a);
      g.fillCircle(cx + s * 0.3, cy + s * 0.38, s * 0.24);
      break;
    }
    case 'reload': {
      // A drum magazine, face on.
      g.fillStyle(c(SUB.steel), a);
      g.fillCircle(cx, cy, s);
      g.fillStyle(c(SUB.graphite), a);
      g.fillCircle(cx, cy, s * 0.76);
      g.fillStyle(c(SUB.gold), a);
      for (let i = 0; i < 6; i++) {
        const an = (i / 6) * TAU + t * 1.5;
        g.fillCircle(cx + Math.cos(an) * s * 0.5, cy + Math.sin(an) * s * 0.5, s * 0.15);
      }
      g.fillStyle(c(SUB.steelHi), a);
      g.fillCircle(cx, cy, s * 0.2);
      break;
    }
    case 'chopper': {
      g.lineStyle(lw, c(SUB.steel), a);
      g.lineBetween(cx - s * 0.2, cy + s * 0.15, cx - s * 1.1, cy + s * 0.05);
      g.lineBetween(cx - s * 1.1, cy - s * 0.3, cx - s * 1.1, cy + s * 0.4);
      g.fillStyle(c(SUB.steel), a);
      g.fillEllipse(cx + s * 0.25, cy + s * 0.2, s * 1.3, s * 0.95);
      g.fillStyle(c(SUB.haze), a);
      g.fillEllipse(cx + s * 0.56, cy + s * 0.1, s * 0.5, s * 0.46);
      const sw = Math.cos(t * 22);
      g.lineStyle(lw, c(SUB.steelHi), a);
      g.lineBetween(cx + s * 0.25 - sw * s * 1.15, cy - s * 0.62, cx + s * 0.25 + sw * s * 1.15, cy - s * 0.62);
      g.lineBetween(cx + s * 0.25, cy - s * 0.62, cx + s * 0.25, cy - s * 0.26);
      break;
    }
    case 'airstrike': {
      // A finned bomb, nose down and to the right.
      const at = frame(cx, cy, 0.8);
      g.fillStyle(c(SUB.steel), a);
      fillPts(g, [at(-s * 0.5, -s * 0.42), at(s * 0.5, -s * 0.42), at(s * 0.5, s * 0.42), at(-s * 0.5, s * 0.42)]);
      fillPts(g, [at(-s * 0.5, 0), at(-s * 1.1, -s * 0.6), at(-s * 0.85, 0), at(-s * 1.1, s * 0.6)]);
      g.fillStyle(c(SUB.scarlet), a);
      fillPts(g, [at(s * 0.5, -s * 0.42), at(s * 1.1, 0), at(s * 0.5, s * 0.42)]);
      g.fillStyle(c(SUB.steelHi), a * 0.8);
      fillPts(g, [at(-s * 0.4, -s * 0.3), at(s * 0.4, -s * 0.3), at(s * 0.4, -s * 0.1), at(-s * 0.4, -s * 0.1)]);
      break;
    }
    case 'savior': {
      // A shield under a halo.
      g.fillStyle(c(SUB.haze), a);
      fillPts(g, [
        { x: cx - s * 0.74, y: cy - s * 0.4 }, { x: cx + s * 0.74, y: cy - s * 0.4 },
        { x: cx + s * 0.62, y: cy + s * 0.46 }, { x: cx, y: cy + s * 1.05 }, { x: cx - s * 0.62, y: cy + s * 0.46 },
      ]);
      g.fillStyle(c(SUB.steelHi), a * 0.85);
      g.fillTriangle(cx - s * 0.5, cy - s * 0.24, cx, cy - s * 0.24, cx - s * 0.36, cy + s * 0.4);
      g.lineStyle(lw, c(SUB.gold), a);
      g.strokeEllipse(cx, cy - s * 0.84, s * 1.2, s * 0.34);
      break;
    }
  }
}

/**
 * A "money bar": a black-lacquer plate with a gold rule, top-left (x,y), size w x h. The price is
 * counted out in banknotes on the left; the thing being bought is the glyph on the right.
 * Everything scales off `h`, so it reads at ~84x16 over an ability card and ~30x14 over a head.
 */
export function drawMoneyButton(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, w: number, h: number, t: number, look: MoneyButtonLook,
): void {
  const ok = look.affordable;
  const c: SubColorFn = ok ? tint : (base) => tint(greyOf(base));
  const a = ok ? 1 : 0.72;
  const rad = Math.min(4, h * 0.3);

  // Plate: drop shadow, lacquer, a sheen across the top half.
  g.fillStyle(tint(SUB.ink), 0.5 * a);
  g.fillRoundedRect(x + 1, y + 1.6, w, h, rad);
  if (look.hover && ok) {
    g.fillStyle(tint(SUB.gold), 0.2 + 0.08 * Math.sin(t * 6));
    g.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, rad + 2);
  }
  g.fillStyle(c(SUB.ink), 0.96 * a);
  g.fillRoundedRect(x, y, w, h, rad);
  g.fillStyle(c(SUB.slate), 0.7 * a);
  g.fillRoundedRect(x + 1, y + 1, w - 2, h * 0.42, Math.max(1, rad - 1));

  // The running timer/charge, gold draining to crimson.
  if (look.progress >= 0) {
    const p = clamp01(look.progress);
    const fw = (w - 3) * p;
    if (fw > 1) {
      g.fillStyle(tint(SUB.crimson), 0.75 * a);
      g.fillRect(x + 1.5, y + 1.5, fw, h - 3);
      g.fillStyle(tint(SUB.gold), 0.75 * a * (1 - p * 0.75));
      g.fillRect(x + 1.5, y + 1.5, fw, h - 3);
      g.fillStyle(tint(SUB.white), 0.22 * a);
      g.fillRect(x + 1.5, y + 1.5, fw, Math.max(1, h * 0.2));
      g.fillStyle(tint(SUB.white), 0.9 * a);
      g.fillRect(x + 1.5 + fw - 1, y + 1.5, 1.2, h - 3);
    }
  }

  // The gold rule.
  const rim = look.hover && ok ? SUB.gold : SUB.brass;
  g.lineStyle(look.hover && ok ? 1.5 : 1, c(rim), a);
  g.strokeRoundedRect(x + 0.5, y + 0.5, w - 1, h - 1, rad);

  // Layout: [notes][chevron?][glyph].
  const cy = y + h / 2;
  const gs = h * 0.34;
  const gx = x + w - h * 0.56;
  const chevW = look.open !== undefined && w > h * 3.5 ? h * 0.62 : 0;
  const n = Math.max(1, Math.min(3, Math.round(look.cost)));
  const room = gx - gs - chevW - (x + 2.5);
  const len = Math.max(5, Math.min(h * 0.92, room / (1 + (n - 1) * 0.55)));
  const stepX = len * 0.55;
  for (let i = 0; i < n; i++) {
    const nx = x + 2.5 + len / 2 + i * stepX;
    const wob = ok ? Math.sin(t * 2.4 + i * 1.3) * 0.06 : 0;
    banknoteLayered(g, c, nx, cy + (i % 2 === 0 ? -0.4 : 0.6), -0.2 + i * 0.16 + wob, len, len * 0.27, a, 0.25, SUB.olive);
  }

  // The fan-menu chevron.
  if (chevW > 0) {
    const kx = gx - gs - chevW * 0.55;
    const lit = look.open === true;
    const lift = lit ? Math.sin(t * 6) * 0.6 : 0;
    g.lineStyle(Math.max(1, h * 0.11), c(lit ? SUB.gold : SUB.graphite), a);
    strokePts(g, [
      { x: kx - h * 0.2, y: cy + h * 0.12 - lift }, { x: kx, y: cy - h * 0.14 - lift }, { x: kx + h * 0.2, y: cy + h * 0.12 - lift },
    ]);
  }

  // The glyph, on a little recessed disc so it separates from the notes.
  g.fillStyle(c(SUB.charcoal), 0.9 * a);
  g.fillCircle(gx, cy, h * 0.44);
  moneyGlyph(g, c, look.icon, gx, cy, gs, t, a);

  if (!ok) {
    // Struck through: you cannot pay for this.
    g.lineStyle(Math.max(1, h * 0.08), tint(SUB.wine), 0.85);
    g.lineBetween(x + 2, y + h - 2.5, x + 2 + len + (n - 1) * stepX, y + 2.5);
  }
}

// ── Things on the ground and in the air ───────────────────────────────────

/**
 * A sack of money sitting on the ground behind the player. `progress` 0..1 = how far through its
 * wait (a ring timer round it); `cracked` 0..1 = how much of the allowed damage it has taken —
 * the burlap rips, and notes and coins spill out as it nears 1.
 */
export function drawMoneyBag(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, t: number, progress: number, cracked: number, alpha: number,
): void {
  const p = clamp01(progress), k = clamp01(cracked);
  const jig = k > 0.55 ? Math.sin(t * 34) * (k - 0.55) * 3 : 0;
  const bx = x + jig;
  const breathe = 1 + Math.sin(t * 2.2) * 0.025;

  g.fillStyle(tint(SUB.ink), alpha * 0.32);
  g.fillEllipse(x, y + 10, 30, 9);

  // The timer ring: a faint track and a gold sweep with a bright head.
  g.lineStyle(2, tint(SUB.graphite), alpha * 0.55);
  g.strokeCircle(x, y, 19);
  if (p > 0) {
    const a1 = -Math.PI / 2 + p * TAU;
    g.lineStyle(2.4, tint(p >= 1 ? SUB.moneyGreen : SUB.gold), alpha * 0.95);
    arc(g, x, y, 19, -Math.PI / 2, a1);
    g.fillStyle(tint(SUB.white), alpha);
    g.fillCircle(x + Math.cos(a1) * 19, y + Math.sin(a1) * 19, 1.8);
  }

  // What has already fallen out.
  const spilled = Math.floor(k * 4.01);
  for (let i = 0; i < spilled; i++) {
    const sa = 0.5 + i * 0.75;
    const sx = x + Math.cos(sa) * (13 + i * 2.5), sy = y + 9 + Math.sin(sa) * 4;
    banknoteLayered(g, tint, sx, sy, sa * 2.3 + Math.sin(t * 2 + i) * 0.1, 11, 3, alpha, 0.3, SUB.olive);
  }

  // The sack: fat belly, gathered neck, ruffled mouth, a rope with a gold toggle.
  g.fillStyle(tint(X.burlapDark), alpha);
  g.fillEllipse(bx + 1, y + 3, 25 * breathe, 21);
  g.fillStyle(tint(X.burlap), alpha);
  g.fillEllipse(bx - 0.5, y + 2, 23 * breathe, 19);
  g.fillStyle(tint(SUB.paper), alpha * 0.22);
  g.fillEllipse(bx - 4.5, y - 1.5, 9, 10);
  g.fillStyle(tint(X.burlapDark), alpha);
  fillPts(g, [{ x: bx - 5, y: y - 6 }, { x: bx + 5, y: y - 6 }, { x: bx + 3, y: y - 10.5 }, { x: bx - 3, y: y - 10.5 }]);
  g.fillStyle(tint(X.burlap), alpha);
  fillPts(g, [{ x: bx - 3, y: y - 10 }, { x: bx - 6.5, y: y - 15 }, { x: bx - 2, y: y - 13.4 }, { x: bx, y: y - 16 }, { x: bx + 2.4, y: y - 13.4 }, { x: bx + 6.5, y: y - 14.6 }, { x: bx + 3, y: y - 10 }]);
  g.lineStyle(1.6, tint(SUB.wood), alpha);
  g.lineBetween(bx - 4.2, y - 9.6, bx + 4.2, y - 9.6);
  g.fillStyle(tint(SUB.gold), alpha);
  g.fillCircle(bx + 4.6, y - 8.6, 1.5);
  // The mark: a green seal with a gold bar struck through it.
  g.fillStyle(tint(SUB.olive), alpha);
  g.fillCircle(bx, y + 3, 5);
  g.lineStyle(1, tint(SUB.moneyGreen), alpha);
  g.strokeCircle(bx, y + 3, 3.4);
  g.lineStyle(1.3, tint(SUB.gold), alpha);
  g.lineBetween(bx, y - 0.4, bx, y + 6.4);

  // The rip: a zigzag tear down the right flank that opens as it takes damage.
  if (k > 0.12) {
    const open = 0.6 + k * 3.4;
    g.fillStyle(tint(SUB.ink), alpha * 0.92);
    fillPts(g, [
      { x: bx + 5, y: y - 4 }, { x: bx + 7 + open, y: y - 1 }, { x: bx + 6.4, y: y + 2 },
      { x: bx + 8 + open, y: y + 6 }, { x: bx + 6, y: y + 9 }, { x: bx + 5.6 - open * 0.3, y: y + 4 },
      { x: bx + 6.6 - open * 0.3, y: y + 1 },
    ]);
    if (k > 0.4) {
      // A note poking out of the tear, and coins dribbling away.
      banknoteLayered(g, tint, bx + 9 + k * 3, y + 3, 0.5 + Math.sin(t * 5) * 0.12, 10, 2.8, alpha, 0.3, SUB.olive);
      for (let i = 0; i < 2; i++) {
        const cp = (t * 0.9 + i * 0.5) % 1;
        g.fillStyle(tint(i === 0 ? SUB.gold : SUB.brass), alpha * (1 - cp));
        g.fillCircle(bx + 9 + cp * 9 + i * 2, y + 5 + cp * cp * 7, 1.6);
      }
    }
  }
}

/**
 * A thrown grenade in flight at (x,y); `h` = current arc height in px (the shadow sits at y, the
 * grenade at y-h), tumbling with t.
 */
export function drawGrenade(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, h: number, t: number, alpha: number,
): void {
  const far = clamp01(h / 90);
  g.fillStyle(tint(SUB.ink), alpha * (0.38 - far * 0.2));
  g.fillEllipse(x, y + 2, 12 - far * 5, 4.5 - far * 1.6);

  const gy = y - h;
  const spin = t * 11;
  const at = frame(x, gy, spin);
  // Fuse sparks falling behind it.
  for (let i = 0; i < 3; i++) {
    const p = (t * 3.1 + i / 3) % 1;
    const sp = at(-9, 0);
    g.fillStyle(tint(i === 0 ? SUB.white : SUB.flame), alpha * (1 - p) * 0.9);
    g.fillCircle(sp.x + Math.sin(i * 4 + t * 9) * 3 * p, sp.y + p * 9, 1.5 * (1 - p * 0.5));
  }
  // Body: a ridged pineapple.
  g.fillStyle(tint(X.drabDark), alpha);
  g.fillCircle(x, gy, 6.2);
  g.fillStyle(tint(X.drab), alpha);
  g.fillCircle(x - 0.5, gy - 0.5, 5.2);
  g.lineStyle(0.9, tint(X.drabDark), alpha * 0.95);
  for (let i = -1; i <= 1; i++) {
    seg(g, at(i * 2.6, -4.6 + Math.abs(i) * 0.9), at(i * 2.6, 4.6 - Math.abs(i) * 0.9));
    seg(g, at(-4.6 + Math.abs(i) * 0.9, i * 2.6), at(4.6 - Math.abs(i) * 0.9, i * 2.6));
  }
  g.fillStyle(tint(X.drabHi), alpha * 0.7);
  g.fillCircle(x - 2, gy - 2.2, 1.6);
  // Cap, spoon and the pin ring.
  g.fillStyle(tint(SUB.steel), alpha);
  box(g, at, -8.4, -2, -5.4, 2);
  g.fillStyle(tint(SUB.graphite), alpha);
  fillPts(g, [at(-8.2, 1.4), at(-7, 3.4), at(1.5, 6.4), at(1.8, 5.2)]);
  g.lineStyle(1, tint(SUB.gold), alpha);
  const ring = at(-8.6, -3.6);
  g.strokeCircle(ring.x, ring.y, 2);
}

/**
 * Top-down helicopter (body ~46px long) at (x,y) heading `angle`: skids, tail boom and tail
 * rotor, glazed nose, a spinning rotor disc, a shadow thrown below it, and — when `carrying` —
 * a cable and hook hanging to (x, y+34).
 */
export function drawHelicopter(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, angle: number, t: number, alpha: number, carrying: boolean,
): void {
  const at = frame(x, y, angle);
  const sh = frame(x + 10, y + 20, angle);

  // Shadow: hull, boom and the rotor's disc.
  g.fillStyle(tint(SUB.ink), alpha * 0.2);
  fillPts(g, [sh(18, -4), sh(18, 4), sh(8, 9), sh(-8, 8), sh(-28, 1.5), sh(-28, -1.5), sh(-8, -8), sh(8, -9)]);
  g.fillStyle(tint(SUB.ink), alpha * 0.09);
  g.fillCircle(x + 10, y + 20, 27);

  // The sling.
  if (carrying) {
    const sway = Math.sin(t * 2.6) * 1.6;
    g.lineStyle(1.3, tint(SUB.ashDark), alpha);
    strokePts(g, [{ x, y }, { x: x + sway * 0.5, y: y + 17 }, { x: x + sway, y: y + 30 }]);
    g.lineStyle(1.8, tint(SUB.steel), alpha);
    arc(g, x + sway, y + 32, 2.6, -0.4, Math.PI * 1.1);
    g.fillStyle(tint(SUB.brass), alpha);
    g.fillCircle(x + sway, y + 29.4, 1.5);
  }

  // Skids and their struts.
  g.lineStyle(1.8, tint(SUB.steel), alpha);
  seg(g, at(-9, -11), at(14, -11));
  seg(g, at(-9, 11), at(14, 11));
  g.lineStyle(1.1, tint(SUB.ashDark), alpha);
  seg(g, at(-4, -7), at(-4, -11));
  seg(g, at(8, -7), at(8, -11));
  seg(g, at(-4, 7), at(-4, 11));
  seg(g, at(8, 7), at(8, 11));

  // Tail boom, stabiliser, fin, tail rotor.
  g.fillStyle(tint(SUB.slate), alpha);
  fillPts(g, [at(-8, -3.2), at(-28, -1.3), at(-28, 1.3), at(-8, 3.2)]);
  g.fillStyle(tint(SUB.graphite), alpha);
  fillPts(g, [at(-21, -6), at(-25, -6), at(-26, 6), at(-22, 6)]);
  fillPts(g, [at(-26, -1.4), at(-31, -2.4), at(-31, 2.4), at(-26, 1.4)]);
  const tr = Math.abs(Math.sin(t * 40)) * 5 + 1;
  g.lineStyle(1.3, tint(SUB.steelHi), alpha * 0.85);
  seg(g, at(-29.5 - tr, -3.6), at(-29.5 + tr, -3.6));

  // Fuselage: charcoal teardrop, house stripe, glazed nose, a door line.
  g.fillStyle(tint(SUB.ink), alpha);
  fillPts(g, [at(19, -3.4), at(19, 3.4), at(12, 9), at(-6, 9), at(-11, 4), at(-11, -4), at(-6, -9), at(12, -9)]);
  g.fillStyle(tint(SUB.charcoal), alpha);
  fillPts(g, [at(17.6, -3), at(17.6, 3), at(11.4, 7.6), at(-5.6, 7.6), at(-9.6, 3.4), at(-9.6, -3.4), at(-5.6, -7.6), at(11.4, -7.6)]);
  g.fillStyle(tint(SUB.blood), alpha);
  box(g, at, -6, -7.6, -2.6, 7.6);
  g.fillStyle(tint(SUB.gold), alpha);
  box(g, at, -2.6, -7.6, -1.8, 7.6);
  g.fillStyle(tint(SUB.haze), alpha * 0.9);
  fillPts(g, [at(17, -2.8), at(17, 2.8), at(11.4, 6.6), at(7, 6), at(7, -6), at(11.4, -6.6)]);
  g.fillStyle(tint(SUB.steelHi), alpha * 0.55);
  fillPts(g, [at(16, -2.4), at(12, -5.6), at(9, -5.2), at(12.6, -1.4)]);
  g.lineStyle(0.9, tint(SUB.ink), alpha);
  seg(g, at(12, -6.6), at(12, 6.6));
  seg(g, at(7, 0), at(17.4, 0));
  // Engine housing and exhaust under the mast.
  g.fillStyle(tint(SUB.graphite), alpha);
  box(g, at, -8, -3.4, 4, 3.4);
  g.fillStyle(tint(SUB.ember), alpha * (0.5 + 0.3 * Math.sin(t * 20)));
  const ex = at(-9, 0);
  g.fillCircle(ex.x, ex.y, 1.5);

  // Main rotor: a blurred disc, three blades, the hub.
  const c = at(1, 0);
  g.fillStyle(tint(SUB.steel), alpha * 0.1);
  g.fillCircle(c.x, c.y, 27);
  g.lineStyle(1, tint(SUB.steelHi), alpha * 0.22);
  g.strokeCircle(c.x, c.y, 26.5);
  const spin = t * 27;
  for (let i = 0; i < 3; i++) {
    const ba = spin + (i / 3) * TAU;
    const bc = Math.cos(ba), bs = Math.sin(ba);
    g.fillStyle(tint(SUB.steel), alpha * 0.16);
    g.fillTriangle(c.x, c.y, c.x + Math.cos(ba - 0.42) * 26, c.y + Math.sin(ba - 0.42) * 26, c.x + bc * 26, c.y + bs * 26);
    g.lineStyle(2.2, tint(SUB.graphite), alpha * 0.9);
    g.lineBetween(c.x + bc * 3, c.y + bs * 3, c.x + bc * 26, c.y + bs * 26);
    g.fillStyle(tint(SUB.gold), alpha * 0.9);
    g.fillCircle(c.x + bc * 25.4, c.y + bs * 25.4, 1.1);
  }
  g.fillStyle(tint(SUB.steel), alpha);
  g.fillCircle(c.x, c.y, 3.2);
  g.fillStyle(tint(SUB.ink), alpha);
  g.fillCircle(c.x, c.y, 1.5);
  // Nav light.
  g.fillStyle(tint(SUB.scarlet), alpha * (Math.sin(t * 7) > 0.2 ? 1 : 0.25));
  const nl = at(-30.5, 0);
  g.fillCircle(nl.x, nl.y, 1.3);
}

/**
 * Top-down fighter-bomber (WW2-ish, wingspan ~70px) at (x,y) heading `angle`, with a prop blur,
 * wing roundels in house crimson, and a big soft shadow thrown off to (+14,+22).
 */
export function drawBomber(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, angle: number, t: number, alpha: number,
): void {
  const at = frame(x, y, angle);
  const sh = frame(x + 14, y + 22, angle);
  const wing = (f: At, grow: number): Pt[] => [
    f(11 + grow, 0), f(9 + grow, -12), f(4, -33 - grow), f(-1, -35 - grow), f(-5, -33 - grow), f(-7 - grow, -10),
    f(-7 - grow, 10), f(-5, 33 + grow), f(-1, 35 + grow), f(4, 33 + grow), f(9 + grow, 12),
  ];
  const body = (f: At, grow: number): Pt[] => [
    f(27 + grow, -2.6), f(27 + grow, 2.6), f(18, 5 + grow), f(0, 5 + grow), f(-22, 2.2 + grow),
    f(-31 - grow, 1.2), f(-31 - grow, -1.2), f(-22, -2.2 - grow), f(0, -5 - grow), f(18, -5 - grow),
  ];
  const tail = (f: At): Pt[] => [f(-22, 0), f(-23, -12), f(-27, -13), f(-30, -11), f(-30, 11), f(-27, 13), f(-23, 12)];

  // Shadow, soft: a wide pass and a tighter one.
  g.fillStyle(tint(SUB.ink), alpha * 0.1);
  fillPts(g, wing(sh, 3));
  fillPts(g, body(sh, 3));
  g.fillStyle(tint(SUB.ink), alpha * 0.16);
  fillPts(g, wing(sh, 0));
  fillPts(g, body(sh, 0));
  fillPts(g, tail(sh));

  // Wings: drab, a darker trailing half, ailerons, invasion bands and roundels.
  g.fillStyle(tint(X.drab), alpha);
  fillPts(g, wing(at, 0));
  g.fillStyle(tint(X.drabDark), alpha);
  fillPts(g, [at(-2, -34), at(-5, -33), at(-7, -10), at(-7, 10), at(-5, 33), at(-2, 34), at(-2.5, 0)]);
  g.fillStyle(tint(X.drabHi), alpha * 0.5);
  fillPts(g, [at(10, -1), at(8.4, -12), at(3.6, -32), at(5.4, -32), at(9.6, -12)]);
  fillPts(g, [at(10, 1), at(8.4, 12), at(3.6, 32), at(5.4, 32), at(9.6, 12)]);
  for (let i = -1; i <= 1; i += 2) {
    g.fillStyle(tint(SUB.paper), alpha * 0.9);
    box(g, at, -5.6, i * 13, 9, i * 15);
    g.fillStyle(tint(SUB.ink), alpha * 0.9);
    box(g, at, -5.8, i * 15, 8.6, i * 17);
    const rp = at(1.5, i * 24.5);
    g.fillStyle(tint(SUB.paper), alpha);
    g.fillCircle(rp.x, rp.y, 4.6);
    g.fillStyle(tint(SUB.blood), alpha);
    g.fillCircle(rp.x, rp.y, 3.3);
    g.fillStyle(tint(SUB.gold), alpha);
    g.fillCircle(rp.x, rp.y, 1.2);
    // Bomb slung under the wing root, and the cannon stub.
    g.fillStyle(tint(SUB.charcoal), alpha);
    box(g, at, -2, i * 8 - 1.5, 8, i * 8 + 1.5);
    g.lineStyle(1.2, tint(SUB.graphite), alpha);
    seg(g, at(8, i * 19), at(13.5, i * 19));
  }

  // Tailplane, then the fuselage with its spine, cowl and canopy.
  g.fillStyle(tint(X.drab), alpha);
  fillPts(g, tail(at));
  g.fillStyle(tint(X.drabDark), alpha);
  fillPts(g, [at(-27, -12.6), at(-30, -11), at(-30, 11), at(-27, 12.6)]);
  g.fillStyle(tint(X.drabDark), alpha);
  fillPts(g, body(at, 0.8));
  g.fillStyle(tint(X.drab), alpha);
  fillPts(g, body(at, 0));
  g.fillStyle(tint(X.drabHi), alpha * 0.55);
  fillPts(g, [at(18, -1.4), at(18, 1.4), at(-28, 0.6), at(-28, -0.6)]);
  g.fillStyle(tint(SUB.blood), alpha);
  box(g, at, -17, -3, -14, 3);
  g.fillStyle(tint(SUB.graphite), alpha);
  fillPts(g, [at(27, -2.6), at(27, 2.6), at(19, 4.9), at(19, -4.9)]);
  g.fillStyle(tint(SUB.gold), alpha);
  box(g, at, 18.2, -4.9, 19.4, 4.9);
  g.fillStyle(tint(SUB.ink), alpha);
  fillPts(g, [at(10, -3), at(10, 3), at(-3, 2.6), at(-6, 0), at(-3, -2.6)]);
  g.fillStyle(tint(SUB.haze), alpha * 0.95);
  fillPts(g, [at(9, -2.2), at(9, 2.2), at(-2.6, 1.8), at(-4.6, 0), at(-2.6, -1.8)]);
  g.fillStyle(tint(SUB.steelHi), alpha * 0.6);
  fillPts(g, [at(8.4, -1.8), at(8.4, -0.4), at(0, -0.4), at(0, -1.5)]);
  g.lineStyle(0.8, tint(SUB.ink), alpha);
  seg(g, at(4.5, -2.4), at(4.5, 2.4));
  // Exhaust stubs glowing along the cowl.
  g.fillStyle(tint(SUB.ember), alpha * (0.6 + 0.3 * Math.sin(t * 30)));
  const e1 = at(17, -5.4), e2 = at(17, 5.4);
  g.fillCircle(e1.x, e1.y, 1.2);
  g.fillCircle(e2.x, e2.y, 1.2);

  // Spinner and the prop: an edge-on blur with a flicker of blade.
  const hub = at(28.4, 0);
  g.fillStyle(tint(SUB.steel), alpha * 0.16);
  fillPts(g, [at(27.6, -11), at(30.4, -11), at(30.4, 11), at(27.6, 11)]);
  const blade = Math.cos(t * 55) * 10.5;
  g.lineStyle(1.6, tint(SUB.steelHi), alpha * 0.55);
  seg(g, at(29, -blade), at(29, blade));
  g.lineStyle(1, tint(SUB.gold), alpha * 0.5);
  seg(g, at(29, -11), at(29, -9.4));
  seg(g, at(29, 9.4), at(29, 11));
  g.fillStyle(tint(SUB.blood), alpha);
  g.fillCircle(hub.x, hub.y, 2.3);
  g.fillStyle(tint(SUB.scarlet), alpha);
  g.fillCircle(hub.x - 0.5, hub.y - 0.6, 0.9);
}

/**
 * One falling bomb: target (x,y), blast radius r, `fall` 0..1 (0 = just released high up,
 * 1 = impact). A red reticle tightens and brightens on the ground while the bomb drops in from
 * y-160.
 */
export function drawBomb(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, r: number, fall: number, t: number, alpha: number,
): void {
  const f = clamp01(fall);
  const rr = r * (0.35 + 0.65 * f);
  const beat = 0.5 + 0.5 * Math.sin(t * (8 + f * 22));

  // The reticle.
  g.fillStyle(tint(SUB.scarlet), alpha * (0.05 + 0.13 * f));
  g.fillCircle(x, y, rr);
  g.lineStyle(1, tint(SUB.wine), alpha * 0.6);
  g.strokeCircle(x, y, r);
  g.lineStyle(1.6 + f, tint(SUB.scarlet), alpha * (0.4 + 0.5 * f));
  g.strokeCircle(x, y, rr);
  g.lineStyle(1.2, tint(SUB.scarlet), alpha * (0.35 + 0.4 * beat));
  g.strokeCircle(x, y, rr * (0.3 + 0.25 * beat));
  g.lineStyle(1.4, tint(SUB.blood), alpha * (0.5 + 0.4 * f));
  const spin = t * 0.9;
  for (let i = 0; i < 4; i++) {
    const a = spin + (i / 4) * TAU;
    const ca = Math.cos(a), sa = Math.sin(a);
    g.lineBetween(x + ca * rr * 0.78, y + sa * rr * 0.78, x + ca * (rr + 5), y + sa * (rr + 5));
  }
  // Its shadow, pooling under where it will land.
  g.fillStyle(tint(SUB.ink), alpha * (0.12 + 0.3 * f));
  g.fillEllipse(x, y, 5 + 12 * f, 2.4 + 5 * f);

  if (f >= 1) return;
  // The bomb itself, nose down, growing as it nears.
  const by = y - 160 * (1 - f * f);
  const s = 0.7 + 0.55 * f;
  const wob = Math.sin(t * 9) * 0.8;
  g.lineStyle(1, tint(SUB.steelHi), alpha * 0.4);
  for (let i = -1; i <= 1; i++) {
    g.lineBetween(x + i * 3.4 * s, by - 13 * s, x + i * 3.4 * s, by - (20 + 12 * f + Math.abs(i) * 5) * s);
  }
  g.fillStyle(tint(SUB.steel), alpha);
  fillPts(g, [{ x: x + wob, y: by - 9 * s }, { x: x - 5.4 * s + wob, y: by - 15 * s }, { x: x - 5.4 * s + wob, y: by - 10.4 * s }]);
  fillPts(g, [{ x: x + wob, y: by - 9 * s }, { x: x + 5.4 * s + wob, y: by - 15 * s }, { x: x + 5.4 * s + wob, y: by - 10.4 * s }]);
  g.fillRect(x - 0.9 * s + wob, by - 15.4 * s, 1.8 * s, 6.4 * s);
  g.fillStyle(tint(SUB.ink), alpha);
  g.fillEllipse(x, by - 2 * s, 9 * s, 17 * s);
  g.fillStyle(tint(SUB.graphite), alpha);
  g.fillEllipse(x - 0.6 * s, by - 2.4 * s, 7 * s, 15 * s);
  g.fillStyle(tint(SUB.ashDark), alpha * 0.9);
  g.fillEllipse(x - 1.7 * s, by - 3 * s, 2 * s, 9 * s);
  g.fillStyle(tint(SUB.gold), alpha);
  g.fillRect(x - 3.6 * s, by - 6.6 * s, 7.2 * s, 1.3 * s);
  g.fillStyle(tint(SUB.scarlet), alpha);
  g.fillEllipse(x, by + 4.6 * s, 5.4 * s, 5 * s);
}

/** A signal flare climbing from (x,y): `rise` 0..1; red star head, smoke trail, glow. */
export function drawFlare(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, rise: number, t: number, alpha: number,
): void {
  const p = clamp01(rise);
  const H = 150;
  // Fast off the ground, hanging at the top.
  const climb = 1 - (1 - p) * (1 - p);
  const pathX = (q: number): number => x + Math.sin(q * 5.2) * 5 * q;
  const hx = pathX(climb), hy = y - climb * H;

  // Launch scorch at the foot.
  g.fillStyle(tint(SUB.ink), alpha * 0.25 * (1 - p * 0.6));
  g.fillEllipse(x, y + 1, 12, 4);

  // The smoke it leaves, oldest at the bottom: drifting, fattening, thinning.
  const puffs = 7;
  for (let i = 0; i < puffs; i++) {
    const q = (climb * i) / puffs;
    const age = 1 - i / puffs;
    const px = pathX(q) + Math.sin(t * 1.4 + i * 1.7) * 3 * age + age * p * 6;
    g.fillStyle(tint(i % 2 === 0 ? SUB.ash : SUB.ashDark), alpha * (0.42 - age * 0.26));
    g.fillCircle(px, y - q * H, 2.4 + age * 4.5 * (0.4 + p));
  }
  g.lineStyle(1.4, tint(SUB.flame), alpha * 0.6);
  g.lineBetween(hx, hy, pathX(climb * 0.9), y - climb * 0.9 * H);

  // The head: wide red glow, a five-point star, a white-hot core, shed sparks.
  const fl = 0.75 + 0.25 * Math.sin(t * 31);
  g.fillStyle(tint(SUB.scarlet), alpha * 0.14 * fl);
  g.fillCircle(hx, hy, 24);
  g.fillStyle(tint(SUB.scarlet), alpha * 0.3 * fl);
  g.fillCircle(hx, hy, 11);
  const star: Pt[] = [];
  const rot = t * 2.6;
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * TAU;
    const sr = i % 2 === 0 ? 8.5 * fl : 3.4;
    star.push({ x: hx + Math.cos(a) * sr, y: hy + Math.sin(a) * sr });
  }
  g.fillStyle(tint(SUB.blood), alpha);
  for (let i = 0; i < 10; i += 2) {
    const a = star[(i + 9) % 10], b = star[i], c = star[(i + 1) % 10];
    g.fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y);
  }
  g.fillStyle(tint(SUB.scarlet), alpha);
  g.fillCircle(hx, hy, 3.8);
  g.fillStyle(tint(SUB.white), alpha);
  g.fillCircle(hx, hy, 2);
  for (let i = 0; i < 4; i++) {
    const sp = (t * 1.7 + i / 4) % 1;
    const sa = i * 1.9 + 0.6;
    g.fillStyle(tint(i % 2 === 0 ? SUB.gold : SUB.scarlet), alpha * (1 - sp));
    g.fillCircle(hx + Math.cos(sa) * sp * 13, hy + Math.abs(Math.sin(sa)) * sp * 15 + sp * sp * 8, 1.4 * (1 - sp * 0.5));
  }
}

/** One red beacon pulse on a planted dagger. */
function strikePulse(g: G, tint: SubColorFn, x: number, y: number, ph: number, alpha: number): void {
  g.lineStyle(1.8, tint(SUB.scarlet), alpha * (1 - ph) * 0.9);
  g.strokeCircle(x, y, 5 + ph * 18);
  const ph2 = (ph + 0.5) % 1;
  g.lineStyle(1.2, tint(SUB.blood), alpha * (1 - ph2) * 0.6);
  g.strokeCircle(x, y, 5 + ph2 * 18);
  g.fillStyle(tint(SUB.scarlet), alpha * 0.3);
  g.fillCircle(x, y, 6);
  g.fillStyle(tint(SUB.white), alpha * (0.6 + 0.4 * (1 - ph)));
  g.fillCircle(x, y, 1.8);
}

/**
 * The air-strike marking drawn while the plane is inbound. `pts` = the planted daggers (0..5);
 * `progress` 0..1 over the wait, pulsing faster as it nears 1.
 *   0 pts: a faint red flashing border round the whole arena (w,h).
 *   1 pt:  pulse rings on the dagger and a wide dashed circle of radius `spread`.
 *   2 pts: a red line between them, pulses on both.
 *   3+:    red lines joining them into a closed polygon with a faint red fill, pulses on each.
 */
export function drawStrikeZone(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  pts: Array<{ x: number; y: number }>, spread: number, w: number, h: number,
  progress: number, t: number, alpha: number,
): void {
  const p = clamp01(progress);
  const rate = 1.1 + p * p * 4.4;
  const ph = (t * rate) % 1;
  const beat = 0.5 + 0.5 * Math.sin(t * rate * TAU);

  if (pts.length === 0) {
    // The whole floor is the target.
    const a = alpha * (0.14 + 0.3 * beat) * (0.6 + 0.4 * p);
    g.lineStyle(10, tint(SUB.blood), a * 0.35);
    g.strokeRect(5, 5, w - 10, h - 10);
    g.lineStyle(2.5, tint(SUB.scarlet), a);
    g.strokeRect(3, 3, w - 6, h - 6);
    g.lineStyle(3.5, tint(SUB.scarlet), alpha * (0.45 + 0.4 * beat));
    const L = 26 + beat * 8;
    for (let i = 0; i < 4; i++) {
      const cx = i % 2 === 0 ? 8 : w - 8, cy = i < 2 ? 8 : h - 8;
      const dx = i % 2 === 0 ? 1 : -1, dy = i < 2 ? 1 : -1;
      strokePts(g, [{ x: cx + dx * L, y: cy }, { x: cx, y: cy }, { x: cx, y: cy + dy * L }]);
    }
    return;
  }

  if (pts.length === 1) {
    const c = pts[0];
    g.fillStyle(tint(SUB.scarlet), alpha * (0.04 + 0.05 * beat));
    g.fillCircle(c.x, c.y, spread);
    const dashes = 28;
    const rot = t * 0.35;
    g.lineStyle(2, tint(SUB.scarlet), alpha * (0.5 + 0.35 * beat));
    for (let i = 0; i < dashes; i++) {
      const a0 = rot + (i / dashes) * TAU;
      arc(g, c.x, c.y, spread, a0, a0 + (TAU / dashes) * 0.55);
    }
    g.lineStyle(1, tint(SUB.blood), alpha * 0.4);
    g.strokeCircle(c.x, c.y, spread * (0.25 + 0.75 * ph));
    strikePulse(g, tint, c.x, c.y, ph, alpha);
    return;
  }

  let ring: Array<{ x: number; y: number }> = pts;
  if (pts.length >= 3) {
    // Wind them round their centroid so the outline never crosses itself.
    let mx = 0, my = 0;
    for (const q of pts) { mx += q.x; my += q.y; }
    mx /= pts.length; my /= pts.length;
    ring = pts.slice().sort((a, b) => Math.atan2(a.y - my, a.x - mx) - Math.atan2(b.y - my, b.x - mx));
    g.fillStyle(tint(SUB.scarlet), alpha * (0.08 + 0.08 * beat));
    // A fan from the centroid keeps every triangle convex whatever the shape.
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      g.fillTriangle(mx, my, a.x, a.y, b.x, b.y);
    }
  }
  const closed = pts.length >= 3;
  g.lineStyle(6, tint(SUB.blood), alpha * (0.14 + 0.12 * beat));
  strokePts(g, ring, closed);
  g.lineStyle(1.8, tint(SUB.scarlet), alpha * (0.6 + 0.35 * beat));
  strokePts(g, ring, closed);
  // A bright bead running each edge toward the next dagger.
  const edges = closed ? ring.length : ring.length - 1;
  g.fillStyle(tint(SUB.white), alpha * 0.85);
  for (let i = 0; i < edges; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    g.fillCircle(a.x + (b.x - a.x) * ph, a.y + (b.y - a.y) * ph, 1.7);
  }
  for (const q of pts) strikePulse(g, tint, q.x, q.y, ph, alpha);
}

/**
 * A selection ring round a recruit (helicopter targeting): four corner brackets turning slowly
 * at radius r, in `color`.
 */
export function drawSelectRing(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, r: number, color: number, t: number, alpha: number,
): void {
  const col = tint(color);
  const breath = 1 + Math.sin(t * 5) * 0.06;
  const rr = r * 1.25 * breath;
  const leg = r * 0.55;
  const rot = t * 0.9;
  g.fillStyle(col, alpha * 0.08);
  g.fillCircle(x, y, r);
  g.lineStyle(1, col, alpha * 0.35);
  g.strokeCircle(x, y, r * (0.86 + 0.06 * Math.sin(t * 5)));
  for (let pass = 0; pass < 2; pass++) {
    if (pass === 0) g.lineStyle(4.2, tint(SUB.ink), alpha * 0.55);
    else g.lineStyle(2.2, col, alpha);
    for (let i = 0; i < 4; i++) {
      const a = rot + Math.PI / 4 + (i / 4) * TAU;
      const cx = x + Math.cos(a) * rr, cy = y + Math.sin(a) * rr;
      // Legs run along the square's sides, toward the neighbouring corners.
      const a1 = a + Math.PI * 0.75, a2 = a - Math.PI * 0.75;
      strokePts(g, [
        { x: cx + Math.cos(a1) * leg, y: cy + Math.sin(a1) * leg }, { x: cx, y: cy },
        { x: cx + Math.cos(a2) * leg, y: cy + Math.sin(a2) * leg },
      ]);
    }
  }
  g.fillStyle(tint(SUB.white), alpha * 0.9);
  for (let i = 0; i < 4; i++) {
    const a = rot + Math.PI / 4 + (i / 4) * TAU;
    g.fillCircle(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 1.2);
  }
}

/** A landing marker at a chosen destination: an "H"-pad circle with a downward chevron bobbing over it. */
export function drawDropMarker(
  g: Phaser.GameObjects.Graphics, tint: SubColorFn,
  x: number, y: number, t: number, alpha: number,
): void {
  const beat = 0.5 + 0.5 * Math.sin(t * 4);
  // The pad.
  g.fillStyle(tint(SUB.ink), alpha * 0.42);
  g.fillCircle(x, y, 17);
  g.fillStyle(tint(SUB.gold), alpha * (0.06 + 0.06 * beat));
  g.fillCircle(x, y, 17);
  g.lineStyle(2, tint(SUB.gold), alpha * 0.95);
  g.strokeCircle(x, y, 16);
  g.lineStyle(1, tint(SUB.brass), alpha * 0.7);
  g.strokeCircle(x, y, 12.5);
  // Turning edge lights.
  for (let i = 0; i < 8; i++) {
    const a = t * 0.8 + (i / 8) * TAU;
    const on = (i + Math.floor(t * 6)) % 4 === 0;
    g.fillStyle(tint(on ? SUB.white : SUB.scarlet), alpha * (on ? 1 : 0.7));
    g.fillCircle(x + Math.cos(a) * 19.5, y + Math.sin(a) * 19.5, on ? 1.6 : 1.1);
  }
  // The H.
  g.lineStyle(2.6, tint(SUB.paper), alpha);
  g.lineBetween(x - 5, y - 7, x - 5, y + 7);
  g.lineBetween(x + 5, y - 7, x + 5, y + 7);
  g.lineBetween(x - 5, y, x + 5, y);
  // An expanding touchdown ring.
  const ph = (t * 0.9) % 1;
  g.lineStyle(1.3, tint(SUB.gold), alpha * (1 - ph) * 0.7);
  g.strokeCircle(x, y, 16 + ph * 12);
  // The chevrons coming down onto it.
  const bob = Math.sin(t * 5) * 3.5;
  for (let i = 0; i < 2; i++) {
    const cy = y - 27 - i * 7 + bob;
    g.lineStyle(4.4 - i, tint(SUB.ink), alpha * 0.6);
    strokePts(g, [{ x: x - 6 + i, y: cy - 4 }, { x, y: cy + 2 }, { x: x + 6 - i, y: cy - 4 }]);
    g.lineStyle(2.4 - i * 0.6, tint(i === 0 ? SUB.gold : SUB.brass), alpha * (i === 0 ? 1 : 0.65));
    strokePts(g, [{ x: x - 6 + i, y: cy - 4 }, { x, y: cy + 2 }, { x: x + 6 - i, y: cy - 4 }]);
  }
}

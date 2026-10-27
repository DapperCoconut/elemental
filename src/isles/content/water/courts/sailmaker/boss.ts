import Phaser from 'phaser';
import type { SignatureMove, WorldBossDef } from '../../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../../boss/framework/BossToolkit';
import { dim, lit, mixC, mulberry } from '../../../../art/IsleArt';
import type { Pt } from '../../../../IslesTypes';
import {
  CANVAS, CANVAS_SHADE, CHALK, HEMP, HEM_GOLD, HEM_VELVET, QUEEN, RED_THREAD, STEEL,
  chalkLine, dist, needle, pin, polyline, segDist, spool, stitches, tapeStrip, tideMark,
} from './art';

/**
 * Prince Hem — the Royal Tailor of the Sailmaker's Court, Queen Maresa's most particular child.
 *
 * Hem governs the cliff-top by the Yardage: every head in the court owes a yard of sailcloth a
 * day toward the Queen's fleet, measured at the Yardstick by his Measurers. A household that
 * comes up short is *bound to the bolt* — indentured to the looms until the debt is woven off,
 * which it never is. He has his mother's tide for a heart and a tape measure for a conscience,
 * and he cannot abide a thing that does not fit.
 *
 * Phase one, *Tailored*: a dandy in velvet with a pincushion for a crown, stalking you with
 * pins, tape and shears — needles that baste a fence across the floor, tape loops that cinch
 * round your waist, pattern pieces chalked round you and cut out. Phase two, *Unravelled*: his
 * velvet comes apart and he spins about you as a storm of ribbons; sail-cloth ghosts rise off the
 * floor to drop over you, and every loose end of him is a thread that snaps taut. Hard mode, *The
 * Shroud*: he sits wrapped in a sailor's shroud at the middle of the room and sews it shut round
 * you, seam by seam — and saves the last stitch for you.
 */

const VELVET = 0x3a5a9a;
const VELVET_LIT = 0xc8d8ff;
const VELVET_DARK = 0x141c36;
const ACCENT = HEM_GOLD;

const PLAYER_R = 20;

// ── Signature: Pins and Needles ──────────────────────────────────────
// A fan of sail-needles flung to marked spots in an arc through where you stand; each one
// lands and sticks, and the red twine between neighbours draws taut into a basting fence. Step
// off the marks before they land, and do not walk through the fence while it holds.

const PN_FLIGHT_MS = 520;
const PN_TAUT_MS = 460;
const PN_HOLD_MS = 3200;
const PN_NEEDLE_DAMAGE = 9;
const PN_FENCE_DAMAGE = 8;
const PN_REHIT_MS = 600;

const pinsAndNeedles = (tk: BossToolkit): SignatureMove => {
  interface Volley { marks: Pt[]; fromX: number; fromY: number; bornAt: number; landAt: number; tautAt: number; endAt: number; hit: boolean[]; lastFence: number }
  let volleys: Volley[] = [];
  return {
    durationMs: 1800,
    windupMs: 650,
    gesture: 'sweep',
    tell: 'PINS AND NEEDLES',
    cast() {
      tk.sfx('whoosh');
      const p = tk.player;
      const a = tk.angleToPlayer();
      const n = tk.hard ? 7 : 6;
      const span = 340;
      const marks: Pt[] = [];
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1) - 0.5;
        const wob = (i % 2 ? 1 : -1) * 22;
        marks.push({
          x: tk.clampX(p.x + Math.cos(a + Math.PI / 2) * span * k + Math.cos(a) * wob),
          y: tk.clampY(p.y + Math.sin(a + Math.PI / 2) * span * k + Math.sin(a) * wob),
        });
      }
      const now = tk.now;
      const landAt = now + tk.warn(PN_FLIGHT_MS + 300);
      volleys.push({ marks, fromX: tk.bossX, fromY: tk.bossY - 20, bornAt: now, landAt, tautAt: landAt + tk.warn(PN_TAUT_MS), endAt: landAt + PN_HOLD_MS, hit: marks.map(() => false), lastFence: 0 });
      tk.schedule(landAt - now, () => tk.sfx('stab'));
    },
    update(time) {
      const p = tk.player;
      for (const v of volleys) {
        // Needles in flight: anything on the path is pricked.
        if (time < v.landAt) {
          const k = Math.max(0, (time - (v.landAt - PN_FLIGHT_MS)) / PN_FLIGHT_MS);
          if (k > 0) {
            v.marks.forEach((m, i) => {
              if (v.hit[i]) return;
              const x = v.fromX + (m.x - v.fromX) * k, y = v.fromY + (m.y - v.fromY) * k;
              if (dist(x, y, p.x, p.y) < PLAYER_R + 6) { v.hit[i] = true; tk.hitPlayer(PN_NEEDLE_DAMAGE, x, y); }
            });
          }
          continue;
        }
        // The basting fence.
        if (time >= v.tautAt && time < v.endAt && time - v.lastFence > PN_REHIT_MS) {
          for (let i = 0; i < v.marks.length - 1; i++) {
            const a = v.marks[i], b = v.marks[i + 1];
            if (segDist(p.x, p.y, a.x, a.y, b.x, b.y) < PLAYER_R * 0.6 + 4) {
              v.lastFence = time;
              tk.hitPlayer(PN_FENCE_DAMAGE, p.x, p.y);
              tk.slowPlayer(0.6, 500);
              break;
            }
          }
        }
      }
      volleys = volleys.filter((v) => time < v.endAt + 300);
    },
    drawGround(g, time) {
      for (const v of volleys) {
        if (time < v.landAt) {
          const k = (time - v.bornAt) / Math.max(1, v.landAt - v.bornAt);
          for (const m of v.marks) {
            g.lineStyle(2, RED_THREAD, 0.4 + k * 0.5);
            g.lineBetween(m.x - 7, m.y - 7, m.x + 7, m.y + 7); g.lineBetween(m.x - 7, m.y + 7, m.x + 7, m.y - 7);
            g.strokeCircle(m.x, m.y, 16 - k * 6);
          }
          // Where the fence will run.
          for (let i = 0; i < v.marks.length - 1; i++) {
            stitches(g, v.marks[i].x, v.marks[i].y, v.marks[i + 1].x, v.marks[i + 1].y, RED_THREAD, 1, 4, 8, 0.25 + k * 0.25);
          }
          continue;
        }
        const fade = time > v.endAt ? 1 - (time - v.endAt) / 300 : 1;
        const taut = time >= v.tautAt;
        for (let i = 0; i < v.marks.length - 1; i++) {
          const a = v.marks[i], b = v.marks[i + 1];
          if (!taut) {
            // Slack twine sagging between the needles, drawing up.
            const k = (time - v.landAt) / Math.max(1, v.tautAt - v.landAt);
            const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 26 * (1 - k) };
            polyline(g, [a, mid, b], 1.5, RED_THREAD, 0.7);
          } else {
            g.lineStyle(8, RED_THREAD, 0.16 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
            g.lineStyle(2.2, RED_THREAD, 0.95 * fade); g.lineBetween(a.x, a.y, b.x, b.y);
            g.lineStyle(1, 0xffffff, 0.4 * fade); g.lineBetween(a.x, a.y - 1, b.x, b.y - 1);
          }
        }
      }
    },
    drawAir(g, time) {
      for (const v of volleys) {
        if (time < v.landAt) {
          const k = Math.max(0, (time - (v.landAt - PN_FLIGHT_MS)) / PN_FLIGHT_MS);
          if (k <= 0) continue;
          v.marks.forEach((m) => {
            const x = v.fromX + (m.x - v.fromX) * k, y = v.fromY + (m.y - v.fromY) * k - Math.sin(k * Math.PI) * 30;
            g.lineStyle(1, RED_THREAD, 0.6); g.lineBetween(v.fromX, v.fromY, x, y);
            needle(g, x, y, Math.atan2(m.y - v.fromY, m.x - v.fromX), 26);
          });
          continue;
        }
        if (time > v.endAt) continue;
        // Stuck needles, upright and quivering.
        for (const m of v.marks) {
          const q = Math.sin(time / 30 + m.x) * Math.max(0, 1 - (time - v.landAt) / 400) * 0.4;
          needle(g, m.x, m.y - 12, -Math.PI / 2 + 0.15 + q, 26);
        }
      }
    },
    onPhaseEnd() { volleys = []; },
  };
};

// ── Signature: Taking Measure ────────────────────────────────────────
// Three loops of his gold tape thrown round you — chest, waist, inseam — each cinching shut
// from the brass case at its rim. Walk out of a loop before it closes; the next lands where you
// went.

const TM_WARN_MS = 720;
const TM_CINCH_MS = 950;
const TM_R0 = 118;
const TM_CLOSE_R = 26;
const TM_DAMAGE = 15;

const takingMeasure = (tk: BossToolkit): SignatureMove => {
  interface Loop { x: number; y: number; bornAt: number; cinchAt: number; closeAt: number; caseA: number; dealt: boolean; label: string }
  let loops: Loop[] = [];
  const radius = (l: Loop, time: number): number => {
    if (time < l.cinchAt) return TM_R0;
    const k = Math.min(1, (time - l.cinchAt) / (l.closeAt - l.cinchAt));
    return TM_R0 - (TM_R0 - TM_CLOSE_R) * (k * k * 0.4 + k * 0.6);
  };
  return {
    durationMs: 2900,
    windupMs: 600,
    gesture: 'point',
    tell: 'TAKING MEASURE',
    cast() {
      const labels = ['CHEST', 'WAIST', 'INSEAM'];
      for (let i = 0; i < 3; i++) {
        tk.schedule(i * 560, () => {
          const p = tk.player;
          const now = tk.now;
          const cinchAt = now + tk.warn(TM_WARN_MS);
          loops.push({
            x: tk.clampX(p.x, 90), y: tk.clampY(p.y, 90), bornAt: now, cinchAt, closeAt: cinchAt + TM_CINCH_MS,
            caseA: Math.atan2(tk.bossY - p.y, tk.bossX - p.x), dealt: false, label: labels[i],
          });
          tk.sfx('whip');
        });
      }
    },
    update(time) {
      const p = tk.player;
      for (const l of loops) {
        if (l.dealt || time < l.closeAt) continue;
        l.dealt = true;
        tk.sfx('trap-snap');
        if (dist(l.x, l.y, p.x, p.y) < TM_CLOSE_R + PLAYER_R + 18) {
          tk.hitPlayer(TM_DAMAGE, p.x, p.y);
          tk.slowPlayer(0.55, 900);
          tk.host.showFloatingText(p.x, p.y - 44, `MEASURED: ${l.label}`, '#ffe08a');
        }
      }
      loops = loops.filter((l) => time < l.closeAt + 380);
    },
    drawGround(g, time) {
      for (const l of loops) {
        const r = radius(l, time);
        const closed = time >= l.closeAt;
        const fade = closed ? 1 - (time - l.closeAt) / 380 : 1;
        // The ground the loop owns.
        if (time < l.cinchAt) {
          const k = (time - l.bornAt) / Math.max(1, l.cinchAt - l.bornAt);
          g.fillStyle(HEM_GOLD, 0.05 + k * 0.1); g.fillCircle(l.x, l.y, r);
        } else if (!closed) {
          g.fillStyle(HEM_GOLD, 0.16); g.fillCircle(l.x, l.y, r);
          if (Math.floor(time / 80) % 2 === 0 && time > l.closeAt - 250) { g.lineStyle(3, 0xffffff, 0.6); g.strokeCircle(l.x, l.y, r + 4); }
        }
        // The tape, as a polygon of short strips with its inch ticks.
        const segs = 28;
        for (let i = 0; i < segs; i++) {
          const a0 = l.caseA + (i / segs) * Math.PI * 2, a1 = l.caseA + ((i + 1) / segs) * Math.PI * 2;
          tapeStrip(g, l.x + Math.cos(a0) * r, l.y + Math.sin(a0) * r, l.x + Math.cos(a1) * r, l.y + Math.sin(a1) * r, 7, 0.95 * fade);
        }
      }
    },
    drawAir(g, time) {
      for (const l of loops) {
        if (time >= l.closeAt + 200) continue;
        const r = radius(l, time);
        const cx = l.x + Math.cos(l.caseA) * r, cy = l.y + Math.sin(l.caseA) * r;
        // The brass tape case on the rim, and the tape back to his hand.
        g.lineStyle(2, HEM_GOLD, 0.5); g.lineBetween(cx, cy, tk.bossX, tk.bossY);
        g.fillStyle(dim(HEM_GOLD, 0.4), 1); g.fillCircle(cx, cy, 10);
        g.fillStyle(HEM_GOLD, 1); g.fillCircle(cx, cy, 8);
        g.fillStyle(lit(HEM_GOLD, 0.4), 1); g.fillCircle(cx - 2, cy - 2, 3);
        g.lineStyle(1.5, dim(HEM_GOLD, 0.5), 1); g.lineBetween(cx, cy, cx + Math.cos(time / 40) * 6, cy + Math.sin(time / 40) * 6);
      }
    },
    onPhaseEnd() { loops = []; },
  };
};

// ── Signature: Cut to Pattern ────────────────────────────────────────
// He chalks a pattern piece round you — a sleeve, a bodice, a collar — notches and grain-line
// and all, then a pair of shears the height of a man runs round the outline. Whatever is still
// inside when the shears close the cut is cut out with it. Cross the chalk anywhere the shears
// are not.

const CP_CHALK_MS = 900;
const CP_SHEAR_SPEED = 620;
const CP_TIP_DAMAGE = 9;
const CP_CUT_DAMAGE = 18;

/** Pattern pieces, normalised to roughly −1..1. */
const PIECES: Pt[][] = [
  // A sleeve: the cap curves up, the wrist narrows.
  [{ x: -1, y: 0.2 }, { x: -0.7, y: -0.45 }, { x: -0.25, y: -0.8 }, { x: 0.25, y: -0.8 }, { x: 0.7, y: -0.45 }, { x: 1, y: 0.2 }, { x: 0.55, y: 0.85 }, { x: -0.55, y: 0.85 }],
  // A bodice front with its dart.
  [{ x: -0.85, y: -0.85 }, { x: -0.3, y: -0.7 }, { x: 0, y: -0.95 }, { x: 0.45, y: -0.85 }, { x: 0.9, y: -0.3 }, { x: 0.8, y: 0.9 }, { x: 0.05, y: 0.75 }, { x: -0.1, y: 0.3 }, { x: -0.25, y: 0.78 }, { x: -0.9, y: 0.9 }],
  // A collar — a long shallow crescent.
  [{ x: -1, y: -0.2 }, { x: -0.5, y: -0.7 }, { x: 0.5, y: -0.7 }, { x: 1, y: -0.2 }, { x: 0.8, y: 0.55 }, { x: 0, y: 0.25 }, { x: -0.8, y: 0.55 }],
];

const cutToPattern = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let poly: Pt[] = [];
  let lengths: number[] = [];
  let total = 0;
  let bornAt = 0, shearAt = 0, doneAt = 0;
  let tipDealt = false, cutDealt = false;
  let grain = 0;
  const pointAt = (d: number): Pt => {
    let left = d;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      if (left <= lengths[i]) { const k = left / Math.max(1, lengths[i]); return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }; }
      left -= lengths[i];
    }
    return poly[0];
  };
  const inside = (x: number, y: number): boolean => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i], b = poly[j];
      if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c;
    }
    return c;
  };
  return {
    durationMs: 3200,
    windupMs: 700,
    gesture: 'slam',
    tell: 'CUT TO PATTERN',
    cast() {
      const p = tk.player;
      const piece = PIECES[Math.floor(Math.random() * PIECES.length)];
      const rot = Math.random() * Math.PI;
      const sx = 150, sy = 110;
      const cx = tk.clampX(p.x, 170), cy = tk.clampY(p.y, 130);
      poly = piece.map((q) => {
        const x = q.x * sx, y = q.y * sy;
        return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) };
      });
      lengths = poly.map((a, i) => { const b = poly[(i + 1) % poly.length]; return dist(a.x, a.y, b.x, b.y); });
      total = lengths.reduce((s, l) => s + l, 0);
      grain = rot + Math.PI / 2;
      const now = tk.now;
      active = true; tipDealt = false; cutDealt = false;
      bornAt = now;
      shearAt = now + tk.warn(CP_CHALK_MS);
      doneAt = shearAt + (total / CP_SHEAR_SPEED) * 1000;
      tk.sfx('trap-set');
      tk.schedule(shearAt - now, () => tk.sfx('slash'));
    },
    update(time) {
      if (!active) return;
      const p = tk.player;
      if (time >= shearAt && time < doneAt && !tipDealt) {
        const tip = pointAt(((time - shearAt) / 1000) * CP_SHEAR_SPEED);
        if (dist(tip.x, tip.y, p.x, p.y) < PLAYER_R + 14) { tipDealt = true; tk.hitPlayer(CP_TIP_DAMAGE, tip.x, tip.y); }
      }
      if (time >= doneAt && !cutDealt) {
        cutDealt = true;
        tk.sfx('slash');
        if (inside(p.x, p.y)) {
          tk.hitPlayer(CP_CUT_DAMAGE, p.x, p.y);
          tk.host.showFloatingText(p.x, p.y - 44, 'CUT OUT', '#f2efe4');
        }
      }
      if (time >= doneAt + 700) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const chalkK = Math.min(1, (time - bornAt) / Math.max(1, shearAt - bornAt));
      const lifted = time >= doneAt;
      if (lifted) {
        // The cut-out piece lifting away: a pale ghost of the shape, fading.
        const k = (time - doneAt) / 700;
        g.fillStyle(CANVAS, 0.5 * (1 - k));
        g.fillPoints(poly.map((q) => new Phaser.Geom.Point(q.x, q.y - k * 30)), true, true);
        return;
      }
      g.fillStyle(CHALK, 0.06 + chalkK * 0.08);
      g.fillPoints(poly.map((q) => new Phaser.Geom.Point(q.x, q.y)), true, true);
      // The outline chalks itself in, edge by edge; cut edges go dark behind the shears.
      const cut = time >= shearAt ? ((time - shearAt) / 1000) * CP_SHEAR_SPEED : 0;
      let run = 0;
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const shown = Math.min(lengths[i], Math.max(0, total * chalkK - run));
        if (shown > 0) {
          const k = shown / lengths[i];
          chalkLine(g, a.x, a.y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, 0.9);
        }
        const cutHere = Math.min(lengths[i], Math.max(0, cut - run));
        if (cutHere > 0) {
          const k = cutHere / lengths[i];
          g.lineStyle(3, 0x1a1a22, 0.9); g.lineBetween(a.x, a.y, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k);
        }
        // A notch at each corner.
        g.fillStyle(CHALK, 0.8 * chalkK);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        g.fillTriangle(a.x, a.y, a.x + Math.cos(ang + 0.5) * 9, a.y + Math.sin(ang + 0.5) * 9, a.x + Math.cos(ang - 0.5) * 9, a.y + Math.sin(ang - 0.5) * 9);
        run += lengths[i];
      }
      // Grain-line arrow in the middle.
      const c = poly.reduce((s, q) => ({ x: s.x + q.x / poly.length, y: s.y + q.y / poly.length }), { x: 0, y: 0 });
      const gx = Math.cos(grain) * 46, gy = Math.sin(grain) * 46;
      g.lineStyle(2, CHALK, 0.7 * chalkK); g.lineBetween(c.x - gx, c.y - gy, c.x + gx, c.y + gy);
      g.fillStyle(CHALK, 0.7 * chalkK);
      g.fillTriangle(c.x + gx, c.y + gy, c.x + gx * 0.75 + gy * 0.15, c.y + gy * 0.75 - gx * 0.15, c.x + gx * 0.75 - gy * 0.15, c.y + gy * 0.75 + gx * 0.15);
      if (time > doneAt - 300 && Math.floor(time / 80) % 2 === 0) {
        g.fillStyle(0xffffff, 0.12); g.fillPoints(poly.map((q) => new Phaser.Geom.Point(q.x, q.y)), true, true);
      }
    },
    drawAir(g, time) {
      if (!active || time < shearAt || time >= doneAt) return;
      const d = ((time - shearAt) / 1000) * CP_SHEAR_SPEED;
      const tip = pointAt(d), back = pointAt(Math.max(0, d - 12));
      const a = Math.atan2(tip.y - back.y, tip.x - back.x);
      const open = Math.abs(Math.sin(time / 45)) * 0.45;
      // Shears: two long blades opening and closing on the line, handles trailing.
      for (const s of [-1, 1]) {
        const ba = a + s * open;
        g.fillStyle(dim(STEEL, 0.35), 1);
        g.fillTriangle(tip.x - Math.cos(ba) * 4, tip.y - Math.sin(ba) * 4, tip.x + Math.cos(ba + s * 1.4) * 5, tip.y + Math.sin(ba + s * 1.4) * 5, tip.x + Math.cos(ba) * 46, tip.y + Math.sin(ba) * 46);
        g.fillStyle(STEEL, 1);
        g.fillTriangle(tip.x, tip.y, tip.x + Math.cos(ba + s * 1.4) * 4, tip.y + Math.sin(ba + s * 1.4) * 4, tip.x + Math.cos(ba) * 44, tip.y + Math.sin(ba) * 44);
        const hx = tip.x - Math.cos(a - s * open) * 26, hy = tip.y - Math.sin(a - s * open) * 26;
        g.lineStyle(4, HEM_GOLD, 1); g.lineBetween(tip.x, tip.y, hx, hy);
        g.lineStyle(3, HEM_GOLD, 1); g.strokeCircle(hx - Math.cos(a) * 7, hy - Math.sin(a) * 7, 7);
      }
      g.fillStyle(HEM_GOLD, 1); g.fillCircle(tip.x, tip.y, 3);
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Ribbon Storm ──────────────────────────────────────────
// Unravelled, he is mostly ribbon: three (four, hard) long streamers whirl round him like the
// sails of a mill. They hang limp for a beat first — each one's sweep shown as a dotted line —
// then stand out on the wind and turn. Ride a gap, or stand beyond their reach.

const RS_LIMP_MS = 950;
const RS_SPIN_MS = 3300;
const RS_LEN = 400;
const RS_TURN = 0.62;
const RS_HALF_W = 13;
const RS_DAMAGE = 10;
const RS_REHIT_MS = 520;
const RIBBON_COLS = [HEM_GOLD, RED_THREAD, QUEEN, 0xe8e2f8];

const ribbonStorm = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let bornAt = 0, spinAt = 0, endAt = 0;
  let a0 = 0, spin = 1, arms = 3;
  let lastHit = 0;
  const armAngle = (i: number, time: number): number => {
    const turned = time < spinAt ? 0 : ((time - spinAt) / 1000) * RS_TURN * spin;
    return a0 + (i / arms) * Math.PI * 2 + turned;
  };
  const reach = (time: number): number => (time < spinAt ? 60 + 40 * Math.sin(time / 120) : Math.min(RS_LEN, 60 + ((time - spinAt) / 260) * RS_LEN));
  return {
    durationMs: 4400,
    windupMs: 600,
    hold: 'conduct',
    tell: 'RIBBON STORM',
    cast() {
      const now = tk.now;
      active = true;
      arms = tk.hard ? 4 : 3;
      // Never start with an arm lying on you.
      a0 = tk.angleToPlayer() + Math.PI / arms;
      spin = Math.random() < 0.5 ? 1 : -1;
      bornAt = now; spinAt = now + tk.warn(RS_LIMP_MS); endAt = spinAt + RS_SPIN_MS;
      tk.sfx('wings');
      tk.schedule(spinAt - now, () => tk.sfx('tornado'));
    },
    update(time) {
      if (!active) return;
      if (time >= endAt) { active = false; return; }
      if (time < spinAt || time - lastHit < RS_REHIT_MS) return;
      const p = tk.player;
      const L = reach(time);
      for (let i = 0; i < arms; i++) {
        const a = armAngle(i, time);
        if (segDist(p.x, p.y, tk.bossX, tk.bossY, tk.bossX + Math.cos(a) * L, tk.bossY + Math.sin(a) * L) < RS_HALF_W + PLAYER_R * 0.6) {
          lastHit = time;
          tk.hitPlayer(RS_DAMAGE, p.x, p.y);
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!active || time >= spinAt) return;
      // The sweep each arm will take: dotted rays and the reach circle.
      const k = (time - bornAt) / Math.max(1, spinAt - bornAt);
      for (let i = 0; i < arms; i++) {
        const a = armAngle(i, time);
        stitches(g, tk.bossX, tk.bossY, tk.bossX + Math.cos(a) * RS_LEN, tk.bossY + Math.sin(a) * RS_LEN, RIBBON_COLS[i], 2, 6, 10, 0.3 + 0.5 * k);
        const ah = a + spin * 0.35;
        g.fillStyle(RIBBON_COLS[i], 0.5 + 0.4 * k);
        const tx = tk.bossX + Math.cos(a) * (RS_LEN - 20), ty = tk.bossY + Math.sin(a) * (RS_LEN - 20);
        g.fillTriangle(tx + Math.cos(ah) * 14, ty + Math.sin(ah) * 14, tx + Math.cos(a) * 7, ty + Math.sin(a) * 7, tx - Math.cos(a) * 7, ty - Math.sin(a) * 7);
      }
      g.lineStyle(2, VELVET_LIT, 0.2 + 0.3 * k); g.strokeCircle(tk.bossX, tk.bossY, RS_LEN);
    },
    drawAir(g, time) {
      if (!active) return;
      const L = reach(time);
      for (let i = 0; i < arms; i++) {
        const a = armAngle(i, time);
        const ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
        const pts: Pt[] = [];
        const segs = 20;
        for (let s = 0; s <= segs; s++) {
          const k = s / segs;
          const wave = Math.sin(time / 70 - k * 9 + i) * (time < spinAt ? 18 : 7) * k;
          const droop = time < spinAt ? k * k * 30 : 0;
          pts.push({ x: tk.bossX + ux * L * k + nx * wave, y: tk.bossY + uy * L * k + ny * wave + droop });
        }
        const col = RIBBON_COLS[i % RIBBON_COLS.length];
        polyline(g, pts, RS_HALF_W * 2 + 2, dim(col, 0.45), 0.9);
        polyline(g, pts, RS_HALF_W * 2 - 4, col, 0.95);
        polyline(g, pts.map((q) => ({ x: q.x, y: q.y - 4 })), 2, lit(col, 0.4), 0.7);
        // A forked tail at the end.
        const tip = pts[pts.length - 1];
        g.fillStyle(col, 0.95);
        g.fillTriangle(tip.x + nx * RS_HALF_W, tip.y + ny * RS_HALF_W, tip.x - nx * RS_HALF_W, tip.y - ny * RS_HALF_W, tip.x + ux * 4, tip.y + uy * 4);
        g.fillTriangle(tip.x + nx * RS_HALF_W, tip.y + ny * RS_HALF_W, tip.x + ux * 22 + nx * 12, tip.y + uy * 22 + ny * 12, tip.x + ux * 6, tip.y + uy * 6);
        g.fillTriangle(tip.x - nx * RS_HALF_W, tip.y - ny * RS_HALF_W, tip.x + ux * 22 - nx * 12, tip.y + uy * 22 - ny * 12, tip.x + ux * 6, tip.y + uy * 6);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── Signature: Sail-cloth Ghosts ─────────────────────────────────────
// Three old sails peel up off the floor as ghosts — drapery with two dark eyes — and drift after
// you. One by one each billows up over a square of floor where you stand and drops flat on it.
// Caught under one, you are wrapped: hurt and hobbled until you fight free.

const SG_DRIFT = 72;
const SG_RISE_MS = 900;
const SG_FIRST_MS = 1900;
const SG_GAP_MS = 750;
const SG_SIZE = 126;
const SG_DAMAGE = 14;
const SG_LIE_MS = 1400;

const sailGhosts = (tk: BossToolkit): SignatureMove => {
  interface Ghost { x: number; y: number; bornAt: number; billowAt: number; dropAt: number; tx: number; ty: number; dropped: boolean; seed: number }
  let ghosts: Ghost[] = [];
  return {
    durationMs: 2600,
    windupMs: 650,
    gesture: 'raise',
    tell: 'SAIL-CLOTH GHOSTS',
    cast() {
      tk.sfx('hush');
      const now = tk.now;
      const n = tk.hard ? 4 : 3;
      const p = tk.player;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
        const billowAt = now + tk.warn(SG_FIRST_MS) + i * SG_GAP_MS;
        ghosts.push({
          x: tk.clampX(p.x + Math.cos(a) * 280, 80), y: tk.clampY(p.y + Math.sin(a) * 200, 80),
          bornAt: now, billowAt, dropAt: billowAt + tk.warn(SG_RISE_MS), tx: 0, ty: 0, dropped: false, seed: Math.random() * 10,
        });
      }
    },
    update(time, dt) {
      const p = tk.player;
      for (const gh of ghosts) {
        if (time < gh.billowAt) {
          // Drift toward you, keeping a little distance until the billow.
          const d = dist(gh.x, gh.y, p.x, p.y);
          if (d > 70) { gh.x += ((p.x - gh.x) / d) * SG_DRIFT * dt; gh.y += ((p.y - gh.y) / d) * SG_DRIFT * dt; }
          continue;
        }
        if (gh.tx === 0 && gh.ty === 0) { gh.tx = tk.clampX(p.x, 70); gh.ty = tk.clampY(p.y, 70); tk.sfx('wings'); }
        if (!gh.dropped && time >= gh.dropAt) {
          gh.dropped = true;
          tk.sfx('slime-splat');
          if (Math.abs(p.x - gh.tx) < SG_SIZE / 2 + PLAYER_R * 0.4 && Math.abs(p.y - gh.ty) < SG_SIZE / 2 + PLAYER_R * 0.4) {
            tk.hitPlayer(SG_DAMAGE, p.x, p.y);
            tk.slowPlayer(0.5, 1200);
            tk.host.showFloatingText(p.x, p.y - 44, 'WRAPPED', '#e8e2f8');
          }
        }
      }
      ghosts = ghosts.filter((gh) => !gh.dropped || time < gh.dropAt + SG_LIE_MS);
    },
    drawGround(g, time) {
      for (const gh of ghosts) {
        if (time < gh.billowAt) {
          g.fillStyle(0x000000, 0.2); g.fillEllipse(gh.x, gh.y + 26, 50, 14);
          continue;
        }
        const half = SG_SIZE / 2;
        if (!gh.dropped) {
          const k = Math.min(1, (time - gh.billowAt) / Math.max(1, gh.dropAt - gh.billowAt));
          g.fillStyle(0x000000, 0.12 + k * 0.25); g.fillRect(gh.tx - half * (0.5 + k * 0.5), gh.ty - half * (0.5 + k * 0.5), SG_SIZE * (0.5 + k * 0.5), SG_SIZE * (0.5 + k * 0.5));
          g.lineStyle(2, 0xe8e2f8, 0.5 + k * 0.4); g.strokeRect(gh.tx - half, gh.ty - half, SG_SIZE, SG_SIZE);
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(3, 0xffffff, 0.55); g.strokeRect(gh.tx - half - 3, gh.ty - half - 3, SG_SIZE + 6, SG_SIZE + 6); }
        } else {
          // Lying flat: an empty old sail, its eyes gone.
          const k = (time - gh.dropAt) / SG_LIE_MS;
          g.fillStyle(CANVAS_SHADE, 0.85 * (1 - k)); g.fillRect(gh.tx - half, gh.ty - half, SG_SIZE, SG_SIZE);
          g.lineStyle(1.5, dim(CANVAS_SHADE, 0.3), 0.8 * (1 - k));
          for (let s = 1; s < 4; s++) g.lineBetween(gh.tx - half + (SG_SIZE / 4) * s, gh.ty - half, gh.tx - half + (SG_SIZE / 4) * s, gh.ty + half);
          stitches(g, gh.tx - half + 4, gh.ty + half - 4, gh.tx + half - 4, gh.ty + half - 4, RED_THREAD, 1.2, 5, 4, 1 - k);
        }
      }
    },
    drawAir(g, time) {
      for (const gh of ghosts) {
        let x = gh.x, y = gh.y, s = 1, lift = 0;
        if (time >= gh.billowAt && !gh.dropped) {
          const k = Math.min(1, (time - gh.billowAt) / Math.max(1, gh.dropAt - gh.billowAt));
          x = gh.x + (gh.tx - gh.x) * Math.min(1, k * 2); y = gh.y + (gh.ty - gh.y) * Math.min(1, k * 2);
          s = 1 + k * 1.3; lift = 50 + k * 40 - (k > 0.85 ? (k - 0.85) * 600 : 0);
          gh.x = x; gh.y = y;
        } else if (gh.dropped) continue;
        const t = time / 1000;
        const bob = Math.sin(t * 2.6 + gh.seed) * 5;
        const cy = y - 30 - lift + bob;
        const w = 34 * s, h = 46 * s;
        // A draped sheet: rounded head, ragged hem that sways.
        g.fillStyle(dim(CANVAS, 0.35), 0.85); g.fillEllipse(x + 2, cy + 2, w, w * 0.9);
        g.fillStyle(CANVAS, 0.9); g.fillEllipse(x, cy, w, w * 0.9);
        g.fillRect(x - w / 2, cy, w, h * 0.55);
        for (let i = 0; i < 5; i++) {
          const hx = x - w / 2 + (w / 4) * i;
          const sway = Math.sin(t * 5 + i + gh.seed) * 4 * s;
          g.fillTriangle(hx - w / 8, cy + h * 0.55, hx + w / 8, cy + h * 0.55, hx + sway, cy + h * 0.78 + (i % 2) * 6 * s);
        }
        g.lineStyle(1.2, CANVAS_SHADE, 0.8);
        g.lineBetween(x - w * 0.15, cy - w * 0.2, x - w * 0.2, cy + h * 0.5); g.lineBetween(x + w * 0.18, cy - w * 0.15, x + w * 0.22, cy + h * 0.5);
        g.fillStyle(VELVET_DARK, 0.95); g.fillEllipse(x - w * 0.16, cy - w * 0.05, w * 0.16, w * 0.22); g.fillEllipse(x + w * 0.16, cy - w * 0.05, w * 0.16, w * 0.22);
        stitches(g, x - w / 2 + 2, cy + h * 0.5, x + w / 2 - 2, cy + h * 0.5, RED_THREAD, 1, 3, 3, 0.8);
      }
    },
    onPhaseEnd() { ghosts = []; },
  };
};

// ── Signature: Loose Ends ────────────────────────────────────────────
// Every loose thread of him trails across the floor to the walls, lying in lazy curls. Each
// curl's true line — the straight path it will snap to when he yanks — is ticked out faintly
// beside it. Then he yanks. Stand where the thread *will* be, not where it is.

const LE_WARN_MS = 1350;
const LE_SNAP_MS = 120;
const LE_SHOW_MS = 420;
const LE_DAMAGE = 14;

const looseEnds = (tk: BossToolkit): SignatureMove => {
  interface End { ex: number; ey: number; seed: number }
  let ends: End[] = [];
  let ox = 0, oy = 0;
  let bornAt = 0, yankAt = 0;
  let dealt = true;
  const rayToEdge = (x: number, y: number, a: number): Pt => {
    const ux = Math.cos(a), uy = Math.sin(a);
    let t = 2000;
    if (ux > 0) t = Math.min(t, (tk.W - 30 - x) / ux); else if (ux < 0) t = Math.min(t, (30 - x) / ux);
    if (uy > 0) t = Math.min(t, (tk.H - 30 - y) / uy); else if (uy < 0) t = Math.min(t, (100 - y) / uy);
    return { x: x + ux * t, y: y + uy * t };
  };
  return {
    durationMs: 2100,
    windupMs: 500,
    gesture: 'recoil',
    tell: 'LOOSE ENDS',
    cast() {
      const now = tk.now;
      ox = tk.bossX; oy = tk.bossY;
      const n = tk.hard ? 7 : 6;
      const base = Math.random() * Math.PI * 2;
      ends = [];
      for (let i = 0; i < n; i++) {
        const a = base + (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const e = rayToEdge(ox, oy, a);
        ends.push({ ex: e.x, ey: e.y, seed: Math.random() * 10 });
      }
      bornAt = now; yankAt = now + tk.warn(LE_WARN_MS); dealt = false;
      tk.schedule(yankAt - now, () => tk.sfx('whip'));
    },
    update(time) {
      if (dealt || time < yankAt) return;
      dealt = true;
      const p = tk.player;
      for (const e of ends) {
        if (segDist(p.x, p.y, ox, oy, e.ex, e.ey) < 12 + PLAYER_R * 0.6) {
          tk.hitPlayer(LE_DAMAGE, p.x, p.y);
          tk.pull(ox, oy, 110, 380);
          break;
        }
      }
    },
    drawGround(g, time) {
      if (!ends.length || time > yankAt + LE_SHOW_MS) return;
      const k = Math.min(1, (time - bornAt) / Math.max(1, yankAt - bornAt));
      for (const e of ends) {
        if (time < yankAt) {
          // The true line, ticked.
          stitches(g, ox, oy, e.ex, e.ey, CHALK, 1.5, 3, 9, 0.25 + 0.55 * k);
          if (k > 0.8 && Math.floor(time / 80) % 2 === 0) { g.lineStyle(10, 0xffffff, 0.1); g.lineBetween(ox, oy, e.ex, e.ey); }
        }
      }
    },
    drawAir(g, time) {
      if (!ends.length || time > yankAt + LE_SHOW_MS) return;
      for (const e of ends) {
        const len = dist(ox, oy, e.ex, e.ey);
        const ux = (e.ex - ox) / len, uy = (e.ey - oy) / len, nx = -uy, ny = ux;
        let curl: number;
        if (time < yankAt) curl = 1;
        else curl = Math.max(0, 1 - (time - yankAt) / LE_SNAP_MS);
        const pts: Pt[] = [];
        for (let s = 0; s <= 30; s++) {
          const k = s / 30;
          const off = Math.sin(k * Math.PI * 3 + e.seed) * 38 * Math.sin(k * Math.PI) * curl + Math.sin(time / 200 + k * 7) * 3 * curl;
          pts.push({ x: ox + ux * len * k + nx * off, y: oy + uy * len * k + ny * off });
        }
        const live = time >= yankAt;
        const fade = live ? 1 - (time - yankAt) / LE_SHOW_MS : 1;
        if (live) polyline(g, pts, 7, RED_THREAD, 0.25 * fade);
        polyline(g, pts, live ? 3 : 2, live ? 0xffffff : RED_THREAD, 0.9 * fade);
        // A frayed end at the wall.
        for (let i = 0; i < 4; i++) {
          g.lineStyle(1, RED_THREAD, 0.8 * fade);
          g.lineBetween(e.ex, e.ey, e.ex + Math.cos(e.seed + i) * 8, e.ey + Math.sin(e.seed + i) * 8);
        }
      }
    },
    onPhaseEnd() { ends = []; dealt = true; },
  };
};

// ── Signature: Sewn Shut ─────────────────────────────────────────────
// The Shroud: a needle the length of a spar sews a seam straight across the room through where
// you stand, then a second at right angles — and the seams hold like walls for a while, so you
// are sewn into one quarter of the floor with whatever else he sends. The needle's point hurts.

const SS_WARN_MS = 900;
const SS_SPEED = 430;
const SS_HOLD_MS = 5200;
const SS_TIP_DAMAGE = 12;
const SS_WALL_BAND = 12;

const sewnShut = (tk: BossToolkit): SignatureMove => {
  interface Seam { horiz: boolean; at: number; dir: number; bornAt: number; runAt: number; doneAt: number; endAt: number; tipDealt: boolean; side: number }
  let seams: Seam[] = [];
  const run = (s: Seam): number => (s.horiz ? tk.W : tk.H - 96);
  const tipPos = (s: Seam, time: number): number => {
    const k = Math.min(1, Math.max(0, (time - s.runAt) / (s.doneAt - s.runAt)));
    const L = run(s);
    const start = s.horiz ? 0 : 96;
    return s.dir > 0 ? start + L * k : start + L * (1 - k);
  };
  /** Sewn so far: [from, to] along the seam's axis. */
  const sewn = (s: Seam, time: number): [number, number] | null => {
    if (time < s.runAt) return null;
    const tp = tipPos(s, time);
    const start = s.horiz ? 0 : 96, end = s.horiz ? tk.W : tk.H;
    return s.dir > 0 ? [start, tp] : [tp, end];
  };
  const addSeam = (horiz: boolean, delay: number): void => {
    tk.schedule(delay, () => {
      const p = tk.player;
      const now = tk.now;
      const at = horiz ? tk.clampY(p.y + (Math.random() - 0.5) * 60, 150) : tk.clampX(p.x + (Math.random() - 0.5) * 60, 150);
      const runAt = now + tk.warn(SS_WARN_MS);
      const L = horiz ? tk.W : tk.H - 96;
      const doneAt = runAt + (L / SS_SPEED) * 1000;
      seams.push({ horiz, at, dir: Math.random() < 0.5 ? 1 : -1, bornAt: now, runAt, doneAt, endAt: doneAt + SS_HOLD_MS, tipDealt: false, side: 0 });
      tk.sfx('trap-set');
    });
  };
  return {
    durationMs: 3600,
    windupMs: 700,
    hold: 'draw',
    tell: 'SEWN SHUT',
    cast() {
      const first = Math.random() < 0.5;
      addSeam(first, 0);
      addSeam(!first, 1100);
    },
    update(time) {
      const p = tk.player;
      for (const s of seams) {
        if (time < s.runAt) continue;
        // The point.
        if (!s.tipDealt && time < s.doneAt) {
          const tp = tipPos(s, time);
          const tx = s.horiz ? tp : s.at, ty = s.horiz ? s.at : tp;
          if (dist(tx, ty, p.x, p.y) < PLAYER_R + 16) { s.tipDealt = true; tk.hitPlayer(SS_TIP_DAMAGE, tx, ty); }
        }
        // The seam behind it is a wall: keep you on the side you were on.
        const span = sewn(s, time);
        if (!span || time >= s.endAt) continue;
        const along = s.horiz ? p.x : p.y;
        const across = (s.horiz ? p.y : p.x) - s.at;
        if (s.side === 0 || Math.abs(across) > SS_WALL_BAND * 2) s.side = across >= 0 ? 1 : -1;
        if (along >= span[0] && along <= span[1] && Math.abs(across) < SS_WALL_BAND + PLAYER_R * 0.5) {
          const want = s.at + s.side * (SS_WALL_BAND + PLAYER_R * 0.5);
          if (s.horiz) p.y = Phaser.Math.Clamp(want, 96, tk.H - 40); else p.x = Phaser.Math.Clamp(want, 40, tk.W - 40);
        }
      }
      seams = seams.filter((s) => time < s.endAt + 400);
    },
    drawGround(g, time) {
      for (const s of seams) {
        const k = Math.min(1, (time - s.bornAt) / Math.max(1, s.runAt - s.bornAt));
        if (time < s.runAt) {
          if (s.horiz) { chalkLine(g, 0, s.at, tk.W, s.at, 0.4 + 0.5 * k); g.fillStyle(RED_THREAD, 0.06 + 0.1 * k); g.fillRect(0, s.at - 20, tk.W, 40); }
          else { chalkLine(g, s.at, 96, s.at, tk.H, 0.4 + 0.5 * k); g.fillStyle(RED_THREAD, 0.06 + 0.1 * k); g.fillRect(s.at - 20, 96, 40, tk.H - 96); }
          continue;
        }
        const span = sewn(s, time);
        if (!span) continue;
        const fade = time > s.endAt ? 1 - (time - s.endAt) / 400 : 1;
        // The seam: a thick welt of canvas, cross-stitched over.
        if (s.horiz) {
          g.fillStyle(dim(CANVAS, 0.4), 0.9 * fade); g.fillRect(span[0], s.at - SS_WALL_BAND, span[1] - span[0], SS_WALL_BAND * 2 + 3);
          g.fillStyle(CANVAS, 0.95 * fade); g.fillRect(span[0], s.at - SS_WALL_BAND, span[1] - span[0], SS_WALL_BAND * 2 - 2);
          for (let x = span[0] + 4; x < span[1] - 6; x += 14) {
            g.lineStyle(2, RED_THREAD, fade); g.lineBetween(x, s.at - SS_WALL_BAND + 3, x + 9, s.at + SS_WALL_BAND - 5); g.lineBetween(x + 9, s.at - SS_WALL_BAND + 3, x, s.at + SS_WALL_BAND - 5);
          }
        } else {
          g.fillStyle(dim(CANVAS, 0.4), 0.9 * fade); g.fillRect(s.at - SS_WALL_BAND, span[0], SS_WALL_BAND * 2 + 3, span[1] - span[0]);
          g.fillStyle(CANVAS, 0.95 * fade); g.fillRect(s.at - SS_WALL_BAND, span[0], SS_WALL_BAND * 2 - 2, span[1] - span[0]);
          for (let y = span[0] + 4; y < span[1] - 6; y += 14) {
            g.lineStyle(2, RED_THREAD, fade); g.lineBetween(s.at - SS_WALL_BAND + 3, y, s.at + SS_WALL_BAND - 5, y + 9); g.lineBetween(s.at + SS_WALL_BAND - 5, y, s.at - SS_WALL_BAND + 3, y + 9);
          }
        }
        // Unpicking at the end: a last flicker.
        if (time > s.endAt - 500 && Math.floor(time / 90) % 2 === 0) {
          g.lineStyle(2, 0xffffff, 0.5);
          if (s.horiz) g.strokeRect(span[0], s.at - SS_WALL_BAND, span[1] - span[0], SS_WALL_BAND * 2); else g.strokeRect(s.at - SS_WALL_BAND, span[0], SS_WALL_BAND * 2, span[1] - span[0]);
        }
      }
    },
    drawAir(g, time) {
      for (const s of seams) {
        if (time < s.runAt || time > s.doneAt) continue;
        const tp = tipPos(s, time);
        const tx = s.horiz ? tp : s.at, ty = s.horiz ? s.at : tp;
        const a = s.horiz ? (s.dir > 0 ? 0 : Math.PI) : (s.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        // The needle dips in and out of the cloth as it runs.
        const dip = Math.sin(time / 50) * 6;
        needle(g, tx - Math.cos(a) * 40 + (s.horiz ? 0 : dip), ty - Math.sin(a) * 40 + (s.horiz ? dip : 0), a, 96);
        g.lineStyle(2, RED_THREAD, 0.9); g.lineBetween(tx - Math.cos(a) * 88, ty - Math.sin(a) * 88, tx - Math.cos(a) * 140, ty - Math.sin(a) * 140 + 8);
      }
    },
    onPhaseEnd() { seams = []; },
  };
};

// ── Signature: The Last Stitch ───────────────────────────────────────
// What sailmakers do last when they sew a drowned sailor into his hammock: one stitch through
// the nose, to be sure. Four threads run in from the corners of the room and meet over you,
// following you, then lock — and the great needle comes down on the knot. Pins spray from the
// strike, but never back toward him.

const LS_TRACK_MS = 1150;
const LS_LOCK_MS = 600;
const LS_R = 62;
const LS_DAMAGE = 22;
const LS_PINS = 10;

const lastStitch = (tk: BossToolkit): SignatureMove => {
  let active = false;
  let bornAt = 0, lockAt = 0, strikeAt = 0;
  let x = 0, y = 0;
  let struck = false;
  return {
    durationMs: 2600,
    windupMs: 600,
    gesture: 'slam',
    tell: 'THE LAST STITCH',
    cast() {
      const now = tk.now;
      active = true; struck = false;
      bornAt = now; lockAt = now + tk.warn(LS_TRACK_MS); strikeAt = lockAt + tk.warn(LS_LOCK_MS);
      x = tk.player.x; y = tk.player.y;
      tk.sfx('curse-cast');
    },
    update(time, dt) {
      if (!active) return;
      const p = tk.player;
      if (time < lockAt) {
        // The knot follows you, a little behind.
        const k = Math.min(1, dt * 3.2);
        x += (p.x - x) * k; y += (p.y - y) * k;
      }
      if (!struck && time >= strikeAt) {
        struck = true;
        tk.sfx('stab');
        tk.sfx('hit-heavy');
        tk.scene.cameras.main.shake(200, 0.007);
        tk.boom(x, y, LS_R, CANVAS);
        if (dist(x, y, p.x, p.y) < LS_R) {
          tk.hitPlayer(LS_DAMAGE, p.x, p.y);
          tk.slowPlayer(0.35, 1400);
          tk.host.showFloatingText(p.x, p.y - 46, 'PINNED', '#f2efe4');
        }
        const away = Math.atan2(y - tk.bossY, x - tk.bossX);
        for (let i = 0; i < LS_PINS; i++) {
          const a = away + ((i + 0.5) / LS_PINS - 0.5) * Math.PI * 1.5;
          tk.spawnBullet({ x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20, angle: a, speed: 190, damage: 7, r: 4, color: STEEL, lifeMs: 2600 });
        }
      }
      if (time > strikeAt + 900) active = false;
    },
    drawGround(g, time) {
      if (!active) return;
      const locked = time >= lockAt;
      const corners: Pt[] = [{ x: 0, y: 96 }, { x: tk.W, y: 96 }, { x: 0, y: tk.H }, { x: tk.W, y: tk.H }];
      if (time < strikeAt) {
        const k = Math.min(1, (time - bornAt) / Math.max(1, strikeAt - bornAt));
        for (const c of corners) {
          const run = Math.min(1, (time - bornAt) / 450);
          g.lineStyle(locked ? 2.5 : 1.5, RED_THREAD, 0.5 + 0.4 * k);
          g.lineBetween(c.x, c.y, c.x + (x - c.x) * run, c.y + (y - c.y) * run);
        }
        g.fillStyle(CANVAS, 0.08 + 0.2 * k); g.fillCircle(x, y, LS_R);
        g.lineStyle(2, locked ? 0xffffff : CHALK, 0.5 + 0.4 * k); g.strokeCircle(x, y, LS_R);
        // The knot.
        g.fillStyle(RED_THREAD, 1); g.fillCircle(x, y, 5 + (locked ? 2 : 0));
        if (locked && Math.floor(time / 80) % 2 === 0) { g.lineStyle(4, 0xffffff, 0.55); g.strokeCircle(x, y, LS_R + 4); }
      } else {
        const k = Math.min(1, (time - strikeAt) / 900);
        g.fillStyle(0x1a1a22, 0.5 * (1 - k)); g.fillCircle(x, y, 10);
        stitches(g, x - LS_R, y, x + LS_R, y, RED_THREAD, 2, 6, 4, 1 - k);
      }
    },
    drawAir(g, time) {
      if (!active) return;
      if (time < strikeAt) {
        const k = Math.min(1, (time - bornAt) / Math.max(1, strikeAt - bornAt));
        const h = (1 - k * k) * 260 + 30;
        needle(g, x, y - h, Math.PI / 2, 120, 0.4 + 0.6 * k);
        g.lineStyle(2, RED_THREAD, 0.4 + 0.5 * k); g.lineBetween(x, y - h - 60, x + 10, y - h - 150);
      } else if (time < strikeAt + 500) {
        needle(g, x, y - 50, Math.PI / 2, 120, 1 - (time - strikeAt) / 500);
      }
    },
    onPhaseEnd() { active = false; },
  };
};

// ── The def ──────────────────────────────────────────────────────────

const DECOR_SEED = 5281;
const PIN_HEADS = [RED_THREAD, HEM_GOLD, QUEEN, 0xe8e2f8, 0x8a3a8a];

export const HEM_BOSS: WorldBossDef = {
  worldId: 'isle:hem',
  name: 'Prince Hem',
  title: 'Royal Tailor of the Sailmaker\'s Court',
  color: VELVET,
  colorLit: VELVET_LIT,
  colorDark: VELVET_DARK,
  accent: ACCENT,
  damageMult: 1.0,

  intro: [
    'Arms up. Hold still. You are being fitted.',
    'Off the peg. I can always tell.',
    'Mother keeps the tide. I keep the measure.',
  ],
  banter: [
    'A yard a head. You will make a very small yard.',
    'Everything on this cliff is cut to pattern. You are a loose thread.',
    'My weavers do not stop. Neither does the fleet. Neither shall I.',
    'You will not fit in the Undertow like that. Let me take you in at the waist.',
    'Measurers! Note the seam allowance on this one. Generous.',
    'Mind the selvedge. It is the only part of a cloth that never frays.',
  ],
  defeatLine: 'THE PRINCE COMES UNSTITCHED',
  resumeLine: 'You again. I had you pinned and you wriggled out.',

  phases: [
    {
      name: 'Tailored',
      line: 'Chest, waist, inseam. Let us see what you are made of.',
      hp: 370,
      cycle: [
        'sig:pinsAndNeedles', 'volley', 'sig:takingMeasure', 'lanes',
        'sig:cutToPattern', 'radial', 'sig:pinsAndNeedles', 'barrage', 'sig:takingMeasure',
      ],
      harass: ['h-flak', 'h-snipe', 'h-lane'],
      restMs: 1120,
      harassMs: 3100,
    },
    {
      name: 'Unravelled',
      line: 'You have pulled a thread. Do you understand? You have PULLED A THREAD.',
      hp: 450,
      cycle: [
        'sig:ribbonStorm', 'sig:sailGhosts', 'spiral', 'sig:looseEnds',
        'homing', 'sig:ribbonStorm', 'charge', 'sig:sailGhosts', 'sig:looseEnds', 'quake',
      ],
      harass: ['h-orbs', 'h-flak', 'h-rune', 'h-snipe'],
      restMs: 960,
      harassMs: 2800,
    },
  ],

  hard: {
    introLine: 'EVERY SAILOR IS SEWN IN AT THE END',
    extraPhase: {
      name: 'The Shroud',
      line: 'Hold still. This is the part where the sailmaker is gentle.',
      hp: 330,
      cycle: [
        'sig:sewnShut', 'sig:lastStitch', 'sig:pinsAndNeedles', 'sweep',
        'sig:sewnShut', 'sig:takingMeasure', 'sig:lastStitch', 'stream',
      ],
      harass: ['h-mines', 'h-rune', 'h-flak'],
      restMs: 860,
      harassMs: 2500,
    },
  },

  tuning: {
    volley: { count: 7, spreadRad: 0.9 },
    lanes: { halfW: 26 },
    sweep: { halfW: 16 },
  },

  signatures: {
    pinsAndNeedles,
    takingMeasure,
    cutToPattern,
    ribbonStorm,
    sailGhosts,
    looseEnds,
    sewnShut,
    lastStitch,
  },

  look: { crest: 'none', pattern: 'weave', aura: 'none', hands: 'blade', torsoR: 34, mouth: 'line', eyes: 2 },

  phaseStyles: [
    { movement: 'stalk', gimmick: 'none' },
    { movement: 'orbit', gimmick: 'none', tint: 'cold', look: { hands: 'wisp', pattern: 'swirl', mouth: 'grin', torsoR: 30 } },
    { movement: 'anchor', gimmick: 'stalkers', tint: 'pale', look: { hands: 'claw', pattern: 'smooth', mouth: 'stitch', torsoR: 38, aura: 'smoke' } },
  ],

  /**
   * Phase one is the dandy: a velvet pincushion for a crown, studded with glass-headed pins; a
   * pleated canvas ruff; his gold tape slung round the neck; a spool and shears on ribbons at his
   * hip. Phase two he is coming apart — the cushion gone, ribbons streaming off him in every
   * direction, threads trailing from the weave. The Shroud wraps him in a sailor's canvas with a
   * single seam stitched up its front, a needle and thread through where his nose should be.
   */
  drawDecor(g, s) {
    const t = s.t / 1000;
    const R = s.radius;
    const rng = mulberry(DECOR_SEED);
    if (s.phaseIdx === 0) {
      // Ruff.
      for (let i = 0; i < 12; i++) {
        const a = Math.PI * 0.08 + (i / 11) * Math.PI * 0.84;
        const x = s.x + Math.cos(a) * R * 0.62, y = s.y + R * 0.28 + Math.sin(a) * R * 0.2;
        g.fillStyle(i % 2 ? CANVAS : CANVAS_SHADE, 1); g.fillEllipse(x, y, 12, 9);
      }
      // The tape slung round the neck, hanging down both sides.
      const sway = Math.sin(t * 1.6) * 3;
      tapeStrip(g, s.x - R * 0.5, s.y + R * 0.15, s.x - R * 0.62 + sway, s.y + R * 1.05, 6, 1);
      tapeStrip(g, s.x + R * 0.45, s.y + R * 0.15, s.x + R * 0.55 + sway, s.y + R * 0.85, 6, 1);
      // Pincushion crown.
      const cy = s.y - R * 0.92;
      g.fillStyle(dim(VELVET, 0.4), 1); g.fillEllipse(s.x, cy + 3, R * 1.2, R * 0.55);
      g.fillStyle(s.palette.main, 1); g.fillEllipse(s.x, cy, R * 1.15, R * 0.5);
      for (let i = 0; i < 6; i++) { g.lineStyle(1, dim(s.palette.main, 0.3), 0.9); const a = (i / 6) * Math.PI; g.lineBetween(s.x, cy, s.x + Math.cos(a) * R * 0.56, cy + Math.sin(a) * R * 0.24 - R * 0.04); }
      g.fillStyle(HEM_GOLD, 1); g.fillCircle(s.x, cy - 2, 3.5);
      for (let i = 0; i < 9; i++) {
        const px = s.x + (rng() - 0.5) * R * 0.95, py = cy - 2 + (rng() - 0.5) * R * 0.28;
        pin(g, px, py, PIN_HEADS[i % PIN_HEADS.length], 0.9);
      }
      // Spool and shears hanging at the hip on ribbon.
      const hx = s.x + R * 0.95, hy = s.y + R * 0.35;
      g.lineStyle(2, RED_THREAD, 1); g.lineBetween(s.x + R * 0.6, s.y + R * 0.1, hx, hy);
      spool(g, hx, hy + 12 + Math.sin(t * 2) * 1.5, 3.6, HEM_GOLD);
      g.lineStyle(2.5, STEEL, 1); g.lineBetween(s.x - R * 0.9, s.y + R * 0.3, s.x - R * 1.1, s.y + R * 0.85); g.lineBetween(s.x - R * 1.0, s.y + R * 0.3, s.x - R * 1.0, s.y + R * 0.9);
      g.lineStyle(2, HEM_GOLD, 1); g.strokeCircle(s.x - R * 0.92, s.y + R * 0.24, 3.5); g.strokeCircle(s.x - R * 1.04, s.y + R * 0.24, 3.5);
    } else if (s.phaseIdx === 1) {
      // Ribbons streaming off him, each on its own flutter.
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + t * 0.8;
        const col = RIBBON_COLS[i % RIBBON_COLS.length];
        const pts: Pt[] = [];
        for (let k = 0; k <= 8; k++) {
          const r = R * 0.8 + k * 6;
          const wave = Math.sin(t * 6 + k * 0.9 + i) * k * 1.6;
          pts.push({ x: s.x + Math.cos(a) * r - Math.sin(a) * wave, y: s.y + Math.sin(a) * r + Math.cos(a) * wave });
        }
        polyline(g, pts, 5, col, 0.95);
      }
      // Threads trailing from the weave.
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * 0.3 + i * 0.4;
        g.lineStyle(1, i % 2 ? RED_THREAD : HEMP, 0.8);
        g.lineBetween(s.x + Math.cos(a) * R * 0.7, s.y + Math.sin(a) * R * 0.7, s.x + Math.cos(a) * R * 1.4 + Math.sin(t * 3 + i) * 5, s.y + Math.sin(a) * R * 1.5);
      }
      // A few pins still stuck in him, crooked.
      for (let i = 0; i < 3; i++) pin(g, s.x - R * 0.4 + i * R * 0.4, s.y - R * 0.55 + (i % 2) * 6, PIN_HEADS[i], 0.8);
    } else {
      // The shroud: a canvas wrap with its seam up the front.
      g.fillStyle(dim(CANVAS, 0.25), 0.95); g.fillEllipse(s.x, s.y + R * 0.15, R * 2.05, R * 1.9);
      g.fillStyle(CANVAS, 0.95); g.fillEllipse(s.x, s.y + R * 0.1, R * 1.95, R * 1.8);
      for (let k = -2; k <= 2; k++) { g.lineStyle(1.5, CANVAS_SHADE, 0.8); g.lineBetween(s.x + k * R * 0.35, s.y - R * 0.7, s.x + k * R * 0.4, s.y + R * 0.9); }
      // Leave the eyes: a slot.
      g.fillStyle(s.palette.dark, 0.9); g.fillRoundedRect(s.x - R * 0.55, s.y - R * 0.38, R * 1.1, R * 0.3, 4);
      g.fillStyle(s.palette.lit, 1); g.fillCircle(s.x - R * 0.22 + Math.cos(s.facing) * 2, s.y - R * 0.23, 3.4); g.fillCircle(s.x + R * 0.22 + Math.cos(s.facing) * 2, s.y - R * 0.23, 3.4);
      stitches(g, s.x, s.y - R * 0.05, s.x, s.y + R * 0.95, RED_THREAD, 2, 5, 3);
      // The last stitch, through the nose.
      needle(g, s.x + 6, s.y - R * 0.02, -0.4, 22);
      g.lineStyle(1.4, RED_THREAD, 1);
      g.lineBetween(s.x - 4, s.y + 2, s.x - 14 + Math.sin(t * 2) * 3, s.y + R * 0.5);
      // His gold tape, wound round the shroud like a binding.
      tapeStrip(g, s.x - R * 0.95, s.y + R * 0.35, s.x + R * 0.95, s.y + R * 0.55, 5, 0.95);
    }
    if (s.hurt) {
      // Lint and snipped thread puffing off him when struck.
      for (let i = 0; i < 5; i++) {
        g.lineStyle(1.2, i % 2 ? CANVAS : RED_THREAD, 0.9);
        const a = i * 1.3;
        g.lineBetween(s.x + Math.cos(a) * R, s.y + Math.sin(a) * R, s.x + Math.cos(a) * (R + 9), s.y + Math.sin(a) * (R + 9) - 4);
      }
    }
  },

  /**
   * The Pattern Room: Hem's cutting floor is one enormous cutting mat, sea-green and gridded by
   * the inch with heavier lines every foot, angle guides fanning from the corners, and a ruler
   * running round the edges. Last season's pattern pieces lie chalked on it in outline; pins and
   * spools are scattered where his tailors dropped them; and the Queen's measure is set into the
   * floor before his chair in gold.
   */
  drawArena(g, W, H) {
    const top = 96;
    const mat = 0x1f5a52;
    g.fillStyle(dim(mat, 0.4), 1); g.fillRect(0, 0, W, H);
    g.fillStyle(mat, 1); g.fillRect(14, top - 6, W - 28, H - top - 2);
    // Grid: inch lines, foot lines.
    for (let x = 14, i = 0; x < W - 14; x += 24, i++) {
      g.lineStyle(i % 5 === 0 ? 1.6 : 0.8, i % 5 === 0 ? 0xd8f0e0 : 0x8ac8b0, i % 5 === 0 ? 0.55 : 0.35);
      g.lineBetween(x, top - 6, x, H - 8);
    }
    for (let y = top - 6, i = 0; y < H - 8; y += 24, i++) {
      g.lineStyle(i % 5 === 0 ? 1.6 : 0.8, i % 5 === 0 ? 0xd8f0e0 : 0x8ac8b0, i % 5 === 0 ? 0.55 : 0.35);
      g.lineBetween(14, y, W - 14, y);
    }
    // Angle guides from two corners.
    for (const [cx, cy, s] of [[14, H - 8, -1], [W - 14, H - 8, -1]] as [number, number, number][]) {
      for (const deg of [30, 45, 60]) {
        const a = (deg * Math.PI) / 180;
        const dx = cx < W / 2 ? Math.cos(a) : -Math.cos(a);
        g.lineStyle(1.2, 0xf0e0a0, 0.35); g.lineBetween(cx, cy, cx + dx * 900, cy + s * Math.sin(a) * 900);
      }
    }
    // Ruler round the edge.
    g.fillStyle(HEM_GOLD, 0.85); g.fillRect(14, top - 6, W - 28, 8);
    for (let x = 14, i = 0; x < W - 14; x += 6, i++) {
      g.lineStyle(1, VELVET_DARK, 0.9); g.lineBetween(x, top - 6, x, top - 6 + (i % 4 === 0 ? 8 : 4));
    }
    // Last season's pattern pieces, chalked.
    const rng = mulberry(7311);
    const spots: [number, number, number][] = [[200, 230, 0], [760, 220, 1], [180, 520, 2], [790, 520, 0], [480, 560, 2]];
    for (const [cx, cy, pi] of spots) {
      const rot = rng() * Math.PI;
      const piece = PIECES[pi];
      const pts = piece.map((q) => {
        const x = q.x * 90, y = q.y * 64;
        return { x: cx + x * Math.cos(rot) - y * Math.sin(rot), y: cy + x * Math.sin(rot) + y * Math.cos(rot) };
      });
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        chalkLine(g, a.x, a.y, b.x, b.y, 0.45);
      }
    }
    // Scattered pins and spools.
    for (let i = 0; i < 18; i++) pin(g, 40 + rng() * (W - 80), top + 30 + rng() * (H - top - 60), PIN_HEADS[i % PIN_HEADS.length], 0.9, 0.85);
    spool(g, 60, H - 40, 6, RED_THREAD); spool(g, W - 60, H - 40, 6, HEM_GOLD); spool(g, W - 80, top + 40, 5, QUEEN);
    // The Queen's measure in gold before his chair.
    const cx = W / 2, cy = (H + top) / 2;
    g.lineStyle(3, HEM_GOLD, 0.55); g.strokeCircle(cx, cy, 80);
    g.lineStyle(1.2, HEM_GOLD, 0.45); g.strokeCircle(cx, cy, 70);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      g.lineStyle(i % 3 === 0 ? 2 : 1, HEM_GOLD, 0.55);
      g.lineBetween(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70, cx + Math.cos(a) * (i % 3 === 0 ? 82 : 76), cy + Math.sin(a) * (i % 3 === 0 ? 82 : 76));
    }
    tideMark(g, cx, cy, 30, mixC(HEM_GOLD, mat, 0.25), 0.7);
  },
};

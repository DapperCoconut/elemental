import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from '../gimmicks/shared';
import { live, SIDES } from '../gimmicks/shared';
import type { G } from '../../../../../art/IsleArt';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { CAP_VIOLET, CAP_VIOLET_LIT, GILL, PEAT_DARK, SPOT, STEM, STEM_SHADE } from '../palette';
import { dist, distToSeg } from '../sporeArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Spore Print — Printer Lamella, Keeper of the Rolls.
 *
 * A mycologist takes a spore print by laying a cap gill-side down on paper and lifting it an hour
 * later: the spores fall in the exact pattern of the gills, a dark star of spokes. In the King's
 * telling Lamella printed the Spore Court's pruning rolls that way — a great parasol cap pressed on
 * the page, every name on a gill. Here the page is the floor and the cap is the size of a cart.
 *
 * The cap drifts over a spot, its shadow darkening, and the gills are *pre-printed* faintly on the
 * peat — ten spokes and a hub. Then it presses: anyone standing on a gill line or the hub is
 * printed (hurt and held a moment). The gaps between gills are safe; so is anywhere past the rim.
 * The fresh print lies wet for a few seconds and drags at the feet of whoever wades it.
 *
 * The cap hangs off a stem, and the stem stands in the hub — **strike it** while the cap is coming
 * down and the cap turns half a gill: every gap becomes a line and every line a gap. Lamella reads
 * the floor and stands in the gaps; turn the cap on her. She will turn it on you, too.
 *
 * Halfway down, the Keeper starts taking *double prints*: the cap presses, lifts, turns half a gill
 * by itself and presses again a beat later — the gaps that saved you from the first press are the
 * lines of the second, so you must leave the print outward, not sidestep inside it.
 */

const ID = fallenId('spore', 'spore-print');
const GILLS = 10;
const RADIUS = 250;
const HUB = 38;
const LINE = 15;
const WARN_MS = 1500;
const TURN_FLOOR_MS = 650;
const SECOND_MS = 850;
const WET_MS = 3800;
const INK = 0x24142e;
const INK_SHEEN = 0x5b3a78;

interface Press { x: number; y: number; rot: number; at: number; second: boolean }
interface Wet { x: number; y: number; rot: number; born: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
  const step = (Math.PI * 2) / GILLS;
  let press: Press | null = null;
  let nextAt = ctx.scene.time.now + 2600;
  let wets: Wet[] = [];
  let turns = 0;
  const onWet = { p: false, n: false };
  let pressed = 0;
  let stem: ReturnType<GimmickCtx['target']> | null = null;
  const lateFight = (): boolean => ctx.npc.hp < ctx.npc.maxHp * 0.5;

  /** Distance from (x, y) to the nearest gill line of a print turned `rot`, or 0 inside the hub. */
  const gillDist = (cx: number, cy: number, rot: number, x: number, y: number): number => {
    const d = dist(cx, cy, x, y);
    if (d < HUB) return 0;
    if (d > RADIUS + 10) return 999;
    let best = 999;
    for (let i = 0; i < GILLS; i++) {
      const a = rot + i * step;
      best = Math.min(best, distToSeg(x, y, cx, cy, cx + Math.cos(a) * RADIUS, cy + Math.sin(a) * RADIUS));
    }
    return best;
  };

  const removeStem = (): void => { stem?.remove(); stem = null; };

  const begin = (time: number): void => {
    // The cap settles over the player, off by a little — the hub is rarely right underfoot.
    const p = ctx.player;
    const a = ctx.rng() * Math.PI * 2, off = 30 + ctx.rng() * 70;
    const x = Phaser.Math.Clamp(p.x + Math.cos(a) * off, 120, W - 120);
    const y = Phaser.Math.Clamp(p.y + Math.sin(a) * off, top + 90, H - 90);
    press = { x, y, rot: ctx.rng() * step, at: time + WARN_MS, second: false };
    ctx.sfx('whoosh');
    removeStem();
    stem = ctx.target({
      x, y, r: 26, passThrough: true,
      onStruck(by) {
        const t = ctx.scene.time.now;
        if (!press || t >= press.at) return;
        press.rot += step / 2;
        press.at = Math.max(press.at, t + TURN_FLOOR_MS);
        turns++;
        ctx.sfx('gear-turn');
        ctx.flash(press.x, press.y, by === 'player' ? SPOT : INK_SHEEN);
      },
    });
  };

  const stamp = (pr: Press, time: number): void => {
    ctx.sfx('stone-slam');
    pressed++;
    for (const k of SIDES) {
      const f = fOf(k);
      if (!live(f) || ctx.isAirborne(f)) continue;
      if (gillDist(pr.x, pr.y, pr.rot, f.x, f.y) > LINE + 18) continue;
      if (k === 'p') tk.hitPlayer(10, f.x, f.y); else ctx.hit(f, 13, f.x, f.y);
      ctx.root(f, 650);
    }
    wets.push({ x: pr.x, y: pr.y, rot: pr.rot, born: time });
  };

  return {
    update(time) {
      if (!press && time >= nextAt) begin(time);
      if (press && time >= press.at) {
        const pr: Press = press;
        stamp(pr, time);
        if (lateFight() && !pr.second) {
          // The double print: lift, turn half a gill by itself, press again.
          press = { ...pr, rot: pr.rot + step / 2, at: time + SECOND_MS, second: true };
        } else {
          press = null;
          removeStem();
          nextAt = time + (lateFight() ? 3600 : 3000);
        }
      }
      wets = wets.filter((w) => time - w.born < WET_MS);
      // Wet ink drags at the feet; it is not a wound, only a slow and a stain.
      for (const k of SIDES) {
        const f = fOf(k);
        onWet[k] = live(f) && wets.some((w) => gillDist(w.x, w.y, w.rot, f.x, f.y) < LINE + 8);
      }
    },

    playerSpeedMult: () => (onWet.p ? 0.7 : 1),
    npcSpeedMult: () => (onWet.n ? 0.7 : 1),

    npcSeek(): Pt | null {
      if (!press) return null;
      const t = ctx.scene.time.now;
      const n = ctx.npc, p = ctx.player;
      const left = press.at - t;
      // The player stands in a gap and there is time: walk up to the stem's reach so a cast turns it.
      const playerSafe = gillDist(press.x, press.y, press.rot, p.x, p.y) > LINE + 30;
      const turned = gillDist(press.x, press.y, press.rot + step / 2, p.x, p.y) < LINE + 10;
      if (playerSafe && turned && left > 1000 && !press.second) {
        const a = Math.atan2(n.y - press.y, n.x - press.x);
        return { x: press.x + Math.cos(a) * 120, y: press.y + Math.sin(a) * 120 };
      }
      // Otherwise, the nearest gap — the middle of a gap, at least a cart's width from the hub —
      // or the rim if the second press is coming (the gaps will close).
      const a = Math.atan2(n.y - press.y, n.x - press.x) - press.rot;
      const slot = Math.floor(a / step);
      const mid = press.rot + (slot + 0.5) * step;
      const r = press.second || lateFight() ? RADIUS + 50 : Phaser.Math.Clamp(dist(n.x, n.y, press.x, press.y), 130, RADIUS - 20);
      return {
        x: Phaser.Math.Clamp(press.x + Math.cos(mid) * r, 50, W - 50),
        y: Phaser.Math.Clamp(press.y + Math.sin(mid) * r, top + 40, H - 40),
      };
    },

    drawGround(g, time) {
      // Old prints: ink spokes, darkest at the hub, drying to a sheen at the edges.
      for (const w of wets) {
        const k = 1 - (time - w.born) / WET_MS;
        printStar(g, w.x, w.y, w.rot, k, w.born);
      }
      if (!press) return;
      // The cap's shadow, darkening as it comes down, then the pre-print of its gills.
      const k = Phaser.Math.Clamp(1 - (press.at - time) / WARN_MS, 0, 1);
      g.fillStyle(PEAT_DARK, 0.15 + 0.3 * k); g.fillEllipse(press.x, press.y, RADIUS * 2.1, RADIUS * 1.9);
      for (let i = 0; i < GILLS; i++) {
        const a = press.rot + i * step;
        const ex = press.x + Math.cos(a) * RADIUS, ey = press.y + Math.sin(a) * RADIUS;
        g.lineStyle(LINE * 2, GILL, 0.08 + 0.22 * k); g.lineBetween(press.x, press.y, ex, ey);
        g.lineStyle(2, dim(GILL, 0.3), 0.4 + 0.5 * k); g.lineBetween(press.x, press.y, ex, ey);
        // Tick marks where the lines will meet the rim.
        g.fillStyle(INK_SHEEN, 0.5 + 0.4 * k); g.fillCircle(ex, ey, 3);
      }
      g.lineStyle(2, GILL, 0.4 + 0.4 * k); g.strokeCircle(press.x, press.y, RADIUS);
      g.fillStyle(INK, 0.25 + 0.4 * k); g.fillCircle(press.x, press.y, HUB);
      // The second press is drawn too, faintly, so the turn is never a surprise.
      if (lateFight() && !press.second) {
        for (let i = 0; i < GILLS; i++) {
          const a = press.rot + (i + 0.5) * step;
          g.lineStyle(1, SPOT, 0.18 + 0.2 * k);
          g.lineBetween(press.x + Math.cos(a) * HUB, press.y + Math.sin(a) * HUB, press.x + Math.cos(a) * RADIUS, press.y + Math.sin(a) * RADIUS);
        }
      }
    },

    drawAir(g, time) {
      if (!press) return;
      const k = Phaser.Math.Clamp(1 - (press.at - time) / WARN_MS, 0, 1);
      // The great parasol cap seen from above, sinking: it shrinks toward its print size and darkens.
      const lift = (1 - k) * 60;
      parasol(g, press.x, press.y - lift, RADIUS * (0.55 + 0.12 * (1 - k)), press.rot, 0.28 + 0.2 * k, time);
      // The stem in the hub — the thing to strike.
      shadow(g, press.x, press.y + 6, 30, 10, 0.4);
      g.fillStyle(STEM_SHADE, 1); g.fillRoundedRect(press.x - 9, press.y - 46 - lift * 0.4, 18, 50 + lift * 0.4, 6);
      g.fillStyle(STEM, 1); g.fillRoundedRect(press.x - 8, press.y - 46 - lift * 0.4, 11, 48 + lift * 0.4, 5);
      // The snakeskin bands of a parasol's stem.
      for (let i = 0; i < 4; i++) {
        g.lineStyle(1.5, dim(STEM_SHADE, 0.3), 0.8);
        g.lineBetween(press.x - 8, press.y - 10 - i * 10, press.x + 8, press.y - 14 - i * 10);
      }
      g.fillStyle(STEM_SHADE, 1); g.fillEllipse(press.x, press.y - 30 - lift * 0.2, 26, 8);
      g.lineStyle(2, SPOT, 0.35 + 0.35 * Math.sin(time / 120)); g.strokeCircle(press.x, press.y - 20, 28);
    },

    drawHud(g, time) {
      const x = W / 2 - 70, y = 104;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 6, y - 4, 152, 20, 6);
      const k = press ? Phaser.Math.Clamp(1 - (press.at - time) / WARN_MS, 0, 1) : Phaser.Math.Clamp(1 - (nextAt - time) / 3000, 0, 1);
      g.fillStyle(press ? INK_SHEEN : GILL, 0.9); g.fillRoundedRect(x, y, 120 * k, 12, 4);
      // A tiny print-star stamp: one spoke darkens per press taken so far this cycle.
      for (let i = 0; i < GILLS; i++) {
        const a = (i / GILLS) * Math.PI * 2;
        g.lineStyle(1.5, i < (pressed % (GILLS + 1)) ? CAP_VIOLET_LIT : 0x554466, 1);
        g.lineBetween(x + 134, y + 6, x + 134 + Math.cos(a) * 8, y + 6 + Math.sin(a) * 8);
      }
      if (turns > 0) { g.fillStyle(SPOT, 0.8); g.fillCircle(x + 134, y + 6, 2); }
      if (lateFight()) { g.lineStyle(1.5, SPOT, 0.9); g.strokeCircle(x + 134, y + 6, 10); }
    },

    destroy() { removeStem(); },
  };
}

/** A wet spore print on the peat: ink spokes with a lilac sheen, a solid hub, drying at the rim. */
function printStar(g: G, x: number, y: number, rot: number, k: number, seed: number): void {
  const step = (Math.PI * 2) / GILLS;
  for (let i = 0; i < GILLS; i++) {
    const a = rot + i * step;
    const ex = x + Math.cos(a) * RADIUS, ey = y + Math.sin(a) * RADIUS;
    g.lineStyle(LINE * 1.6, INK, 0.55 * k); g.lineBetween(x, y, ex, ey);
    g.lineStyle(3, INK_SHEEN, 0.5 * k); g.lineBetween(x + Math.cos(a) * HUB, y + Math.sin(a) * HUB, ex, ey);
    // Spore dust feathered off each gill, a few grains.
    for (let j = 1; j < 6; j++) {
      const r = HUB + j * (RADIUS - HUB) / 6;
      const s = Math.sin(seed * 0.01 + i * 3.1 + j) * 7;
      g.fillStyle(INK, 0.4 * k); g.fillCircle(x + Math.cos(a) * r - Math.sin(a) * s, y + Math.sin(a) * r + Math.cos(a) * s, 1.6);
    }
  }
  g.fillStyle(INK, 0.75 * k); g.fillCircle(x, y, HUB);
  g.fillStyle(INK_SHEEN, 0.35 * k); g.fillCircle(x - 8, y - 8, HUB * 0.4);
}

/**
 * A parasol mushroom's cap from above, hovering: brown scales in rings on a pale dome, a dark umbo
 * at the middle, and the gill edge showing as a fringe round the rim. Drawn translucent so the
 * print beneath reads through it.
 */
function parasol(g: G, x: number, y: number, r: number, rot: number, a: number, time: number): void {
  glow(g, x, y, r * 1.1, CAP_VIOLET, 0.04, 3);
  g.fillStyle(dim(STEM, 0.15), a); g.fillCircle(x, y, r);
  g.fillStyle(STEM, a * 0.8); g.fillCircle(x - r * 0.08, y - r * 0.08, r * 0.9);
  // Rings of scales, each scale a little tilted chip.
  for (let ring = 1; ring <= 4; ring++) {
    const rr = r * (0.2 + ring * 0.18);
    const n = 6 + ring * 5;
    for (let i = 0; i < n; i++) {
      const ang = rot + (i / n) * Math.PI * 2 + ring * 0.4 + Math.sin(time / 900 + ring) * 0.02;
      const sx = x + Math.cos(ang) * rr, sy = y + Math.sin(ang) * rr;
      g.fillStyle(0x6b4a30, a * (1.1 - ring * 0.15)); g.fillEllipse(sx, sy, 9 - ring, 5 - ring * 0.6);
    }
  }
  g.fillStyle(0x4a2f1e, a * 1.4); g.fillCircle(x, y, r * 0.14);
  g.fillStyle(lit(0x4a2f1e, 0.3), a); g.fillCircle(x - r * 0.04, y - r * 0.04, r * 0.06);
  // The gill fringe peeking under the rim, one tooth per gill.
  for (let i = 0; i < GILLS * 3; i++) {
    const ang = rot + (i / (GILLS * 3)) * Math.PI * 2;
    g.fillStyle(i % 3 === 0 ? CAP_VIOLET : GILL, a);
    g.fillCircle(x + Math.cos(ang) * r, y + Math.sin(ang) * r, i % 3 === 0 ? 4 : 2.5);
  }
}

export const FALLEN_SPORE_PRINT: GimmickDef = {
  id: ID,
  rules: 'A great cap prints its gills on the floor: stand in the gaps. Strike its stem to turn it half a gill. Past halfway it prints twice.',
  make,
};

import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, glow, lit, mixC, mulberry, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { FELT_OAT, FELT_OAT_DARK, FELT_PLUM_DARK, IRON, IRON_LIT, SNOW_LIT, TIMBER, TIMBER_DARK, TIMBER_LIT } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Felted In — Hamnet Waulk, Master Fuller.
 *
 * In the star's telling the fulling mill beats more than wool. Every felt that pads a Quiet House
 * door was a wet fleece once, laid out in the yard and pounded by the silent stocks until it shrank
 * into something dense enough to stop a voice — and Hamnet Waulk lays the fleeces where people stand.
 *
 * Three sodden fleeces lie in the yard. **Wool is soft: on a fleece you take less from every blow**,
 * though the wet drags at your feet. But the stocks follow a blow: **whoever is struck while standing
 * on a fleece calls the stocks to it**. The mallet's shadow gathers over that fleece and it is beaten
 * — everyone on it struck and held a moment, and the fleece **shrinks**, dragging whoever is still on
 * it in toward its middle. The **third** beating fulls it: whoever is on it then is pressed into the
 * felt, struck hard and held long, and the finished felt is rolled away and a fresh fleece laid.
 *
 * So the soft wool is a trap you set with your own hands: let Waulk shelter on a fleece, then hit
 * him there. Past half, a second stock is engaged and two fleeces can be beaten at once.
 */

const SLUG = 'felted';
const WARN = 1300;
const BEAT_DMG = 11;
const FULL_DMG = 20;
const BEAT_ROOT = 700;
const FULL_ROOT = 1500;
const SHRINK = 0.78;
const SOFT = 0.75;
const SODDEN = 0.82;
const IDLE_MS = 6500;
const ROLL_MS = 1400;
const RELAY_MS = 3400;
const W0 = 200;
const H0 = 128;

interface Fleece {
  x: number; y: number; w: number; h: number;
  beats: number;
  /** When the stocks were called to it (-1 = idle) and when they fall. */
  callAt: number; beatAt: number;
  /** When it was fulled (-1 = still wool); it rolls away and is re-laid. */
  fulledAt: number;
  laid: boolean; layAt: number; laidAt: number;
  seed: number;
  /** Last beating, for the splash. */
  splashAt: number;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const SPOTS: Pt[] = [
    { x: 200, y: top + 140 }, { x: 480, y: top + 120 }, { x: 760, y: top + 150 },
    { x: 220, y: H - 120 }, { x: 490, y: H - 150 }, { x: 760, y: H - 120 },
  ];
  const fleeces: Fleece[] = [0, 4, 2].map((i, k) => ({
    x: SPOTS[i].x, y: SPOTS[i].y, w: W0, h: H0, beats: 0, callAt: -1, beatAt: 0, fulledAt: -1,
    laid: true, layAt: 0, laidAt: -9999, seed: 11 + k * 37, splashAt: -9999,
  }));
  let maxStocks = 1;
  let half = false;
  let lastBeat = 0;
  let started = false;
  /** Set while our own blows land, so they do not call the stocks again. */
  let selfHit = false;

  const on = (f: Fleece, fi: Fighter): boolean => {
    if (!f.laid || f.fulledAt >= 0 || !alive(fi)) return false;
    const dx = (fi.x - f.x) / (f.w / 2), dy = (fi.y - f.y) / (f.h / 2);
    return dx * dx + dy * dy <= 1;
  };
  const under = (fi: Fighter): Fleece | null => fleeces.find((f) => on(f, fi)) ?? null;
  const calledCount = (): number => fleeces.filter((f) => f.callAt >= 0).length;

  function hit(fi: Fighter, amount: number): void {
    selfHit = true;
    try { ctx.hit(fi, amount, fi.x, fi.y); } finally { selfHit = false; }
  }

  function call(f: Fleece, time: number): void {
    if (f.callAt >= 0 || f.fulledAt >= 0 || !f.laid || calledCount() >= maxStocks) return;
    f.callAt = time;
    f.beatAt = time + WARN;
    ctx.sfx('gear-turn');
  }

  function beat(f: Fleece, time: number): void {
    f.callAt = -1;
    f.beats++;
    f.splashAt = time;
    lastBeat = time;
    const caught = [player, npc].filter((fi) => on(f, fi));
    ctx.sfx('stone-slam');
    ctx.sfx('splash');
    if (f.beats >= 3) {
      for (const fi of caught) {
        hit(fi, FULL_DMG);
        ctx.root(fi, FULL_ROOT);
        ctx.float(fi.x, fi.y - 52, 'FULLED', '#e8d8b0');
      }
      f.fulledAt = time;
      ctx.banner('FULLED — THE FELT IS ROLLED AWAY', '#e8d8b0');
      return;
    }
    for (const fi of caught) {
      hit(fi, BEAT_DMG);
      ctx.root(fi, BEAT_ROOT);
      // The fleece shrinks round its middle and drags its load in with it.
      ctx.nudge(fi, (f.x - fi.x) * (1 - SHRINK), (f.y - fi.y) * (1 - SHRINK));
      ctx.float(fi.x, fi.y - 50, 'BEATEN', '#d8c8a0');
    }
    f.w *= SHRINK;
    f.h *= SHRINK;
  }

  /** A fresh spot for a new fleece: the free one farthest from both fighters. */
  function freshSpot(skip: Fleece): Pt {
    let best = SPOTS[0], bestD = -1;
    for (const s of SPOTS) {
      if (fleeces.some((o) => o !== skip && o.laid && dist(o.x, o.y, s.x, s.y) < 160)) continue;
      const d = Math.min(dist(s.x, s.y, player.x, player.y), dist(s.x, s.y, npc.x, npc.y));
      if (d > bestD) { bestD = d; best = s; }
    }
    return best;
  }

  return {
    update(time, dtRaw) {
      stepDt(dtRaw);
      if (!started) { started = true; lastBeat = time; }
      if (!half && npc.hp < npc.maxHp * 0.5) {
        half = true;
        maxStocks = 2;
        ctx.banner('THE SECOND STOCK IS ENGAGED', '#e8d8b0');
      }
      for (const f of fleeces) {
        if (f.callAt >= 0 && time >= f.beatAt) beat(f, time);
        if (f.fulledAt >= 0 && f.laid && time - f.fulledAt > ROLL_MS) { f.laid = false; f.layAt = time + RELAY_MS; }
        if (!f.laid && time >= f.layAt) {
          const s = freshSpot(f);
          Object.assign(f, { x: s.x, y: s.y, w: W0, h: H0, beats: 0, fulledAt: -1, laid: true, laidAt: time, callAt: -1 });
        }
      }
      // A quiet yard is not allowed for long: the stocks find whoever is on the wool.
      if (calledCount() === 0 && time - lastBeat > IDLE_MS) {
        const pick = under(player) ?? under(npc)
          ?? fleeces.filter((f) => f.laid && f.fulledAt < 0).sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
        if (pick) call(pick, time); else lastBeat = time;
      }
    },

    onPlayerHurt() { if (!selfHit) { const f = under(player); if (f) call(f, ctx.scene.time.now); } },
    onNpcHurt() { if (!selfHit) { const f = under(npc); if (f) call(f, ctx.scene.time.now); } },

    playerTakenMult: () => (under(player) ? SOFT : 1),
    npcTakenMult: () => (under(npc) ? SOFT : 1),
    playerSpeedMult: () => (under(player) ? SODDEN : 1),
    npcSpeedMult: () => (under(npc) ? SODDEN : 1),

    npcSeek() {
      if (!alive(npc)) return null;
      const mine = under(npc);
      if (mine && mine.callAt >= 0) {
        // The stocks are coming: walk straight out of the wool.
        const a = Math.atan2(npc.y - mine.y, npc.x - mine.x);
        return { x: clamp(mine.x + Math.cos(a) * (mine.w / 2 + 60), 60, W - 60), y: clamp(mine.y + Math.sin(a) * (mine.h / 2 + 60), top + 50, H - 40) };
      }
      const yours = under(player);
      if (yours && yours.callAt < 0) return null; // you are on the wool: hit you there
      // Otherwise shelter on the nearest idle fleece, on the side toward you.
      const idle = fleeces.filter((f) => f.laid && f.fulledAt < 0 && f.callAt < 0)
        .sort((a, b) => dist(a.x, a.y, npc.x, npc.y) - dist(b.x, b.y, npc.x, npc.y))[0];
      if (!idle || dist(idle.x, idle.y, npc.x, npc.y) > 420) return null;
      const a = Math.atan2(player.y - idle.y, player.x - idle.x);
      return { x: idle.x + Math.cos(a) * idle.w * 0.2, y: idle.y + Math.sin(a) * idle.h * 0.2 };
    },

    drawGround(g, time) {
      for (const f of fleeces) {
        if (!f.laid) continue;
        const rng = mulberry(f.seed);
        const dense = f.beats / 3;
        // Rolled up after fulling: the felt is a fat bolt shrinking toward its end.
        if (f.fulledAt >= 0) {
          const k = clamp((time - f.fulledAt) / ROLL_MS, 0, 1);
          const w = f.w * (1 - k * 0.85);
          shadow(g, f.x + f.w / 2 - w / 2, f.y + 8, w + 10, 14);
          g.fillStyle(dim(FELT_OAT, 0.35), 1); g.fillRoundedRect(f.x + f.w / 2 - w, f.y - 12, w, 24, 10);
          g.fillStyle(FELT_OAT_DARK, 1); g.fillRoundedRect(f.x + f.w / 2 - w, f.y - 12, w, 10, 6);
          g.fillStyle(dim(FELT_OAT, 0.15), 1); g.fillEllipse(f.x + f.w / 2 - w, f.y, 16, 26);
          g.lineStyle(1.5, FELT_PLUM_DARK, 0.6); g.strokeEllipse(f.x + f.w / 2 - w, f.y, 10, 18);
          continue;
        }
        const grow = clamp((time - f.laidAt) / 500, 0, 1);
        const w = f.w * (0.6 + grow * 0.4), h = f.h * (0.6 + grow * 0.4);
        // A dark wet stain spreading on the snow, then the fleece on it.
        g.fillStyle(0x3a3a44, 0.22); g.fillEllipse(f.x + 4, f.y + 6, w + 26, h + 20);
        const base = mixC(0x9a8c70, 0x7a6a52, dense);
        g.fillStyle(dim(base, 0.25), 1); g.fillEllipse(f.x, f.y + 3, w, h);
        g.fillStyle(base, 1); g.fillEllipse(f.x, f.y, w - 6, h - 6);
        // Locks of wool: fat and curly while raw, flattened and matted as it is beaten.
        const locks = Math.round(46 - dense * 24);
        for (let i = 0; i < locks; i++) {
          const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * 0.88;
          const lx = f.x + Math.cos(a) * rr * (w / 2 - 8), ly = f.y + Math.sin(a) * rr * (h / 2 - 6);
          const s = (5 + rng() * 6) * (1 - dense * 0.45);
          const c = mixC(FELT_OAT, 0xe8dcc0, rng() * 0.6) ;
          g.fillStyle(dim(c, 0.3 + dense * 0.2), 1); g.fillCircle(lx + 1, ly + 1.5, s);
          g.fillStyle(dim(c, dense * 0.25), 1); g.fillCircle(lx, ly, s);
          if (dense < 0.5) {
            g.lineStyle(1, lit(c, 0.3), 0.7);
            g.beginPath(); g.arc(lx, ly, s * 0.55, rng() * 3, rng() * 3 + 3.2, false); g.strokePath();
          }
        }
        // Wet sheen streaks, and soap suds round the rim.
        g.fillStyle(0xffffff, 0.12); g.fillEllipse(f.x - w * 0.18, f.y - h * 0.22, w * 0.42, h * 0.12);
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + f.seed;
          g.fillStyle(SNOW_LIT, 0.55); g.fillCircle(f.x + Math.cos(a) * w / 2, f.y + Math.sin(a) * h / 2, 2 + ((i * 7) % 3));
        }
        // Beaten felt gets a stitched, squared edge.
        if (f.beats > 0) {
          g.lineStyle(1.5, FELT_PLUM_DARK, 0.35 * f.beats);
          for (let i = 0; i < 24; i += 2) {
            const a0 = (i / 24) * Math.PI * 2, a1 = ((i + 1) / 24) * Math.PI * 2;
            g.lineBetween(f.x + Math.cos(a0) * (w / 2 - 5), f.y + Math.sin(a0) * (h / 2 - 4), f.x + Math.cos(a1) * (w / 2 - 5), f.y + Math.sin(a1) * (h / 2 - 4));
          }
        }
        // Three tally notches chalked beside it: how many beatings it has taken.
        for (let i = 0; i < 3; i++) {
          const nx = f.x - 16 + i * 16, ny = f.y + h / 2 + 12;
          g.fillStyle(i < f.beats ? 0xe8d8b0 : 0x000000, i < f.beats ? 0.9 : 0.25); g.fillRect(nx - 2, ny - 6, 4, 12);
        }
        // Called: the stock's shadow gathering in the middle, and a gold warning rim.
        if (f.callAt >= 0) {
          const k = clamp((time - f.callAt) / WARN, 0, 1);
          g.fillStyle(0x000000, 0.12 + k * 0.32); g.fillEllipse(f.x, f.y, 40 + k * 90, 16 + k * 40);
          g.lineStyle(3, 0xffd88a, 0.35 + Math.sin(time / 70) * 0.25 * k); g.strokeEllipse(f.x, f.y, w + 8, h + 8);
          if (f.beats === 2) { g.lineStyle(2, 0xff9a5a, 0.5 + k * 0.4); g.strokeEllipse(f.x, f.y, w + 18, h + 18); }
        }
        // Just beaten: water thrown out of the wool in a ring.
        const sk = (time - f.splashAt) / 520;
        if (sk >= 0 && sk < 1) {
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const r = 0.5 + sk * 0.75;
            g.fillStyle(0xdfe8f2, 0.8 * (1 - sk)); g.fillCircle(f.x + Math.cos(a) * w * r, f.y + Math.sin(a) * h * r - Math.sin(sk * Math.PI) * 14, 3);
          }
        }
      }
    },

    drawAir(g, time) {
      for (const f of fleeces) {
        if (!f.laid || f.fulledAt >= 0) continue;
        // Steam off the warm wet wool.
        for (let i = 0; i < 3; i++) {
          const p = ((time / 1800 + i / 3 + f.seed * 0.1) % 1);
          g.fillStyle(0xffffff, 0.12 * (1 - p)); g.fillCircle(f.x - 40 + i * 40 + Math.sin(time / 500 + i) * 6, f.y - 8 - p * 46, 8 + p * 10);
        }
        if (f.callAt < 0 && time - f.splashAt > 260) continue;
        // The fulling stock: a great wooden mallet with a stepped toe, swung down from the dark.
        const k = f.callAt >= 0 ? clamp((time - f.callAt) / WARN, 0, 1) : 1;
        const lift = f.callAt >= 0 ? Math.pow(1 - k, 0.6) : 0;
        const hx = f.x, hy = f.y - 18 - lift * 150;
        const px = f.x - 120, py = top - 20;
        g.lineStyle(10, TIMBER_DARK, 1); g.lineBetween(px, py, hx - 20, hy - 30);
        g.lineStyle(4, TIMBER_LIT, 0.5); g.lineBetween(px + 2, py - 2, hx - 18, hy - 33);
        g.fillStyle(dim(TIMBER, 0.3), 1); g.fillRoundedRect(hx - 46, hy - 40, 92, 40, 6);
        g.fillStyle(TIMBER, 1); g.fillRoundedRect(hx - 44, hy - 42, 88, 36, 6);
        // The stepped toe that turns the cloth as it falls.
        g.fillStyle(TIMBER_DARK, 1);
        g.fillPoints([new Phaser.Geom.Point(hx - 44, hy - 6), new Phaser.Geom.Point(hx - 20, hy - 6), new Phaser.Geom.Point(hx - 20, hy + 2),
          new Phaser.Geom.Point(hx + 4, hy + 2), new Phaser.Geom.Point(hx + 4, hy + 8), new Phaser.Geom.Point(hx + 44, hy + 8), new Phaser.Geom.Point(hx + 44, hy - 6)], true);
        g.fillStyle(IRON, 1); g.fillRect(hx - 44, hy - 30, 88, 5); g.fillRect(hx - 44, hy - 16, 88, 4);
        g.fillStyle(IRON_LIT, 1); for (const bx of [-36, -12, 12, 36]) g.fillCircle(hx + bx, hy - 28, 1.6);
        g.lineStyle(1, TIMBER_LIT, 0.6); for (let i = 0; i < 4; i++) g.lineBetween(hx - 40, hy - 38 + i * 7, hx + 40, hy - 37 + i * 7);
        if (f.callAt >= 0 && k > 0.7) glow(g, hx, hy, 50, 0xffd88a, 0.05, 3);
      }
    },

    drawHud(g, time) {
      // Three fleeces along the top: how beaten each is, and a mallet over any that is called.
      const x0 = 24, y = top + 16;
      g.fillStyle(0x000000, 0.42); g.fillRoundedRect(x0 - 8, y - 12, 150, 26, 8);
      fleeces.forEach((f, i) => {
        const cx = x0 + 18 + i * 46;
        g.fillStyle(f.laid && f.fulledAt < 0 ? mixC(0xd8c8a0, 0x7a6a52, f.beats / 3) : 0x444444, 1); g.fillEllipse(cx, y + 1, 30, 16);
        for (let b = 0; b < 3; b++) { g.fillStyle(b < f.beats ? 0xe8d8b0 : 0x222222, 1); g.fillRect(cx - 9 + b * 7, y + 10, 5, 3); }
        if (f.callAt >= 0) {
          const k = clamp((time - f.callAt) / WARN, 0, 1);
          g.fillStyle(TIMBER, 1); g.fillRect(cx - 8, y - 12 + k * 6, 16, 7);
        }
      });
    },
  };
}

export const FALLEN_FELTED: GimmickDef = {
  id: fallenId('hush', SLUG),
  rules: 'Fleece is soft. Hit anyone on a fleece and the stocks beat it: struck, held, it shrinks inward. The third beating fulls all on it.',
  make,
};

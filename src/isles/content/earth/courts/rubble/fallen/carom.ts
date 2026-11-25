import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { mosaicChip } from './fallenArt';
import { shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { ashlar, regentSeal } from '../art';
import { CHALK, DUST, DUST_DARK, DUST_LIT, IRON, IRON_LIT, LIME, LIME_DARK, LIME_LIT, SEAL } from '../palette';
import { alive, dist, stepDt } from '../util';

/**
 * Ashlar Carom — Shifter Theodric Farrant, the gang-boss who moved the capital's dressed stone for the
 * Regent: every block of the old Exchange went down the hill on his rollers to be built into the
 * Sepulchre. In the King's telling he could move a ton of stone with a crowbar and one look.
 *
 * Great cut blocks stand on the mosaic. They are cover — shots stop on them — but strike one and it
 * skids away from whoever struck it, fast, until the dust stops it. A sliding block crushes whoever
 * it meets and knocks on any block it runs into: the struck block takes its speed, like a cue ball.
 * Every few seconds Theodric sets his bar to a block, chalks an arrow on it at you, and drives it.
 *
 * The rule is all geometry: a block between you and him is a shot you have lined up. Shoot it and it
 * goes at him; run one into another to bank it round. Halfway down the Regent's mortar sets: any block
 * that comes to rest is sealed where it stands — a fixed bumper that blocks bounce off — until the
 * yard is half bumpers. The bot stands behind blocks on its line to you, so its own casts drive them,
 * and steps out of the path of anything sliding at it.
 */

const ID = fallenId('rubble', 'carom');
const HALF = 22;
const SPEED = 600;
const DECEL = 470;
const DRIVE_EVERY = 3600;
const CHALK_MS = 850;
const MAX_SEALED = 4;

interface Block {
  x: number; y: number; vx: number; vy: number;
  sealed: boolean;
  moved: boolean;
  target: StrikeTarget;
  struckAt: number;
  /** Theodric's chalked aim, while it shows. */
  aim: { x: number; y: number; at: number } | null;
  hitAt: Map<Fighter, number>;
  seed: number;
}

const SPOTS: [number, number][] = [[250, 220], [480, 200], [720, 230], [330, 400], [630, 390], [220, 560], [480, 540], [740, 560]];

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, tk } = ctx;
  const blocks: Block[] = [];
  let started = false;
  let nextDrive = 0;
  let setting = false;
  let sealedCount = 0;

  const speed = (b: Block) => Math.hypot(b.vx, b.vy);

  function launch(b: Block, dx: number, dy: number): void {
    const l = Math.hypot(dx, dy) || 1;
    b.vx = (dx / l) * SPEED; b.vy = (dy / l) * SPEED;
    b.moved = true;
    ctx.sfx('stone-slam');
  }

  function addBlock(x: number, y: number, seed: number): void {
    const b: Block = {
      x, y, vx: 0, vy: 0, sealed: false, moved: false, struckAt: -1e9, aim: null, hitAt: new Map(), seed,
      target: ctx.target({
        x, y: y - 10, r: 26,
        onStruck: (by) => {
          if (b.sealed || tk.now - b.struckAt < 260) return;
          b.struckAt = tk.now;
          const f = by === 'player' ? player : npc;
          b.aim = null;
          launch(b, b.x - f.x, b.y - f.y);
        },
      }),
    };
    blocks.push(b);
  }

  function crush(b: Block, f: Fighter, time: number): void {
    const last = b.hitAt.get(f) ?? -1e9;
    if (time - last < 700) return;
    b.hitAt.set(f, time);
    const s = speed(b) || 1;
    if (f === player) tk.hitPlayer(18, f.x, f.y);
    else { ctx.hit(npc, 28, f.x, f.y); ctx.float(npc.x, npc.y - 56, 'CAROM', '#f0e2c0'); }
    ctx.nudge(f, (b.vx / s) * 46, (b.vy / s) * 46);
    ctx.sfx('hit-heavy');
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        SPOTS.forEach(([x, y], i) => addBlock(x, y, i * 1.7));
        nextDrive = time + 2600;
      }
      if (!setting && npc.hp < npc.maxHp * 0.5) { setting = true; ctx.banner('THE MORTAR SETS', '#c8564a'); ctx.sfx('curse-cast'); }

      // Theodric drives a block at you: the loose one best lined up between you.
      if (time >= nextDrive && alive(npc) && alive(player)) {
        nextDrive = time + DRIVE_EVERY;
        let best: Block | null = null, bs = Infinity;
        for (const b of blocks) {
          if (b.sealed || speed(b) > 0 || b.aim) continue;
          const dp = dist(b.x, b.y, player.x, player.y);
          if (dp < 150) continue;
          const sc = dist(b.x, b.y, npc.x, npc.y) * 0.6 + dp * 0.4;
          if (sc < bs) { bs = sc; best = b; }
        }
        if (best) { best.aim = { x: player.x, y: player.y, at: time + tk.warn(CHALK_MS) }; ctx.sfx('clang'); }
      }

      for (const b of blocks) {
        if (b.aim && time >= b.aim.at) { const a = b.aim; b.aim = null; launch(b, a.x - b.x, a.y - b.y); }
        const s = speed(b);
        if (s <= 0) continue;
        b.x += b.vx * dt; b.y += b.vy * dt;
        // The arena's edge is a cushion.
        if (b.x < 40 + HALF) { b.x = 40 + HALF; b.vx = Math.abs(b.vx) * 0.7; ctx.sfx('land'); }
        if (b.x > W - 40 - HALF) { b.x = W - 40 - HALF; b.vx = -Math.abs(b.vx) * 0.7; ctx.sfx('land'); }
        if (b.y < top + 30 + HALF) { b.y = top + 30 + HALF; b.vy = Math.abs(b.vy) * 0.7; ctx.sfx('land'); }
        if (b.y > H - 30) { b.y = H - 30; b.vy = -Math.abs(b.vy) * 0.7; ctx.sfx('land'); }
        // Knock on: the struck block takes the speed along the line of centres.
        for (const o of blocks) {
          if (o === b) continue;
          const d = dist(b.x, b.y, o.x, o.y);
          if (d >= HALF * 2 || d < 0.01) continue;
          const nx = (o.x - b.x) / d, ny = (o.y - b.y) / d;
          const vn = b.vx * nx + b.vy * ny;
          if (vn <= 0) continue;
          if (o.sealed) { b.vx -= 2 * vn * nx * 0.85; b.vy -= 2 * vn * ny * 0.85; }
          else { o.vx += vn * nx * 0.95; o.vy += vn * ny * 0.95; o.moved = true; o.aim = null; b.vx -= vn * nx; b.vy -= vn * ny; }
          const push = HALF * 2 - d;
          b.x -= nx * push; b.y -= ny * push;
          ctx.sfx('clang');
        }
        if (s > 150) for (const f of [player, npc]) if (alive(f) && !ctx.isAirborne(f) && dist(b.x, b.y - 8, f.x, f.y) < HALF + 22) crush(b, f, time);
        const ns = Math.max(0, speed(b) - DECEL * dt);
        if (ns <= 0) {
          b.vx = 0; b.vy = 0;
          if (setting && b.moved && sealedCount < MAX_SEALED) { b.sealed = true; sealedCount++; ctx.sfx('stone-rise'); }
          b.moved = false;
        } else { const k = ns / speed(b); b.vx *= k; b.vy *= k; }
        b.target.moveTo(b.x, b.y - 10);
      }

      // Resting blocks are solid.
      for (const b of blocks) {
        if (speed(b) > 0) continue;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const d = dist(b.x, b.y - 4, f.x, f.y);
          if (d < HALF + 16 && d > 0.01) { const k = (HALF + 16 - d) / d; ctx.nudge(f, (f.x - b.x) * k, (f.y - b.y + 4) * k); }
        }
      }
    },

    npcSeek() {
      if (!alive(player)) return null;
      // Out of the path of anything sliding at him.
      for (const b of blocks) {
        const s = speed(b);
        if (s < 120 && !b.aim) continue;
        const ux = b.aim ? b.aim.x - b.x : b.vx, uy = b.aim ? b.aim.y - b.y : b.vy;
        const l = Math.hypot(ux, uy) || 1;
        const rx = npc.x - b.x, ry = npc.y - b.y;
        const ahead = (rx * ux + ry * uy) / l;
        const across = (rx * -uy + ry * ux) / l;
        if (ahead > 0 && ahead < 420 && Math.abs(across) < 60) {
          const sg = across >= 0 ? 1 : -1;
          return { x: tk.clampX(npc.x + (-uy / l) * sg * 90), y: tk.clampY(npc.y + (ux / l) * sg * 90) };
        }
      }
      // Behind a loose block on his line to you: his casts drive it.
      let best: { x: number; y: number } | null = null, bs = Infinity;
      for (const b of blocks) {
        if (b.sealed || speed(b) > 0) continue;
        const dp = dist(b.x, b.y, player.x, player.y);
        if (dp < 120 || dp > 420) continue;
        const ux = (b.x - player.x) / dp, uy = (b.y - player.y) / dp;
        const x = tk.clampX(b.x + ux * 66), y = tk.clampY(b.y + uy * 66);
        const sc = dist(npc.x, npc.y, x, y);
        if (sc < bs) { bs = sc; best = { x, y }; }
      }
      return best;
    },

    drawGround(g, time) {
      for (const b of blocks) {
        // Scrape marks behind a sliding block.
        const s = speed(b);
        if (s > 0) {
          const ux = b.vx / s, uy = b.vy / s;
          for (let i = -1; i <= 1; i++) {
            g.lineStyle(2, DUST_DARK, 0.5);
            g.lineBetween(b.x - uy * i * 12, b.y + ux * i * 12, b.x - ux * 70 - uy * i * 12, b.y - uy * 70 + ux * i * 12);
          }
        }
        if (b.aim) drawChalkArrow(g, b, time);
        if (!b.sealed && s === 0) mosaicChip(g, b.x, b.y + 6, b.seed);
      }
    },

    drawAir(g, time) {
      const order = [...blocks].sort((a, c) => a.y - c.y);
      for (const b of order) drawBlock(g, b, time, speed(b));
    },

    drawHud(g) {
      // Pips: loose blocks in honey stone, sealed ones in the Regent's red.
      const n = blocks.length, x0 = W / 2 - (n * 16) / 2, y = top + 18;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 8, y - 12, n * 16 + 16, 24, 6);
      blocks.forEach((b, i) => {
        const x = x0 + i * 16 + 8;
        g.fillStyle(b.sealed ? SEAL : speed(b) > 0 ? LIME_LIT : LIME, 1); g.fillRect(x - 6, y - 6, 12, 12);
        g.lineStyle(1, LIME_DARK, 1); g.strokeRect(x - 6, y - 6, 12, 12);
      });
    },

    destroy() { for (const b of blocks) b.target.remove(); },
  };
}

/** Theodric's chalk: an arrow scrawled on the floor from the block toward where you stood, and his bar. */
function drawChalkArrow(g: G, b: Block, time: number): void {
  if (!b.aim) return;
  const dx = b.aim.x - b.x, dy = b.aim.y - b.y, l = Math.hypot(dx, dy) || 1;
  const ux = dx / l, uy = dy / l, len = Math.min(l + 60, 520);
  g.fillStyle(CHALK, 0.08); g.fillPoints([
    { x: b.x - uy * HALF, y: b.y + ux * HALF }, { x: b.x + ux * len - uy * HALF, y: b.y + uy * len + ux * HALF },
    { x: b.x + ux * len + uy * HALF, y: b.y + uy * len - ux * HALF }, { x: b.x + uy * HALF, y: b.y - ux * HALF },
  ], true);
  g.lineStyle(3, CHALK, 0.8);
  for (let s = HALF + 6; s < len - 20; s += 28) g.lineBetween(b.x + ux * s, b.y + uy * s, b.x + ux * (s + 16), b.y + uy * (s + 16));
  const tx = b.x + ux * len, ty = b.y + uy * len;
  g.fillStyle(CHALK, 0.9);
  g.fillTriangle(tx, ty, tx - ux * 18 - uy * 10, ty - uy * 18 + ux * 10, tx - ux * 18 + uy * 10, ty - uy * 18 - ux * 10);
  // The crowbar under its back edge, levering.
  const bx = b.x - ux * (HALF + 4), by = b.y - uy * (HALF + 4);
  const lift = Math.sin(time / 60) * 3;
  g.lineStyle(5, IRON, 1); g.lineBetween(bx, by, bx - ux * 46 - uy * 6, by - uy * 46 + ux * 6 - 18 - lift);
  g.lineStyle(2, IRON_LIT, 1); g.lineBetween(bx, by - 1, bx - ux * 46 - uy * 6, by - uy * 46 + ux * 6 - 19 - lift);
}

/** A dressed block of the old Exchange: two courses of ashlar, a lewis-hole on top, mortar if sealed. */
function drawBlock(g: G, b: Block, time: number, s: number): void {
  const shake = b.aim ? Math.sin(time / 25 + b.seed) * 1.5 : 0;
  shadow(g, b.x, b.y + 2, HALF * 2.4, 12, 0.35);
  if (s > 0) for (let i = 0; i < 4; i++) {
    const ph = ((time / 200) + i * 0.25) % 1;
    g.fillStyle(DUST, 0.5 * (1 - ph)); g.fillCircle(b.x - (b.vx / s) * (20 + ph * 50) + (i - 1.5) * 8, b.y - ph * 14, 6 + ph * 10);
  }
  const x = b.x + shake;
  ashlar(g, x, b.y, HALF * 2, 22, LIME_DARK);
  ashlar(g, x, b.y - 22, HALF * 2, 22, LIME);
  g.fillStyle(LIME_LIT, 1); g.fillRect(x - HALF, b.y - 48, HALF * 2 - 2, 6);
  // The lewis-hole the cranes lifted it by.
  g.fillStyle(0x2a2218, 1); g.fillRect(x - 5, b.y - 47, 10, 4);
  // A mason's banker-mark on its face.
  g.lineStyle(1.5, LIME_DARK, 1);
  const mx = x - 8, my = b.y - 32;
  if (((b.seed * 3) | 0) % 2) { g.strokeTriangle(mx - 5, my + 5, mx + 5, my + 5, mx, my - 5); }
  else { g.lineBetween(mx - 5, my - 5, mx + 5, my + 5); g.lineBetween(mx + 5, my - 5, mx - 5, my + 5); }
  g.lineStyle(1, DUST_LIT, 0.6); g.lineBetween(x - HALF + 2, b.y - 22, x + HALF - 4, b.y - 22);
  if (b.sealed) {
    g.fillStyle(SEAL, 0.55); g.fillRect(x - HALF, b.y - 4, HALF * 2, 6);
    regentSeal(g, x + 6, b.y - 30, 9);
  }
}

export const FALLEN_CAROM: GimmickDef = {
  id: ID,
  rules: 'Strike a block and it skids away from you, crushing whoever it meets and knocking on the next. Line one up on him. At half, stopped blocks are sealed.',
  make,
};

import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, FOE_C, HOT_LIT, IRON, IRON_DARK, IRON_LIT, MINE_C, REDLINE, RIVET,
  clamp, dist, frameClock, inRect, rivets,
} from '../util';

/**
 * Bunk Count — Warden Agathe Slatter keeps the company bunkhouse, and in the King's telling she
 * counts heads at lights-out and hands the empty cots' names to the overseer.
 *
 * The room has four cots. A bell warns, then the lamps go out. Anyone lying on a lit cot when the
 * dark comes is **counted**: held down asleep (a real root) while a little health comes back.
 * Anyone else is **AWOL**, and the warden's lantern — a pool of light that hunts AWOL fighters at
 * a little under walking pace — burns whoever it finds. So each count is a wager: sleep safe but
 * pinned in place where your foe can reach you, or stay up and outwalk the lantern. Past half, two
 * lanterns search, and only the two cots with their blankets turned down will count you.
 */

const ID = fallenId('boilerworks', 'bunk-count');
const DAY_MS = 7600;
const WARN_MS = 2400;
const DARK_MS = 4600;
const SLEEP_MS = 2300;

type Phase = 'day' | 'warn' | 'dark';
interface Lantern { x: number; y: number; nextTick: number }

function makeBunkCount(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top } = ctx;
  const tick = frameClock();
  const cw = 104, ch = 50;
  const cots: Rect[] = [
    { x: 120, y: top + 70 }, { x: W - 120, y: top + 70 }, { x: 120, y: H - 80 }, { x: W - 120, y: H - 80 },
  ].map((c) => ({ x: c.x - cw / 2, y: c.y - ch / 2, w: cw, h: ch }));
  const door: Pt = { x: W / 2, y: H - 14 };

  let phase: Phase = 'day';
  let phaseEnd = ctx.scene.time.now + DAY_MS - 2000;
  let double = false;
  let open = [true, true, true, true];
  let lanterns: Lantern[] = [];
  const counted = { player: false, npc: false };

  const alive = (f: Fighter): boolean => f.active && f.hp > 0;
  const onCot = (f: Fighter): number => cots.findIndex((c, i) => open[i] && inRect(f.x, f.y, { x: c.x - 8, y: c.y - 8, w: c.w + 16, h: c.h + 16 }));
  const awol = (): Fighter[] => [
    ...(counted.player || !alive(ctx.player) ? [] : [ctx.player]),
    ...(counted.npc || !alive(ctx.npc) ? [] : [ctx.npc]),
  ];

  const startWarn = (time: number): void => {
    phase = 'warn'; phaseEnd = time + WARN_MS;
    if (double) {
      // Two cots turned down, chosen fresh each night.
      const a = Math.floor(ctx.rng() * 4);
      const b = (a + 1 + Math.floor(ctx.rng() * 3)) % 4;
      open = [0, 1, 2, 3].map((i) => i === a || i === b);
    }
    ctx.sfx('countdown-tick');
    ctx.float(W / 2, top + 40, 'LIGHTS OUT — TO YOUR COTS', '#ffe2a8');
  };

  const startDark = (time: number): void => {
    phase = 'dark'; phaseEnd = time + DARK_MS;
    ctx.sfx('hush');
    for (const [k, f] of [['player', ctx.player], ['npc', ctx.npc]] as ['player' | 'npc', Fighter][]) {
      counted[k] = alive(f) && onCot(f) >= 0;
      if (counted[k]) {
        ctx.root(f, SLEEP_MS);
        ctx.heal(f, 12);
        ctx.float(f.x, f.y - 44, 'COUNTED', k === 'player' ? '#9fe8ff' : '#ffb070');
      }
    }
    lanterns = [{ x: door.x - (double ? 60 : 0), y: door.y - 20, nextTick: 0 }];
    if (double) lanterns.push({ x: door.x + 60, y: door.y - 20, nextTick: 0 });
  };

  return {
    update(time) {
      const dt = tick(time);
      if (!double && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        double = true;
        ctx.banner('DOUBLE COUNT', '#ffd08a');
        ctx.sfx('curse-cast');
      }
      if (phase === 'day' && time >= phaseEnd) startWarn(time);
      else if (phase === 'warn' && time >= phaseEnd) startDark(time);
      else if (phase === 'dark') {
        const hunted = awol();
        for (const [i, l] of lanterns.entries()) {
          // Each lantern hunts its own AWOL fighter if there are two; otherwise the nearest.
          const prey = hunted.length === 0 ? null
            : hunted.length === 1 ? hunted[0]
            : hunted.reduce((a, b) => (dist(l.x, l.y, a.x, a.y) < dist(l.x, l.y, b.x, b.y) === (i === 0) ? a : b));
          if (prey) {
            const d = dist(l.x, l.y, prey.x, prey.y);
            const step = Math.min(d, 150 * dt);
            if (d > 1) { l.x += ((prey.x - l.x) / d) * step; l.y += ((prey.y - l.y) / d) * step; }
          }
          if (time >= l.nextTick) {
            for (const f of hunted) {
              if (dist(f.x, f.y, l.x, l.y) < 62) {
                l.nextTick = time + 420;
                ctx.hit(f, 7, f.x, f.y);
                ctx.sfx('status-burn');
              }
            }
          }
        }
        if (time >= phaseEnd) {
          phase = 'day'; phaseEnd = time + DAY_MS;
          counted.player = false; counted.npc = false;
          lanterns = [];
          if (!double) open = [true, true, true, true];
          ctx.sfx('sparkle');
        }
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      if (phase === 'warn') {
        // Sleep when it is losing the trade, or when the player is already tucked in (a free count).
        const losing = n.hp / n.maxHp < ctx.player.hp / ctx.player.maxHp;
        const left = (phaseEnd - ctx.scene.time.now) / 1000;
        let best: Pt | null = null, bestD = Infinity;
        cots.forEach((c, i) => {
          if (!open[i]) return;
          const p = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
          const d = dist(n.x, n.y, p.x, p.y);
          if (d < bestD) { bestD = d; best = p; }
        });
        if (best && losing && bestD < left * 190) return best;
        return null;
      }
      if (phase === 'dark' && !counted.npc && lanterns.length) {
        const l = lanterns.reduce((a, b) => (dist(n.x, n.y, a.x, a.y) < dist(n.x, n.y, b.x, b.y) ? a : b));
        const d = Math.max(1, dist(n.x, n.y, l.x, l.y));
        return { x: clamp(n.x + ((n.x - l.x) / d) * 160, 60, W - 60), y: clamp(n.y + ((n.y - l.y) / d) * 160, top + 40, H - 40) };
      }
      return null;
    },

    drawGround(g, time) {
      // The dark: the floor drops to a blue-black; the fighters stay readable above it.
      if (phase === 'dark' || phase === 'warn') {
        const k = phase === 'dark' ? 1 : clamp(1 - (phaseEnd - time) / WARN_MS, 0, 1) * 0.4;
        g.fillStyle(0x050812, 0.62 * k); g.fillRect(0, top, W, H - top);
      }
      cots.forEach((c, i) => drawCot(g, c, open[i], phase, time));
      // The bunkhouse door the warden comes in by.
      g.fillStyle(IRON_DARK, 1); g.fillRect(door.x - 40, door.y - 6, 80, 16);
      g.fillStyle(0x3a2a1c, 1); g.fillRect(door.x - 34, door.y - 4, 68, 12);
      rivets(g, { x: door.x - 32, y: door.y + 2 }, { x: door.x + 32, y: door.y + 2 }, 10, 1.2, RIVET);
      // Lantern pools: warm light that burns, ringed by a wavering edge.
      for (const l of lanterns) {
        const w = Math.sin(time / 90) * 3;
        g.fillStyle(HOT_LIT, 0.1); g.fillCircle(l.x, l.y, 86 + w);
        g.fillStyle(0xffe6a0, 0.28); g.fillCircle(l.x, l.y, 62 + w);
        g.fillStyle(0xfff4d0, 0.25); g.fillCircle(l.x, l.y, 34);
        g.lineStyle(2, REDLINE, 0.6); g.strokeCircle(l.x, l.y, 62 + w);
      }
    },

    drawAir(g, time) {
      // Each lantern hangs from the warden's pole; the beam slants down from the door.
      for (const l of lanterns) {
        g.fillStyle(0xffe6a0, 0.06);
        g.fillTriangle(door.x, door.y - 60, l.x - 50, l.y, l.x + 50, l.y);
        const lx = l.x, ly = l.y - 70;
        g.lineStyle(3, 0x3a2a1c, 1); g.lineBetween(door.x, door.y - 40, lx, ly - 18);
        g.fillStyle(IRON, 1); g.fillRect(lx - 10, ly - 18, 20, 5);
        g.fillStyle(0xfff0b0, 0.8 + 0.2 * Math.sin(time / 70)); g.fillRoundedRect(lx - 8, ly - 13, 16, 22, 4);
        g.lineStyle(1.5, BRASS, 1); g.strokeRoundedRect(lx - 8, ly - 13, 16, 22, 4);
        g.lineBetween(lx, ly - 13, lx, ly + 9);
        g.fillStyle(IRON, 1); g.fillRect(lx - 9, ly + 9, 18, 4);
      }
      // Sleepers: drifting dream-bubbles over a counted fighter.
      for (const [k, f] of [['player', ctx.player], ['npc', ctx.npc]] as ['player' | 'npc', Fighter][]) {
        if (phase !== 'dark' || !counted[k] || !alive(f)) continue;
        for (let i = 0; i < 3; i++) {
          const ph = ((time / 900) + i / 3) % 1;
          g.lineStyle(1.5, k === 'player' ? MINE_C : FOE_C, 0.8 * (1 - ph));
          g.strokeCircle(f.x + 14 + ph * 16 + Math.sin(ph * 6) * 4, f.y - 40 - ph * 36, 3 + ph * 6);
        }
      }
    },

    drawHud(g, time) {
      // A bunkhouse clock: day fills round the dial; the warn arc is red; dark is the moon.
      const x = W - 38, y = top + 34, r = 22;
      g.fillStyle(0x000000, 0.5); g.fillCircle(x, y, r + 6);
      g.fillStyle(phase === 'dark' ? 0x0a1028 : 0xf1e6c8, 1); g.fillCircle(x, y, r);
      g.lineStyle(3, BRASS, 1); g.strokeCircle(x, y, r + 1);
      const span = phase === 'day' ? DAY_MS : phase === 'warn' ? WARN_MS : DARK_MS;
      const k = clamp(1 - (phaseEnd - time) / span, 0, 1);
      g.lineStyle(5, phase === 'warn' ? REDLINE : phase === 'dark' ? 0x8ab0ff : 0x6a5a3a, 1);
      g.beginPath(); g.arc(x, y, r - 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
      if (phase === 'dark') {
        g.fillStyle(0xe8ecff, 1); g.fillCircle(x, y, 9);
        g.fillStyle(0x0a1028, 1); g.fillCircle(x + 4, y - 3, 8);
      }
      for (let i = 0; i < 4; i++) {
        g.fillStyle(open[i] ? 0xc8a878 : 0x333333, 1); g.fillRect(x - 60 + (i % 2) * 14, y - 12 + Math.floor(i / 2) * 14, 11, 8);
      }
    },
  };
}

/** A company cot: iron frame on four legs, a thin ticking mattress, a grey blanket — turned down if it counts. */
function drawCot(g: G, c: Rect, open: boolean, phase: Phase, time: number): void {
  const glowOn = open && phase !== 'day';
  if (glowOn) {
    const p = 0.5 + 0.5 * Math.sin(time / 180);
    g.fillStyle(0xffe6a0, 0.1 + 0.12 * p); g.fillRect(c.x - 14, c.y - 14, c.w + 28, c.h + 28);
    g.lineStyle(2, 0xffe6a0, 0.5 + 0.4 * p); g.strokeRect(c.x - 8, c.y - 8, c.w + 16, c.h + 16);
  }
  g.fillStyle(0x000000, 0.35); g.fillRect(c.x + 4, c.y + 6, c.w, c.h);
  g.fillStyle(IRON_DARK, 1); g.fillRect(c.x, c.y, c.w, c.h);
  for (const [lx, ly] of [[c.x, c.y], [c.x + c.w, c.y], [c.x, c.y + c.h], [c.x + c.w, c.y + c.h]]) {
    g.fillStyle(IRON_LIT, 1); g.fillCircle(lx, ly, 3.5);
  }
  // Mattress ticking.
  g.fillStyle(0xd8ccb0, 1); g.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
  g.lineStyle(1, 0x8a9ab0, 0.6);
  for (let x = c.x + 10; x < c.x + c.w - 6; x += 7) g.lineBetween(x, c.y + 4, x, c.y + c.h - 4);
  // Pillow.
  g.fillStyle(0xf0ead8, 1); g.fillRoundedRect(c.x + 6, c.y + 8, 22, c.h - 16, 5);
  // Blanket: over the whole cot, or folded back to show it is turned down.
  const bx = open ? c.x + 46 : c.x + 30;
  g.fillStyle(0x5a6068, 1); g.fillRect(bx, c.y + 4, c.x + c.w - 4 - bx, c.h - 8);
  g.fillStyle(dim(0x5a6068, 0.25), 1); g.fillRect(bx, c.y + 4, 6, c.h - 8);
  g.fillStyle(0x8a2a1e, 1); g.fillRect(bx + 14, c.y + 4, 4, c.h - 8);
  if (open) { g.fillStyle(lit(0x5a6068, 0.2), 1); g.fillTriangle(bx, c.y + 4, bx + 12, c.y + 4, bx, c.y + c.h - 4); }
  // Stencilled number plate at the foot.
  g.fillStyle(BRASS, 1); g.fillRect(c.x + c.w - 14, c.y + c.h / 2 - 6, 8, 12);
}

export const BUNK_COUNT: GimmickDef = {
  id: ID,
  rules: 'At lights-out, a fighter on a lit cot is counted: held asleep, healed a little. Anyone else is hunted by the warden\'s burning lantern.',
  make: makeBunkCount,
};

import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { topiary, type TopiaryKind } from '../art';
import { GRAVEL_DARK, IRON_WHITE, LEAF, SOIL_DARK, STONE, STONE_DARK } from '../palette';
import { alive, clamp, dist, segDist, stepDt } from '../util';

/**
 * Topiary — Hedgecutter Box.
 *
 * The lawn is stood about with Box's hedge animals — a bear, a peacock, a hare, a swan, a stag —
 * clipped yew on root-balls, and they are not quite still. Each one lumbers, slowly, after
 * whichever fighter is nearest. They shoulder you aside and they *screen*: a blow thrown with a
 * hedge animal between you and your mark lands soft, the yew taking most of it.
 *
 * But every blow a hedge soaks clips it. Twice clipped and it is a stump. So the hedge Box hides
 * behind is also the hedge you can cut down — and he knows it: when one of his animals is a
 * stump, Box walks over to it and trims it back into shape, snips flashing, and for those few
 * seconds the hedgecutter is standing still with his back to you.
 */

const HEDGE_R = 26;
const SPEED = 42;
const SCREEN_MULT = 0.45;
const TRIM_MS = 1300;
const KINDS: TopiaryKind[] = ['bear', 'peacock', 'hare', 'swan', 'stag'];

interface Hedge {
  x: number; y: number;
  kind: TopiaryKind;
  clips: number;
  seed: number;
  /** Shake when clipped. */
  hitAt: number;
  /** Clippings flying off the last cut. */
  cuts: { x: number; y: number; vx: number; vy: number; at: number }[];
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const n = ctx.hard ? 5 : 4;
  const hedges: Hedge[] = [];
  for (let i = 0; i < n; i++) {
    const x = W * (0.2 + (i / Math.max(1, n - 1)) * 0.6);
    const y = top + 90 + ((i * 197) % (H - top - 200));
    hedges.push({ x, y, kind: KINDS[i % KINDS.length], clips: 0, seed: rng() * 10, hitAt: -9999, cuts: [] });
  }
  const trimEvery = ctx.hard ? 7500 : 10000;
  let trimReadyAt = 0;
  let trimming: Hedge | null = null;
  let trimSince = 0;
  let lastScreenFx = 0;
  let started = false;

  const standing = (h: Hedge) => h.clips < 2;

  /** The live hedge screening a blow from `from` at `to`, if any. */
  function screen(from: Fighter, to: Fighter): Hedge | null {
    const d = dist(from.x, from.y, to.x, to.y);
    for (const h of hedges) {
      if (!standing(h)) continue;
      // Between them, not behind either.
      if (dist(h.x, h.y - 16, from.x, from.y) > d || dist(h.x, h.y - 16, to.x, to.y) > d) continue;
      if (segDist(h.x, h.y - 16, from.x, from.y, to.x, to.y) < HEDGE_R + 6) return h;
    }
    return null;
  }

  function clip(h: Hedge, time: number, by: Fighter): void {
    h.clips = Math.min(2, h.clips + 1);
    h.hitAt = time;
    for (let i = 0; i < 9; i++) {
      const a = rng() * Math.PI * 2;
      h.cuts.push({ x: h.x, y: h.y - 30, vx: Math.cos(a) * (60 + rng() * 80), vy: -60 - rng() * 90, at: time });
    }
    ctx.sfx('slash');
    ctx.float(h.x, h.y - 70, h.clips >= 2 ? 'STUMPED' : 'CLIPPED', by === player ? '#a8f0a0' : '#c8d0c0');
  }

  function onHurt(victim: Fighter, attacker: Fighter, amount: number): void {
    if (amount < 3 || !alive(attacker)) return;
    const time = ctx.scene.time.now;
    const s = screen(attacker, victim);
    if (s) {
      clip(s, time, attacker);
      if (time - lastScreenFx > 900) { lastScreenFx = time; ctx.float(s.x, s.y - 90, 'THE YEW TOOK IT', '#c8e8b8'); }
      return;
    }
    // Swinging next to a hedge clips it in passing.
    let near: Hedge | null = null;
    let nd = 80;
    for (const h of hedges) { const d = dist(h.x, h.y, attacker.x, attacker.y); if (standing(h) && d < nd) { nd = d; near = h; } }
    if (near) clip(near, time, attacker);
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; trimReadyAt = time + trimEvery; }
      for (const h of hedges) {
        // Clippings fall.
        for (let i = h.cuts.length - 1; i >= 0; i--) {
          const c = h.cuts[i];
          c.vy += 300 * dt; c.x += c.vx * dt; c.y += c.vy * dt;
          if (time - c.at > 700) h.cuts.splice(i, 1);
        }
        if (!standing(h)) continue;
        // Lumber after whoever is nearest.
        const dp = alive(player) ? dist(h.x, h.y, player.x, player.y) : Infinity;
        const dn = alive(npc) ? dist(h.x, h.y, npc.x, npc.y) : Infinity;
        const f = dp <= dn ? player : npc;
        const d = Math.min(dp, dn);
        if (d < Infinity && d > HEDGE_R + 26) {
          h.x += ((f.x - h.x) / d) * SPEED * dt;
          h.y += ((f.y - h.y) / d) * SPEED * dt;
        }
        // Keep apart from each other.
        for (const o of hedges) {
          if (o === h) continue;
          const dd = dist(h.x, h.y, o.x, o.y);
          if (dd > 0 && dd < HEDGE_R * 2.2) { h.x += ((h.x - o.x) / dd) * 30 * dt; h.y += ((h.y - o.y) / dd) * 30 * dt; }
        }
        h.x = clamp(h.x, 50, W - 50); h.y = clamp(h.y, top + 60, H - 20);
        // Shoulder fighters aside.
        for (const g of [player, npc]) {
          if (!alive(g)) continue;
          const dd = dist(h.x, h.y - 10, g.x, g.y);
          if (dd < HEDGE_R + 18 && dd > 0) {
            const push = (HEDGE_R + 18 - dd) * 0.5;
            ctx.nudge(g, ((g.x - h.x) / dd) * push, ((g.y - (h.y - 10)) / dd) * push);
          }
        }
      }

      // Box trims a stump back into shape — he has to stand at it to do it.
      if (!trimming && time >= trimReadyAt) {
        const stump = hedges.find((h) => !standing(h));
        if (stump) { trimming = stump; trimSince = 0; ctx.banner('BOX GOES TO TRIM A STUMP', '#c8e8b8'); }
      }
      if (trimming) {
        if (alive(npc) && dist(npc.x, npc.y, trimming.x, trimming.y) < 60) {
          if (!trimSince) { trimSince = time; ctx.sfx('trap-set'); }
          if (time - trimSince >= TRIM_MS) {
            trimming.clips = 0;
            trimming.hitAt = time;
            ctx.float(trimming.x, trimming.y - 80, 'CLIPPED TO SHAPE', '#7fd67f');
            ctx.sfx('sparkle');
            trimming = null;
            trimReadyAt = time + trimEvery;
          }
        } else trimSince = 0;
      }
    },

    onNpcHurt(amount) { onHurt(npc, player, amount); },
    onPlayerHurt(amount) { onHurt(player, npc, amount); },

    playerTakenMult: () => (alive(npc) && screen(npc, player) ? SCREEN_MULT : 1),
    npcTakenMult: () => (alive(player) && screen(player, npc) ? SCREEN_MULT : 1),

    npcSeek() {
      if (trimming) return { x: trimming.x + 30, y: trimming.y };
      // Otherwise stand behind the standing hedge nearest him, on the far side from you.
      let best: Hedge | null = null;
      let bd = Infinity;
      for (const h of hedges) {
        if (!standing(h)) continue;
        const d = dist(h.x, h.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = h; }
      }
      if (!best) return null;
      const d = dist(best.x, best.y, player.x, player.y) || 1;
      return { x: clamp(best.x + ((best.x - player.x) / d) * 70, 50, W - 50), y: clamp(best.y - 10 + ((best.y - player.y) / d) * 70, top + 50, H - 40) };
    },

    drawGround(g, time) {
      const front = Math.max(player.y, npc.y) + 10;
      for (const h of hedges) {
        drawFootprint(g, h, time);
        if (h.y <= front) drawHedge(g, h, time);
      }
      if (trimming) {
        g.lineStyle(2, IRON_WHITE, 0.5 + Math.sin(time / 90) * 0.3); g.strokeCircle(trimming.x, trimming.y, 60);
        if (trimSince) {
          const k = clamp((time - trimSince) / TRIM_MS, 0, 1);
          g.lineStyle(4, 0x7fd67f, 0.9); g.beginPath(); g.arc(trimming.x, trimming.y, 40, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
    },

    drawAir(g, time) {
      const front = Math.max(player.y, npc.y) + 10;
      for (const h of hedges) if (h.y > front) drawHedge(g, h, time);
      for (const h of hedges) {
        for (const c of h.cuts) {
          const k = (time - c.at) / 700;
          g.fillStyle(LEAF, 1 - k); g.fillEllipse(c.x, c.y, 4, 2.5);
        }
      }
      // A screen line while the yew is between you: a pale bar across the blocked shot.
      for (const [a, b] of [[player, npc], [npc, player]] as [Fighter, Fighter][]) {
        if (!alive(a) || !alive(b)) continue;
        const s = screen(a, b);
        if (!s) continue;
        g.lineStyle(2, 0xd8f0c8, 0.25 + Math.sin(time / 140) * 0.1);
        g.strokeCircle(s.x, s.y - 26, HEDGE_R + 10);
      }
      // Box's snips flashing at work.
      if (trimming && trimSince && alive(npc)) {
        const o = Math.sin(time / 50) * 0.4;
        g.lineStyle(2, 0xd8dade, 1);
        g.lineBetween(npc.x + 14, npc.y - 20, npc.x + 30, npc.y - 30 + o * 10);
        g.lineBetween(npc.x + 14, npc.y - 20, npc.x + 30, npc.y - 30 - o * 10);
      }
    },
  };

  function drawHedge(g: Phaser.GameObjects.Graphics, h: Hedge, time: number): void {
    const shake = time - h.hitAt < 250 ? Math.sin(time / 20) * 3 : 0;
    // A lumbering sway as it walks; a stump doesn't.
    const sway = standing(h) ? Math.sin(time / 300 + h.seed) * 1.5 : 0;
    // Root-ball in hessian under the yew.
    g.fillStyle(0x8a6a48, 1); g.fillEllipse(h.x, h.y - 2, 30, 12);
    g.lineStyle(1, 0x5a432c, 0.8); g.lineBetween(h.x - 12, h.y - 4, h.x + 12, h.y); g.lineBetween(h.x - 12, h.y, h.x + 12, h.y - 4);
    topiary(g, h.x + shake + sway, h.y - 4, h.kind, 0.95, h.clips, false);
  }

  function drawFootprint(g: Phaser.GameObjects.Graphics, h: Hedge, time: number): void {
    g.fillStyle(0x000000, 0.22); g.fillEllipse(h.x, h.y + 2, 54, 16);
    if (!standing(h)) {
      g.fillStyle(SOIL_DARK, 0.4); g.fillEllipse(h.x, h.y + 2, 40, 12);
      return;
    }
    // Scuffed turf behind a walking hedge.
    const ph = (time / 500 + h.seed) % 1;
    g.fillStyle(GRAVEL_DARK, 0.25 * (1 - ph)); g.fillCircle(h.x - 12 + ph * 4, h.y + 4, 3 + ph * 4);
    g.fillStyle(GRAVEL_DARK, 0.25 * ph); g.fillCircle(h.x + 12 - ph * 4, h.y + 4, 3 + (1 - ph) * 4);
  }
}

/** The empty plinths the animals walked off, for the floor. */
export function emptyPlinth(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(STONE_DARK, 1); g.fillRect(x - 18, y - 8, 36, 9);
  g.fillStyle(STONE, 1); g.fillRect(x - 17, y - 9, 34, 6);
}

export const TOPIARY: GimmickDef = {
  id: 'bloom-topiary',
  rules: 'Hedge animals lumber after the nearest fighter and screen blows: a hit through one lands at under half. Every blow a hedge soaks clips it; two clips is a stump. Box walks to stumps to trim them back.',
  make,
};

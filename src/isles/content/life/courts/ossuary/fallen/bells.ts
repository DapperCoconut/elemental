import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, O, OCOL, alive, clamp, dist, drawLily, drawSkull, jit } from '../util';

/**
 * THE BELL UNDER THE LILIES — Hobb Lisle, Rope-Cutter.
 *
 * Some of the pruned came down the hill not quite dead. The old sextons strung a bell over every
 * fresh bed, its cord running down into the coffin, so a sleeper who woke could ring. In the King's
 * telling Hobb walked the beds with shears and cut the cords that rang — the Prince likes the
 * garden quiet, and a grave that rings is untidy.
 *
 * Five bell-posts stand over five fresh beds. Now and then one rings — the bell swings, the cord
 * jerks. It rings for a few seconds: STRIKE THE BELL first (a shot from across the yard will do)
 * and you have answered — the sleeper climbs out, pale, and hurls the grave's bones at Hobb, and you
 * are mended a little. If Hobb strikes it first he cuts the cord and is mended instead; cut or left
 * ringing, the bed caves in and stays a pit of loose bone that bites anyone standing in it.
 * Halfway down two ring at once, far apart: answer one, and race him for the other.
 */

const ID = fallenId('ossuary', 'bells');
const RING_MS = 4600;
const PIT_MS = 7500;
const PIT_R = 52;
const BELL_UP = 64;

type Side = 'player' | 'npc';
type State = 'idle' | 'ringing' | 'pit';

interface Post {
  x: number; y: number;
  state: State;
  since: number;
  target: StrikeTarget | null;
  answered: boolean;
  seed: number;
  pitTick: Record<Side, number>;
}

interface Shade { x: number; y: number; at: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const clock = new Clock();
  const yy = (k: number): number => top + (H - top) * k;
  const posts: Post[] = [
    { x: W * 0.17, y: yy(0.26) }, { x: W * 0.83, y: yy(0.26) }, { x: W * 0.5, y: yy(0.48) },
    { x: W * 0.2, y: yy(0.84) }, { x: W * 0.8, y: yy(0.84) },
  ].map((p, i) => ({ ...p, state: 'idle' as State, since: 0, target: null, answered: false, seed: i * 3.7 + 1, pitTick: { player: 0, npc: 0 } }));
  const shades: Shade[] = [];
  let now = 0;
  let nextRing = -1;
  let both = false;
  let answeredN = 0;
  let cutN = 0;
  const fighter = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const grave = (p: Post): Pt => ({ x: p.x, y: p.y + 26 });

  const cave = (p: Post): void => {
    p.target?.remove(); p.target = null;
    p.state = 'pit'; p.since = now;
    ctx.sfx('quake');
  };

  const struck = (p: Post, by: Side): void => {
    if (p.state !== 'ringing') return;
    if (by === 'player') {
      answeredN++;
      p.target?.remove(); p.target = null;
      p.state = 'idle'; p.since = now; p.answered = true;
      const gv = grave(p);
      shades.push({ x: gv.x, y: gv.y, at: now });
      ctx.heal(ctx.player, 6);
      ctx.sfx('holy-chord');
      ctx.float(gv.x, gv.y - 70, 'ANSWERED', OCOL.green);
      // The sleeper climbs out and throws the grave's bones at the man with the shears.
      for (let i = 0; i < 5; i++) {
        tk.schedule(260 + i * 190, () => {
          const n = ctx.npc;
          if (!alive(n)) return;
          const a = Math.atan2(n.y - (gv.y - 30), n.x - gv.x) + (i - 2) * 0.12;
          tk.spawnBullet({ x: gv.x, y: gv.y - 30, angle: a, speed: 330, damage: 7, r: 7, turn: 1.4, color: O.bone, hits: [ctx.npc], lifeMs: 2600 });
          ctx.sfx('rock-throw');
        });
      }
    } else {
      cutN++;
      tk.healBoss(14, p.x, p.y - BELL_UP);
      ctx.sfx('snap');
      ctx.float(p.x, p.y - BELL_UP - 30, 'CORD CUT', OCOL.red);
      cave(p);
    }
  };

  const ring = (): void => {
    const idle = posts.filter((p) => p.state === 'idle' && now - p.since > 1500);
    if (!idle.length) return;
    const pick = idle[Math.floor(ctx.rng() * idle.length)];
    const start = (p: Post): void => {
      p.state = 'ringing'; p.since = now; p.answered = false;
      p.target = ctx.target({ x: p.x + 14, y: p.y - BELL_UP + 18, r: 26, onStruck: (by) => struck(p, by) });
    };
    start(pick);
    if (both) {
      let far: Post | null = null, fd = 0;
      for (const p of idle) { const d = dist(p.x, p.y, pick.x, pick.y); if (p !== pick && d > fd) { fd = d; far = p; } }
      if (far) start(far);
    }
    ctx.sfx('holy-chord');
  };

  return {
    update(time: number) {
      const dt = clock.tick(time);
      now = time;
      if (dt === 0) return;
      if (nextRing < 0) nextRing = time + 2600;
      if (!both && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        both = true;
        ctx.banner('TWO GRAVES RINGING', OCOL.holy);
        ctx.sfx('boss-phase');
      }
      if (time >= nextRing && !posts.some((p) => p.state === 'ringing')) {
        ring();
        nextRing = time + (both ? 6200 : 5400);
      }
      for (const p of posts) {
        if (p.state === 'ringing' && now - p.since > tk.warn(RING_MS)) {
          ctx.float(p.x, p.y - BELL_UP - 30, 'TOO LATE', OCOL.bone);
          cave(p);
        } else if (p.state === 'pit') {
          if (now - p.since > PIT_MS) { p.state = 'idle'; p.since = now; continue; }
          const gv = grave(p);
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighter(s);
            if (!alive(f) || dist(f.x, f.y + 10, gv.x, gv.y) > PIT_R + 10 || now < p.pitTick[s]) continue;
            p.pitTick[s] = now + 500;
            if (s === 'player') { tk.hitPlayer(5, f.x, f.y); tk.slowPlayer(0.65, 520); }
            else ctx.hit(f, 9, f.x, f.y);
          }
        }
      }
      while (shades.length && now - shades[0].at > 1600) shades.shift();
    },

    npcSeek(): Pt | null {
      const n = ctx.npc;
      for (const p of posts) {
        if (p.state !== 'pit') continue;
        const gv = grave(p);
        const d = dist(n.x, n.y + 10, gv.x, gv.y);
        if (d < PIT_R + 30) {
          const a = d > 3 ? Math.atan2(n.y + 10 - gv.y, n.x - gv.x) : -Math.PI / 2;
          return { x: tk.clampX(gv.x + Math.cos(a) * (PIT_R + 60)), y: tk.clampY(gv.y + Math.sin(a) * (PIT_R + 60)) };
        }
      }
      // A ringing bell: to the nearest one, shears out.
      let best: Post | null = null, bd = 1e9;
      for (const p of posts) { if (p.state !== 'ringing') continue; const d = dist(n.x, n.y, p.x, p.y); if (d < bd) { bd = d; best = p; } }
      if (best) {
        const a = Math.atan2(n.y - best.y, n.x - best.x);
        return { x: tk.clampX(best.x + Math.cos(a) * 46), y: tk.clampY(best.y - 20 + Math.sin(a) * 46) };
      }
      return null;
    },

    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const p of posts) drawBed(g, p, time, now);
    },

    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      for (const p of posts) drawPost(g, p, time, now);
      for (const s of shades) drawShade(g, s, clamp((time - s.at) / 1600, 0, 1));
    },

    drawHud(g: Phaser.GameObjects.Graphics) {
      // A sexton's tally: lilies for the answered, cut cords for the cut.
      const x = 30, y = H - 34;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 14, y - 40, 200, 52, 8);
      for (let i = 0; i < Math.min(answeredN, 8); i++) drawLily(g, x + 4 + i * 22, y + 4, 6, 1, 0);
      for (let i = 0; i < Math.min(cutN, 8); i++) {
        const cx = x + 4 + i * 22, cy = y - 30;
        g.lineStyle(2, O.timberLit, 1); g.lineBetween(cx, cy, cx, cy + 6); g.lineBetween(cx + 2, cy + 9, cx + 2, cy + 14);
        g.fillStyle(O.sinewLit, 1); g.fillCircle(cx + 1, cy + 7.5, 1.5);
      }
      if (both) { g.fillStyle(O.holy, 1); g.fillCircle(W - 30, H - 30, 4); g.fillCircle(W - 44, H - 30, 4); }
    },

    destroy() { for (const p of posts) p.target?.remove(); },
  };
}

/** A fresh bed under the post — or, caved in, a pit of loose bone with a dark mouth. */
function drawBed(g: Phaser.GameObjects.Graphics, p: Post, time: number, now: number): void {
  const x = p.x, y = p.y + 26;
  if (p.state === 'pit') {
    const k = clamp((now - p.since) / 300, 0, 1);
    const fade = clamp((PIT_MS - (now - p.since)) / 800, 0, 1);
    g.fillStyle(O.loamDeep, 0.95 * fade); g.fillEllipse(x, y, PIT_R * 2 * k, PIT_R * 1.1 * k);
    g.fillStyle(0x0c0808, 0.9 * fade); g.fillEllipse(x, y + 4, PIT_R * 1.3 * k, PIT_R * 0.6 * k);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time / 3000;
      const r = PIT_R * (0.35 + jit(p.seed, i) * 0.55) * k;
      const bx = x + Math.cos(a) * r, by = y + Math.sin(a) * r * 0.55;
      g.fillStyle(i % 3 ? O.boneShade : O.bone, 0.9 * fade); g.fillEllipse(bx, by, 9, 4);
    }
    drawSkull(g, x + Math.sin(time / 700 + p.seed) * 6, y + 2, 7, 0.85 * fade, { tone: O.boneShade, jaw: 0.5 });
    g.lineStyle(2, O.sinew, 0.5 * fade); g.strokeEllipse(x, y, PIT_R * 2, PIT_R * 1.1);
    return;
  }
  shadow(g, x, y + 8, 86, 22, 0.25);
  g.fillStyle(O.loamDeep, 1); g.fillEllipse(x, y, 86, 36);
  g.fillStyle(O.loamLit, 1); g.fillEllipse(x, y - 3, 74, 26);
  for (let i = 0; i < 9; i++) { g.lineStyle(1, O.loam, 0.8); g.lineBetween(x - 32 + i * 8, y - 12, x - 30 + i * 8, y + 8); }
  for (let i = 0; i < 3; i++) drawLily(g, x - 22 + i * 22, y - 2, 5, 0.8 + jit(p.seed, i) * 0.2, (p.state === 'ringing' ? Math.sin(time / 60 + i) * 0.5 : 0.1));
  if (p.answered && now - p.since < 1500) { g.fillStyle(O.holy, 0.25 * (1 - (now - p.since) / 1500)); g.fillEllipse(x, y, 100, 44); }
}

/** The bell-post: a crooked gallows-arm, a bronze bell, and its cord down into the bed. */
function drawPost(g: Phaser.GameObjects.Graphics, p: Post, time: number, now: number): void {
  const x = p.x, y = p.y;
  const ringing = p.state === 'ringing';
  const swing = ringing ? Math.sin(time / 70) * 0.5 : 0;
  g.fillStyle(dim(O.timber, 0.2), 1); g.fillRect(x - 5, y - BELL_UP - 18, 10, BELL_UP + 22);
  g.fillStyle(O.timberLit, 1); g.fillRect(x - 4, y - BELL_UP - 18, 3, BELL_UP + 22);
  g.fillStyle(O.timber, 1); g.fillRect(x - 3, y - BELL_UP - 20, 26, 6);
  g.lineStyle(3, O.timber, 1); g.lineBetween(x + 2, y - BELL_UP + 4, x + 16, y - BELL_UP - 16);
  // The bell, hung from the arm's end and swinging.
  const hx = x + 18, hy = y - BELL_UP - 14;
  const bx = hx + Math.sin(swing) * 14, by = hy + Math.cos(swing) * 20;
  g.lineStyle(1.5, O.iron, 1); g.lineBetween(hx, hy, bx, by - 12);
  const bell = 0xa07a3a;
  g.fillStyle(dim(bell, 0.25), 1); g.fillTriangle(bx - 13, by + 6, bx + 13, by + 6, bx, by - 14);
  g.fillStyle(bell, 1); g.fillEllipse(bx, by - 6, 18, 18);
  g.fillStyle(bell, 1); g.fillRect(bx - 12, by - 2, 24, 8);
  g.fillStyle(lit(bell, 0.4), 1); g.fillEllipse(bx - 4, by - 8, 5, 9);
  g.fillStyle(O.iron, 1); g.fillCircle(bx + Math.sin(swing * 2) * 5, by + 7, 3);
  // The cord down into the bed — taut and jerking while it rings, gone once cut.
  if (p.state !== 'pit') {
    const gy = y + 26;
    const jerk = ringing ? Math.sin(time / 45) * 4 : 0;
    g.lineStyle(1.5, O.wax, 0.9);
    g.beginPath(); g.moveTo(bx, by + 6); g.lineTo(x + 10 + jerk, (by + gy) / 2); g.lineTo(x + 4, gy - 4); g.strokePath();
  } else {
    g.lineStyle(1.5, O.wax, 0.8); g.lineBetween(bx, by + 6, bx + 2, by + 18);
  }
  if (ringing) {
    const left = clamp(1 - (now - p.since) / RING_MS, 0, 1);
    glow(g, bx, by, 34, O.candle, 0.05, 3);
    for (let i = 0; i < 2; i++) {
      const k = ((time / 400 + i * 0.5) % 1);
      g.lineStyle(2, O.holy, 0.6 * (1 - k)); g.beginPath(); g.arc(bx, by, 18 + k * 30, -Math.PI * 0.85, -Math.PI * 0.15); g.strokePath();
    }
    // How long the sleeper has left to be heard: a ring of wax burning down round the bell.
    g.lineStyle(4, 0x000000, 0.5); g.strokeCircle(bx, by - 2, 28);
    g.lineStyle(3, left < 0.3 ? O.sinewLit : O.candle, 1);
    g.beginPath(); g.arc(bx, by - 2, 28, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); g.strokePath();
  }
}

/** The answered sleeper: a pale shade climbing out of the bed, arm up, and fading. */
function drawShade(g: Phaser.GameObjects.Graphics, s: Shade, k: number): void {
  const a = (1 - k) * 0.85;
  const rise = Math.min(1, k * 3) * 36;
  g.fillStyle(O.holy, a * 0.35); g.fillEllipse(s.x, s.y - rise, 34, 60);
  g.fillStyle(O.lily, a); g.fillEllipse(s.x, s.y - rise - 6, 22, 40);
  drawSkull(g, s.x, s.y - rise - 34, 8, a, { tone: O.lily, eye: O.candle, eyeA: 1 });
  g.lineStyle(4, O.lily, a); g.lineBetween(s.x + 8, s.y - rise - 14, s.x + 20, s.y - rise - 40);
}

export const FALLEN_BELLS: GimmickDef = {
  id: ID,
  rules: 'A grave rings: strike its bell first and the sleeper stones Hobb; if he strikes first he cuts it and heals. Caved beds bite. At half, two ring.',
  make,
};

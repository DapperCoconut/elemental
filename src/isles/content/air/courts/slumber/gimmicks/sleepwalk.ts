import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { DREAM, DREAM_LIT, FOE_TINT, PLAYER_TINT, dist, nightcapOn, zzz } from '../art';

/**
 * Sleepwalk — Somnambulist Nod's crossroads.
 *
 * Every few seconds a drowsy chime sounds and both fighters fall asleep on their feet. Before the
 * walk begins, each sleeper's route is drawn ahead of them as a line of footprints: it carries on
 * the way they were heading, meandering as sleepwalkers do and turning off the walls. Then for a
 * few seconds the legs follow the footprints whatever you tell them — though the hands still cast.
 *
 * Nod reads paths. The moment the chime sounds he reads yours and lays his own straight through
 * it, timed to arrive as you do; a sleepwalker who walks into him is bumped awake hard (a knock
 * and a stagger). But his path is fixed the instant he reads it, while yours keeps redrawing
 * until the walk begins — so turn during the chime and his route goes somewhere you aren't. His
 * footprints are on the floor too: three seconds of a foe walking exactly where it says.
 */

const INTERVAL_MS = 8500;
const INTERVAL_HARD_MS = 7000;
const TELL_MS = 1600;
const WALK_MS = 3000;
const WALK_HARD_MS = 3400;
const SPEED = 150;
const STEPS = 48;
const BUMP_R = 44;
const BUMP_DAMAGE = 10;
const BUMP_STUN_MS = 700;
const MARGIN = 46;

interface Track { lastX: number; lastY: number; heading: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const interval = ctx.hard ? INTERVAL_HARD_MS : INTERVAL_MS;
  const walkMs = ctx.hard ? WALK_HARD_MS : WALK_MS;

  let phase: 'idle' | 'tell' | 'walk' = 'idle';
  let phaseAt = 0;
  let nextAt = 4200;
  let seed = 0;
  let playerPath: Pt[] = [];
  let npcPath: Pt[] = [];
  let playerAwake = false;
  let bumpedAt = -9999;
  let bumpPt: Pt = { x: 0, y: 0 };
  let announced = false;
  const tracks = new Map<Fighter, Track>();
  const alive = (f: Fighter): boolean => f.active && f.hp > 0;

  const track = (f: Fighter): Track => {
    let tr = tracks.get(f);
    if (!tr) {
      const other = f === ctx.player ? ctx.npc : ctx.player;
      tr = { lastX: f.x, lastY: f.y, heading: Math.atan2(other.y - f.y, other.x - f.x) };
      tracks.set(f, tr);
    }
    return tr;
  };

  /** Simulate a sleepwalk: a gentle meander from (x, y) along `heading`, turning off the walls. */
  const meander = (x: number, y: number, heading: number, s: number): Pt[] => {
    const pts: Pt[] = [{ x, y }];
    const dt = walkMs / 1000 / STEPS;
    let a = heading, px = x, py = y;
    for (let i = 1; i <= STEPS; i++) {
      a += Math.sin(i * 0.22 + s) * 0.9 * dt;
      let nx = px + Math.cos(a) * SPEED * dt, ny = py + Math.sin(a) * SPEED * dt;
      if (nx < MARGIN || nx > W - MARGIN) { a = Math.PI - a; nx = Phaser.Math.Clamp(nx, MARGIN, W - MARGIN); }
      if (ny < top + MARGIN || ny > H - MARGIN) { a = -a; ny = Phaser.Math.Clamp(ny, top + MARGIN, H - MARGIN); }
      px = nx; py = ny;
      pts.push({ x: px, y: py });
    }
    return pts;
  };

  /** Nod's path: straight at where you will be part-way through your walk, then on past. */
  const intercept = (n: Fighter, target: Pt[]): Pt[] => {
    const iStep = Math.round(STEPS * 0.55);
    const goal = target[iStep];
    const tGoal = (walkMs / 1000) * (iStep / STEPS);
    const d = dist(n.x, n.y, goal.x, goal.y);
    const v = Phaser.Math.Clamp(d / tGoal, 80, 250);
    const a = Math.atan2(goal.y - n.y, goal.x - n.x);
    const pts: Pt[] = [{ x: n.x, y: n.y }];
    const dt = walkMs / 1000 / STEPS;
    let px = n.x, py = n.y, ang = a;
    for (let i = 1; i <= STEPS; i++) {
      let nx = px + Math.cos(ang) * v * dt, ny = py + Math.sin(ang) * v * dt;
      if (nx < MARGIN || nx > W - MARGIN) { ang = Math.PI - ang; nx = Phaser.Math.Clamp(nx, MARGIN, W - MARGIN); }
      if (ny < top + MARGIN || ny > H - MARGIN) { ang = -ang; ny = Phaser.Math.Clamp(ny, top + MARGIN, H - MARGIN); }
      px = nx; py = ny;
      pts.push({ x: px, y: py });
    }
    return pts;
  };

  const at = (path: Pt[], k: number): Pt => {
    const f = Phaser.Math.Clamp(k, 0, 1) * (path.length - 1);
    const i = Math.floor(f), u = f - i;
    const a = path[i], b = path[Math.min(path.length - 1, i + 1)];
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  };

  const walking = (): boolean => phase === 'walk';

  /** Footprints along a path, left-right, from step `from` on. */
  const footprints = (g: Phaser.GameObjects.Graphics, path: Pt[], color: number, a: number, from = 0): void => {
    for (let i = Math.max(1, from); i < path.length; i += 2) {
      const p = path[i], q = path[i - 1];
      const ang = Math.atan2(p.y - q.y, p.x - q.x);
      const side = (i / 2) % 2 ? 1 : -1;
      const fx = p.x + Math.cos(ang + Math.PI / 2) * 5 * side, fy = p.y + Math.sin(ang + Math.PI / 2) * 5 * side + 10;
      g.fillStyle(color, a);
      g.fillEllipse(fx, fy, 7, 4.5);
      g.fillCircle(fx + Math.cos(ang) * 4, fy + Math.sin(ang) * 3, 1.6);
    }
  };

  return {
    update(time) {
      if (!announced) { announced = true; ctx.banner('MIND WHERE YOU WALK', '#e4d8ff'); }
      // Keep a smoothed heading for both, from how they have been moving.
      for (const f of [ctx.player, ctx.npc]) {
        const tr = track(f);
        const dx = f.x - tr.lastX, dy = f.y - tr.lastY;
        if (Math.hypot(dx, dy) > 1.2 && !walking()) {
          const h = Math.atan2(dy, dx);
          const diff = Phaser.Math.Angle.Wrap(h - tr.heading);
          tr.heading += diff * 0.35;
        }
        tr.lastX = f.x; tr.lastY = f.y;
      }

      if (phase === 'idle' && time >= nextAt) {
        phase = 'tell'; phaseAt = time;
        seed = rng() * 10;
        const p = ctx.player;
        playerPath = meander(p.x, p.y, track(p).heading, seed);
        npcPath = intercept(ctx.npc, playerPath);
        ctx.sfx('crystal-chime');
        ctx.float(W / 2, top + 40, 'YOU FEEL YOUR FEET GO TO SLEEP...', '#e4d8ff');
      } else if (phase === 'tell') {
        // Your route keeps following your heading until the walk begins. His is already set.
        const p = ctx.player;
        playerPath = meander(p.x, p.y, track(p).heading, seed);
        if (time - phaseAt >= TELL_MS) {
          phase = 'walk'; phaseAt = time; playerAwake = false;
          ctx.sfx('hush');
        }
      } else if (phase === 'walk') {
        const k = (time - phaseAt) / walkMs;
        if (k >= 1) {
          phase = 'idle'; nextAt = time + interval;
          ctx.float(ctx.player.x, ctx.player.y - 50, 'AWAKE', '#ffffff');
          return;
        }
        // Legs follow the footprints.
        if (!playerAwake && alive(ctx.player)) { const tp = at(playerPath, k); ctx.nudge(ctx.player, tp.x - ctx.player.x, tp.y - ctx.player.y); }
        if (alive(ctx.npc)) { const tn = at(npcPath, k); ctx.nudge(ctx.npc, tn.x - ctx.npc.x, tn.y - ctx.npc.y); }
        // Walking into Nod bumps you awake — hard.
        if (!playerAwake && alive(ctx.player) && alive(ctx.npc) && dist(ctx.player.x, ctx.player.y, ctx.npc.x, ctx.npc.y) < BUMP_R) {
          playerAwake = true;
          bumpedAt = time; bumpPt = { x: (ctx.player.x + ctx.npc.x) / 2, y: (ctx.player.y + ctx.npc.y) / 2 };
          ctx.hit(ctx.player, BUMP_DAMAGE, ctx.player.x, ctx.player.y);
          ctx.stun(ctx.player, BUMP_STUN_MS);
          ctx.nudge(ctx.player, Math.sign(ctx.player.x - ctx.npc.x || 1) * 40, Math.sign(ctx.player.y - ctx.npc.y || 1) * 20);
          ctx.float(ctx.player.x, ctx.player.y - 56, 'BUMPED AWAKE!', '#ff9ac8');
          ctx.sfx('hit-heavy');
        }
      }
    },

    playerSpeedMult: () => (walking() && !playerAwake ? 0.25 : 1),
    npcSpeedMult: () => (walking() ? 0.2 : 1),

    npcSeek(): Pt | null {
      // Between walks he drifts toward the middle, where a path can reach anywhere.
      if (phase === 'idle') {
        const n = ctx.npc;
        if (dist(n.x, n.y, W / 2, (H + top) / 2) > 260) return { x: W / 2, y: (H + top) / 2 };
      }
      return null;
    },

    drawGround(g, time) {
      if (phase === 'idle') return;
      const k = phase === 'walk' ? (time - phaseAt) / walkMs : 0;
      const from = Math.floor(k * STEPS);
      const tellK = phase === 'tell' ? (time - phaseAt) / TELL_MS : 1;
      // Your footprints flicker while they are still yours to turn; Nod's are inked in at once.
      const flick = phase === 'tell' ? 0.35 + 0.35 * Math.abs(Math.sin(time / 90)) : 0.75;
      if (!playerAwake) footprints(g, playerPath, PLAYER_TINT, flick, from);
      footprints(g, npcPath, FOE_TINT, phase === 'tell' ? 0.5 + 0.3 * tellK : 0.8, from);
      // Where the two lines meet, a little warning star.
      for (let i = from + 4; i < STEPS; i += 2) {
        const a = playerPath[i], b = npcPath[i];
        if (!a || !b || playerAwake) continue;
        if (dist(a.x, a.y, b.x, b.y) < BUMP_R) {
          g.lineStyle(2, 0xff9ac8, 0.6 + 0.3 * Math.sin(time / 80)); g.strokeCircle(a.x, a.y + 8, 22);
          break;
        }
      }
      // End-of-walk rings — where each of you will wake up.
      g.lineStyle(1.5, PLAYER_TINT, 0.4); if (!playerAwake) g.strokeCircle(playerPath[STEPS].x, playerPath[STEPS].y + 8, 14);
      g.lineStyle(1.5, FOE_TINT, 0.4); g.strokeCircle(npcPath[STEPS].x, npcPath[STEPS].y + 8, 14);
    },

    drawAir(g, time) {
      const t = time / 1000;
      if (phase === 'walk') {
        // Both sleepwalkers in nightcaps, arms held out in front, eyes shut.
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f) || (f === ctx.player && playerAwake)) continue;
          const path = f === ctx.player ? playerPath : npcPath;
          const k = (time - phaseAt) / walkMs;
          const ahead = at(path, Math.min(1, k + 0.05));
          const ang = Math.atan2(ahead.y - f.y, ahead.x - f.x);
          g.lineStyle(4, lit(f === ctx.player ? PLAYER_TINT : DREAM, 0.3), 0.8);
          for (const s of [-1, 1]) {
            const sx = f.x + Math.cos(ang + Math.PI / 2) * 9 * s, sy = f.y - 6 + Math.sin(ang + Math.PI / 2) * 9 * s;
            g.lineBetween(sx, sy, sx + Math.cos(ang) * 22, sy + Math.sin(ang) * 22);
          }
          nightcapOn(g, f.x, f.y - 26, 14, f === ctx.player ? lit(PLAYER_TINT, 0.4) : DREAM, 0.95, 0.6, Math.sin(t * 3) * 2);
          zzz(g, f.x + 14, f.y - 44, 5, t, DREAM_LIT, 0.9);
        }
      } else if (phase === 'tell') {
        // The chime: a soft ring closing in on each of you.
        const k = (time - phaseAt) / TELL_MS;
        for (const f of [ctx.player, ctx.npc]) {
          if (!alive(f)) continue;
          g.lineStyle(2, DREAM_LIT, 0.7 * k); g.strokeCircle(f.x, f.y, 60 * (1 - k) + 18);
        }
        // Nod's eyes are open and he is looking at your line.
        const n = ctx.npc;
        if (alive(n)) {
          const goal = playerPath[Math.round(STEPS * 0.55)];
          g.lineStyle(1, FOE_TINT, 0.35); g.lineBetween(n.x, n.y - 10, goal.x, goal.y);
          g.fillStyle(DREAM_LIT, 0.8); g.fillCircle(goal.x, goal.y + 8, 3);
        }
      }
      const b = (time - bumpedAt) / 500;
      if (b >= 0 && b < 1) {
        for (let i = 0; i < 6; i++) {
          const a = i * 1.05;
          g.lineStyle(3, 0xff9ac8, 1 - b);
          g.lineBetween(bumpPt.x + Math.cos(a) * (8 + b * 10), bumpPt.y + Math.sin(a) * (8 + b * 10), bumpPt.x + Math.cos(a) * (18 + b * 26), bumpPt.y + Math.sin(a) * (18 + b * 26));
        }
      }
    },
  };
}

export const SLEEPWALK: GimmickDef = {
  id: 'slumber-sleepwalk',
  rules: 'Now and then you both sleepwalk: your legs follow the footprints drawn ahead (you can still cast). Nod aims his walk through yours — turn during the chime to dodge.',
  make,
};

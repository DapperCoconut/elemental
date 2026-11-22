import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget, Striker } from '../../../../../IslesTypes';
import { dim, lit } from '../../../../../art/IsleArt';
import { automaton } from '../art';
import { BRASS, BRASS_DARK, BRASS_LIT, FILAMENT, IRON, IRON_DARK, PULSE, SILK } from '../palette';
import { alive, clamp, dist, segDist, stepDt, wrapAngle } from '../util';

/**
 * Automaton — Tinker Gearlock.
 *
 * Gearlock's works wind a clockwork automaton every few seconds at the stands along the back wall.
 * It steps off its stand and marches for its side — and its side is whoever last struck it. Fresh
 * off the stand, that is Gearlock: it marches at you and, reaching you, swings a brass fist.
 *
 * But a blow jars its key round. Strike one and it is yours now, eyes lit your colour, and it
 * about-faces and marches on Gearlock instead — until he strikes it back. Their springs run down
 * after a while and they topple. Three on one side at once and they link arms: a brass chain between them that bowls
 * over the other side's fighter.
 */

const STANDS = [200, 480, 760];
const BODY_R = 20;
const PUNCH_R = 36;
const LIFE_MS = 15000;
const MAX = 6;

type Side = 'p' | 'n';
interface Bot {
  x: number; y: number;
  heading: number;
  side: Side;
  born: number;
  step: number;
  punchAt: number;
  windupAt: number;
  flippedAt: number;
  dead: number;
  /** The strike target riding on its body. */
  hit: StrikeTarget;
}

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const SPEED = ctx.hard ? 84 : 70;
  const PUNCH = ctx.hard ? 9 : 7;
  const every = ctx.hard ? 3300 : 4100;
  const bots: Bot[] = [];
  const linkHit = new Map<Fighter, number>([[player, -9999], [npc, -9999]]);
  let nextWind = 0;
  let windStand = 0;
  let windWarnAt = -1;
  let linked: Record<Side, boolean> = { p: false, n: false };
  let started = false;
  const STAND_Y = top + 44;

  const foeOf = (s: Side): Fighter => (s === 'p' ? npc : player);
  const wind = (b: Bot, time: number) => clamp(1 - (time - b.born) / LIFE_MS, 0, 1);
  const color = (s: Side) => (s === 'p' ? PULSE : FILAMENT);

  /** A blow turns its key: it now marches for whoever struck it. */
  function strike(b: Bot, by: Striker): void {
    const side: Side = by === 'player' ? 'p' : 'n';
    const time = ctx.scene.time.now;
    if (b.dead || b.side === side || time - b.flippedAt < 600) return;
    b.side = side;
    b.flippedAt = time;
    b.windupAt = -1;
    b.born = Math.min(time, b.born + 3000); // a fresh turn of the key
    ctx.float(b.x, b.y - 60, 'WOUND', by === 'player' ? '#9af6ff' : '#ffb070');
    ctx.sfx('gear-turn');
  }

  /** The linked line for a side: its live automatons in order across the floor. */
  const chain = (s: Side): Bot[] => bots.filter((b) => b.side === s && !b.dead).sort((a, b) => a.x - b.x);

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) { started = true; nextWind = time + 1600; }
      // Winding: the key on a stand turns, then a fresh automaton steps off it.
      if (windWarnAt < 0 && time >= nextWind - 1200) { windWarnAt = time; windStand = Math.floor(rng() * STANDS.length); ctx.sfx('clock-tick'); }
      if (time >= nextWind) {
        nextWind = time + every;
        windWarnAt = -1;
        if (bots.filter((b) => !b.dead).length < MAX) {
          const x = STANDS[windStand], y = STAND_Y + 30;
          const b: Bot = {
            x, y, heading: Math.PI / 2, side: 'n', born: time, step: 0, punchAt: 0, windupAt: -1, flippedAt: -9999, dead: 0,
            hit: ctx.target({ x, y: y - 18, r: BODY_R, onStruck: (by) => strike(b, by) }),
          };
          bots.push(b);
          ctx.sfx('gear-turn');
        }
      }
      for (let i = bots.length - 1; i >= 0; i--) {
        const b = bots[i];
        if (b.dead) { if (time - b.dead > 900) bots.splice(i, 1); continue; }
        const w = wind(b, time);
        if (w <= 0) { b.dead = time; b.hit.remove(); ctx.sfx('clang'); continue; }
        const target = foeOf(b.side);
        // March for its side.
        const isLinked = linked[b.side];
        if (alive(target)) {
          const want = Math.atan2(target.y - b.y, target.x - b.x);
          b.heading += clamp(wrapAngle(want - b.heading), -2.4 * dt, 2.4 * dt);
          const d = dist(b.x, b.y, target.x, target.y);
          if (b.windupAt < 0 && d > PUNCH_R - 6) {
            const sp = SPEED * (0.55 + w * 0.45) * (isLinked ? 0.8 : 1);
            b.x = clamp(b.x + Math.cos(b.heading) * sp * dt, 40, W - 40);
            b.y = clamp(b.y + Math.sin(b.heading) * sp * dt, top + 40, H - 30);
            b.step += dt * 9;
          }
          // The fist: a raised arm, then the swing.
          if (b.windupAt < 0 && d < PUNCH_R && time >= b.punchAt) { b.windupAt = time; ctx.sfx('gear-turn'); }
          if (b.windupAt >= 0 && time - b.windupAt > 380) {
            b.windupAt = -1;
            b.punchAt = time + 1400;
            if (dist(b.x, b.y, target.x, target.y) < PUNCH_R + 6) {
              ctx.hit(target, PUNCH, target.x, target.y);
              ctx.nudge(target, Math.cos(b.heading) * 46, Math.sin(b.heading) * 46);
              ctx.sfx('hit-medium');
            }
          }
        }
        // Automatons don't walk through each other.
        for (const o of bots) {
          if (o === b || o.dead) continue;
          const d = dist(b.x, b.y, o.x, o.y);
          if (d < 30 && d > 0.01) { b.x += ((b.x - o.x) / d) * (30 - d) * 0.5; b.y += ((b.y - o.y) / d) * (30 - d) * 0.5; }
        }
        b.hit.moveTo(b.x, b.y - 18);
      }
      // Linked arms: three or more on a side.
      for (const s of ['p', 'n'] as Side[]) {
        const line = chain(s);
        const now = line.length >= 3;
        if (now && !linked[s]) { ctx.banner(s === 'p' ? 'YOUR AUTOMATONS LINK ARMS' : 'GEARLOCK\'S AUTOMATONS LINK ARMS', s === 'p' ? '#9af6ff' : '#ffb070'); ctx.sfx('chain'); }
        linked = { ...linked, [s]: now };
        if (!now) continue;
        const foe = foeOf(s);
        if (!alive(foe) || time - (linkHit.get(foe) ?? 0) < 650) continue;
        for (let k = 1; k < line.length; k++) {
          const a = line[k - 1], b = line[k];
          if (dist(a.x, a.y, b.x, b.y) > 260) continue;
          if (segDist(foe.x, foe.y, a.x, a.y - 22, b.x, b.y - 22) < 18) {
            linkHit.set(foe, time);
            ctx.hit(foe, 6, foe.x, foe.y);
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const dd = Math.max(1, dist(mx, my, foe.x, foe.y));
            ctx.nudge(foe, ((foe.x - mx) / dd) * 60, ((foe.y - my) / dd) * 60);
            ctx.sfx('clang');
            break;
          }
        }
      }
    },

    npcSeek() {
      if (!alive(npc) || !alive(player)) return null;
      // Steal the player's automatons: come in on the nearest one from behind and strike it.
      let best: Bot | null = null;
      let bd = Infinity;
      for (const b of bots) {
        if (b.dead || b.side !== 'p') continue;
        const d = dist(b.x, b.y, npc.x, npc.y);
        if (d < bd) { bd = d; best = b; }
      }
      if (best && bd < 420) {
        const bx = best.x - Math.cos(best.heading) * 26, by = best.y - Math.sin(best.heading) * 26;
        // Swing wide round its front rather than walk into the fist.
        const toNpc = Math.atan2(npc.y - best.y, npc.x - best.x);
        if (Math.abs(wrapAngle(toNpc - best.heading)) < 1.4 && bd < 120) {
          const side = wrapAngle(toNpc - best.heading) > 0 ? 1 : -1;
          return { x: clamp(best.x + Math.cos(best.heading + side * 1.7) * 90, 50, W - 50), y: clamp(best.y + Math.sin(best.heading + side * 1.7) * 90, top + 40, H - 40) };
        }
        return { x: clamp(bx, 50, W - 50), y: clamp(by, top + 40, H - 40) };
      }
      // Otherwise keep the player out in front of my marchers.
      const mine = bots.filter((b) => b.side === 'n' && !b.dead);
      if (mine.length) {
        const cx = mine.reduce((s, b) => s + b.x, 0) / mine.length, cy = mine.reduce((s, b) => s + b.y, 0) / mine.length;
        const a = Math.atan2(player.y - cy, player.x - cx);
        return { x: clamp(player.x + Math.cos(a) * 170, 60, W - 60), y: clamp(player.y + Math.sin(a) * 170, top + 50, H - 50) } as Pt;
      }
      return { x: clamp(player.x + (npc.x < player.x ? -180 : 180), 60, W - 60), y: clamp(player.y, top + 60, H - 50) };
    },

    drawGround(g, time) {
      // The winding stands along the back wall.
      for (let i = 0; i < STANDS.length; i++) {
        const x = STANDS[i], y = STAND_Y;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(x, y + 16, 80, 18);
        g.fillStyle(IRON_DARK, 1); g.fillRect(x - 36, y - 6, 72, 20);
        g.fillStyle(IRON, 1); g.fillRect(x - 34, y - 8, 68, 14);
        g.fillStyle(lit(IRON, 0.3), 1); g.fillRect(x - 34, y - 8, 68, 2);
        // The great winding key, turning while it winds.
        const turning = windWarnAt >= 0 && windStand === i;
        const ka = turning ? (time - windWarnAt) / 90 : 0;
        g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(x, y - 8, x, y - 26);
        const ew = 14 * Math.abs(Math.cos(ka)) + 2;
        g.lineStyle(4, turning ? BRASS_LIT : BRASS, 1);
        g.strokeEllipse(x - ew / 2 - 2, y - 32, ew, 14); g.strokeEllipse(x + ew / 2 + 2, y - 32, ew, 14);
        if (turning) { g.lineStyle(2, FILAMENT, 0.5 + Math.sin(time / 60) * 0.3); g.strokeCircle(x, y + 30, 22); }
      }
      for (const b of bots) if (!b.dead) { g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x, b.y + 2, 30, 9); }
    },

    drawAir(g, time) {
      // Linked arms: a brass chain at shoulder height.
      for (const s of ['p', 'n'] as Side[]) {
        if (!linked[s]) continue;
        const line = chain(s);
        for (let k = 1; k < line.length; k++) {
          const a = line[k - 1], b = line[k];
          if (dist(a.x, a.y, b.x, b.y) > 260) continue;
          const n = Math.max(3, Math.floor(dist(a.x, a.y, b.x, b.y) / 12));
          for (let i = 0; i <= n; i++) {
            const t = i / n;
            const cx = a.x + (b.x - a.x) * t, cy = a.y - 22 + (b.y - a.y) * t + Math.sin(t * Math.PI) * 6;
            g.lineStyle(2, i % 2 ? BRASS : BRASS_LIT, 1);
            if (i % 2) g.strokeEllipse(cx, cy, 8, 5); else g.strokeEllipse(cx, cy, 5, 8);
          }
          g.lineStyle(6, color(s), 0.12); g.lineBetween(a.x, a.y - 22, b.x, b.y - 22);
        }
      }
      for (const b of bots) {
        if (b.dead) {
          // Toppled: lying on its side, a last spring-sproing.
          const k = clamp((time - b.dead) / 900, 0, 1);
          g.fillStyle(BRASS_DARK, 1 - k); g.fillRoundedRect(b.x - 18, b.y - 10, 36, 16, 6);
          g.fillStyle(BRASS, 1 - k); g.fillCircle(b.x + 20, b.y - 4, 7);
          g.lineStyle(1.5, BRASS_LIT, 1 - k);
          g.beginPath(); for (let i = 0; i < 14; i++) { const a = i * 0.9, r = 2 + i * 0.9; const px = b.x - 10 + Math.cos(a) * r, py = b.y - 20 - k * 20 + Math.sin(a) * r; if (i) g.lineTo(px, py); else g.moveTo(px, py); } g.strokePath();
          continue;
        }
        const s = b.windupAt >= 0 ? 1.08 : 1;
        automaton(g, b.x, b.y, 0.95 * s, b.step, wind(b, time), color(b.side));
        if (b.windupAt >= 0) {
          const k = clamp((time - b.windupAt) / 380, 0, 1);
          g.lineStyle(2, 0xffffff, 0.4 + k * 0.5);
          g.strokeCircle(b.x + Math.cos(b.heading) * 26, b.y - 18 + Math.sin(b.heading) * 26, 10 - k * 5);
        }
        if (time - b.flippedAt < 400) {
          const k = (time - b.flippedAt) / 400;
          g.lineStyle(3 * (1 - k), color(b.side), 1 - k); g.strokeCircle(b.x, b.y - 24, 18 + k * 30);
        }
      }
    },

    destroy() { for (const b of bots) b.hit.remove(); },

    drawHud(g) {
      // Tally of automatons per side.
      const y = top + 8;
      const draw = (s: Side, x: number, dir: number) => {
        const n = bots.filter((b) => b.side === s && !b.dead).length;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(dir > 0 ? x : x - 98, y - 2, 98, 16, 6);
        for (let i = 0; i < MAX; i++) {
          const cx = x + dir * (10 + i * 15);
          g.fillStyle(i < n ? color(s) : dim(SILK, 0.7), i < n ? 1 : 0.3);
          g.fillCircle(cx, y + 6, 4);
          if (i === 2) { g.lineStyle(1, SILK, 0.5); g.lineBetween(cx + dir * 7, y, cx + dir * 7, y + 12); }
        }
      };
      draw('p', 20, 1);
      draw('n', W - 20, -1);
    },
  };
}

export const AUTOMATON: GimmickDef = {
  id: 'circuit-automaton',
  rules: 'Automatons march for whoever last wound them. Strike one to turn its key your way. Three on one side link arms.',
  make,
};

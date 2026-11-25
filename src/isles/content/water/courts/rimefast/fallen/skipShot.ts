import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, R, RCOL, alive, dist, drawCrack, jit } from '../util';

/**
 * SKIP SHOT — Gunner Merriwether Slade (gunpowder).
 *
 * The revenue cutter's swivel gunner fired the warning shots that kept Rimefast's fleet in its
 * ice. In the star's telling he aimed lower. A swivel gun on a post at the edge of the ice swings
 * round, its fuse spits, and a round shot goes SKIPPING across the harbour like a stone on a pond:
 * its next landings are ringed on the ice before it comes down, and it only hurts where it lands.
 * Between bounces it is in the air and harmless.
 *
 * Strike the ball in flight and you knock it back — re-aimed at your foe, a little faster, and it
 * no longer lands on you. He can do the same, and the bot's shots will. A rally on ice. Halfway
 * down a second gun is run out on the far side and the two fire turn about.
 *
 * The exploit: a returned ball lands only on the one it is sent at, and every return quickens it.
 */

type Side = 'player' | 'npc';

interface Ball {
  x: number; y: number; dx: number; dy: number; speed: number;
  /** Who knocked it last (immune to its landings); null = straight from the gun, lands on anyone. */
  owner: Side | null;
  /** Distance flown since the last landing, and the length of this hop. */
  hop: number; hopLen: number;
  bounces: number; returns: number;
  target: StrikeTarget;
  struckAt: number;
  seed: number;
}

interface Gun { x: number; y: number; ang: number; warnAt: number; firedAt: number; side: -1 | 1 }
interface Scar { x: number; y: number; at: number; seed: number }

const LAND_R = 42;
const HIT_PAD = 20;
const FIRST_HOP = 200;
const HOP = 150;
const RETURN_HOP = 110;
const GUN_WARN = 850;
const MAX_BOUNCES = 6;
const MAX_RETURNS = 8;

export const FALLEN_SKIP_SHOT: GimmickDef = {
  id: fallenId('rimefast', 'skip-shot'),
  rules: 'Round shot skips across the ice and hurts only where it lands (ringed ahead). Strike it in the air to knock it back at your foe, faster.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, tk, rng } = ctx;
    const midY = (top + H) / 2;
    const guns: Gun[] = [
      { x: 34, y: midY, ang: 0, warnAt: -1, firedAt: -9999, side: -1 },
      { x: W - 34, y: midY, ang: Math.PI, warnAt: -1, firedAt: -9999, side: 1 },
    ];
    const balls: Ball[] = [];
    const scars: Scar[] = [];
    const smoke: { x: number; y: number; at: number; vx: number }[] = [];
    let now = 0;
    let nextShot = 2000;
    let turn = 0;
    let broadside = false;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);

    const nextLanding = (b: Ball, ahead = 0): Pt => {
      const d = b.hopLen - b.hop + ahead * HOP;
      return { x: b.x + b.dx * d, y: b.y + b.dy * d };
    };

    const knock = (b: Ball, by: Side): void => {
      if (now - b.struckAt < 260 || b.returns >= MAX_RETURNS) return;
      const foe = fighterOf(by === 'player' ? 'npc' : 'player');
      const a = Math.atan2(foe.y - b.y, foe.x - b.x);
      b.dx = Math.cos(a); b.dy = Math.sin(a);
      b.speed = Math.min(480, b.speed * 1.1);
      b.owner = by; b.struckAt = now; b.returns++; b.bounces = 0;
      b.hop = 0; b.hopLen = RETURN_HOP;
      ctx.sfx('clang');
      ctx.float(b.x, b.y - 46, by === 'player' ? 'RETURNED' : 'HE SENDS IT BACK', by === 'player' ? RCOL.green : RCOL.red);
    };

    const fire = (gun: Gun): void => {
      const b: Ball = {
        x: gun.x + Math.cos(gun.ang) * 26, y: gun.y + Math.sin(gun.ang) * 26,
        dx: Math.cos(gun.ang), dy: Math.sin(gun.ang), speed: broadside ? 370 : 330,
        owner: null, hop: 0, hopLen: FIRST_HOP - 26, bounces: 0, returns: 0, struckAt: -9999, seed: rng() * 100,
        target: ctx.target({ x: gun.x, y: gun.y, r: 18, onStruck: (by) => knock(b, by) }),
      };
      balls.push(b);
      gun.firedAt = now; gun.warnAt = -1;
      ctx.sfx('musket'); tk.sfx('explosion-small');
      for (let i = 0; i < 5; i++) smoke.push({ x: gun.x + Math.cos(gun.ang) * 30, y: gun.y - 14 + Math.sin(gun.ang) * 30, at: now + i * 60, vx: Math.cos(gun.ang) * (20 + i * 8) });
    };

    const land = (b: Ball): void => {
      b.bounces++;
      scars.push({ x: b.x, y: b.y, at: now, seed: b.seed + b.bounces });
      ctx.sfx(b.bounces >= MAX_BOUNCES ? 'splash' : 'stone-slam');
      for (const s of ['player', 'npc'] as Side[]) {
        if (s === b.owner) continue;
        const f = fighterOf(s);
        if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, b.x, b.y) > LAND_R + HIT_PAD) continue;
        if (s === 'player') tk.hitPlayer(14, b.x, b.y);
        else { ctx.hit(f, 18, b.x, b.y); ctx.float(f.x, f.y - 52, 'SKIPPED OVER HIM', RCOL.green); }
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        if (!broadside && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          broadside = true;
          ctx.banner('BROADSIDE — the second gun is run out', RCOL.warm);
          ctx.sfx('reload');
        }
        // Gun drill: pick the gun (turn about once both are run out), swing, fuse, fire.
        const p = ctx.player;
        for (const g of guns) if (g.warnAt >= 0 || time - g.firedAt < 300) {
          const want = Math.atan2(p.y - g.y, p.x - g.x);
          if (g.warnAt >= 0 && time - g.warnAt < GUN_WARN * 0.6) g.ang += Math.max(-4 * dt, Math.min(4 * dt, want - g.ang));
          if (g.warnAt >= 0 && time - g.warnAt >= GUN_WARN) fire(g);
        }
        if (time >= nextShot && alive(p)) {
          const g = broadside ? guns[turn++ % 2] : guns[0];
          g.warnAt = time;
          g.ang = Math.atan2(p.y - g.y, p.x - g.x);
          tk.sfx('reload');
          nextShot = time + (broadside ? 2500 : 3300);
        }
        for (const b of [...balls]) {
          const step = b.speed * dt;
          b.x += b.dx * step; b.y += b.dy * step; b.hop += step;
          b.target.moveTo(b.x, b.y - 10);
          if (b.hop >= b.hopLen) { b.hop = 0; b.hopLen = HOP; land(b); }
          if (b.bounces >= MAX_BOUNCES || b.x < -20 || b.x > W + 20 || b.y < top - 10 || b.y > H + 20) {
            b.target.remove(); balls.splice(balls.indexOf(b), 1);
          }
        }
        while (scars.length && time - scars[0].at > 3200) scars.shift();
        while (smoke.length && time - smoke[0].at > 1400) smoke.shift();
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // A landing ringed under him: sidestep the ball's line, the short way.
        for (const b of balls) {
          if (b.owner === 'npc') continue;
          for (let k = 0; k < 2; k++) {
            const q = nextLanding(b, k);
            if (dist(q.x, q.y, n.x, n.y) > LAND_R + HIT_PAD + 30) continue;
            const side = (n.x - b.x) * -b.dy + (n.y - b.y) * b.dx >= 0 ? 1 : -1;
            return { x: tk.clampX(n.x - b.dy * side * 110), y: tk.clampY(n.y + b.dx * side * 110) };
          }
        }
        // A ball coming his way in the air: step into its line short of the landing, to bat it back.
        for (const b of balls) {
          if (b.owner === 'npc' || b.returns >= MAX_RETURNS) continue;
          if (dist(b.x, b.y, n.x, n.y) < 260) {
            const q = nextLanding(b, 0);
            const mx = (b.x + q.x) / 2, my = (b.y + q.y) / 2;
            if (dist(q.x, q.y, n.x, n.y) > LAND_R + HIT_PAD + 20) return { x: mx, y: my };
          }
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        for (const s of scars) {
          const a = 1 - (time - s.at) / 3200;
          g.fillStyle(R.snow, 0.5 * a); g.fillEllipse(s.x, s.y, 40, 16);
          drawCrack(g, s.x, s.y, 30, s.seed, 0.6, a);
        }
        // The landings ahead of each ball: the next one bold, the one after faint.
        for (const b of balls) {
          for (let k = 0; k < 2; k++) {
            if (b.bounces + k >= MAX_BOUNCES) break;
            const q = nextLanding(b, k);
            const col = b.owner === 'player' ? R.livery : b.owner === 'npc' ? R.scarf : R.ember;
            const prog = k === 0 ? b.hop / b.hopLen : 0;
            g.fillStyle(col, (k === 0 ? 0.12 : 0.05) + prog * 0.12); g.fillCircle(q.x, q.y, LAND_R);
            g.lineStyle(k === 0 ? 2.5 : 1.5, col, k === 0 ? 0.85 : 0.4); g.strokeCircle(q.x, q.y, LAND_R);
            if (k === 0) { g.beginPath(); g.arc(q.x, q.y, LAND_R - 6, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2, false); g.strokePath(); }
            for (let i = 0; i < 4; i++) {
              const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
              g.lineStyle(2, col, k === 0 ? 0.7 : 0.3);
              g.lineBetween(q.x + Math.cos(a) * (LAND_R - 10), q.y + Math.sin(a) * (LAND_R - 10), q.x + Math.cos(a) * (LAND_R + 4), q.y + Math.sin(a) * (LAND_R + 4));
            }
          }
          // The ball's shadow running across the ice.
          const hh = Math.sin(Math.min(1, b.hop / b.hopLen) * Math.PI);
          g.fillStyle(0x000000, 0.28 - hh * 0.12); g.fillEllipse(b.x, b.y + 4, 22 - hh * 6, 8 - hh * 2);
        }
        // Aim lines while a gun lays: dotted, with the landings ticked along it.
        for (const gun of guns) {
          if (gun.warnAt < 0) continue;
          const k = Math.min(1, (time - gun.warnAt) / GUN_WARN);
          for (let d = 40; d < 760; d += 16) {
            const x = gun.x + Math.cos(gun.ang) * d, y = gun.y + Math.sin(gun.ang) * d;
            if (x < 0 || x > W || y < top || y > H) break;
            const isLand = Math.abs(((d - FIRST_HOP) % HOP + HOP) % HOP) < 8 && d >= FIRST_HOP - 8;
            g.fillStyle(R.ember, 0.25 + k * 0.4); g.fillCircle(x, y, isLand ? 5 : 2);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const gun of guns) {
          if (!broadside && gun.side === 1) { drawGunPost(g, gun, t, time, false); continue; }
          drawGunPost(g, gun, t, time, true);
        }
        for (const b of balls) {
          const hh = Math.sin(Math.min(1, b.hop / b.hopLen) * Math.PI) * 30;
          const bx = b.x, by = b.y - 8 - hh;
          // Frost spray trailing off the shot.
          for (let i = 1; i < 6; i++) {
            g.fillStyle(R.frost, 0.4 - i * 0.06);
            g.fillCircle(bx - b.dx * i * 7, by - b.dy * i * 7 + i * 0.8, 4 - i * 0.5);
          }
          g.fillStyle(0x15171a, 1); g.fillCircle(bx, by, 9);
          g.fillStyle(0x3a3e44, 1); g.fillCircle(bx - 2, by - 2, 6);
          g.fillStyle(0x8a929c, 1); g.fillCircle(bx - 3.5, by - 3.5, 2);
          g.fillStyle(R.rime, 0.7); g.fillCircle(bx + 4, by + 3, 1.5);
          if (b.owner) { g.lineStyle(2, b.owner === 'player' ? R.livery : R.scarf, 0.9); g.strokeCircle(bx, by, 12); }
          if (now - b.struckAt < 200) glow(g, bx, by, 26, 0xffffff, 0.08, 3);
        }
        for (const s of scars) {
          const k = (time - s.at) / 500;
          if (k > 1) continue;
          for (let i = 0; i < 10; i++) {
            const a = -Math.PI * (0.1 + jit(s.seed, i) * 0.8);
            const d = 10 + k * (20 + jit(s.seed, i + 5) * 30);
            g.fillStyle(i % 2 ? R.snow : R.iceLit, 1 - k);
            g.fillCircle(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.9 + k * k * 18, 2.4);
          }
        }
        for (const s of smoke) {
          const k = (time - s.at) / 1400;
          if (k < 0) continue;
          g.fillStyle(0xd8d8d8, 0.4 * (1 - k)); g.fillCircle(s.x + s.vx * k * 1.4, s.y - k * 40, 7 + k * 16);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The fuse: a slow match burning down toward the next shot, a little gun at its end.
        const x = 18, y = H - 34, len = 180;
        const left = Math.max(0, Math.min(1, (nextShot - time) / (broadside ? 2500 : 3300)));
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 6, y - 14, len + 52, 28, 6);
        g.lineStyle(3, R.rope, 1); g.lineBetween(x, y, x + len * left, y);
        g.lineStyle(1, R.timberDark, 0.8);
        for (let i = 0; i < len * left; i += 6) g.lineBetween(x + i, y - 1.5, x + i + 3, y + 1.5);
        if (left > 0) { glow(g, x + len * left, y, 8, R.ember, 0.15, 3); g.fillStyle(R.emberHot, 1); g.fillCircle(x + len * left, y, 2.5); }
        g.fillStyle(R.brass, 1); g.fillRect(x + len + 8, y - 4, 26, 8); g.fillCircle(x + len + 8, y, 5);
        g.fillStyle(R.timber, 1); g.fillRect(x + len + 14, y + 4, 6, 8);
        // Returns on the ball in play: a row of shot, filling as the rally goes on.
        const live = balls.reduce((m, b) => Math.max(m, b.returns), 0);
        for (let i = 0; i < MAX_RETURNS; i++) {
          g.fillStyle(i < live ? 0x3a3e44 : 0x000000, i < live ? 1 : 0.3); g.fillCircle(x + 6 + i * 14, y - 26, 5);
          if (i < live) { g.fillStyle(0x8a929c, 1); g.fillCircle(x + 4.5 + i * 14, y - 27.5, 1.5); }
        }
      },

      destroy() { for (const b of balls) b.target.remove(); },
    };
  },
};

/**
 * The swivel gun on its post: a tarred timber stanchion with a powder keg lashed to it, an iron
 * yoke, the bronze barrel swung to its aim, the fuse smoking on the touch-hole while it lays.
 * A gun not yet run out is drawn under canvas, lashed down.
 */
function drawGunPost(g: Phaser.GameObjects.Graphics, gun: Gun, t: number, time: number, out: boolean): void {
  const { x, y } = gun;
  shadow(g, x, y + 10, 44, 14);
  g.fillStyle(R.hull, 1); g.fillRect(x - 6, y - 16, 12, 28);
  g.fillStyle(R.hullLit, 1); g.fillRect(x - 6, y - 16, 4, 28);
  g.fillStyle(R.timber, 1); g.fillEllipse(x - gun.side * 20, y + 4, 18, 22);
  g.lineStyle(2, R.iron, 1); g.lineBetween(x - gun.side * 28, y - 2, x - gun.side * 12, y - 2); g.lineBetween(x - gun.side * 28, y + 8, x - gun.side * 12, y + 8);
  if (!out) {
    g.fillStyle(R.canvas, 1); g.fillRoundedRect(x - 18, y - 30, 36, 18, 6);
    g.lineStyle(1.5, R.rope, 1); g.lineBetween(x - 12, y - 30, x - 12, y - 12); g.lineBetween(x + 12, y - 30, x + 12, y - 12);
    return;
  }
  const recoil = Math.max(0, 1 - (time - gun.firedAt) / 220) * 8;
  const c = Math.cos(gun.ang), s = Math.sin(gun.ang);
  const bx = x - c * recoil, by = y - 20 - s * recoil * 0.5;
  g.lineStyle(3, R.iron, 1); g.lineBetween(x - 8, y - 14, x - 8, y - 22); g.lineBetween(x + 8, y - 14, x + 8, y - 22);
  g.lineStyle(10, 0x6a4a1a, 1); g.lineBetween(bx - c * 10, by - s * 6, bx + c * 26, by + s * 16);
  g.lineStyle(7, R.brass, 1); g.lineBetween(bx - c * 10, by - s * 6, bx + c * 26, by + s * 16);
  g.lineStyle(2, 0xf0d070, 0.8); g.lineBetween(bx - c * 8, by - s * 6 - 2, bx + c * 24, by + s * 15 - 2);
  g.fillStyle(0x6a4a1a, 1); g.fillCircle(bx + c * 27, by + s * 16.5, 5);
  g.fillStyle(0x15171a, 1); g.fillCircle(bx + c * 28, by + s * 17, 3);
  g.fillStyle(R.brass, 1); g.fillCircle(bx - c * 12, by - s * 7, 4);
  if (gun.warnAt >= 0) {
    const k = (time - gun.warnAt) / GUN_WARN;
    for (let i = 0; i < 4; i++) {
      g.fillStyle(R.emberHot, 1); g.fillCircle(bx - c * 4 + Math.sin(t * 30 + i) * 3, by - 6 - Math.abs(Math.cos(t * 24 + i)) * 5, 1.5);
    }
    glow(g, bx - c * 4, by - 6, 10 + k * 8, R.ember, 0.1, 3);
  }
  const fl = 1 - (time - gun.firedAt) / 140;
  if (fl > 0) {
    const mx = bx + c * 32, my = by + s * 19;
    g.fillStyle(R.emberHot, fl); g.fillTriangle(mx, my - 8, mx, my + 8, mx + c * 30, my + s * 30);
    g.fillStyle(R.flame, fl); g.fillCircle(mx + c * 6, my + s * 6, 9);
  }
}

import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { fallenId } from '../../../../meteor/spec';
import { Clock, S, alive, clamp, dist, jit } from '../util';

/**
 * LOOSE FROM THE PEN — Oda Galloway, Penkeeper (plasma).
 *
 * Behind the lightning gate north-east of the Rod Field is the Charging Pen, where Stormeye keeps
 * the ball lightning the rods catch. In the star's telling its keeper lets the balls out on whoever
 * the Prince points at. Ball lightning is a lazy, stupid thing: it follows the draught. Each ball
 * drifts after whichever fighter is stirring the air more — the one who has been walking, dashing,
 * running about — and bursts on touch, shocking and silencing whoever it meets.
 *
 * So the rule is about stillness. Stand still and a ball loses interest in you and wanders to the
 * other fighter; run and you call every ball in the yard. Balls are slower than a walk, so you can
 * always lead one away. And they can be STRUCK: a blow bats a ball away from the striker at speed,
 * and a batted ball bursts on the first fighter it reaches — bat it into Oda.
 *
 * Past half she throws the pen open: balls come two at a time, and two that touch fuse into a
 * great ball that stuns instead of silences.
 */

type Side = 'player' | 'npc';

interface Ball {
  x: number; y: number; vx: number; vy: number;
  r: number; big: boolean;
  bornAt: number;
  battedUntil: number;
  batBy: Side | null;
  seed: number;
  target: StrikeTarget;
  dead: boolean;
  trail: Pt[];
}

const MAX_SPEED = 118;
const LIFE_MS = 15000;

export const FALLEN_PEN: GimmickDef = {
  id: fallenId('stormeye', 'pen'),
  rules: 'Ball lightning follows the draught: it drifts after whoever is moving more and bursts on touch. Stand still to lose it; strike a ball to bat it away.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const GATE = { x: W - 34, y: top + (H - top) / 2 };
    const openMs = ctx.tk.warn(900);
    const balls: Ball[] = [];
    const stir: Record<Side, number> = { player: 0, npc: 0 };
    const last: Record<Side, Pt | null> = { player: null, npc: null };
    let now = 0;
    let nextRelease = -1;
    let gateAt = -1;
    let open = false;

    const bat = (b: Ball, by: Side): void => {
      if (b.dead) return;
      const f = fighterOf(by);
      const a = Math.atan2(b.y - f.y, b.x - f.x);
      b.vx = Math.cos(a) * 400; b.vy = Math.sin(a) * 400;
      b.battedUntil = now + 1300; b.batBy = by;
      ctx.sfx('zap');
    };

    const spawn = (dy: number): void => {
      const b: Ball = {
        x: GATE.x - 30, y: GATE.y + dy, vx: -80, vy: dy * 0.4, r: 16, big: false,
        bornAt: now, battedUntil: 0, batBy: null, seed: rng() * 100, dead: false, trail: [],
        target: null as unknown as StrikeTarget,
      };
      b.target = ctx.target({ x: b.x, y: b.y, r: 20, onStruck: (by) => bat(b, by) });
      balls.push(b);
    };

    const burst = (b: Ball, f: Fighter): void => {
      b.dead = true;
      b.target.remove();
      ctx.hit(f, b.big ? 20 : 12, b.x, b.y);
      if (b.big) ctx.stun(f, 650); else ctx.silence(f, 1400);
      ctx.flash(b.x, b.y, S.bolt);
      ctx.sfx(b.big ? 'thunder' : 'status-shock');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextRelease < 0) nextRelease = time + 1600;
        if (dt === 0) return;
        if (!open && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          open = true;
          ctx.banner('The Charging Pen stands open', '#c8b8ff');
          ctx.sfx('electric-charge');
        }

        // How hard each fighter is stirring the air: a smoothed walking speed.
        for (const side of ['player', 'npc'] as Side[]) {
          const f = fighterOf(side);
          const p = last[side];
          const v = p ? dist(p.x, p.y, f.x, f.y) / dt : 0;
          stir[side] += (Math.min(400, v) - stir[side]) * Math.min(1, dt * 3);
          last[side] = { x: f.x, y: f.y };
        }

        // The gate crackles, then lets one (or two) out.
        const cap = open ? 6 : 4;
        if (gateAt < 0 && time >= nextRelease && balls.length < cap) { gateAt = time + openMs; ctx.sfx('electric-charge'); }
        if (gateAt > 0 && time >= gateAt) {
          gateAt = -1;
          if (open) { spawn(-40); spawn(40); } else spawn(0);
          nextRelease = time + (open ? 4600 : 4000);
        }

        const draw: Side | null = Math.max(stir.player, stir.npc) < 35 ? null : stir.player >= stir.npc ? 'player' : 'npc';
        for (const b of balls) {
          if (b.dead) continue;
          const batted = time < b.battedUntil;
          if (batted) {
            b.vx *= 1 - dt * 0.6; b.vy *= 1 - dt * 0.6;
          } else {
            let tx: number, ty: number;
            if (draw) { const f = fighterOf(draw); tx = f.x; ty = f.y; } else { tx = W / 2 + Math.cos(time / 1700 + b.seed) * 260; ty = top + (H - top) / 2 + Math.sin(time / 1300 + b.seed) * 150; }
            const a = Math.atan2(ty - b.y, tx - b.x);
            b.vx += Math.cos(a) * 200 * dt; b.vy += Math.sin(a) * 200 * dt;
            const sp = Math.hypot(b.vx, b.vy);
            const max = b.big ? MAX_SPEED * 0.85 : MAX_SPEED;
            if (sp > max) { b.vx *= max / sp; b.vy *= max / sp; }
          }
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 30 || b.x > W - 30) { b.vx = -b.vx; b.x = clamp(b.x, 30, W - 30); }
          if (b.y < top + 20 || b.y > H - 24) { b.vy = -b.vy; b.y = clamp(b.y, top + 20, H - 24); }
          b.target.moveTo(b.x, b.y);
          b.trail.push({ x: b.x, y: b.y });
          if (b.trail.length > 10) b.trail.shift();
          for (const side of ['player', 'npc'] as Side[]) {
            const f = fighterOf(side);
            if (!alive(f) || b.dead) continue;
            // A ball just batted cannot burst back on the hand that batted it.
            if (batted && b.batBy === side && time < b.battedUntil - 900) continue;
            if (dist(f.x, f.y, b.x, b.y) < b.r + 20) burst(b, f);
          }
          if (!b.dead && time - b.bornAt > LIFE_MS) { b.dead = true; b.target.remove(); ctx.flash(b.x, b.y, S.boltGlow); }
        }
        // Fusing: two balls that touch become one great one.
        if (open) {
          for (const a of balls) for (const c of balls) {
            if (a === c || a.dead || c.dead || a.big || c.big) continue;
            if (dist(a.x, a.y, c.x, c.y) < a.r + c.r) {
              c.dead = true; c.target.remove();
              a.big = true; a.r = 26; a.x = (a.x + c.x) / 2; a.y = (a.y + c.y) / 2; a.bornAt = time;
              a.target.setRadius(30);
              ctx.sfx('plasma-arc');
              ctx.flash(a.x, a.y, S.boltHot);
            }
          }
        }
        for (let i = balls.length - 1; i >= 0; i--) if (balls[i].dead) balls.splice(i, 1);
      },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // A ball close and coming for him: step across its path rather than run from it.
        let near: Ball | null = null;
        for (const b of balls) if (!near || dist(b.x, b.y, n.x, n.y) < dist(near.x, near.y, n.x, n.y)) near = b;
        if (!near || dist(near.x, near.y, n.x, n.y) > 230) return null;
        if (stir.npc < stir.player && now >= near.battedUntil) return { x: n.x, y: n.y };
        const a = Math.atan2(n.y - near.y, n.x - near.x) + Math.PI / 2;
        return { x: clamp(n.x + Math.cos(a) * 160, 60, W - 60), y: clamp(n.y + Math.sin(a) * 160, top + 50, H - 50) };
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The pen gate on the east side: two copper posts, a lintel of glass insulators and three
        // live bars that buzz brighter as the keeper lifts them.
        const k = gateAt > 0 ? 1 - (gateAt - time) / openMs : 0;
        g.fillStyle(0x000000, 0.3); g.fillEllipse(GATE.x, GATE.y + 70, 60, 14);
        g.fillStyle(S.slateDark, 1); g.fillRect(GATE.x - 10, GATE.y - 74, 44, 148);
        for (const dy of [-70, 70]) {
          g.fillStyle(S.copperDark, 1); g.fillRect(GATE.x - 8, GATE.y + dy - 10, 16, 20);
          g.fillStyle(S.copper, 1); g.fillRect(GATE.x - 6, GATE.y + dy - 8, 12, 16);
          g.fillStyle(S.verdigris, 0.8); g.fillRect(GATE.x - 6, GATE.y + dy + 2, 12, 4);
          g.fillStyle(S.glass, 1); g.fillEllipse(GATE.x, GATE.y + dy - 12, 14, 6);
        }
        for (let i = 0; i < 3; i++) {
          const yy = GATE.y - 40 + i * 40;
          const lift = k * 26;
          g.lineStyle(3, S.copperDark, 1); g.lineBetween(GATE.x - 4, yy - lift, GATE.x + 4, yy - lift);
          const live = 0.35 + 0.4 * k + (Math.floor(time / 70 + i) % 3 === 0 ? 0.2 : 0);
          g.lineStyle(2, S.boltGlow, live);
          g.beginPath(); g.moveTo(GATE.x, GATE.y - 66);
          for (let s = 1; s <= 8; s++) g.lineTo(GATE.x + (jit(i * 10 + Math.floor(time / 90), s) - 0.5) * 10, GATE.y - 66 + s * 16.5);
          g.strokePath();
        }
        if (k > 0) { g.fillStyle(S.boltGlow, 0.12 * k); g.fillCircle(GATE.x - 20, GATE.y, 50 + k * 20); }
        // Scorched breadcrumbs where each ball has rolled, and its blue glow on the wet setts.
        for (const b of balls) {
          for (let i = 0; i < b.trail.length; i += 2) { g.fillStyle(0x10141c, 0.25 * (i / b.trail.length)); g.fillCircle(b.trail[i].x, b.trail[i].y + b.r * 0.6, 4); }
          g.fillStyle(S.boltGlow, 0.12); g.fillEllipse(b.x, b.y + b.r * 0.9, b.r * 4, b.r * 1.4);
          g.fillStyle(0x000000, 0.25); g.fillEllipse(b.x, b.y + b.r * 0.9, b.r * 1.6, b.r * 0.5);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const b of balls) {
          const batted = time < b.battedUntil;
          const fade = clamp((LIFE_MS - (time - b.bornAt)) / 1500, 0.25, 1);
          const bob = Math.sin(time / 220 + b.seed) * 3;
          const x = b.x, y = b.y - 10 + bob;
          // Halo, shell, writhing filaments, a hot core — whiter when batted.
          g.fillStyle(S.boltGlow, 0.14 * fade); g.fillCircle(x, y, b.r * 2.1);
          g.fillStyle(S.boltGlow, 0.3 * fade); g.fillCircle(x, y, b.r * 1.3);
          g.fillStyle(batted ? S.boltHot : 0x9a8cf0, 0.55 * fade); g.fillCircle(x, y, b.r);
          for (let i = 0; i < (b.big ? 7 : 5); i++) {
            const a0 = time / 300 * (i % 2 ? 1 : -1) + jit(b.seed, i) * 6.28;
            g.lineStyle(1.5, S.bolt, 0.85 * fade);
            g.beginPath(); g.moveTo(x, y);
            for (let s = 1; s <= 4; s++) {
              const rr = (b.r * s) / 4;
              const a = a0 + Math.sin(time / 90 + s + i) * 0.5;
              g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
            }
            g.strokePath();
          }
          g.fillStyle(0xffffff, 0.95 * fade); g.fillCircle(x, y, b.r * 0.32);
          // Sparks shed behind it.
          for (let i = 0; i < 4; i++) {
            const ph = ((time / 400) + jit(b.seed, i + 20)) % 1;
            g.fillStyle(S.bolt, (1 - ph) * 0.8 * fade); g.fillCircle(x - b.vx * ph * 0.25 + (jit(b.seed, i) - 0.5) * 10, y - b.vy * ph * 0.25 + ph * 10, 1.6);
          }
          // Which way the draught is pulling it: a faint thread to the one it follows.
          if (!batted) {
            const side: Side = stir.player >= stir.npc ? 'player' : 'npc';
            if (Math.max(stir.player, stir.npc) >= 35) {
              const f = fighterOf(side);
              if (dist(f.x, f.y, x, y) < 320) {
                g.lineStyle(1, S.boltGlow, 0.25);
                const mx = (x + f.x) / 2 + Math.sin(time / 120 + b.seed) * 8, my = (y + f.y) / 2 + Math.cos(time / 140) * 8;
                g.lineBetween(x, y, mx, my); g.lineBetween(mx, my, f.x, f.y - 20);
              }
            }
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // The draught gauge, bottom centre: two windsocks, the one stirring more filled and lit.
        const cx = W / 2, y = H - 26;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(cx - 120, y - 16, 240, 32, 8);
        const sock = (x: number, k: number, col: number, dir: number): void => {
          g.fillStyle(S.timberLit, 1); g.fillRect(x, y - 12, 3, 24);
          const len = 18 + k * 60;
          const droop = (1 - k) * 10;
          for (let i = 0; i < 4; i++) {
            const x0 = x + dir * (3 + (i * len) / 4), x1 = x + dir * (3 + ((i + 1) * len) / 4);
            const h0 = 8 - i * 1.5;
            g.fillStyle(i % 2 ? 0xf4f0ff : col, 1);
            g.fillPoints([{ x: x0, y: y - 10 + droop * (i / 4) }, { x: x1, y: y - 10 + droop * ((i + 1) / 4) }, { x: x1, y: y - 10 + droop * ((i + 1) / 4) + h0 }, { x: x0, y: y - 10 + droop * (i / 4) + h0 + 1.5 }], true);
          }
        };
        const kp = clamp(stir.player / 200, 0, 1), kn = clamp(stir.npc / 200, 0, 1);
        sock(cx - 8, kp, stir.player >= stir.npc ? S.boltGlow : S.slateLit, -1);
        sock(cx + 6, kn, stir.npc > stir.player ? S.boltGlow : S.slateLit, 1);
        if (open) { g.fillStyle(S.boltHot, 1); g.fillCircle(cx, y - 13, 3); }
      },

      destroy() {
        for (const b of balls) b.target.remove();
      },
    };
  },
};

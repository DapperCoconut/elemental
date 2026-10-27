import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { lit } from '../../../../../art/IsleArt';
import { Clock, S, SCOL, alive, clamp, dist, drawBolt, drawCloud, drawRod, jit } from '../util';

/**
 * LIGHTNING ROD — Rodsmith Volta.
 *
 * Five of Volta's copper rods stand about the yard, each grounding a ring of floor around it.
 * Every few seconds the cloud over the yard gathers — a crackle, a darkening, a long hum — and the
 * lightning comes down on *whoever stands farthest from a rod*. The gathering shows its pick live:
 * a crown of sparks over the head of whoever the sky has chosen, and it changes as you move.
 *
 * If both fighters are grounded, the sky settles for a rod instead — the one the farther fighter is
 * sheltering under — and a struck rod rings: a shock rolls out from its foot a heartbeat later, so
 * whoever was hugging it had better step clear. A struck rod runs hot for a while and grounds
 * nothing until it cools, so the safe copper keeps moving.
 *
 * The play is to stay closer to copper than Volta does — and, when you are both under rods, to be
 * the nearer one, so that it is his rod that sings.
 */

type Side = 'player' | 'npc';

interface Rod { x: number; y: number; hotUntil: number; ringAt: number; ringFrom: number; hit: Record<Side, boolean> }
interface Scorch { x: number; y: number; at: number; seed: number }

const GROUND_R = 95;
const RING_R = 150;
const RING_SPEED = 320;
const HUM_MS = 420;
const HOT_MS = 8000;

export const LIGHTNING_ROD: GimmickDef = {
  id: 'stormeye-lightning-rod',
  rules: 'Lightning strikes whoever stands farthest from a rod. If both of you are grounded, it hits the farther one\'s rod instead — and a struck rod rings out a shock: step clear. Struck rods run hot and ground nothing for a while.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const cy = top + (H - top) / 2;
    const rods: Rod[] = [
      { x: W * 0.2, y: top + 120 }, { x: W * 0.8, y: top + 120 }, { x: W * 0.5, y: cy + 10 },
      { x: W * 0.27, y: H - 80 }, { x: W * 0.73, y: H - 80 },
    ].map((p) => ({ ...p, hotUntil: 0, ringAt: -1, ringFrom: -1, hit: { player: false, npc: false } }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const every = ctx.hard ? 5400 : 6600;
    const gatherMs = ctx.tk.warn(1800);
    let now = 0;
    let nextAt = -1;
    let gatherFrom = -1;
    let strikeAt = -1;
    let flash: { x1: number; y1: number; x2: number; y2: number; at: number; seed: number } | null = null;
    const scorches: Scorch[] = [];

    /** Nearest *cool* rod to a point, and how far. */
    const nearestRod = (x: number, y: number): { rod: Rod | null; d: number } => {
      let best: Rod | null = null, bd = Infinity;
      for (const r of rods) {
        if (now < r.hotUntil) continue;
        const d = dist(x, y, r.x, r.y);
        if (d < bd) { bd = d; best = r; }
      }
      return { rod: best, d: bd };
    };

    /** What the sky would pick if it struck now. */
    const pick = (): { kind: 'sky'; side: Side } | { kind: 'rod'; rod: Rod; side: Side } | null => {
      const p = ctx.player, n = ctx.npc;
      const pa = alive(p), na = alive(n);
      if (!pa && !na) return null;
      const dp = pa ? nearestRod(p.x, p.y) : { rod: null, d: -1 };
      const dn = na ? nearestRod(n.x, n.y) : { rod: null, d: -1 };
      const side: Side = dp.d >= dn.d ? 'player' : 'npc';
      const g = side === 'player' ? dp : dn;
      if (!g.rod || g.d > GROUND_R) return { kind: 'sky', side };
      return { kind: 'rod', rod: g.rod, side };
    };

    const strike = (): void => {
      const pk = pick();
      if (!pk) return;
      if (pk.kind === 'sky') {
        const f = fighterOf(pk.side);
        flash = { x1: f.x + (jit(now, 1) - 0.5) * 80, y1: top - 10, x2: f.x, y2: f.y, at: now, seed: now % 997 };
        ctx.hit(f, ctx.hard ? 22 : 18, f.x, f.y);
        ctx.stun(f, 450);
        ctx.flash(f.x, f.y, S.bolt);
        ctx.sfx('thunder');
        ctx.float(f.x, f.y - 56, pk.side === 'player' ? 'STRUCK — GET TO COPPER' : 'VOLTA IS STRUCK', pk.side === 'player' ? SCOL.red : SCOL.green);
        scorches.push({ x: f.x, y: f.y + 16, at: now, seed: now % 331 });
      } else {
        const r = pk.rod;
        flash = { x1: r.x + (jit(now, 2) - 0.5) * 60, y1: top - 10, x2: r.x, y2: r.y - 104, at: now, seed: now % 991 };
        r.hotUntil = now + HOT_MS;
        r.ringFrom = now + HUM_MS;
        r.ringAt = now;
        r.hit = { player: false, npc: false };
        ctx.sfx('zap');
        ctx.float(r.x, r.y - 130, 'THE ROD RINGS', SCOL.violet);
        scorches.push({ x: r.x, y: r.y + 4, at: now, seed: now % 211 });
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (nextAt < 0) nextAt = time + 2600;
        if (dt === 0) return;
        if (gatherFrom < 0 && time >= nextAt) {
          gatherFrom = time; strikeAt = time + gatherMs;
          ctx.sfx('electric-charge');
        }
        if (gatherFrom >= 0 && time >= strikeAt) {
          strike();
          gatherFrom = -1; strikeAt = -1;
          nextAt = time + every;
        }
        // Ringing rods: a shock rolling out from the foot after the hum.
        for (const r of rods) {
          if (r.ringFrom < 0 || time < r.ringFrom) continue;
          const rad = 20 + ((time - r.ringFrom) / 1000) * RING_SPEED;
          if (rad > RING_R + 20) { r.ringFrom = -1; continue; }
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (r.hit[s] || !alive(f)) continue;
            const d = dist(f.x, f.y, r.x, r.y);
            if (d < rad && rad <= RING_R + 20 && d < RING_R) {
              r.hit[s] = true;
              ctx.hit(f, ctx.hard ? 14 : 11, f.x, f.y);
              ctx.flash(f.x, f.y, S.boltGlow);
              ctx.sfx('status-shock');
            }
          }
        }
        while (scorches.length && time - scorches[0].at > 4000) scorches.shift();
      },

      npcSeek(): Pt | null {
        if (gatherFrom < 0) return null;
        const n = ctx.npc;
        const pk = pick();
        if (!pk) return null;
        // The sky has picked him: get under the nearest cool rod.
        if (pk.kind === 'sky' && pk.side === 'npc') {
          const nr = nearestRod(n.x, n.y).rod;
          return nr ? { x: nr.x + (n.x < nr.x ? -30 : 30), y: nr.y + 24 } : null;
        }
        // It is his rod that is going to ring: step out of its reach, toward another rod.
        if (pk.kind === 'rod' && pk.side === 'npc') {
          const others = rods.filter((r) => r !== pk.rod && now >= r.hotUntil);
          const o = others.sort((a, b) => dist(n.x, n.y, a.x, a.y) - dist(n.x, n.y, b.x, b.y))[0];
          if (o) return { x: o.x, y: o.y + 26 };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Scorches where bolts went in: a black star, fading.
        for (const s of scorches) {
          const a = 1 - (time - s.at) / 4000;
          g.fillStyle(0x0c0e12, 0.55 * a); g.fillEllipse(s.x, s.y, 46, 18);
          for (let i = 0; i < 8; i++) {
            const an = (i / 8) * Math.PI * 2 + jit(s.seed, i) * 0.4, L = 24 + jit(s.seed, i + 9) * 26;
            g.lineStyle(2, 0x0c0e12, 0.5 * a); g.lineBetween(s.x, s.y, s.x + Math.cos(an) * L, s.y + Math.sin(an) * L * 0.45);
          }
        }
        // Each rod's grounded ring: a dotted copper circle, or an ember-red one while it runs hot.
        for (const r of rods) {
          const hot = time < r.hotUntil;
          const n = 28;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + time / 4000;
            g.fillStyle(hot ? 0xff6a3a : S.copperLit, hot ? 0.35 : 0.55);
            g.fillCircle(r.x + Math.cos(a) * GROUND_R, r.y + Math.sin(a) * GROUND_R * 0.62, 2);
          }
          g.fillStyle(hot ? 0xff6a3a : S.copper, hot ? 0.06 : 0.07); g.fillEllipse(r.x, r.y, GROUND_R * 2, GROUND_R * 1.24);
          // The shock rolling out.
          if (r.ringFrom > 0 && time >= r.ringFrom) {
            const rad = 20 + ((time - r.ringFrom) / 1000) * RING_SPEED;
            const f = clamp(1 - rad / (RING_R + 20), 0, 1);
            g.lineStyle(10, S.boltGlow, 0.35 * f); g.strokeEllipse(r.x, r.y, rad * 2, rad * 1.24);
            g.lineStyle(2.5, S.bolt, 0.9 * f); g.strokeEllipse(r.x, r.y, rad * 2, rad * 1.24);
          } else if (r.ringFrom > 0) {
            // The hum: the reach of the coming shock, shimmering.
            const k = clamp((time - r.ringAt) / HUM_MS, 0, 1);
            g.lineStyle(2, S.boltGlow, 0.3 + k * 0.5); g.strokeEllipse(r.x, r.y, RING_R * 2, RING_R * 1.24);
            g.fillStyle(S.boltGlow, 0.06 + k * 0.12); g.fillEllipse(r.x, r.y, RING_R * 2, RING_R * 1.24);
          }
        }
        // While it gathers: a spot of darkness under the chosen one.
        if (gatherFrom >= 0) {
          const pk = pick();
          const k = clamp((time - gatherFrom) / (strikeAt - gatherFrom), 0, 1);
          if (pk?.kind === 'sky') {
            const f = fighterOf(pk.side);
            g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(f.x, f.y + 18, 60 + k * 30, 20 + k * 10);
            g.lineStyle(2, S.boltGlow, 0.4 + k * 0.5); g.strokeEllipse(f.x, f.y + 18, 70, 24);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const r of rods) {
          const hot = time < r.hotUntil;
          let glow = 0;
          if (gatherFrom >= 0) glow = 0.3 + clamp((time - gatherFrom) / (strikeAt - gatherFrom), 0, 1) * 0.5;
          drawRod(g, r.x, r.y, 104, hot ? 0 : glow);
          if (hot) {
            // Running hot: the copper glows dull red down its length and smokes.
            const left = (r.hotUntil - time) / HOT_MS;
            g.fillStyle(0xff5a2a, 0.35 * left); g.fillRect(r.x - 3, r.y - 100, 6, 90);
            for (let i = 0; i < 3; i++) {
              const ph = (time / 900 + i / 3) % 1;
              g.fillStyle(0x8a8a9a, 0.3 * (1 - ph) * left); g.fillCircle(r.x + Math.sin(time / 300 + i) * 6, r.y - 110 - ph * 40, 4 + ph * 6);
            }
          }
        }
        // The gathering: a cloud building over the chosen one (or their rod), sparks round their head.
        if (gatherFrom >= 0) {
          const pk = pick();
          const k = clamp((time - gatherFrom) / (strikeAt - gatherFrom), 0, 1);
          if (pk) {
            const tx = pk.kind === 'sky' ? fighterOf(pk.side).x : pk.rod.x;
            drawCloud(g, tx, top + 14 + k * 10, 50 + k * 30, 0.5 + k * 0.4, k > 0.8 && Math.floor(time / 70) % 2 ? S.cloudLit : S.cloudDark, 7);
            if (pk.kind === 'sky') {
              const f = fighterOf(pk.side);
              for (let i = 0; i < 5; i++) {
                const a = time / 160 + (i / 5) * Math.PI * 2;
                const x = f.x + Math.cos(a) * 20, y = f.y - 44 + Math.sin(a) * 6;
                drawBolt(g, x, y, x + Math.cos(a + 1) * 8, y - 8, Math.floor(time / 50) + i, 0.7 + k * 0.3, 1, 3);
              }
            } else {
              // The rod's tip crackles and its reach shows faint before the strike.
              const r = pk.rod;
              for (let i = 0; i < 3; i++) drawBolt(g, r.x, r.y - 116, r.x + (jit(time, i) - 0.5) * 30, r.y - 136 - jit(time, i + 3) * 20, Math.floor(time / 40) + i, 0.8, 1, 4);
              g.lineStyle(1.5, S.boltGlow, 0.25 + k * 0.4); g.strokeEllipse(r.x, r.y, RING_R * 2, RING_R * 1.24);
            }
          }
        }
        // The strike itself: a bolt and a blink of white.
        if (flash) {
          const since = time - flash.at;
          if (since < 260) {
            const a = 1 - since / 260;
            drawBolt(g, flash.x1, flash.y1, flash.x2, flash.y2, flash.seed, a, 4.5, 34);
            g.fillStyle(S.bolt, 0.4 * a); g.fillCircle(flash.x2, flash.y2, 30 + since * 0.2);
          } else flash = null;
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // A white blink over everything as the bolt lands.
        if (flash && time - flash.at < 120) { g.fillStyle(0xffffff, 0.22 * (1 - (time - flash.at) / 120)); g.fillRect(0, 0, W, H); }
        // The charge gauge: a copper bar that fills toward the next strike and crackles while gathering.
        const x = W / 2 - 90, y = top + 6;
        g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 6, y - 4, 192, 16, 6);
        let k: number;
        if (gatherFrom >= 0) k = 1;
        else k = nextAt > 0 ? clamp(1 - (nextAt - time) / every, 0, 1) : 0;
        g.fillStyle(gatherFrom >= 0 && Math.floor(time / 80) % 2 ? S.bolt : S.copper, 1); g.fillRect(x, y, 180 * k, 8);
        g.fillStyle(lit(S.copper, 0.3), 1); g.fillRect(x, y, 180 * k, 2);
        // Who the sky wants: a pip on the left for you, the right for Volta.
        if (gatherFrom >= 0) {
          const pk = pick();
          if (pk) {
            const mine = pk.side === 'player';
            g.fillStyle(mine ? 0xff6a5a : 0x8af0a0, 1); g.fillCircle(mine ? x - 16 : x + 196, y + 4, 6);
          }
        }
      },
    };
  },
};

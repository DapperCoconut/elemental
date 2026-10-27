import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { live, SIDES } from './shared';
import { CAP_RED, CAP_VIOLET, CSS_GLOW, CSS_STEM, GLOW, GLOW_WASH, SPORE, WHITE } from '../palette';
import { toadstool } from '../sporeArt';

/**
 * Fairy Ring — Ringwarden Puck's fight.
 *
 * Rings sprout in PAIRS. Every few seconds a ring of red caps starts coming up round wherever
 * you stand, and at the same moment its twin — violet caps — starts coming up beside Puck. The
 * caps pop one by one round each circle, and a trail of fairy-lights runs between the two so you
 * can see which door leads where. When the last cap is up, both rings **close**: anyone inside
 * either ring is whisked out of the other, spat onto the moss **ring-dizzy** — held in place for
 * a moment and taking 30% more for a couple of seconds after.
 *
 * Puck's trick is to wait beside the violet ring for you to come out of it dizzy. But a ring is a
 * door both ways: step out of yours before it shuts, or — better — walk into *his* twin and let
 * the door carry him out next to you instead, while you stand in his place. He cannot stand in a
 * ring when it shuts without going through it himself.
 */

const R = 86;
const DIZZY_MS = 700;
const DIZZY_TAKEN = 1.3;
const DIZZY_LONG_MS = 2200;
const CAPS = 14;

interface Ring {
  x: number; y: number;
  /** The other ring of the pair — the door this one leads to. */
  twin: Ring | null;
  born: number;
  closeAt: number;
  closed: boolean;
  /** When it withers after closing. */
  goneAt: number;
  cap: number;
  seed: number;
  /** 'home' rings sprout under the player; 'twin' rings beside Puck. */
  kind: 'home' | 'twin';
}

export const FAIRY_RING: GimmickDef = {
  id: 'spore-fairy-ring',
  rules: 'Rings sprout in pairs, one round you and one by Puck. When they close, whoever is inside one comes out of the other, dizzy.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const every = hard ? 3600 : 4600;
    const sprout = hard ? 1500 : 1850;
    let rings: Ring[] = [];
    let nextAt = ctx.scene.time.now + 2400;
    let pairs = 0;
    const dizzyUntil = { p: 0, n: 0 };
    const tenderUntil = { p: 0, n: 0 };
    const arrivals: { x: number; y: number; at: number }[] = [];

    const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const inside = (r: Ring, f: Fighter): boolean => Phaser.Math.Distance.Between(f.x, f.y, r.x, r.y) < R - 6;
    const clampPt = (x: number, y: number): Pt => ({ x: Phaser.Math.Clamp(x, R + 10, W - R - 10), y: Phaser.Math.Clamp(y, top + R * 0.8, H - R * 0.8) });

    const spawnPair = (time: number): void => {
      const p = ctx.player, n = ctx.npc;
      const home = clampPt(p.x, p.y);
      // The twin by Puck, but never on top of the home ring.
      let twin = clampPt(n.x + (ctx.rng() - 0.5) * 160, n.y + (ctx.rng() - 0.5) * 120);
      for (let i = 0; i < 10 && Phaser.Math.Distance.Between(twin.x, twin.y, home.x, home.y) < R * 2.6; i++) {
        const a = ctx.rng() * Math.PI * 2;
        twin = clampPt(home.x + Math.cos(a) * 330, home.y + Math.sin(a) * 240);
      }
      const seed = Math.floor(ctx.rng() * 1000);
      const a: Ring = { ...home, twin: null, born: time, closeAt: time + sprout, closed: false, goneAt: time + sprout + 2600, cap: CAP_RED, seed, kind: 'home' };
      const b: Ring = { ...twin, twin: a, born: time, closeAt: time + sprout, closed: false, goneAt: time + sprout + 2600, cap: CAP_VIOLET, seed: seed + 7, kind: 'twin' };
      a.twin = b;
      rings.push(a, b);
      ctx.sfx('sparkle');
    };

    const close = (r: Ring, time: number, moved: Set<Fighter>): void => {
      r.closed = true;
      const to = r.twin;
      if (!to) return;
      for (const k of SIDES) {
        const f = fOf(k);
        if (!live(f) || moved.has(f) || !inside(r, f)) continue;
        moved.add(f);
        const ox = (f.x - r.x) * 0.4, oy = (f.y - r.y) * 0.4;
        ctx.nudge(f, to.x + ox - f.x, to.y + oy - f.y);
        ctx.root(f, DIZZY_MS);
        dizzyUntil[k] = time + DIZZY_MS;
        tenderUntil[k] = time + DIZZY_LONG_MS;
        ctx.hit(f, hard ? 6 : 4, f.x, f.y);
        arrivals.push({ x: f.x, y: f.y, at: time });
        ctx.float(f.x, f.y - 44, k === 'p' ? 'RING-DIZZY' : 'PUCK TAKES THE WRONG DOOR', k === 'p' ? CSS_STEM : CSS_GLOW);
      }
    };

    return {
      update(time) {
        if (time >= nextAt) {
          nextAt = time + every;
          pairs++;
          spawnPair(time);
          // Hard mode: every third time, a second pair a beat later, from where you will run to.
          if (hard && pairs % 3 === 0) ctx.scene.time.delayedCall(700, () => spawnPair(ctx.scene.time.now));
        }
        // Close — both rings of a pair in the same instant, so a fighter only travels once.
        const moved = new Set<Fighter>();
        for (const r of rings) {
          if (!r.closed && time >= r.closeAt) {
            close(r, time, moved);
            if (r.twin && !r.twin.closed) close(r.twin, time, moved);
            ctx.sfx('teleport');
          }
        }
        rings = rings.filter((r) => time < r.goneAt);
        while (arrivals.length && time - arrivals[0].at > 700) arrivals.shift();
      },

      playerTakenMult: () => (ctx.scene.time.now < tenderUntil.p ? DIZZY_TAKEN : 1),
      npcTakenMult: () => (ctx.scene.time.now < tenderUntil.n ? DIZZY_TAKEN : 1),

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        // Get out of any ring that is about to shut — the short way, out through the caps.
        for (const r of rings) {
          if (r.closed || !inside(r, n)) continue;
          const a = Math.atan2(n.y - r.y, n.x - r.x);
          return clampPt(r.x + Math.cos(a) * (R + 50), r.y + Math.sin(a) * (R + 50));
        }
        // An open pair with the player inside the home ring: wait at the twin's rim to pounce.
        for (const r of rings) {
          if (r.closed || r.kind !== 'twin' || !r.twin) continue;
          if (!inside(r.twin, p)) continue;
          const a = Math.atan2(r.y - r.twin.y, r.x - r.twin.x);
          if (t > r.closeAt - 900) return clampPt(r.x + Math.cos(a) * (R + 36), r.y + Math.sin(a) * (R + 36));
        }
        // The player has come out dizzy: close in.
        if (t < dizzyUntil.p + 400) return { x: p.x, y: p.y };
        return null;
      },

      drawGround(g, time) {
        for (const r of rings) {
          const k = Phaser.Math.Clamp((time - r.born) / Math.max(1, r.closeAt - r.born), 0, 1);
          const fade = r.closed ? Phaser.Math.Clamp((r.goneAt - time) / 1200, 0, 1) : 1;
          // A pale ring in the moss shows where the caps will stand, then fills as they pop.
          g.lineStyle(2, r.kind === 'home' ? SPORE : GLOW, (0.25 + 0.4 * k) * fade);
          g.strokeCircle(r.x, r.y, R);
          g.fillStyle(r.kind === 'home' ? SPORE : GLOW, (0.04 + 0.1 * k) * fade);
          g.fillCircle(r.x, r.y, R);
          if (!r.closed && k > 0.75) {
            // Shutting: the inside shimmers and the rim tightens.
            const pulse = 0.5 + 0.5 * Math.sin(time / 50);
            g.lineStyle(4, WHITE, 0.25 + 0.35 * pulse); g.strokeCircle(r.x, r.y, R - 4 - (1 - k) * 20);
          }
          if (r.closed && time - r.closeAt < 500) {
            const q = (time - r.closeAt) / 500;
            g.lineStyle(6 * (1 - q), GLOW_WASH, 1 - q); g.strokeCircle(r.x, r.y, R * (0.4 + q * 0.6));
          }
        }
        // Fairy-lights between twins: a dotted trail of motes, flowing from home to twin.
        for (const r of rings) {
          if (r.kind !== 'home' || !r.twin || r.closed) continue;
          const b = r.twin;
          const d = Phaser.Math.Distance.Between(r.x, r.y, b.x, b.y);
          const n = Math.floor(d / 26);
          const mx = (r.x + b.x) / 2, my = (r.y + b.y) / 2 - d * 0.18;
          for (let i = 0; i <= n; i++) {
            const t = ((i / n) + time / 2400) % 1;
            const x = (1 - t) * (1 - t) * r.x + 2 * (1 - t) * t * mx + t * t * b.x;
            const y = (1 - t) * (1 - t) * r.y + 2 * (1 - t) * t * my + t * t * b.y;
            g.fillStyle(GLOW_WASH, 0.35 + 0.35 * Math.sin(time / 120 + i)); g.fillCircle(x, y, 2.2);
          }
        }
      },

      drawAir(g, time) {
        // The caps themselves, popping up one at a time round each circle.
        for (const r of rings) {
          const k = Phaser.Math.Clamp((time - r.born) / Math.max(1, r.closeAt - r.born), 0, 1);
          const fade = r.closed ? Phaser.Math.Clamp((r.goneAt - time) / 1200, 0, 1) : 1;
          const up = r.closed ? CAPS : Math.floor(k * CAPS);
          for (let i = 0; i < up; i++) {
            const a = (i / CAPS) * Math.PI * 2 + r.seed;
            const popT = r.born + ((i + 1) / CAPS) * (r.closeAt - r.born);
            const grow = Phaser.Math.Clamp((time - popT) / 160 + 1, 0.3, 1.15);
            const s = (7 + ((i * 0.61 + r.seed) % 1) * 3) * Math.min(1, grow) * (r.closed ? 0.6 + 0.4 * fade : 1);
            toadstool(g, r.x + Math.cos(a) * R, r.y + Math.sin(a) * R + 6, s, r.cap, true, fade, i + r.seed);
          }
        }
        // Arrival puffs: a ring of sparkles round whoever was spat out.
        for (const a of arrivals) {
          const q = (time - a.at) / 700;
          for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + q * 2;
            g.fillStyle(GLOW_WASH, 1 - q); g.fillCircle(a.x + Math.cos(ang) * (20 + q * 30), a.y + Math.sin(ang) * (14 + q * 20), 2.5);
          }
        }
        // Dizzy fighters: little caps orbiting the head instead of stars.
        for (const k of SIDES) {
          const f = fOf(k);
          if (time > tenderUntil[k] || !live(f)) continue;
          for (let i = 0; i < 3; i++) {
            const ang = time / 220 + (i / 3) * Math.PI * 2;
            toadstool(g, f.x + Math.cos(ang) * 18, f.y - 36 + Math.sin(ang) * 6, 4, i % 2 ? CAP_VIOLET : CAP_RED, false, 0.9, i);
          }
        }
      },

      drawHud(g) {
        // The next pair: a little ring of pips that fills toward it.
        const t = ctx.scene.time.now;
        const k = Phaser.Math.Clamp(1 - (nextAt - t) / every, 0, 1);
        const cx = W / 2, cy = 112;
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i / 10) * Math.PI * 2;
          g.fillStyle(i / 10 < k ? CAP_RED : 0x2b221a, 1);
          g.fillCircle(cx + Math.cos(a) * 12, cy + Math.sin(a) * 9, 2.6);
        }
        if (t < tenderUntil.p) { g.fillStyle(SPORE, 0.9); g.fillCircle(cx - 26, cy, 4); }
        if (t < tenderUntil.n) { g.fillStyle(GLOW, 0.9); g.fillCircle(cx + 26, cy, 4); }
      },
    };
  },
};

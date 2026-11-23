import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { glow, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, R, RCOL, alive, dist, drawCrack, drawGlint, jit } from '../util';

/**
 * TAKEN IN LIKENESS — Limner Aurelie Frane (echo).
 *
 * The Prince's court limner draws every face in Rimefast for his files; in the star's telling she
 * also carves them. Every couple of seconds a likeness of you stands up out of the ice where you
 * were a moment ago — a rough ice statue that echoes you. A likeness left standing begins to
 * testify: its eyes catch ember-gold, then it fires a bolt of evidence at you, again and again.
 *
 * Break them — but a struck likeness cracks for a beat and then bursts, and the shards hurt
 * anyone close, either side. They also stand in the way of shots, his as well as yours.
 * Halfway down she has your measure: the likenesses are carved where you are GOING.
 *
 * The exploit: walk the Limner past your own likenesses, then strike one as she reaches it. And
 * a likeness standing between you is a wall her bolts break on.
 */

interface Statue {
  x: number; y: number; born: number; seed: number;
  face: number;
  target: StrikeTarget;
  crackAt: number;
  warnAt: number;
  nextTestify: number;
}

interface Track { t: number; x: number; y: number }

const MAX_STATUES = 6;
const GROW_MS = 520;
const CRACK_MS = 650;
const BURST_R = 84;
const BURST_DMG = 14;
const FIRST_TESTIFY = 4300;
const TESTIFY_EVERY = 3800;
const TESTIFY_WARN = 720;

export const FALLEN_LIKENESS: GimmickDef = {
  id: fallenId('rimefast', 'likeness'),
  rules: 'Ice likenesses of you rise where you were and, left standing, shoot at you. Strike one and it bursts a beat later, hurting whoever is close.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, tk, rng } = ctx;
    const statues: Statue[] = [];
    const track: Track[] = [];
    let now = 0;
    let nextCarve = 2400;
    let nextSample = 0;
    let measured = false;
    const bursts: { x: number; y: number; at: number; seed: number }[] = [];

    const where = (msAgo: number): Pt | null => {
      const want = now - msAgo;
      for (let i = track.length - 1; i >= 0; i--) if (track[i].t <= want) return track[i];
      return null;
    };

    const shatter = (s: Statue): void => {
      s.target.remove();
      statues.splice(statues.indexOf(s), 1);
      bursts.push({ x: s.x, y: s.y, at: now, seed: s.seed });
      ctx.sfx('ice-shatter');
      for (const f of [ctx.player, ctx.npc] as Fighter[]) {
        if (!alive(f) || ctx.isAirborne(f) || dist(f.x, f.y, s.x, s.y) > BURST_R + 20) continue;
        ctx.hit(f, BURST_DMG, s.x, s.y);
        if (f === ctx.npc) ctx.float(f.x, f.y - 52, 'CUT ON HER OWN WORK', RCOL.green);
      }
    };

    const carve = (p: Pt): void => {
      const x = tk.clampX(p.x, 50), y = tk.clampY(Math.max(top + 40, p.y), 40);
      if (dist(x, y, ctx.player.x, ctx.player.y) < 46 || dist(x, y, ctx.npc.x, ctx.npc.y) < 46) return;
      if (statues.some((s) => dist(s.x, s.y, x, y) < 60)) return;
      const s: Statue = {
        x, y, born: now, seed: rng() * 100, face: Math.atan2(ctx.npc.y - y, ctx.npc.x - x),
        crackAt: -1, warnAt: -1, nextTestify: now + FIRST_TESTIFY,
        target: ctx.target({ x, y: y - 18, r: 20, onStruck: () => { if (s.crackAt < 0 && now - s.born > GROW_MS) { s.crackAt = now; ctx.sfx('crystal-chime'); } } }),
      };
      statues.push(s);
      ctx.sfx('stone-rise');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        const p = ctx.player;
        if (time >= nextSample) { track.push({ t: time, x: p.x, y: p.y }); nextSample = time + 100; while (track.length > 40) track.shift(); }
        if (!measured && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          measured = true;
          ctx.banner('SHE HAS YOUR MEASURE — likenesses rise where you are going', RCOL.warm);
          ctx.sfx('curse-cast');
        }
        if (time >= nextCarve && alive(p)) {
          nextCarve = time + (measured ? 2100 : 2500);
          if (statues.length < MAX_STATUES) {
            if (measured) {
              const back = where(300);
              const vx = back ? (p.x - back.x) / 0.3 : 0, vy = back ? (p.y - back.y) / 0.3 : 0;
              carve({ x: p.x + vx * 0.9, y: p.y + vy * 0.9 + (Math.hypot(vx, vy) < 30 ? 90 : 0) });
            } else {
              const then = where(1600);
              if (then) carve(then);
            }
          }
        }
        for (const s of [...statues]) {
          if (s.crackAt >= 0) { if (time - s.crackAt >= CRACK_MS) shatter(s); continue; }
          if (s.warnAt < 0 && time >= s.nextTestify) { s.warnAt = time; tk.sfx('beam-charge'); }
          if (s.warnAt >= 0 && time - s.warnAt >= TESTIFY_WARN) {
            s.warnAt = -1;
            s.nextTestify = time + TESTIFY_EVERY;
            if (alive(p)) {
              tk.spawnBullet({ x: s.x, y: s.y - 30, angle: Math.atan2(p.y - (s.y - 30), p.x - s.x), speed: 280, damage: 9, r: 6, color: 0xffa040, lifeMs: 3200 });
              ctx.sfx('sonic-pulse');
            }
          }
        }
        while (bursts.length && time - bursts[0].at > 700) bursts.shift();
      },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Out of reach of anything cracking.
        for (const s of statues) {
          if (s.crackAt < 0 || dist(s.x, s.y, n.x, n.y) > BURST_R + 40) continue;
          const a = Math.atan2(n.y - s.y, n.x - s.x);
          return { x: tk.clampX(s.x + Math.cos(a) * (BURST_R + 80)), y: tk.clampY(s.y + Math.sin(a) * (BURST_R + 80)) };
        }
        // You are standing at a likeness: she comes round its far side to strike it on you.
        for (const s of statues) {
          if (s.crackAt >= 0 || dist(s.x, s.y, p.x, p.y) > BURST_R) continue;
          const a = Math.atan2(s.y - p.y, s.x - p.x);
          return { x: tk.clampX(s.x + Math.cos(a) * 100), y: tk.clampY(s.y + Math.sin(a) * 100) };
        }
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        for (const s of statues) {
          // The plinth: snow packed and squared off, chisel chips scattered round it.
          shadow(g, s.x + 6, s.y + 2, 58, 18, 0.3);
          g.fillStyle(R.snowBlue, 1); g.fillEllipse(s.x, s.y + 2, 50, 18);
          g.fillStyle(R.snow, 1); g.fillEllipse(s.x - 1, s.y, 46, 15);
          for (let i = 0; i < 7; i++) {
            const a = jit(s.seed, i) * Math.PI * 2, d = 28 + jit(s.seed, i + 9) * 16;
            g.fillStyle(R.iceLit, 0.85); g.fillTriangle(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d * 0.5, s.x + Math.cos(a) * d + 4, s.y + Math.sin(a) * d * 0.5 + 1, s.x + Math.cos(a) * d + 1, s.y + Math.sin(a) * d * 0.5 - 3);
          }
          // The limner's brass tag at the plinth's foot.
          g.fillStyle(R.brass, 1); g.fillRect(s.x - 6, s.y + 3, 12, 5);
          g.lineStyle(1, 0x6a4a1a, 1); g.lineBetween(s.x - 4, s.y + 5.5, s.x + 4, s.y + 5.5);
          if (s.crackAt >= 0) {
            const k = (time - s.crackAt) / CRACK_MS;
            g.lineStyle(2, R.scarf, 0.4 + k * 0.5); g.strokeCircle(s.x, s.y, BURST_R * (0.6 + k * 0.4));
            g.fillStyle(R.scarf, 0.06 + k * 0.1); g.fillCircle(s.x, s.y, BURST_R);
          }
        }
        for (const b of bursts) {
          const k = (time - b.at) / 700;
          drawCrack(g, b.x, b.y, BURST_R * 0.7, b.seed, 1, 1 - k);
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const s of statues) {
          const grow = Math.min(1, (time - s.born) / GROW_MS);
          drawStatue(g, s, grow, t, time);
          if (s.warnAt >= 0) {
            const k = (time - s.warnAt) / TESTIFY_WARN;
            const p = ctx.player;
            g.lineStyle(1.5, 0xffa040, 0.15 + k * 0.45);
            g.lineBetween(s.x, s.y - 50, p.x, p.y);
            glow(g, s.x, s.y - 50, 14 + k * 10, 0xffa040, 0.06 + k * 0.05, 3);
          }
          if (grow < 1) for (let i = 0; i < 4; i++) {
            const a = t * 12 + i * 1.7;
            g.fillStyle(R.glassLit, 1 - grow); g.fillCircle(s.x + Math.cos(a) * 20 * grow, s.y - 30 - Math.abs(Math.sin(a)) * 30, 2);
          }
        }
        for (const b of bursts) {
          const k = (time - b.at) / 700;
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2 + b.seed;
            const d = BURST_R * k * (0.7 + jit(b.seed, i) * 0.5);
            const x = b.x + Math.cos(a) * d, y = b.y - 30 + Math.sin(a) * d * 0.7 + k * k * 30;
            g.fillStyle(i % 3 ? R.ice : R.glassLit, 1 - k);
            g.fillTriangle(x - 4, y, x + 4, y + 1, x + Math.cos(a) * 7, y + Math.sin(a) * 7);
          }
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics, time: number) {
        // The limner's file: six frames along the foot of the screen, one per likeness taken.
        const fw = 34, gap = 8, total = MAX_STATUES * fw + (MAX_STATUES - 1) * gap;
        const x0 = W / 2 - total / 2, y0 = H - 54;
        g.fillStyle(R.timberDark, 0.85); g.fillRoundedRect(x0 - 10, y0 - 8, total + 20, 52, 5);
        for (let i = 0; i < MAX_STATUES; i++) {
          const x = x0 + i * (fw + gap);
          g.fillStyle(R.brass, 1); g.fillRect(x, y0, fw, 38);
          g.fillStyle(0x1e2830, 1); g.fillRect(x + 3, y0 + 3, fw - 6, 32);
          const s = statues[i];
          if (!s) continue;
          const hot = s.warnAt >= 0 || s.crackAt >= 0;
          const c = s.crackAt >= 0 ? R.scarf : R.ice;
          g.fillStyle(c, 1); g.fillCircle(x + fw / 2, y0 + 12, 5);
          g.fillRoundedRect(x + fw / 2 - 6, y0 + 17, 12, 14, 3);
          if (s.warnAt >= 0 || time - s.born < 400) { g.fillStyle(0xffa040, 1); g.fillCircle(x + fw / 2 - 2, y0 + 11, 1.2); g.fillCircle(x + fw / 2 + 2, y0 + 11, 1.2); }
          if (hot && Math.floor(time / 150) % 2 === 0) { g.lineStyle(2, 0xffa040, 0.9); g.strokeRect(x - 1, y0 - 1, fw + 2, 40); }
          // A thin bar under the frame: how long until this one speaks.
          const k = s.crackAt >= 0 ? 1 : Math.max(0, Math.min(1, 1 - (s.nextTestify - time) / TESTIFY_EVERY));
          g.fillStyle(0xffa040, 0.8); g.fillRect(x + 2, y0 + 36, (fw - 4) * k, 2);
        }
      },

      destroy() { for (const s of statues) s.target.remove(); },
    };
  },
};

/**
 * A likeness in rough ice: two legs, a coat roughed out in planes, arms at the sides, a head with
 * the brow cut in — lit along one edge, chisel facets across it, and (when it testifies) two
 * ember-gold eyes. `grow` raises it from the plinth.
 */
function drawStatue(g: Phaser.GameObjects.Graphics, s: Statue, grow: number, t: number, time: number): void {
  const x = s.x, base = s.y - 2;
  const h = 58 * grow;
  const lean = Math.cos(s.face) * 3;
  const shake = s.crackAt >= 0 ? Math.sin(time * 0.09) * 1.6 : 0;
  const cx = x + shake;
  const k = h / 58;
  // Legs.
  g.fillStyle(R.iceDeep, 0.95);
  g.fillRect(cx - 9, base - 18 * k, 7, 18 * k); g.fillRect(cx + 2, base - 18 * k, 7, 18 * k);
  // Coat.
  g.fillStyle(R.iceDark, 0.9); g.fillRoundedRect(cx - 13 + lean * 0.3, base - 44 * k, 26, 28 * k, 5);
  g.fillStyle(R.ice, 0.95); g.fillRoundedRect(cx - 12 + lean * 0.3, base - 44 * k, 22, 27 * k, 5);
  g.fillStyle(R.glassLit, 0.8); g.fillTriangle(cx - 11, base - 42 * k, cx - 4, base - 42 * k, cx - 10, base - 20 * k);
  // Arms.
  g.lineStyle(5, R.iceDeep, 0.95);
  g.lineBetween(cx - 13, base - 40 * k, cx - 16, base - 20 * k); g.lineBetween(cx + 13, base - 40 * k, cx + 16 + lean, base - 20 * k);
  // Head.
  if (grow > 0.6) {
    const hy = base - 52 * k;
    g.fillStyle(R.iceDeep, 1); g.fillCircle(cx + lean, hy + 1, 9);
    g.fillStyle(R.ice, 1); g.fillCircle(cx + lean - 0.5, hy, 8.5);
    g.fillStyle(R.glassLit, 0.9); g.fillCircle(cx + lean - 3, hy - 3, 3);
    g.lineStyle(1, R.iceDark, 0.8); g.lineBetween(cx + lean - 6, hy - 1, cx + lean + 6, hy - 1);
    const eyes = s.warnAt >= 0 || time - s.born < 500;
    if (eyes) { g.fillStyle(0xffa040, 1); g.fillCircle(cx + lean - 3, hy + 1, 1.7); g.fillCircle(cx + lean + 3, hy + 1, 1.7); }
  }
  // Chisel facets: short diagonal cuts across the coat.
  for (let i = 0; i < 4; i++) {
    const yy = base - (22 + i * 6) * k;
    g.lineStyle(1, R.iceDark, 0.5); g.lineBetween(cx - 8 + jit(s.seed, i) * 6, yy, cx + jit(s.seed, i + 3) * 8, yy - 4);
  }
  if (s.crackAt >= 0) {
    const c = (time - s.crackAt) / CRACK_MS;
    drawCrack(g, cx, base - 32 * k, 26, s.seed, c, 1);
    glow(g, cx, base - 30 * k, 30, R.scarf, 0.05 * c, 3);
  }
  drawGlint(g, cx - 8, base - 44 * k, 4, 0.3 + Math.sin(t * 2.4 + s.seed) * 0.3);
}

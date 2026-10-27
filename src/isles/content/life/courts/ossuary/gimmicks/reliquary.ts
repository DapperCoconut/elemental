import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, O, OCOL, alive, clamp, dist, drawBone, drawCandle, drawFlame, jit } from '../util';

/**
 * RELIQUARY — Keeper Vertebra.
 *
 * Four reliquaries stand on plinths about the chapel floor, gilt caskets with a little glass
 * window and a saint's knuckle inside. A saint is forgiving: stand at a reliquary and it mends
 * you, until its virtue runs dry (it fills again while nobody leans on it).
 *
 * Vertebra kneels at them one by one and consecrates them *to herself*. A consecration takes a few
 * seconds of prayer, shown as a ring of gold closing round the casket — hurt her enough while she
 * prays and the prayer breaks. A consecrated reliquary is hers: a golden thread runs from it to
 * her and mends her from anywhere, and its halo scorches anyone else who comes close.
 *
 * Desecrate it. Get onto its plinth through the burning halo and prise the seal (a moment's
 * work) and it cracks open — the knuckle spills, the thread snaps, and that saint is nobody's. Break
 * all four and there is nothing left loving her: she takes more from everything.
 */

type State = 'free' | 'hers' | 'broken';

interface Casket {
  x: number; y: number; seed: number;
  state: State;
  /** Healing left in a free casket. */
  virtue: number;
  /** Her prayer, 0..1. */
  prayer: number;
  /** Damage she has taken during this prayer. */
  prayerHurt: number;
  /** Your prising, 0..1. */
  prise: number;
  changedAt: number;
}

const VIRTUE = 60;
const MEND_R = 58;
const HALO_R = 92;
const PLINTH_R = 34;
const PRISE_MS = 800;
const BREAK_PRAYER = 22;

export const RELIQUARY: GimmickDef = {
  id: 'ossuary-reliquary',
  rules: 'Stand at a reliquary to be mended. Vertebra consecrates them to herself (hurt her to break the prayer); hers mend her from afar and scorch you. Stand on one\'s plinth to prise it open — break all four and she weakens.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const caskets: Casket[] = [
      { x: 170, y: top + 120 }, { x: W - 170, y: top + 120 }, { x: 170, y: H - 90 }, { x: W - 170, y: H - 90 },
    ].map((p, i) => ({ ...p, seed: i * 3.7 + 2, state: 'free' as State, virtue: VIRTUE, prayer: 0, prayerHurt: 0, prise: 0, changedAt: -9999 }));
    let now = 0;
    let internal = false;
    let lastScorch = 0;
    const healAcc = { player: 0, npc: 0 };
    let threadAcc = 0;
    let praying: Casket | null = null;
    const spill: { x: number; y: number; vx: number; vy: number; at: number; a: number; fy: number }[] = [];
    const prayMs = ctx.hard ? 2400 : 3200;

    const mend = (f: Fighter, key: 'player' | 'npc', c: Casket, dt: number): void => {
      if (c.virtue <= 0) return;
      const amt = 7 * dt;
      c.virtue = Math.max(0, c.virtue - amt);
      healAcc[key] += amt;
      if (healAcc[key] >= 2) { ctx.heal(f, Math.floor(healAcc[key])); healAcc[key] -= Math.floor(healAcc[key]); }
    };

    const desecrate = (c: Casket): void => {
      c.state = 'broken';
      c.changedAt = now;
      c.prise = 0;
      for (let i = 0; i < 8; i++) {
        const a = -Math.PI / 2 + (jit(c.seed, i) - 0.5) * 2.4;
        spill.push({ x: c.x, y: c.y - 30, vx: Math.cos(a) * (90 + jit(c.seed, i + 4) * 80), vy: Math.sin(a) * 140, at: now, a: jit(c.seed, i + 8) * 6, fy: c.y + 8 + jit(c.seed, i + 12) * 18 });
      }
      ctx.sfx('crystal-shatter');
      ctx.sfx('curse-cast');
      ctx.flash(c.x, c.y - 30, O.holy);
      ctx.float(c.x, c.y - 70, 'DESECRATED', OCOL.red);
      if (caskets.every((k) => k.state === 'broken')) ctx.banner('NO SAINT KEEPS HER', '#fff0b8');
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        const p = ctx.player, n = ctx.npc;
        let scorched = false;
        praying = null;
        for (const c of caskets) {
          const dp = alive(p) ? dist(p.x, p.y, c.x, c.y) : Infinity;
          const dn = alive(n) ? dist(n.x, n.y, c.x, c.y) : Infinity;
          if (c.state === 'free') {
            if (dp < MEND_R) mend(p, 'player', c, dt);
            if (dn < MEND_R) mend(n, 'npc', c, dt);
            if (dp >= MEND_R && dn >= MEND_R) c.virtue = Math.min(VIRTUE, c.virtue + 3 * dt);
            // Her prayer: kneeling close, it closes; away, it fades.
            if (dn < MEND_R) {
              c.prayer += (dt * 1000) / prayMs;
              praying = c;
              if (c.prayer >= 1) {
                c.state = 'hers';
                c.changedAt = now;
                c.prayer = 0;
                ctx.sfx('holy-chord');
                ctx.float(c.x, c.y - 70, 'CONSECRATED TO VERTEBRA', OCOL.holy);
              }
            } else {
              c.prayer = Math.max(0, c.prayer - dt * 0.5);
              c.prayerHurt = 0;
            }
          } else if (c.state === 'hers') {
            // The thread: it mends her wherever she is.
            if (alive(n)) threadAcc += dt * (ctx.hard ? 3 : 2.4);
            // The halo scorches you.
            if (dp < HALO_R) scorched = true;
            // On the plinth: prise the seal.
            if (dp < PLINTH_R) {
              c.prise += (dt * 1000) / PRISE_MS;
              if (c.prise >= 1) desecrate(c);
            } else c.prise = Math.max(0, c.prise - dt * 2);
          }
        }
        if (threadAcc >= 2 && alive(n)) { ctx.heal(n, Math.floor(threadAcc)); threadAcc -= Math.floor(threadAcc); }
        if (scorched && now - lastScorch > 500) {
          lastScorch = now;
          internal = true;
          try { ctx.hit(p, ctx.hard ? 7 : 6, p.x, p.y); } finally { internal = false; }
          ctx.sfx('status-burn');
        }
        for (const s of spill) {
          s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt;
          if (s.y > s.fy) { s.y = s.fy; s.vy = 0; s.vx *= Math.pow(0.05, dt); }
        }
        while (spill.length && now - spill[0].at > 4000) spill.shift();
      },

      onNpcHurt(amount: number) {
        if (internal || !praying) return;
        praying.prayerHurt += amount;
        if (praying.prayerHurt >= BREAK_PRAYER) {
          praying.prayer = 0;
          praying.prayerHurt = 0;
          ctx.sfx('shield-break');
          ctx.float(praying.x, praying.y - 70, 'PRAYER BROKEN', OCOL.green);
        }
      },

      npcTakenMult: () => (caskets.every((c) => c.state === 'broken') ? 1.15 : 1),

      npcSeek(): Pt | null {
        const n = ctx.npc;
        let best: Casket | null = null, bd = Infinity;
        for (const c of caskets) {
          if (c.state !== 'free') continue;
          const d = dist(n.x, n.y, c.x, c.y);
          if (d < bd) { bd = d; best = c; }
        }
        // She kneels just in front of the casket, not on its plinth.
        return best ? { x: best.x + (best.x < W / 2 ? 40 : -40), y: best.y + 10 } : null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const c of caskets) {
          // The plinth's footing: a rug of worn red velvet and a ring of candle stubs.
          g.fillStyle(0x000000, 0.3); g.fillEllipse(c.x, c.y + 6, 120, 40);
          g.fillStyle(c.state === 'broken' ? dim(O.sinew, 0.5) : O.sinew, 0.7); g.fillEllipse(c.x, c.y + 4, 100, 32);
          if (c.state === 'free') {
            const v = c.virtue / VIRTUE;
            g.lineStyle(2, O.lily, 0.2 + v * 0.35); g.strokeCircle(c.x, c.y, MEND_R);
            if (c.prayer > 0) {
              g.lineStyle(6, O.gilt, 0.9);
              g.beginPath(); g.arc(c.x, c.y, MEND_R + 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.prayer, false); g.strokePath();
            }
          } else if (c.state === 'hers') {
            // A burning halo: rays of gold turning slowly on the floor.
            g.fillStyle(O.holy, 0.08 + Math.sin(t * 3 + c.seed) * 0.03); g.fillCircle(c.x, c.y, HALO_R);
            g.lineStyle(2, O.holy, 0.55); g.strokeCircle(c.x, c.y, HALO_R);
            for (let i = 0; i < 12; i++) {
              const a = t * 0.4 + (i / 12) * Math.PI * 2;
              g.lineStyle(3, O.gilt, 0.35);
              g.lineBetween(c.x + Math.cos(a) * 40, c.y + Math.sin(a) * 40, c.x + Math.cos(a) * (HALO_R - 4), c.y + Math.sin(a) * (HALO_R - 4));
            }
            if (c.prise > 0) {
              g.lineStyle(5, O.sinewLit, 0.95);
              g.beginPath(); g.arc(c.x, c.y, PLINTH_R + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * c.prise, false); g.strokePath();
            }
          }
          for (let i = 0; i < 6; i++) {
            const a = Math.PI * 0.1 + (i / 5) * Math.PI * 0.8;
            drawCandle(g, c.x + Math.cos(a) * 46, c.y + Math.sin(a) * 18 + 4, 6 + (i % 3) * 2, 4);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        const n = ctx.npc;
        for (const c of caskets) {
          // Candle flames.
          for (let i = 0; i < 6; i++) {
            const a = Math.PI * 0.1 + (i / 5) * Math.PI * 0.8;
            if (c.state !== 'broken' || i % 2 === 0) drawFlame(g, c.x + Math.cos(a) * 46, c.y + Math.sin(a) * 18 + 4 - (6 + (i % 3) * 2) - 3, t, 0.7);
          }
          // The plinth and the casket: a gilt house with a pitched lid and a glass window.
          const x = c.x, y = c.y;
          g.fillStyle(dim(O.stone, 0.4), 1); g.fillRect(x - 22, y - 22, 44, 24);
          g.fillStyle(O.stone, 1); g.fillRect(x - 20, y - 20, 40, 20);
          g.fillStyle(O.stoneLit, 1); g.fillRect(x - 24, y - 26, 48, 6);
          const gold = c.state === 'hers' ? lit(O.gilt, 0.25) : c.state === 'broken' ? dim(O.gilt, 0.4) : O.gilt;
          if (c.state === 'broken') {
            // Split open: the lid thrown back, the window cracked, the saint gone.
            g.fillStyle(dim(gold, 0.35), 1); g.fillRect(x - 15, y - 48, 30, 22);
            g.fillStyle(gold, 1); g.fillRect(x - 14, y - 47, 28, 20);
            g.fillStyle(0x161014, 1); g.fillRect(x - 8, y - 43, 16, 12);
            g.lineStyle(1, 0xffffff, 0.7); g.lineBetween(x - 8, y - 43, x + 2, y - 33); g.lineBetween(x + 8, y - 41, x - 1, y - 36);
            g.fillStyle(gold, 1); g.fillTriangle(x - 16, y - 50, x - 30, y - 70, x - 4, y - 60);
          } else {
            g.fillStyle(dim(gold, 0.35), 1); g.fillRect(x - 15, y - 48, 30, 22);
            g.fillStyle(gold, 1); g.fillRect(x - 14, y - 47, 28, 20);
            g.fillStyle(dim(gold, 0.35), 1); g.fillTriangle(x - 18, y - 47, x + 18, y - 47, x, y - 62);
            g.fillStyle(lit(gold, 0.2), 1); g.fillTriangle(x - 15, y - 48, x + 15, y - 48, x, y - 60);
            g.fillStyle(O.gilt, 1); g.fillCircle(x, y - 64, 2.5);
            // The window, and the saint's knuckle inside it.
            g.fillStyle(0x2a2226, 1); g.fillRect(x - 8, y - 43, 16, 12);
            drawBone(g, x - 4, y - 36, x + 4, y - 38, 2.4, O.bone, 1);
            g.fillStyle(0xffffff, 0.3); g.fillRect(x - 7, y - 42, 4, 10);
            // A free casket shows its virtue as a small light over the lid.
            if (c.state === 'free') {
              const v = c.virtue / VIRTUE;
              g.fillStyle(O.lily, 0.15 + v * 0.5); g.fillCircle(x, y - 72, 4 + v * 4);
            }
          }
          // Hers: a golden thread from the casket to Vertebra, beaded with light running to her.
          if (c.state === 'hers' && alive(n)) {
            const sx = x, sy = y - 60;
            const ex = n.x, ey = n.y - 10;
            g.lineStyle(2, O.holy, 0.55);
            g.beginPath(); g.moveTo(sx, sy);
            const mx = (sx + ex) / 2, my = Math.min(sy, ey) - 60;
            for (let k = 1; k <= 12; k++) {
              const u = k / 12;
              const qx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex;
              const qy = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey;
              g.lineTo(qx, qy);
            }
            g.strokePath();
            for (let b = 0; b < 3; b++) {
              const u = (t * 0.7 + b / 3) % 1;
              const qx = (1 - u) * (1 - u) * sx + 2 * (1 - u) * u * mx + u * u * ex;
              const qy = (1 - u) * (1 - u) * sy + 2 * (1 - u) * u * my + u * u * ey;
              g.fillStyle(0xffffff, 0.9); g.fillCircle(qx, qy, 2.5);
            }
            // Rays standing off the lid.
            for (let i = 0; i < 5; i++) {
              const a = -Math.PI / 2 + (i - 2) * 0.35;
              g.lineStyle(2, O.holy, 0.4 + Math.sin(t * 4 + i) * 0.2);
              g.lineBetween(x + Math.cos(a) * 18, y - 60 + Math.sin(a) * 18, x + Math.cos(a) * 34, y - 60 + Math.sin(a) * 34);
            }
          }
          // Her prayer: folded hands of light over the casket while it closes.
          if (c.state === 'free' && c.prayer > 0) {
            g.fillStyle(O.holy, 0.35 + c.prayer * 0.5); g.fillTriangle(x - 6, y - 84, x + 6, y - 84, x, y - 104);
          }
        }
        for (const s of spill) {
          const k = clamp((now - s.at) / 4000, 0, 1);
          const spin = s.a + Math.min(1, (now - s.at) / 700) * 8;
          const c = Math.cos(spin) * 6, sn = Math.sin(spin) * 3;
          drawBone(g, s.x - c, s.y - sn, s.x + c, s.y + sn, 2.5, O.bone, 1 - k * 0.6);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // Four little caskets in a row, top-right: white free, gold hers, cracked dark broken.
        caskets.forEach((c, i) => {
          const x = W - 110 + i * 24, y = top + 14;
          g.fillStyle(0x000000, 0.45); g.fillRect(x - 9, y - 3, 18, 20);
          const col = c.state === 'free' ? O.lily : c.state === 'hers' ? O.gilt : 0x3a3036;
          g.fillStyle(col, 1); g.fillRect(x - 7, y + 4, 14, 11); g.fillTriangle(x - 8, y + 4, x + 8, y + 4, x, y - 2);
          if (c.state === 'broken') { g.lineStyle(1.5, O.sinewLit, 1); g.lineBetween(x - 6, y + 2, x + 6, y + 14); }
        });
      },
    };
  },
};

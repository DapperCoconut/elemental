import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, O, OCOL, alive, dist, drawBone, jit } from '../util';

/**
 * BONE GARDEN — Gardener Sternum.
 *
 * The yard is laid out in three planted rows. In every plot a long bone stands in the loam, and
 * left alone it sprouts: first a crown of pale shoots, then a full bone thicket — a knot of
 * thorned, branching bone that walls off its plot. Thickets are solid; nobody walks through one.
 *
 * Strike a thicket and it shatters. Shoulder into one (keep pushing against it for a moment) and
 * it bursts away from you — a fan of bone shrapnel thrown out of its far side at whoever is
 * standing there. And a blow that lands on a fighter standing right beside a thicket knocks it
 * apart around them: shrapnel all round, at everyone close. A shattered plot leaves a stub that
 * grows back in its own time.
 *
 * Sternum tends his rows like traps: he waits on the far side of a thicket from you and shoulders
 * it into your face. Do it to him. Fight him against his own hedges, and keep your back off them.
 */

type Side = 'player' | 'npc';

interface Plot {
  x: number; y: number; seed: number;
  /** 0 a bare stub, 0..1 sprouting, 1 a full thicket. */
  growth: number;
  /** Growth per second — each plot keeps its own pace. */
  rate: number;
  shatteredAt: number;
  /** Seconds each side has spent pushing into it. */
  push: Record<Side, number>;
}

interface Splinter { x: number; y: number; vx: number; vy: number; at: number; spin: number; hitDone: boolean; from: Side | 'blow' }

const R_THICKET = 30;
const SHOULDER_S = 0.35;
const FAN_RANGE = 230;
const FAN_HALF = 0.85;
const FAN_DMG = 16;
const BLOW_R = 112;
const BLOW_DMG = 12;
const BLOW_NEAR = R_THICKET + 46;

export const BONE_GARDEN: GimmickDef = {
  id: 'ossuary-bone-garden',
  rules: 'Planted bones grow into thickets that wall the rows. Shoulder into one and it bursts out its far side at whoever stands there; a blow landing beside one shatters it on everyone close.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top, rng } = ctx;
    const rows = [top + 112, top + (H - top) / 2, H - 92];
    const cols = [190, 335, 480, 625, 770];
    const plots: Plot[] = [];
    rows.forEach((y, ri) => cols.forEach((x, ci) => {
      // The middle of the middle row is left bare so there is always a way across.
      if (ri === 1 && ci === 2) return;
      const seed = ri * 7 + ci * 1.3;
      plots.push({
        x: x + (ri % 2 ? 30 : -30) * (ci % 2 ? 1 : -1) * 0.3, y, seed,
        growth: rng() < 0.45 ? 1 : rng() * 0.6,
        rate: (0.07 + rng() * 0.06) * (ctx.hard ? 1.35 : 1),
        shatteredAt: -9999,
        push: { player: 0, npc: 0 },
      });
    }));
    const splinters: Splinter[] = [];
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    let now = 0;
    /** True while the gimmick itself is dealing damage, so its own hits don't shatter more thickets. */
    let internal = false;

    const hurt = (f: Fighter, n: number, x: number, y: number): void => {
      internal = true;
      try { ctx.hit(f, n, x, y); } finally { internal = false; }
    };

    const shatter = (p: Plot, cause: Side | 'blow', ax = 0, ay = 0): void => {
      p.growth = 0;
      p.shatteredAt = now;
      p.push.player = 0; p.push.npc = 0;
      ctx.sfx('ice-shatter');
      ctx.sfx('hit-heavy');
      ctx.flash(p.x, p.y - 20, O.boneLit);
      if (cause === 'blow') {
        // Everything close takes the burst.
        for (let i = 0; i < 18; i++) {
          const a = (i / 18) * Math.PI * 2 + jit(p.seed, i) * 0.3;
          const sp = 300 + jit(p.seed, i + 40) * 160;
          splinters.push({ x: p.x, y: p.y - 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.8, at: now, spin: jit(p.seed, i + 3) * 20, hitDone: true, from: 'blow' });
        }
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighterOf(s);
          if (alive(f) && dist(f.x, f.y, p.x, p.y) < BLOW_R) hurt(f, BLOW_DMG, f.x, f.y);
        }
        ctx.float(p.x, p.y - 60, 'THICKET BURSTS', OCOL.bone);
        return;
      }
      // Shouldered: a fan out of the far side, away from the one who broke it.
      const a0 = Math.atan2(p.y - ay, p.x - ax);
      for (let i = 0; i < 14; i++) {
        const a = a0 + (i / 13 - 0.5) * FAN_HALF * 2;
        const sp = 420 + jit(p.seed, i + 20) * 140;
        splinters.push({ x: p.x, y: p.y - 18, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, at: now, spin: jit(p.seed, i) * 24, hitDone: true, from: cause });
      }
      const victim: Side = cause === 'player' ? 'npc' : 'player';
      const v = fighterOf(victim);
      if (alive(v)) {
        const d = dist(v.x, v.y, p.x, p.y);
        const av = Math.atan2(v.y - p.y, v.x - p.x);
        let da = av - a0;
        while (da > Math.PI) da -= Math.PI * 2;
        while (da < -Math.PI) da += Math.PI * 2;
        if (d < FAN_RANGE && Math.abs(da) < FAN_HALF) {
          hurt(v, FAN_DMG, v.x, v.y);
          ctx.float(v.x, v.y - 48, victim === 'npc' ? 'SHRAPNEL!' : 'STERNUM\'S SHRAPNEL', victim === 'npc' ? OCOL.green : OCOL.red);
        }
      }
      ctx.float(p.x, p.y - 60, cause === 'player' ? 'SHOULDERED' : 'STERNUM SHOULDERS IT', OCOL.bone);
    };

    /** A hit landed on `s`: if they stood against a grown thicket, the blow breaks it on them. */
    const blowNear = (s: Side): void => {
      if (internal) return;
      const f = fighterOf(s);
      if (!alive(f)) return;
      let best: Plot | null = null, bd = Infinity;
      for (const p of plots) {
        if (p.growth < 1) continue;
        const d = dist(f.x, f.y, p.x, p.y);
        if (d < BLOW_NEAR && d < bd) { bd = d; best = p; }
      }
      if (best) shatter(best, 'blow');
    };

    const thickR = (p: Plot): number => (p.growth >= 1 ? R_THICKET : p.growth > 0.55 ? R_THICKET * 0.5 : 0);

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        for (const p of plots) {
          if (p.growth < 1 && now - p.shatteredAt > 2500) {
            const was = p.growth;
            p.growth = Math.min(1, p.growth + p.rate * dt);
            if (was < 1 && p.growth >= 1) ctx.sfx('thorn');
          }
          // Solid: shove anyone out of a grown (or half-grown) thicket, and count the pushing.
          const r = thickR(p);
          for (const s of ['player', 'npc'] as Side[]) {
            const f = fighterOf(s);
            if (!alive(f) || r === 0) { p.push[s] = Math.max(0, p.push[s] - dt); continue; }
            const d = dist(f.x, f.y, p.x, p.y);
            const need = r + 20;
            if (d < need) {
              const ux = d > 0.01 ? (f.x - p.x) / d : 1, uy = d > 0.01 ? (f.y - p.y) / d : 0;
              ctx.nudge(f, ux * (need - d), uy * (need - d));
              if (p.growth >= 1) {
                p.push[s] += dt;
                if (p.push[s] >= SHOULDER_S) { shatter(p, s, f.x, f.y); break; }
              }
            } else if (d > need + 10) p.push[s] = Math.max(0, p.push[s] - dt * 2);
          }
        }
        for (const sp of splinters) {
          sp.x += sp.vx * dt; sp.y += sp.vy * dt;
          sp.vx *= Math.pow(0.18, dt); sp.vy *= Math.pow(0.18, dt);
        }
        while (splinters.length && now - splinters[0].at > 900) splinters.shift();
      },

      onPlayerHurt() { blowNear('player'); },
      onNpcHurt() { blowNear('npc'); },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        // Find a grown thicket with the player close on its far side, and get behind it.
        let best: Pt | null = null, bd = Infinity;
        for (const pl of plots) {
          if (pl.growth < 1) continue;
          const dp = dist(p.x, p.y, pl.x, pl.y);
          if (dp > FAN_RANGE * 0.8 || dp < R_THICKET + 14) continue;
          const a = Math.atan2(pl.y - p.y, pl.x - p.x);
          // Pushing in from just past the thicket's surface on the side away from the player.
          const tx = pl.x + Math.cos(a) * (R_THICKET + 8), ty = pl.y + Math.sin(a) * (R_THICKET + 8);
          const dn = dist(n.x, n.y, tx, ty);
          if (dn < bd && dn < 360) { bd = dn; best = { x: tx, y: ty }; }
        }
        return best;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // The planted rows: furrows of turned loam along each row.
        for (const y of rows) {
          g.fillStyle(O.loamDeep, 0.55); g.fillRoundedRect(130, y - 18, W - 260, 40, 18);
          g.lineStyle(1, O.loamLit, 0.4);
          for (let x = 140; x < W - 140; x += 14) g.lineBetween(x, y - 12, x + 6, y + 14);
        }
        for (const p of plots) {
          // The plot: a little mound with a marker peg.
          g.fillStyle(O.loam, 1); g.fillEllipse(p.x, p.y + 6, 62, 22);
          g.fillStyle(O.loamLit, 0.8); g.fillEllipse(p.x - 4, p.y + 3, 44, 12);
          // A ring of warning on a full thicket: who is close enough to be caught by a blow.
          if (p.growth >= 1) {
            const near = [ctx.player, ctx.npc].some((f) => alive(f) && dist(f.x, f.y, p.x, p.y) < BLOW_NEAR + 10);
            if (near) { g.lineStyle(2, O.boneLit, 0.25 + Math.sin(time / 120) * 0.1); g.strokeCircle(p.x, p.y, BLOW_NEAR); }
            const pushed = Math.max(p.push.player, p.push.npc) / SHOULDER_S;
            if (pushed > 0.05) {
              g.lineStyle(4, pushed > 0.6 ? O.sinewLit : O.boneLit, 0.85);
              g.beginPath(); g.arc(p.x, p.y + 4, R_THICKET + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, pushed), false); g.strokePath();
            }
          }
          // Splintered stubs after a break.
          if (time - p.shatteredAt < 2500) {
            for (let i = 0; i < 6; i++) {
              const a = jit(p.seed, i) * Math.PI * 2, d = 14 + jit(p.seed, i + 5) * 26;
              g.fillStyle(O.boneShade, 0.8); g.fillRect(p.x + Math.cos(a) * d - 3, p.y + Math.sin(a) * d * 0.5, 6, 2);
            }
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        const t = time / 1000;
        for (const p of plots) {
          const k = p.growth;
          // The planted bone itself: a femur standing in the loam, always there.
          drawBone(g, p.x, p.y + 2, p.x + Math.sin(p.seed) * 3, p.y - 22, 4.5, O.boneShade, 1);
          if (k <= 0.05) continue;
          if (k < 1) {
            // Sprouting: pale shoots unfurling off the bone's head, each a little curl.
            const n = Math.ceil(k * 6);
            for (let i = 0; i < n; i++) {
              const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.45;
              const len = 6 + k * 22 * (0.7 + jit(p.seed, i) * 0.4);
              const sx = p.x + Math.sin(p.seed) * 3, sy = p.y - 22;
              const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
              g.lineStyle(2, O.bone, 0.95); g.lineBetween(sx, sy, ex, ey);
              g.fillStyle(O.boneLit, 1); g.fillCircle(ex, ey, 1.8);
            }
            if (k > 0.55) { g.lineStyle(1, O.boneDark, 0.5); g.strokeCircle(p.x, p.y - 8, R_THICKET * 0.5); }
            continue;
          }
          // A full thicket: a knot of branching bone with thorns, rooted round the old femur.
          const sway = Math.sin(t * 1.3 + p.seed) * 1.5;
          g.fillStyle(0x000000, 0.3); g.fillEllipse(p.x, p.y + 8, R_THICKET * 2.4, 16);
          for (let b = 0; b < 9; b++) {
            const a = -Math.PI / 2 + (b - 4) * 0.36 + (jit(p.seed, b) - 0.5) * 0.2;
            const len = 34 + jit(p.seed, b + 10) * 26;
            const bx = p.x + (b - 4) * 4, by = p.y + 4;
            const mx = bx + Math.cos(a) * len * 0.55, my = by + Math.sin(a) * len * 0.55;
            const ex = bx + Math.cos(a) * len + sway, ey = by + Math.sin(a) * len;
            const tone = b % 3 === 0 ? O.boneShade : O.bone;
            g.lineStyle(5, dim(tone, 0.45), 1); g.lineBetween(bx, by, mx, my); g.lineBetween(mx, my, ex, ey);
            g.lineStyle(3.5, tone, 1); g.lineBetween(bx, by, mx, my); g.lineBetween(mx, my, ex, ey);
            // A side spur off each branch, then thorns along both.
            const sa = a + (b % 2 ? 0.8 : -0.8);
            g.lineStyle(2, tone, 1); g.lineBetween(mx, my, mx + Math.cos(sa) * 12, my + Math.sin(sa) * 12);
            for (let s = 0.3; s < 1; s += 0.3) {
              const tx = bx + (ex - bx) * s, ty = by + (ey - by) * s;
              const ta = a + Math.PI / 2 * (s > 0.5 ? 1 : -1);
              g.fillStyle(lit(tone, 0.3), 1);
              g.fillTriangle(tx - 1.5, ty, tx + 1.5, ty, tx + Math.cos(ta) * 5, ty + Math.sin(ta) * 5);
            }
            g.fillStyle(O.boneLit, 1); g.fillCircle(ex, ey, 2.4);
          }
          // Knuckled joints where the branches meet the root.
          g.fillStyle(O.boneShade, 1); g.fillEllipse(p.x, p.y, 34, 14);
          g.fillStyle(O.bone, 1); g.fillEllipse(p.x - 2, p.y - 2, 26, 9);
        }
        for (const sp of splinters) {
          const a = 1 - (time - sp.at) / 900;
          if (a <= 0) continue;
          const ang = Math.atan2(sp.vy, sp.vx) + sp.spin * (time - sp.at) / 1000;
          const c = Math.cos(ang) * 6, s = Math.sin(ang) * 6;
          g.lineStyle(2.5, sp.from === 'player' ? O.boneLit : sp.from === 'npc' ? O.sinewLit : O.bone, a);
          g.lineBetween(sp.x - c, sp.y - s, sp.x + c, sp.y + s);
        }
      },
    };
  },
};

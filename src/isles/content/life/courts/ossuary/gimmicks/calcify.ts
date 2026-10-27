import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, lit } from '../../../../../art/IsleArt';
import { Clock, O, OCOL, alive, dist, jit } from '../util';

/**
 * CALCIFY — Mason Ossein.
 *
 * Ossein's yard is white with lime dust; it gets into everything that stops. Stand still and a
 * crust of bone-stone climbs you from the feet up — armour (hits on you are blunted, up to nearly
 * half) bought with speed (you slow, down to half pace). Move and it sheds off you in flakes.
 * Every fighter chooses, moment to moment: stone or speed.
 *
 * The shell has a flaw. Past two-thirds set it is brittle: one heavy blow (a hit of 9 or more)
 * cracks the whole crust off in a burst that hurts its wearer, worse the thicker it was, and
 * leaves them soft. Little hits only chip at it.
 *
 * Ossein never runs. He plants himself, sets hard, and walks at you like a statue that has made
 * up its mind. Pepper him and you will get nowhere — save your heaviest blow for the moment the
 * crust closes over his shoulders, and break him open.
 */

type Side = 'player' | 'npc';

interface Body {
  side: Side;
  stone: number;
  ax: number; ay: number; anchorAt: number;
  still: boolean;
  /** Flakes shed while moving, and the burst when the shell breaks. */
  crackedAt: number;
  crackX: number; crackY: number; crackK: number;
}

interface Flake { x: number; y: number; vx: number; vy: number; at: number; big: boolean }

const STILL_PX = 22;
const STILL_MS = 450;
const BRITTLE = 0.66;
const HEAVY = 9;
const MAX_ARMOUR = 0.45;
const MAX_SLOW = 0.5;

export const CALCIFY: GimmickDef = {
  id: 'ossuary-calcify',
  rules: 'Standing still crusts you in bone-stone: armour builds, speed falls. Moving sheds it. Past two-thirds the crust is brittle — one heavy hit (9+) shatters it and hurts the wearer.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const clock = new Clock();
    const { W, H, top } = ctx;
    const bodies: Body[] = (['player', 'npc'] as Side[]).map((side) => ({
      side, stone: side === 'npc' ? 0.3 : 0, ax: 0, ay: 0, anchorAt: -1, still: false, crackedAt: -9999, crackX: 0, crackY: 0, crackK: 0,
    }));
    const fighterOf = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
    const bodyOf = (s: Side): Body => bodies[s === 'player' ? 0 : 1];
    const flakes: Flake[] = [];
    let now = 0;
    let internal = false;
    let lastFlake = 0;
    const setRate = ctx.hard ? 0.4 : 0.32;
    const shedRate = ctx.hard ? 0.45 : 0.55;

    const crack = (bd: Body): void => {
      const f = fighterOf(bd.side);
      const k = bd.stone;
      bd.crackedAt = now; bd.crackX = f.x; bd.crackY = f.y; bd.crackK = k;
      bd.stone = 0;
      bd.anchorAt = now; bd.ax = f.x; bd.ay = f.y;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        flakes.push({ x: f.x, y: f.y - 6, vx: Math.cos(a) * (180 + jit(i, 3) * 140), vy: Math.sin(a) * 120 - 80, at: now, big: true });
      }
      internal = true;
      try { ctx.hit(f, Math.round(8 + 14 * k), f.x, f.y); } finally { internal = false; }
      ctx.sfx('crystal-shatter');
      ctx.flash(f.x, f.y, O.boneLit);
      ctx.float(f.x, f.y - 54, bd.side === 'npc' ? 'OSSEIN CRACKS OPEN' : 'SHELL SHATTERS', bd.side === 'npc' ? OCOL.green : OCOL.red);
    };

    const onHurt = (s: Side, amount: number): void => {
      if (internal) return;
      const bd = bodyOf(s);
      if (bd.stone >= BRITTLE && amount >= HEAVY) crack(bd);
      else if (bd.stone > 0.15) {
        // A chip: a little flake knocked off, a little less stone.
        bd.stone = Math.max(0, bd.stone - 0.04);
        const f = fighterOf(s);
        flakes.push({ x: f.x, y: f.y - 10, vx: (Math.random() - 0.5) * 160, vy: -120, at: now, big: false });
        ctx.sfx('stone-slam');
      }
    };

    return {
      update(time: number) {
        const dt = clock.tick(time);
        now = time;
        if (dt === 0) return;
        for (const bd of bodies) {
          const f = fighterOf(bd.side);
          if (!alive(f)) continue;
          if (bd.anchorAt < 0) { bd.ax = f.x; bd.ay = f.y; bd.anchorAt = now; }
          if (dist(f.x, f.y, bd.ax, bd.ay) > STILL_PX) { bd.ax = f.x; bd.ay = f.y; bd.anchorAt = now; bd.still = false; }
          else bd.still = now - bd.anchorAt > STILL_MS;
          const was = bd.stone;
          // Ossein is a mason: lime takes him a little quicker, and leaves him a little slower.
          const mason = bd.side === 'npc' ? 1.15 : 1;
          if (bd.still) bd.stone = Math.min(1, bd.stone + setRate * mason * dt);
          else bd.stone = Math.max(0, bd.stone - (shedRate / mason) * dt);
          if (was < BRITTLE && bd.stone >= BRITTLE) {
            ctx.float(f.x, f.y - 50, bd.side === 'npc' ? 'OSSEIN SETS — BRITTLE' : 'SET HARD — BRITTLE', OCOL.bone);
            ctx.sfx('stone-rise');
          }
          // Shedding: flakes fall off a moving, crusted fighter.
          if (!bd.still && bd.stone > 0.05 && now - lastFlake > 90) {
            lastFlake = now;
            flakes.push({ x: f.x + (Math.random() - 0.5) * 24, y: f.y + 6, vx: (Math.random() - 0.5) * 60, vy: -40, at: now, big: false });
          }
        }
        for (const fl of flakes) { fl.x += fl.vx * dt; fl.y += fl.vy * dt; fl.vy += 320 * dt; fl.vx *= Math.pow(0.3, dt); }
        while (flakes.length && now - flakes[0].at > 1100) flakes.shift();
      },

      playerSpeedMult: () => 1 - bodyOf('player').stone * MAX_SLOW,
      npcSpeedMult: () => 1 - bodyOf('npc').stone * MAX_SLOW,
      playerTakenMult: () => 1 - bodyOf('player').stone * MAX_ARMOUR,
      npcTakenMult: () => 1 - bodyOf('npc').stone * MAX_ARMOUR,

      onPlayerHurt(amount: number) { onHurt('player', amount); },
      onNpcHurt(amount: number) { onHurt('npc', amount); },

      npcSeek(): Pt | null {
        const n = ctx.npc, p = ctx.player;
        const me = bodyOf('npc');
        // Freshly cracked or soft and far from you: he plants and sets.
        if (me.stone < 0.7 && dist(n.x, n.y, p.x, p.y) > 170) return { x: n.x, y: n.y };
        // Set hard: he walks in, slow and certain.
        if (me.stone >= 0.7) return { x: p.x + (n.x > p.x ? 70 : -70), y: p.y };
        return null;
      },

      drawGround(g: Phaser.GameObjects.Graphics, time: number) {
        // Lime dust on the yard: a pale bloom under anyone standing still.
        for (const bd of bodies) {
          const f = fighterOf(bd.side);
          if (!alive(f)) continue;
          if (bd.still || bd.stone > 0.1) {
            const k = bd.stone;
            g.fillStyle(O.boneLit, 0.12 + k * 0.2); g.fillEllipse(f.x, f.y + 18, 50 + k * 30, 16 + k * 8);
            // Hairline crust creeping out across the flags from the feet.
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + jit(bd.side === 'npc' ? 2 : 1, i) * 0.4;
              const len = 14 + k * 30;
              g.lineStyle(1, O.boneShade, 0.3 + k * 0.5);
              g.lineBetween(f.x, f.y + 18, f.x + Math.cos(a) * len, f.y + 18 + Math.sin(a) * len * 0.35);
            }
          }
          // The burst ring when a shell breaks.
          const since = time - bd.crackedAt;
          if (since < 500) {
            const k = since / 500;
            g.lineStyle(4, O.boneLit, 0.8 * (1 - k)); g.strokeEllipse(bd.crackX, bd.crackY + 16, 40 + k * 120 * bd.crackK + k * 40, 14 + k * 40);
          }
        }
      },

      drawAir(g: Phaser.GameObjects.Graphics, time: number) {
        for (const bd of bodies) {
          const f = fighterOf(bd.side);
          if (!alive(f) || bd.stone < 0.04) continue;
          const k = bd.stone;
          // The crust: faceted plates of bone-stone climbing from the feet to the crown.
          const footY = f.y + 22;
          const reach = 8 + k * 50;
          const seed = bd.side === 'npc' ? 11 : 5;
          for (let i = 0; i < 9; i++) {
            const fx = f.x - 20 + (i / 8) * 40;
            const h = reach * (0.55 + jit(seed, i) * 0.45);
            const w = 7 + jit(seed, i + 9) * 4;
            const tone = i % 2 ? O.boneShade : O.bone;
            g.fillStyle(dim(tone, 0.4), 0.9); g.fillTriangle(fx - w - 1, footY, fx + w + 1, footY, fx + (jit(seed, i + 3) - 0.5) * 6, footY - h - 2);
            g.fillStyle(tone, 0.92); g.fillTriangle(fx - w, footY, fx + w, footY, fx + (jit(seed, i + 3) - 0.5) * 6, footY - h);
            g.fillStyle(lit(tone, 0.5), 0.85); g.fillTriangle(fx - w, footY, fx - 1, footY, fx + (jit(seed, i + 3) - 0.5) * 6, footY - h);
          }
          if (k > 0.5) {
            // A collar of crust over the shoulders, and a cap creeping over the crown.
            g.fillStyle(O.bone, 0.75 * (k - 0.5) * 2); g.fillEllipse(f.x, f.y - 6, 50, 22);
            if (k > 0.85) { g.fillStyle(O.boneShade, 0.85); g.fillEllipse(f.x, f.y - 22, 40, 18); }
          }
          // Brittle: fine cracks web the shell and it glints, a warning.
          if (k >= BRITTLE) {
            for (let i = 0; i < 6; i++) {
              const x0 = f.x + (jit(seed, i + 30) - 0.5) * 36, y0 = footY - jit(seed, i + 31) * reach;
              g.lineStyle(1.2, O.slate, 0.8);
              g.lineBetween(x0, y0, x0 + (jit(seed, i + 32) - 0.5) * 14, y0 - 8);
              g.lineBetween(x0, y0, x0 + (jit(seed, i + 33) - 0.5) * 12, y0 + 6);
            }
            if (Math.floor(time / 260) % 3 === 0) { g.fillStyle(0xffffff, 0.7); g.fillCircle(f.x + 10, footY - reach * 0.7, 2.5); }
          }
          // A gauge over the foe's head: soft to set, the brittle line marked.
          if (bd.side === 'npc') {
            const x = f.x - 22, y = f.y - 52;
            g.fillStyle(0x000000, 0.5); g.fillRect(x - 1, y - 1, 46, 7);
            g.fillStyle(k >= BRITTLE ? O.boneLit : O.boneShade, 1); g.fillRect(x, y, 44 * k, 5);
            g.fillStyle(O.sinewLit, 1); g.fillRect(x + 44 * BRITTLE, y - 2, 2, 9);
          }
        }
        for (const fl of flakes) {
          const a = 1 - (time - fl.at) / 1100;
          if (a <= 0) continue;
          g.fillStyle(fl.big ? O.bone : O.boneShade, a);
          if (fl.big) g.fillTriangle(fl.x - 4, fl.y, fl.x + 4, fl.y, fl.x, fl.y - 7); else g.fillRect(fl.x - 1.5, fl.y - 1, 3, 2);
        }
      },

      drawHud(g: Phaser.GameObjects.Graphics) {
        // Your own set, bottom-left: a little column of stone filling from the bottom.
        const me = bodyOf('player');
        const x = 24, y = H - 132;
        g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x - 10, y - 6, 20, 112, 6);
        g.fillStyle(O.loamDeep, 1); g.fillRect(x - 6, y - 2, 12, 104);
        g.fillStyle(me.stone >= BRITTLE ? O.boneLit : O.boneShade, 1); g.fillRect(x - 6, y + 102 - 104 * me.stone, 12, 104 * me.stone);
        g.fillStyle(O.sinewLit, 1); g.fillRect(x - 9, y + 102 - 104 * BRITTLE, 18, 2);
        // Lime haze at the screen's foot while you set.
        if (me.stone > 0.3) { g.fillStyle(O.boneLit, (me.stone - 0.3) * 0.18); g.fillRect(0, H - 40, W, 40); g.fillRect(0, top, W, 16); }
      },
    };
  },
};

import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt, Side } from './shared';
import { live, SIDES } from './shared';
import { CAP_RED, CAP_RED_LIT, CSS_ROT, CSS_STEM, ROT, ROT_LIT, SPORE, STEM, WHITE } from '../palette';
import { dist, rotPatch, sporeCloud, toadstool } from '../sporeArt';

/**
 * Decomposition — Rotmother Morel's fight.
 *
 * Every blow that lands leaves **rot** on the floor where the struck fighter stood — a bruise of
 * purple-brown with pale threads creeping out of it. Rot does not sit idle. After a few seconds a
 * mushroom pushes up out of it and swells; while it is still growing you can **tread it flat**
 * (walk over it — squelch, gone). Then it **ripens**: the cap reddens, starts to tick and throb,
 * and from then on it cannot be trodden — it bursts after a short fuse, or at once if anyone
 * blunders into it, for heavy damage all round.
 *
 * Morel tends the pits and knows where every fruit is: she lures you across her ripe ones, always
 * standing just past them so that chasing her walks you over them. But rot is rot. Every blow
 * *you* land on her plants it at her feet, and her lures only work while she is not standing in
 * her own garden. Hit her where she stands, then make her stay there.
 */

const ROT_MS = 2600;
const GROW_MS = 2400;
const FUSE_MS = 1300;
const BURST_R = 74;
const STOMP_R = 26;
const MAX_ROT = 12;

interface Rot { x: number; y: number; born: number; seed: number; from: Side; fuseAt: number }

export const DECOMPOSITION: GimmickDef = {
  id: 'spore-decomposition',
  rules: 'Every hit leaves rot that fruits into a mushroom. Tread it flat while it grows; once it is ripe it bursts for heavy damage.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const burstDmg = hard ? 20 : 16;
    let rots: Rot[] = [];
    const lastRot = { p: 0, n: 0 };
    let internal = false;
    const squelches: { x: number; y: number; at: number }[] = [];
    const bursts: { x: number; y: number; at: number; seed: number }[] = [];
    const fOf = (k: Side): Fighter => (k === 'p' ? ctx.player : ctx.npc);

    const stage = (r: Rot, time: number): 'rot' | 'grow' | 'ripe' => {
      const age = time - r.born;
      if (age < ROT_MS) return 'rot';
      if (age < ROT_MS + GROW_MS) return 'grow';
      return 'ripe';
    };
    const growK = (r: Rot, time: number): number => Phaser.Math.Clamp((time - r.born - ROT_MS) / GROW_MS, 0, 1);

    const plant = (k: Side, amount: number): void => {
      if (internal || amount < 3) return;
      const time = ctx.scene.time.now;
      if (time - lastRot[k] < 450) return;
      lastRot[k] = time;
      const f = fOf(k);
      if (!live(f)) return;
      // Rot never stacks on rot: a new bruise sits beside an old one.
      let x = f.x, y = f.y + 12;
      for (let i = 0; i < 6 && rots.some((r) => dist(r.x, r.y, x, y) < 40); i++) {
        const a = ctx.rng() * Math.PI * 2;
        x = f.x + Math.cos(a) * 46; y = f.y + 12 + Math.sin(a) * 34;
      }
      x = Phaser.Math.Clamp(x, 40, W - 40); y = Phaser.Math.Clamp(y, top + 30, H - 24);
      rots.push({ x, y, born: time, seed: Math.floor(ctx.rng() * 999), from: k, fuseAt: 0 });
      if (rots.length > MAX_ROT) rots.shift();
    };

    const burst = (r: Rot, time: number): void => {
      rots = rots.filter((q) => q !== r);
      bursts.push({ x: r.x, y: r.y, at: time, seed: r.seed });
      ctx.sfx('explosion-medium');
      internal = true;
      for (const k of SIDES) {
        const f = fOf(k);
        if (live(f) && dist(f.x, f.y + 12, r.x, r.y) < BURST_R) {
          ctx.hit(f, burstDmg, f.x, f.y);
          ctx.float(f.x, f.y - 46, k === 'n' ? 'MOREL IN HER OWN GARDEN' : 'BURST', k === 'n' ? CSS_ROT : CSS_STEM);
        }
      }
      internal = false;
    };

    return {
      update(time) {
        for (const r of rots.slice()) {
          const st = stage(r, time);
          if (st === 'grow') {
            // Still soft: tread it flat.
            for (const k of SIDES) {
              const f = fOf(k);
              if (live(f) && dist(f.x, f.y + 12, r.x, r.y) < STOMP_R) {
                rots = rots.filter((q) => q !== r);
                squelches.push({ x: r.x, y: r.y, at: time });
                ctx.sfx('slime-splat');
                if (k === 'p') ctx.float(r.x, r.y - 30, 'SQUELCH', CSS_STEM);
                break;
              }
            }
          } else if (st === 'ripe') {
            if (!r.fuseAt) { r.fuseAt = time + FUSE_MS; ctx.sfx('clock-tick'); }
            const touched = SIDES.some((k) => live(fOf(k)) && dist(fOf(k).x, fOf(k).y + 12, r.x, r.y) < STOMP_R + 6);
            if (touched || time >= r.fuseAt) burst(r, time);
          }
        }
        while (squelches.length && time - squelches[0].at > 500) squelches.shift();
        while (bursts.length && time - bursts[0].at > 600) bursts.shift();
      },

      onPlayerHurt(amount) { plant('p', amount); },
      onNpcHurt(amount) { plant('n', amount); },

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        // Never stand where one of her fruits is about to go.
        const danger = rots.find((r) => {
          const st = stage(r, t);
          return (st === 'ripe' || (st === 'grow' && growK(r, t) > 0.7)) && dist(r.x, r.y, n.x, n.y + 12) < BURST_R + 20;
        });
        if (danger) {
          const a = Math.atan2(n.y - danger.y, n.x - danger.x);
          return { x: Phaser.Math.Clamp(danger.x + Math.cos(a) * (BURST_R + 70), 60, W - 60), y: Phaser.Math.Clamp(danger.y + Math.sin(a) * (BURST_R + 60), top + 40, H - 40) };
        }
        // The lure: the ripening fruit nearest you, and her just past it, so you walk over it after her.
        const fruit = rots.filter((r) => stage(r, t) !== 'rot' && growK(r, t) > 0.35)
          .sort((a, b) => dist(a.x, a.y, p.x, p.y) - dist(b.x, b.y, p.x, p.y))[0];
        if (fruit && dist(fruit.x, fruit.y, p.x, p.y) < 320) {
          const a = Math.atan2(fruit.y - p.y, fruit.x - p.x);
          return { x: Phaser.Math.Clamp(fruit.x + Math.cos(a) * (BURST_R + 60), 60, W - 60), y: Phaser.Math.Clamp(fruit.y + Math.sin(a) * (BURST_R + 50), top + 40, H - 40) } as Pt;
        }
        return null;
      },

      drawGround(g, time) {
        for (const r of rots) {
          const st = stage(r, time);
          const age = time - r.born;
          const spread = Phaser.Math.Clamp(age / 500, 0.3, 1);
          rotPatch(g, r.x, r.y, 18 * spread + (st !== 'rot' ? 6 : 0), 1, r.seed);
          if (st === 'ripe') {
            const q = Phaser.Math.Clamp((time - (r.fuseAt || time)) / FUSE_MS + 1, 0, 1);
            const pulse = 0.5 + 0.5 * Math.sin(time / (90 - q * 50));
            g.lineStyle(2, CAP_RED_LIT, 0.4 + 0.5 * pulse); g.strokeCircle(r.x, r.y, BURST_R);
            g.fillStyle(CAP_RED, 0.06 + 0.08 * pulse); g.fillCircle(r.x, r.y, BURST_R);
          } else if (st === 'grow') {
            g.lineStyle(1, ROT_LIT, 0.35); g.strokeCircle(r.x, r.y, BURST_R * growK(r, time));
          }
        }
        for (const s of squelches) {
          const q = (time - s.at) / 500;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillStyle(ROT_LIT, 1 - q); g.fillEllipse(s.x + Math.cos(a) * (8 + q * 22), s.y + Math.sin(a) * (5 + q * 12), 6, 3);
          }
        }
      },

      drawAir(g, time) {
        for (const r of rots) {
          const st = stage(r, time);
          if (st === 'rot') {
            // A pale knob just breaking the surface in the last second.
            const k = Phaser.Math.Clamp((time - r.born - (ROT_MS - 900)) / 900, 0, 1);
            if (k > 0) { g.fillStyle(STEM, 0.8); g.fillEllipse(r.x, r.y - 2, 8 * k, 6 * k); }
            continue;
          }
          const k = growK(r, time);
          if (st === 'grow') {
            // A soft, pale cap swelling — still safe to tread.
            toadstool(g, r.x, r.y + 2, 6 + k * 11, Phaser.Display.Color.GetColor(200 - k * 60, 170 - k * 90, 150 - k * 80), false, 1, r.seed);
            continue;
          }
          // Ripe: a fat red cap, throbbing faster as the fuse runs.
          const q = Phaser.Math.Clamp((time - (r.fuseAt || time)) / FUSE_MS + 1, 0, 1);
          const throb = 1 + Math.sin(time / (70 - q * 40)) * 0.08 * (0.5 + q);
          toadstool(g, r.x, r.y + 2, 17 * throb, CAP_RED, true, 1, r.seed);
          g.fillStyle(SPORE, 0.3 * q); g.fillCircle(r.x, r.y - 26, 8 + q * 8);
          // Fuse ticks: a ring of pips round the stem that go out one by one.
          const pips = 5;
          for (let i = 0; i < pips; i++) {
            const a = -Math.PI / 2 + (i / pips) * Math.PI * 2;
            g.fillStyle(i / pips >= q ? WHITE : ROT, 0.9);
            g.fillCircle(r.x + Math.cos(a) * 24, r.y - 12 + Math.sin(a) * 9, 2.2);
          }
        }
        for (const b of bursts) {
          const q = (time - b.at) / 600;
          sporeCloud(g, b.x, b.y - 10, BURST_R * (0.5 + q * 0.7), ROT_LIT, 1 - q, time / 1000, b.seed);
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + b.seed;
            g.fillStyle(CAP_RED, 1 - q); g.fillCircle(b.x + Math.cos(a) * BURST_R * q, b.y - 10 + Math.sin(a) * BURST_R * q * 0.7, 3.5 * (1 - q) + 1);
          }
        }
      },

      drawHud(g) {
        // How much of the floor has gone to rot: a row of caps, one per live fruit.
        const t = ctx.scene.time.now;
        const x0 = W / 2 - (MAX_ROT * 10) / 2, y = 112;
        for (let i = 0; i < MAX_ROT; i++) {
          const r = rots[i];
          const c = !r ? 0x2b221a : stage(r, t) === 'ripe' ? CAP_RED : stage(r, t) === 'grow' ? STEM : ROT;
          g.fillStyle(c, 1); g.fillCircle(x0 + i * 10, y, 3.4);
        }
      },
    };
  },
};

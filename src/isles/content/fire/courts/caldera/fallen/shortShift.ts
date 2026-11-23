import Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { brandSigil, mixC } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { CAL, dist, makeClock } from '../palette';

/**
 * Short Shift — Tally-Clerk Dole Marrable (Gold).
 *
 * In the King's telling Dole kept the crater's tally book, and every crew that came up short
 * was his to report. The fight is a shift on his slate: every blow either side lands is chalked
 * up in its column, and when the shift bell rings the side that did *less* is short. Short
 * means the Overseer's tally stamp — an iron die with the King's brand on its face, dropped on
 * chains onto wherever the short one stood. Its shadow gives a clear second to step out; it
 * stuns and burns whoever is still under it, Dole included. A dead-even slate is short on both.
 *
 * So there are two things at once: out-hit him over the shift (the thing to do), and leave the
 * square when the shadow finds you (the thing to dodge). Win the tally and the stamp is his.
 * Halfway down, the shifts shorten and the die comes down twice — the second drop hunts where
 * the short one *went*, so the first step has to be a long one.
 */

const STAMP_R = 66;
const STAMP_WARN = 1150;
const STAMP_DMG = 28;
const STUN_MS = 650;
/** Chalk one tally mark per this much damage. */
const PER_MARK = 8;

interface Stamp { x: number; y: number; at: number; landAt: number; victim: 'player' | 'npc'; repeat: boolean }
interface Scar { x: number; y: number; at: number }

export const shortShiftGimmick: GimmickDef = {
  id: fallenId('caldera', 'short-shift'),
  rules: 'Each shift the slate counts damage dealt. At the bell the short side (or both, if even) gets the tally stamp — step out of its shadow.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const tick = makeClock();
    let shiftStart = -1;
    let nowT = 0;
    let lateShift = false;
    const dealt = { player: 0, npc: 0 };
    let lastCount = 0;
    let bellSwingAt = -9999;
    let selfHit = false;
    let lastResult: 'player' | 'npc' | 'even' | null = null;
    const stamps: Stamp[] = [];
    const scars: Scar[] = [];

    const shiftMs = (): number => (lateShift ? 6600 : 9000);
    const fighterOf = (side: 'player' | 'npc'): Fighter => (side === 'player' ? ctx.player : ctx.npc);
    const clampPt = (x: number, y: number): Pt => ({ x: Phaser.Math.Clamp(x, 60, W - 60), y: Phaser.Math.Clamp(y, top + 50, H - 50) });

    const drop = (side: 'player' | 'npc', at: number, repeat: boolean): void => {
      const f = fighterOf(side);
      stamps.push({ x: f.x, y: f.y, at, landAt: at + STAMP_WARN, victim: side, repeat });
      ctx.sfx('chain');
    };

    const ringBell = (time: number): void => {
      bellSwingAt = time;
      ctx.sfx('drum-hit');
      const diff = dealt.player - dealt.npc;
      if (Math.abs(diff) < PER_MARK) {
        // Dead even is short too — the Overseer never believed a tie. Both crews get the stamp.
        lastResult = 'even';
        drop('player', time, false);
        drop('npc', time, false);
      } else {
        const short = diff < 0 ? 'player' : 'npc';
        lastResult = short;
        drop(short, time, lateShift);
        const f = fighterOf(short);
        ctx.flash(f.x, f.y, CAL.sulphur);
      }
      dealt.player = 0; dealt.npc = 0;
      shiftStart = time;
    };

    const land = (s: Stamp, time: number): void => {
      ctx.sfx('anvil');
      ctx.flash(s.x, s.y, CAL.lavaLit);
      scars.push({ x: s.x, y: s.y, at: time });
      if (scars.length > 6) scars.shift();
      selfHit = true;
      for (const f of [ctx.player, ctx.npc]) {
        if (f.active && f.hp > 0 && dist(s.x, s.y, f.x, f.y) <= STAMP_R + 16) {
          ctx.hit(f, STAMP_DMG, f.x, f.y);
          ctx.stun(f, STUN_MS);
        }
      }
      selfHit = false;
      // Late shift: the die is hauled up and dropped again on wherever the short one ran to.
      if (s.repeat) stamps.push({ ...fighterPos(s.victim), at: time + 250, landAt: time + 250 + STAMP_WARN, victim: s.victim, repeat: false });
    };
    const fighterPos = (side: 'player' | 'npc'): Pt => { const f = fighterOf(side); return { x: f.x, y: f.y }; };

    /** A chalk tally — gates of five, the fifth stroke struck across — growing down a slate column. */
    const chalkColumn = (g: Phaser.GameObjects.Graphics, x: number, y: number, marks: number, color: number): void => {
      const n = Math.min(marks, 25);
      for (let i = 0; i < n; i++) {
        const gate = Math.floor(i / 5), k = i % 5;
        const gx = x + (gate % 3) * 26, gy = y + Math.floor(gate / 3) * 18;
        g.lineStyle(2, color, 0.92);
        if (k < 4) g.lineBetween(gx + k * 5, gy, gx + k * 5 + 1, gy + 13);
        else g.lineBetween(gx - 3, gy + 11, gx + 19, gy + 2);
      }
    };

    return {
      update(time: number) {
        tick(time);
        nowT = time;
        if (shiftStart < 0) shiftStart = time;
        if (!lateShift && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
          lateShift = true;
          ctx.banner('LATE SHIFT — THE STAMP FALLS TWICE', '#ffd27a');
          ctx.sfx('boss-phase');
        }
        const left = shiftStart + shiftMs() - time;
        const count = Math.ceil(left / 1000);
        if (count !== lastCount && count >= 1 && count <= 3) ctx.sfx('countdown-tick');
        lastCount = count;
        if (left <= 0) ringBell(time);
        for (let i = stamps.length - 1; i >= 0; i--) {
          const s = stamps[i];
          if (time >= s.landAt) { stamps.splice(i, 1); land(s, time); }
        }
        while (scars.length && time - scars[0].at > 4000) scars.shift();
      },

      onNpcHurt(amount: number) { if (!selfHit) dealt.player += amount; },
      onPlayerHurt(amount: number) { if (!selfHit) dealt.npc += amount; },

      npcSeek(): Pt | null {
        const n = ctx.npc;
        // Under a falling die: out of its shadow, the long way.
        for (const s of stamps) {
          if (nowT < s.at) continue;
          const d = dist(s.x, s.y, n.x, n.y);
          if (d < STAMP_R + 50) {
            const a = d > 1 ? Math.atan2(n.y - s.y, n.x - s.x) : ctx.rng() * Math.PI * 2;
            return clampPt(s.x + Math.cos(a) * (STAMP_R + 110), s.y + Math.sin(a) * (STAMP_R + 110));
          }
        }
        // Behind on the slate with the bell coming: press in and land something.
        const left = shiftStart + shiftMs() - nowT;
        if (left < 3500 && dealt.npc <= dealt.player) return { x: ctx.player.x, y: ctx.player.y };
        return null;
      },

      drawGround(g, time) {
        // Old stamps: the King's brand scorched into the glass, cooling.
        for (const sc of scars) {
          const k = 1 - (time - sc.at) / 4000;
          g.fillStyle(0x000000, 0.25 * k); g.fillCircle(sc.x, sc.y, STAMP_R * 0.9);
          brandSigil(g, sc.x, sc.y, STAMP_R * 0.55, mixC(CAL.seam, CAL.lavaLit, k), 0.6 * k);
        }
        // The die's shadow: a square of dark tightening onto the floor, the brand outlined in it.
        for (const s of stamps) {
          if (time < s.at) continue;
          const k = Phaser.Math.Clamp((time - s.at) / (s.landAt - s.at), 0, 1);
          const half = STAMP_R * (0.55 + 0.45 * k);
          g.fillStyle(0x000000, 0.18 + 0.4 * k); g.fillRect(s.x - half, s.y - half * 0.8, half * 2, half * 1.6);
          g.lineStyle(2, CAL.sulphur, 0.35 + 0.55 * k); g.strokeRect(s.x - STAMP_R, s.y - STAMP_R * 0.8, STAMP_R * 2, STAMP_R * 1.6);
          // Corner rivets, so the square reads as a die face, not a zone.
          for (const [cx, cy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
            g.fillStyle(CAL.sulphurDark, 0.7); g.fillCircle(s.x + cx * (STAMP_R - 8), s.y + cy * (STAMP_R * 0.8 - 7), 3);
          }
          brandSigil(g, s.x, s.y, STAMP_R * 0.42, CAL.lava, 0.25 + 0.45 * k);
        }
      },

      drawAir(g, time) {
        // The die itself, coming down on its chains; it rides high until the last third.
        for (const s of stamps) {
          if (time < s.at) continue;
          const k = Phaser.Math.Clamp((time - s.at) / (s.landAt - s.at), 0, 1);
          const fall = k < 0.65 ? 0 : ((k - 0.65) / 0.35) ** 2;
          const y = s.y - 300 + 300 * fall - (1 - fall) * Math.sin(time / 120) * 4;
          const w = STAMP_R * 1.5, h = 44;
          // Chains up out of the top of the screen.
          g.lineStyle(3, CAL.iron, 0.9);
          for (const cx of [-w * 0.35, w * 0.35]) {
            for (let cy = y - h; cy > top - 20; cy -= 12) g.strokeEllipse(s.x + cx, cy, 6, 11);
          }
          // Iron block: dark sides, a lit top bevel, a hot brand face peeking at the bottom.
          g.fillStyle(CAL.iron, 1); g.fillRect(s.x - w / 2, y - h, w, h);
          g.fillStyle(mixC(CAL.iron, 0xffffff, 0.18), 1); g.fillRect(s.x - w / 2, y - h, w, 8);
          g.fillStyle(mixC(CAL.iron, 0x000000, 0.4), 1); g.fillRect(s.x + w / 2 - 10, y - h, 10, h);
          g.fillStyle(CAL.lava, 0.85); g.fillRect(s.x - w / 2 + 6, y - 6, w - 12, 6);
          brandSigil(g, s.x - 4, y - h / 2 - 2, 11, mixC(CAL.seam, CAL.lavaHot, k), 0.9);
          g.lineStyle(1, CAL.basaltLit, 0.6); g.strokeRect(s.x - w / 2, y - h, w, h);
        }
      },

      drawHud(g, time) {
        // Dole's slate, top-centre: two chalk columns, a shift fuse, the bell between them.
        const cx = W / 2, y0 = top + 6;
        g.fillStyle(CAL.wood, 1); g.fillRect(cx - 132, y0, 264, 62);
        g.fillStyle(0x23272a, 1); g.fillRect(cx - 126, y0 + 5, 252, 52);
        g.lineStyle(1, 0x3a4044, 1); g.lineBetween(cx, y0 + 8, cx, y0 + 54);
        // Column heads: the player's pale chalk, Dole's ember chalk.
        g.fillStyle(0xe8ecef, 0.9); g.fillCircle(cx - 116, y0 + 12, 4);
        g.fillStyle(0xffa040, 0.95); g.fillCircle(cx + 116, y0 + 12, 4);
        chalkColumn(g, cx - 104, y0 + 10, Math.floor(dealt.player / PER_MARK), 0xe8ecef);
        chalkColumn(g, cx + 22, y0 + 10, Math.floor(dealt.npc / PER_MARK), 0xffa040);
        // Shift fuse along the bottom of the frame, burning toward the bell.
        const k = Phaser.Math.Clamp((nowT - shiftStart) / shiftMs(), 0, 1);
        g.lineStyle(3, CAL.ash, 0.9); g.lineBetween(cx - 126 + 252 * k, y0 + 60, cx + 126, y0 + 60);
        g.fillStyle(CAL.lavaHot, 0.95); g.fillCircle(cx - 126 + 252 * k, y0 + 60, 3 + Math.sin(time / 50));
        // The bell over the slate, swinging on its ring.
        const swing = Math.sin((time - bellSwingAt) / 90) * Math.max(0, 1 - (time - bellSwingAt) / 900) * 0.6 + (k > 0.7 ? Math.sin(time / 70) * (k - 0.7) : 0);
        const bx = cx + Math.sin(swing) * 12, by = y0 - 2 + Math.cos(swing) * 12;
        g.lineStyle(2, CAL.iron, 1); g.lineBetween(cx, y0 - 10, bx, by);
        g.fillStyle(CAL.sulphurDark, 1);
        g.fillTriangle(bx - 10, by + 14, bx + 10, by + 14, bx, by - 2);
        g.fillStyle(CAL.sulphur, 1); g.fillEllipse(bx, by + 14, 22, 6);
        g.fillStyle(CAL.iron, 1); g.fillCircle(bx + Math.sin(swing * 2) * 4, by + 17, 2.5);
        // Last bell's verdict, a small chalk tick next to whoever came up short.
        if (lastResult && lastResult !== 'even' && nowT - bellSwingAt < 2000) {
          const sx = lastResult === 'player' ? cx - 140 : cx + 140;
          g.fillStyle(CAL.lava, 0.9); g.fillRect(sx - 4, y0 + 18, 8, 22);
          brandSigil(g, sx, y0 + 30, 6, CAL.lavaHot, 0.9);
        }
      },

      destroy() { stamps.length = 0; scars.length = 0; },
    };
  },
};

import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef } from './shared';
import { live } from './shared';
import { BLUE, BLUE_LIT, BLUE_WASH, GREY, GREY_LIT, INK, PAPER, PAPER_SHADE, WHITE } from '../palette';
import { CSS_BLUE, CSS_PAPER } from '../palette';
import { hatchRect } from '../inkArt';

/**
 * Wet Ink — Calligrapher Sumi's fight.
 *
 * Every step either fighter takes leaves a wet footprint on the page: yours are boot-prints, hers
 * are brush-daubs (she writes as she walks, and she walks in long calligraphic strokes). Prints
 * are fresh for a few seconds, then dry grey, then fade.
 * • The other side's prints are **slick and sting**: tread on one and you skid along it and take a
 *   nip — a big one while it is wet, a small one once it has dried.
 * • Your own fresh prints are your own hand: walking on them is quick.
 * Every so often a **blotter** — a great sheet of blotting paper — is pressed onto one half of the
 * page (pencilled first). Everything under it dries at once, and anyone caught under the press is
 * squashed flat for a moment.
 *
 * Sumi circles you, writing an enso round you to box you in. Her ring is only as good as its
 * ink, though — wait for the blotter to fall on her half, or lay your own trail across her line
 * so that every stroke she finishes runs her across your prints.
 */

const STEP_P = 34;
const STEP_N = 24;
const FRESH_MS = 3400;
const STING_R = 16;
const BLOT_WARN = 1400;

interface Print { x: number; y: number; a: number; side: 'p' | 'n'; born: number; left: boolean; stung: boolean; dryAt: number }

export const WET_INK: GimmickDef = {
  id: 'inkwell-wet-ink',
  rules: 'Every step leaves a wet print. The other side\'s prints are slick and sting; your own fresh ones speed you up.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top, hard } = ctx;
    const life = hard ? 7600 : 6600;
    const wetSting = hard ? 6 : 5;
    const drySting = 2;
    const blotEvery = hard ? 9500 : 11500;
    const blotDmg = hard ? 14 : 11;
    let prints: Print[] = [];
    const last = { p: { x: ctx.player.x, y: ctx.player.y }, n: { x: ctx.npc.x, y: ctx.npc.y } };
    const foot = { p: false, n: false };
    const skid = { p: { vx: 0, vy: 0, until: 0 }, n: { vx: 0, vy: 0, until: 0 } };
    const onOwn = { p: false, n: false };
    let blotAt = ctx.scene.time.now + blotEvery;
    let blot: { left: boolean; warnFrom: number; pressAt: number; liftAt: number; dealt: boolean } | null = null;
    let encircle = ctx.rng() * Math.PI * 2;
    const turn = ctx.rng() < 0.5 ? 1 : -1;

    const fOf = (k: 'p' | 'n'): Fighter => (k === 'p' ? ctx.player : ctx.npc);
    const halfHas = (left: boolean, x: number): boolean => (left ? x < W / 2 : x >= W / 2);

    return {
      update(time, dt) {
        // Lay prints.
        for (const k of ['p', 'n'] as const) {
          const f = fOf(k);
          if (!live(f)) continue;
          const d = Phaser.Math.Distance.Between(f.x, f.y, last[k].x, last[k].y);
          const step = k === 'p' ? STEP_P : STEP_N;
          if (d >= step) {
            const a = Math.atan2(f.y - last[k].y, f.x - last[k].x);
            foot[k] = !foot[k];
            const side = foot[k] ? 1 : -1;
            const off = k === 'p' ? 7 : 4;
            prints.push({
              x: f.x - Math.sin(a) * off * side, y: f.y + 14 + Math.cos(a) * off * side, a, side: k,
              born: time, left: foot[k], stung: false, dryAt: time + FRESH_MS,
            });
            last[k] = { x: f.x, y: f.y };
          }
        }
        if (prints.length > 260) prints.splice(0, prints.length - 260);

        // Stings and skids on the other side's prints; speed on your own.
        for (const k of ['p', 'n'] as const) {
          const f = fOf(k);
          onOwn[k] = false;
          if (!live(f)) continue;
          const fx = f.x, fy = f.y + 14;
          for (const pr of prints) {
            if (Math.abs(pr.x - fx) > STING_R || Math.abs(pr.y - fy) > STING_R) continue;
            if (pr.side === k) { if (time < pr.dryAt) onOwn[k] = true; continue; }
            if (pr.stung) continue;
            pr.stung = true;
            const wet = time < pr.dryAt;
            ctx.hit(f, wet ? wetSting : drySting, f.x, f.y);
            if (wet) {
              skid[k] = { vx: Math.cos(pr.a) * 150, vy: Math.sin(pr.a) * 150, until: time + 300 };
              ctx.sfx('slime-splat');
              if (k === 'n') ctx.float(f.x, f.y - 40, 'SLIPPED', CSS_BLUE);
            }
          }
          const sk = skid[k];
          if (time < sk.until) {
            const fall = (sk.until - time) / 300;
            ctx.nudge(f, sk.vx * dt * fall, sk.vy * dt * fall);
          }
        }

        // The blotter.
        if (!blot && time >= blotAt) {
          const n = ctx.npc;
          // It falls on whichever half holds more of the page's wet ink — usually hers.
          let l = 0, r = 0;
          for (const pr of prints) if (time < pr.dryAt) { if (pr.x < W / 2) l++; else r++; }
          const left = l === r ? n.x < W / 2 : l > r;
          blot = { left, warnFrom: time, pressAt: time + BLOT_WARN, liftAt: time + BLOT_WARN + 700, dealt: false };
          ctx.banner('BLOTTER', CSS_PAPER);
          ctx.sfx('beam-charge');
        }
        if (blot) {
          if (!blot.dealt && time >= blot.pressAt) {
            blot.dealt = true;
            ctx.sfx('stone-slam');
            prints = prints.filter((pr) => !halfHas(blot!.left, pr.x));
            for (const k of ['p', 'n'] as const) {
              const f = fOf(k);
              if (live(f) && halfHas(blot.left, f.x)) {
                ctx.hit(f, blotDmg, f.x, f.y);
                ctx.float(f.x, f.y - 40, 'BLOTTED', CSS_PAPER);
              }
            }
          }
          if (time >= blot.liftAt) { blot = null; blotAt = time + blotEvery; }
        }

        prints = prints.filter((pr) => time - pr.born < life);
        encircle += turn * dt * 1.25;
      },

      playerSpeedMult: () => (onOwn.p ? 1.18 : 1),
      npcSpeedMult: () => {
        const t = ctx.scene.time.now;
        const squashed = blot && blot.dealt && t < blot.liftAt && halfHas(blot.left, ctx.npc.x);
        return squashed ? 0.3 : onOwn.n ? 1.18 : 1;
      },

      npcSeek() {
        const n = ctx.npc, p = ctx.player;
        const t = ctx.scene.time.now;
        // A blotter is coming down on her half — cross the gutter.
        if (blot && t < blot.pressAt && halfHas(blot.left, n.x)) {
          return { x: blot.left ? W / 2 + 120 : W / 2 - 120, y: Phaser.Math.Clamp(n.y, top + 60, H - 60) };
        }
        // Otherwise: an enso round the player — a wide circle, brush never lifted.
        const r = 150;
        return {
          x: Phaser.Math.Clamp(p.x + Math.cos(encircle) * r, 50, W - 50),
          y: Phaser.Math.Clamp(p.y + Math.sin(encircle) * r * 0.8, top + 40, H - 40),
        };
      },

      drawGround(g, time) {
        // The gutter down the middle where the blotter folds.
        g.lineStyle(1, BLUE_LIT, 0.45);
        for (let y = top + 10; y < H; y += 18) g.lineBetween(W / 2, y, W / 2, y + 9);
        // Prints.
        for (const pr of prints) {
          const age = time - pr.born;
          const wet = time < pr.dryAt;
          const fade = Phaser.Math.Clamp((life - age) / 900, 0, 1);
          const c = Math.cos(pr.a), s = Math.sin(pr.a);
          if (pr.side === 'p') {
            // Boot-print: a sole and a heel, ink rim, wet gloss.
            const col = wet ? INK : GREY;
            const sx = pr.x + c * 4, sy = pr.y + s * 4;
            const hx = pr.x - c * 7, hy = pr.y - s * 7;
            g.fillStyle(col, (wet ? 0.85 : 0.55) * fade); g.fillEllipse(sx, sy, 12, 9); g.fillEllipse(hx, hy, 8, 7);
            if (wet) { g.fillStyle(WHITE, 0.6 * fade); g.fillCircle(sx - 2, sy - 2, 1.6); }
          } else {
            // Brush-daub: a tapered stroke with a dry-brush tail; Sumi's hand.
            const col = wet ? INK : GREY_LIT;
            const len = 18;
            g.lineStyle(9, col, (wet ? 0.9 : 0.6) * fade);
            g.lineBetween(pr.x - c * len * 0.4, pr.y - s * len * 0.4, pr.x + c * len * 0.3, pr.y + s * len * 0.3);
            g.lineStyle(4, col, (wet ? 0.9 : 0.6) * fade);
            g.lineBetween(pr.x + c * len * 0.3, pr.y + s * len * 0.3, pr.x + c * len * 0.6, pr.y + s * len * 0.6);
            g.lineStyle(1, col, 0.5 * fade);
            g.lineBetween(pr.x - c * len * 0.5 - s * 3, pr.y - s * len * 0.5 + c * 3, pr.x - c * len * 0.8 - s * 3, pr.y - s * len * 0.8 + c * 3);
            if (wet) { g.lineStyle(1.5, WHITE, 0.5 * fade); g.lineBetween(pr.x - c * 4 - s * 2, pr.y - s * 4 + c * 2, pr.x + c * 4 - s * 2, pr.y + s * 4 + c * 2); }
          }
        }
        // Blotter warning: the half it will fall on, pencilled and hatching in.
        if (blot && time < blot.pressAt) {
          const k = Phaser.Math.Clamp((time - blot.warnFrom) / BLOT_WARN, 0, 1);
          const x0 = blot.left ? 8 : W / 2, w = W / 2 - 8;
          g.lineStyle(2, INK, 0.4 + k * 0.5); g.strokeRect(x0, top + 4, w, H - top - 12);
          hatchRect(g, { x: x0, y: top + 4, w, h: H - top - 12 }, Math.max(6, 22 - k * 16), BLUE, 0.1 + k * 0.2, 1.2);
        }
      },

      drawAir(g, time) {
        if (!blot) return;
        const x0 = blot.left ? 0 : W / 2, w = W / 2;
        if (time < blot.pressAt) {
          // The sheet hovering, its shadow tightening as it drops.
          const k = Phaser.Math.Clamp((time - blot.warnFrom) / BLOT_WARN, 0, 1);
          const lift = (1 - k) * 60;
          g.fillStyle(PAPER_SHADE, 0.25 + k * 0.35); g.fillRect(x0 + 6, top - lift + 6, w - 12, H - top - 16);
          g.lineStyle(2, INK, 0.3 + k * 0.4); g.strokeRect(x0 + 6, top - lift + 6, w - 12, H - top - 16);
          return;
        }
        // Pressed: a thick sheet of blue blotting paper, the page's ink soaking up into it.
        const k = Phaser.Math.Clamp((time - blot.pressAt) / 700, 0, 1);
        const a = 1 - k * k;
        g.fillStyle(BLUE_WASH, 0.9 * a); g.fillRect(x0, top, w, H - top);
        g.lineStyle(3, INK, a); g.strokeRect(x0 + 2, top + 2, w - 4, H - top - 4);
        // Mirror-writing soaked into the blotter — every stroke backwards.
        g.lineStyle(2, INK, 0.5 * a);
        for (let i = 0; i < 9; i++) {
          const y = top + 40 + i * 52;
          for (let j = 0; j < 6; j++) {
            const x = x0 + w - 40 - j * 60;
            g.lineBetween(x, y, x - 24, y + Math.sin(i + j) * 6);
            g.beginPath(); g.arc(x - 34, y, 8, 0, Math.PI * 1.3, true); g.strokePath();
          }
        }
        g.fillStyle(BLUE, a); g.fillCircle(x0 + w / 2, top + 30, 9);
      },

      drawHud(g, time) {
        // Blotter clock: a little rocker blotter that fills as the press comes.
        const t = ctx.scene.time.now;
        const k = blot ? 1 : Phaser.Math.Clamp(1 - (blotAt - t) / blotEvery, 0, 1);
        const x = W / 2, y = 110;
        g.fillStyle(INK, 1); g.fillRoundedRect(x - 40, y - 8, 80, 16, 8);
        g.fillStyle(PAPER, 1); g.fillRoundedRect(x - 37, y - 5, 74, 10, 5);
        g.fillStyle(blot ? (Math.floor(time / 100) % 2 ? BLUE : INK) : BLUE, 1); g.fillRoundedRect(x - 37, y - 5, Math.max(8, 74 * k), 10, 5);
        g.fillStyle(INK, 1); g.fillRect(x - 3, y - 18, 6, 10); g.fillCircle(x, y - 20, 5);
        if (onOwn.p) { g.fillStyle(WHITE, 1); g.fillTriangle(x - 64, y - 6, x - 64, y + 6, x - 52, y); }
      },
    };
  },
};

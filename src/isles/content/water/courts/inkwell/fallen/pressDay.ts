import Phaser from 'phaser';
import type { EncounterGimmick, Fighter, GimmickCtx, GimmickDef, Pt } from '../gimmicks/shared';
import { live } from '../gimmicks/shared';
import type { StrikeTarget } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { mulberry } from '../../../../../art/IsleArt';
import { BLUE, BLUE_DEEP, BLUE_LIT, CSS_BLUE, CSS_PAPER, GREY, INK, INK_LIT, PAPER, PAPER_SHADE, WHITE } from '../palette';
import { glyph, hatchRect, inkBurst, splashRing } from '../inkArt';
import { fallenId } from '../../../../meteor/spec';

/**
 * Press Day — Pressman Platt's fight (metal).
 *
 * The whole floor is the bed of the Pressworks' great press: a forme of twelve type-pages locked
 * in an iron chase. Every few seconds the inking roller runs across the bed and blacks half of
 * the pages — their sorts stand raised, letters reversed, glossy with ink — and then the platen
 * comes down. Whoever stands on an inked page is PRINTED: crushed for heavy damage and held to
 * the page for a beat. Every inked page always has a clean page beside it.
 *
 * The press lever stands at the left of the bed. Strike it while the bed is inked and the
 * pressman's pull comes early — whoever is still on the black then has two-thirds of a second.
 * The crown's version of Platt uses it to catch the player; a clever player uses it to catch him.
 *
 * At half health the press goes to a SECOND FORME: after each impression the roller inks the
 * other half of the bed and the platen falls again — step back onto the pages just pressed.
 */

const ID = fallenId('inkwell', 'press-day');
const COLS = 4;
const ROWS = 3;
const REST_MS = 2100;
const INK_MS = 1750;
const SECOND_MS = 1450;
const EARLY_MS = 650;
const SLAM_DMG = 21;
const HOLD_MS = 650;
const SHOW_MS = 700;

type Phase = 'rest' | 'ink' | 'shown';

export const PRESS_DAY: GimmickDef = {
  id: ID,
  rules: 'The roller inks half the press bed, then the platen falls on it. Strike the lever to pull it early; at half health it prints twice.',
  make(ctx: GimmickCtx): EncounterGimmick {
    const { W, H, top } = ctx;
    const cw = W / COLS;
    const ch = (H - top) / ROWS;
    let inked: boolean[] = new Array(COLS * ROWS).fill(false);
    let printed: boolean[] = new Array(COLS * ROWS).fill(false);
    let phase: Phase = 'rest';
    let phaseAt = ctx.scene.time.now;
    let slamAt = phaseAt + REST_MS;
    let secondPending = false;
    let secondForme = false;
    let impressions = 0;
    let leverPulledAt = -9999;
    let formeSeed = 1;
    const lever: Pt = { x: 34, y: top + (H - top) / 2 };

    const cellOf = (x: number, y: number): number => {
      const c = Phaser.Math.Clamp(Math.floor(x / cw), 0, COLS - 1);
      const r = Phaser.Math.Clamp(Math.floor((y - top) / ch), 0, ROWS - 1);
      return r * COLS + c;
    };
    const centre = (i: number): Pt => ({ x: (i % COLS) * cw + cw / 2, y: top + Math.floor(i / COLS) * ch + ch / 2 });
    const neighbours = (i: number): number[] => {
      const c = i % COLS, r = Math.floor(i / COLS);
      const out: number[] = [];
      if (c > 0) out.push(i - 1);
      if (c < COLS - 1) out.push(i + 1);
      if (r > 0) out.push(i - COLS);
      if (r < ROWS - 1) out.push(i + COLS);
      return out;
    };

    /** Half the bed, with every inked page touching a clean one; usually the player's page. */
    const layForme = (): boolean[] => {
      const pc = cellOf(ctx.player.x, ctx.player.y);
      for (let tries = 0; tries < 40; tries++) {
        const order = [...Array(COLS * ROWS).keys()].sort(() => ctx.rng() - 0.5);
        const pick = new Array(COLS * ROWS).fill(false);
        for (let k = 0; k < 6; k++) pick[order[k]] = true;
        if (ctx.rng() < 0.75 && !pick[pc]) continue;
        if (pick.every((on, i) => !on || neighbours(i).some((n) => !pick[n]))) return pick;
      }
      const odd = ctx.rng() < 0.5 ? 1 : 0;
      return inked.map((_, i) => (((i % COLS) + Math.floor(i / COLS)) % 2) === odd);
    };

    const startInking = (time: number, forme: boolean[], warn: number): void => {
      inked = forme;
      formeSeed = Math.floor(ctx.rng() * 1e6);
      phase = 'ink';
      phaseAt = time;
      slamAt = time + warn;
      ctx.sfx('gear-turn');
    };

    const leverTarget: StrikeTarget = ctx.target({
      x: lever.x, y: lever.y, r: 24,
      onStruck(by) {
        const t = ctx.scene.time.now;
        if (!(phase === 'ink' || (phase === 'shown' && secondPending)) || t - leverPulledAt < 900) return;
        if (slamAt - t > EARLY_MS) {
          slamAt = t + EARLY_MS;
          leverPulledAt = t;
          ctx.sfx('clang');
          ctx.float(lever.x + 30, lever.y - 40, by === 'player' ? 'YOU PULL' : 'PLATT PULLS', CSS_BLUE);
        }
      },
    });

    const slam = (time: number): void => {
      ctx.sfx('stone-slam');
      impressions++;
      for (const f of [ctx.player, ctx.npc] as Fighter[]) {
        if (!live(f) || !inked[cellOf(f.x, f.y)]) continue;
        ctx.hit(f, SLAM_DMG, f.x, f.y);
        ctx.root(f, HOLD_MS);
        ctx.float(f.x, f.y - 46, 'PRINTED', CSS_PAPER);
      }
      printed = inked;
      phase = 'shown';
      phaseAt = time;
      if (secondForme && !secondPending) {
        secondPending = true;
        const first = inked;
        startInking(time, first.map((v) => !v), SECOND_MS);
        printed = first;
        phase = 'shown';
      } else {
        secondPending = false;
        slamAt = time + REST_MS;
        inked = new Array(COLS * ROWS).fill(false);
      }
    };

    /** A raised sort: a lead block with its letter cut backwards, inked or clean. */
    const sort = (g: G, x: number, y: number, s: number, code: number, wet: number): void => {
      g.fillStyle(GREY, 0.55); g.fillRect(x - s / 2 + 2, y - s / 2 + 2, s, s);
      g.fillStyle(wet > 0 ? INK : PAPER_SHADE, 0.35 + wet * 0.6); g.fillRect(x - s / 2, y - s / 2, s, s);
      g.lineStyle(1, INK, 0.7); g.strokeRect(x - s / 2, y - s / 2, s, s);
      glyph(g, x, y, -s * 0.6, code, wet > 0.5 ? WHITE : INK, 0.55 + wet * 0.35, 1.6);
    };

    return {
      update(time) {
        if (!secondForme && ctx.npc.hp <= ctx.npc.maxHp * 0.5) {
          secondForme = true;
          ctx.banner('SECOND FORME — the platen falls twice. Step back onto the page just pressed.', CSS_BLUE);
        }
        if (phase === 'rest' && time >= slamAt) startInking(time, layForme(), INK_MS);
        else if (phase === 'shown' && !secondPending && time - phaseAt > SHOW_MS) phase = 'rest';
        if (phase === 'ink' || (phase === 'shown' && secondPending)) {
          if (time >= slamAt) slam(time);
        }
      },

      npcSeek() {
        const n = ctx.npc;
        if (phase !== 'ink' && !(phase === 'shown' && secondPending)) return null;
        const mine = cellOf(n.x, n.y);
        if (inked[mine]) {
          const safe = [...Array(COLS * ROWS).keys()].filter((i) => !inked[i]);
          safe.sort((a, b) => Phaser.Math.Distance.Between(n.x, n.y, centre(a).x, centre(a).y) - Phaser.Math.Distance.Between(n.x, n.y, centre(b).x, centre(b).y));
          return safe.length ? centre(safe[0]) : null;
        }
        // Clean himself, the player on the black, the lever on clean paper: go and pull it.
        if (inked[cellOf(ctx.player.x, ctx.player.y)] && !inked[cellOf(lever.x, lever.y)] && slamAt - ctx.scene.time.now > EARLY_MS + 300) {
          return { x: lever.x + 40, y: lever.y };
        }
        return null;
      },

      drawGround(g, time) {
        // The chase: iron frame, wooden furniture between the pages, quoins at the joins.
        g.lineStyle(6, INK, 0.5); g.strokeRect(6, top + 3, W - 12, H - top - 8);
        for (let c = 1; c < COLS; c++) { g.fillStyle(PAPER_SHADE, 0.6); g.fillRect(c * cw - 3, top, 6, H - top); g.lineStyle(1, INK, 0.4); g.strokeRect(c * cw - 3, top, 6, H - top); }
        for (let r = 1; r < ROWS; r++) { g.fillStyle(PAPER_SHADE, 0.6); g.fillRect(0, top + r * ch - 3, W, 6); g.lineStyle(1, INK, 0.4); g.strokeRect(0, top + r * ch - 3, W, 6); }
        for (let c = 1; c < COLS; c++) for (let r = 1; r < ROWS; r++) { g.fillStyle(INK_LIT, 0.8); g.fillRect(c * cw - 6, top + r * ch - 6, 12, 12); }

        const inking = phase === 'ink' || (phase === 'shown' && secondPending);
        const k = inking ? Phaser.Math.Clamp((time - phaseAt) / Math.max(1, slamAt - phaseAt), 0, 1) : 0;
        const rollerX = -40 + (W + 80) * Math.min(1, k * 1.6);
        const rng = mulberry(formeSeed);
        for (let i = 0; i < COLS * ROWS; i++) {
          const c = centre(i);
          const x0 = c.x - cw / 2 + 12, y0 = c.y - ch / 2 + 12;
          if (inking && inked[i]) {
            const wet = c.x - cw / 2 < rollerX ? 1 : 0.35;
            hatchRect(g, { x: x0, y: y0, w: cw - 24, h: ch - 24 }, Math.max(4, 12 - k * 8), INK, 0.2 + k * 0.4, 1.2);
            g.lineStyle(2.5, BLUE, 0.5 + k * 0.5); g.strokeRect(x0, y0, cw - 24, ch - 24);
            // Three lines of reversed type standing on the page.
            for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
              sort(g, x0 + 22 + col * ((cw - 68) / 6), y0 + 30 + row * ((ch - 84) / 2), 18, Math.floor(rng() * 999), wet);
            }
          } else {
            for (let row = 0; row < 3; row++) {
              g.lineStyle(1, BLUE_LIT, 0.25); g.lineBetween(x0 + 10, y0 + 30 + row * ((ch - 84) / 2) + 10, x0 + cw - 34, y0 + 30 + row * ((ch - 84) / 2) + 10);
            }
          }
          // The fresh impression, printed right-reading, fading off the page.
          if (phase === 'shown' && printed[i] && !inked[i]) {
            const a = 1 - (time - phaseAt) / SHOW_MS;
            if (a > 0) for (let row = 0; row < 3; row++) for (let col = 0; col < 7; col++) {
              glyph(g, x0 + 22 + col * ((cw - 68) / 6), y0 + 30 + row * ((ch - 84) / 2), 13, (i * 31 + row * 7 + col) % 999, INK, a * 0.8, 2);
            }
          }
        }

        // The inking roller: a long composition cylinder on its iron frame.
        if (inking && k < 0.66) {
          g.fillStyle(INK, 0.95); g.fillRoundedRect(rollerX - 16, top + 2, 32, H - top - 6, 14);
          g.lineStyle(2, WHITE, 0.5); g.lineBetween(rollerX - 7, top + 14, rollerX - 7, H - 16);
          g.lineStyle(1, WHITE, 0.25); g.lineBetween(rollerX + 4, top + 14, rollerX + 4, H - 16);
          g.fillStyle(GREY, 1); g.fillRect(rollerX - 4, top - 2, 8, 10); g.fillRect(rollerX - 4, H - 10, 8, 10);
          splashRing(g, rollerX + 22, top + (H - top) * ((time / 900) % 1), 14, 0.6, 6);
        }

        // The press lever: a pivot block, an iron bar and a ball weight; it swings on the pull.
        const pull = Phaser.Math.Clamp((time - leverPulledAt) / 220, 0, 1);
        const back = time - leverPulledAt > 900 ? 0 : 1;
        const ang = -1.1 + (back ? pull : 0) * 1.6;
        g.fillStyle(INK, 0.45); g.fillEllipse(lever.x + 4, lever.y + 18, 46, 12);
        g.fillStyle(INK_LIT, 1); g.fillRect(lever.x - 12, lever.y - 4, 24, 20);
        g.lineStyle(2, INK, 1); g.strokeRect(lever.x - 12, lever.y - 4, 24, 20);
        const ex = lever.x + Math.cos(ang) * 52, ey = lever.y + Math.sin(ang) * 52;
        g.lineStyle(6, INK, 1); g.lineBetween(lever.x, lever.y, ex, ey);
        g.lineStyle(2, GREY, 1); g.lineBetween(lever.x, lever.y, ex, ey);
        g.fillStyle(INK, 1); g.fillCircle(ex, ey, 9);
        g.fillStyle(WHITE, 0.6); g.fillCircle(ex - 3, ey - 3, 2.5);
        g.fillStyle(BLUE, 1); g.fillCircle(lever.x, lever.y, 4);
        if (inking && leverTarget.alive) { g.lineStyle(2, BLUE_LIT, 0.4 + 0.4 * Math.sin(time / 90)); g.strokeCircle(lever.x, lever.y, 30); }
      },

      drawAir(g, time) {
        // The platen's shadow gathers over the inked pages in the last half-second, then the burst.
        const inking = phase === 'ink' || (phase === 'shown' && secondPending);
        if (inking) {
          const left = slamAt - time;
          if (left < 520) {
            const k = 1 - left / 520;
            for (let i = 0; i < COLS * ROWS; i++) {
              if (!inked[i]) continue;
              const c = centre(i);
              g.fillStyle(INK, 0.1 + k * 0.35); g.fillRect(c.x - cw / 2 + 4, c.y - ch / 2 + 4, cw - 8, ch - 8);
              g.lineStyle(3, BLUE_DEEP, k); g.strokeRect(c.x - cw / 2 + 4 + (1 - k) * 20, c.y - ch / 2 + 4 + (1 - k) * 20, cw - 8 - (1 - k) * 40, ch - 8 - (1 - k) * 40);
            }
          }
        }
        if (time - phaseAt < 240 && phase === 'shown') {
          const k = (time - phaseAt) / 240;
          for (let i = 0; i < COLS * ROWS; i++) if (printed[i]) { const c = centre(i); inkBurst(g, c.x, c.y, 30 + k * 50, 1 - k); }
        }
      },

      drawHud(g, time) {
        // A tympan frame: the sheet slides in as the pull nears; pips count the impressions.
        const x = W / 2 - 110, y = 102, w = 220;
        const inking = phase === 'ink' || (phase === 'shown' && secondPending);
        const k = inking ? Phaser.Math.Clamp((time - phaseAt) / Math.max(1, slamAt - phaseAt), 0, 1) : 0;
        g.fillStyle(INK, 0.75); g.fillRect(x - 6, y - 4, w + 12, 24);
        g.fillStyle(PAPER, 1); g.fillRect(x, y, w * k, 16);
        g.lineStyle(1, BLUE_LIT, 0.8); g.strokeRect(x, y, w, 16);
        for (let i = 0; i < Math.min(impressions, 14); i++) { g.fillStyle(i % 2 ? BLUE : WHITE, 1); g.fillRect(x + w + 14 + (i % 7) * 7, y + (i < 7 ? 0 : 9), 5, 7); }
        if (secondForme) { g.fillStyle(BLUE, 1); g.fillRect(x - 20, y, 8, 16); g.fillRect(x - 32, y, 8, 16); }
      },

      destroy() { leverTarget.remove(); },
    };
  },
};

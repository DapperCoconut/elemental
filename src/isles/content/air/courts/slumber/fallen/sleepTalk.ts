import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { BRASS, BRASS_DARK, DREAM, DREAM_LIT, LINEN, NIGHTMARE, PLUM, cloudPuff, dist, star } from '../art';
import { fallenId } from '../../../../meteor/spec';
import { EMBER, alive, hudPlate } from './kit';

/**
 * Talking in Your Sleep — Dreamwright Lull, the Prince's Ear. In the waking world Lull reads
 * sleepers' dreams back to them for a copper and keeps their secrets. In the star's telling he
 * listens at the pillows of the Long Ward with his brass ear-trumpet and carries every word up to
 * the Four-Poster.
 *
 * Every ability you cast is something said in your sleep: a little dream-cloud of it is left
 * hanging where you stood (casting from the same spot only makes that cloud louder). Lull keeps
 * an ear on them all, and every few seconds he *reports*: he lifts the trumpet, each cloud swells
 * and darkens, and then every word you said goes off where you said it. The clouds cannot tell
 * who is standing in them — the report hits Lull just as hard, so lead him through your own words
 * before he reads them. Fight on the move, and never cast twice from where you will be standing.
 * Strike a cloud yourself to hush it before it is read (Lull's own blows only make it louder).
 *
 * Halfway down he reads them back *in order*, one after another, and the last thing you said is
 * shouted twice as wide. The bot steps out of a cloud that is about to be read and otherwise keeps
 * close to you, so the clouds you leave are always near the both of you.
 */

const ID = fallenId('slumber', 'sleep-talk');
const MAX = 6;
const MERGE_R = 64;
const R = 66;
const LOUD_R = 84;
const SHOUT_R = 128;
const EVERY_MS = 6200;
const WARN_MS = 1150;
const CHAIN_MS = 280;
const DMG_P = 15;
const DMG_N = 26;

interface Word { x: number; y: number; at: number; loud: boolean; seed: number; target: ReturnType<GimmickCtx['target']> | null; boomAt: number; r: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { player, npc, tk } = ctx;
  let words: Word[] = [];
  let reportAt = 0;
  let readingAt = 0;
  let started = false;
  let inOrder = false;
  let seed = 1;

  const radiusOf = (w: Word): number => (w.loud ? LOUD_R : R);

  function hush(w: Word): void {
    w.target?.remove();
    w.target = null;
    words = words.filter((o) => o !== w);
    ctx.sfx('hush');
    ctx.flash(w.x, w.y, DREAM_LIT);
  }

  function say(x: number, y: number, time: number): void {
    if (readingAt) return; // nothing new while he reads
    const near = words.find((w) => dist(w.x, w.y, x, y) < MERGE_R);
    if (near) { near.loud = true; near.at = time; return; }
    if (words.length >= MAX) hush(words[0]);
    const w: Word = { x, y, at: time, loud: false, seed: seed++, target: null, boomAt: 0, r: R };
    w.target = ctx.target({
      x, y: y - 30, r: 24, passThrough: true,
      onStruck: (by) => {
        if (!words.includes(w) || w.boomAt) return;
        if (by === 'player') hush(w);
        else w.loud = true;
      },
    });
    words.push(w);
  }

  function boom(w: Word): void {
    w.target?.remove();
    w.target = null;
    const r = w.r;
    ctx.sfx(r >= SHOUT_R ? 'screech' : 'sonic-pulse');
    tk.boom(w.x, w.y, r, DREAM);
    if (alive(player) && dist(player.x, player.y, w.x, w.y) < r + 12) tk.hitPlayer(r >= SHOUT_R ? DMG_P + 6 : DMG_P, player.x, player.y);
    if (alive(npc) && dist(npc.x, npc.y, w.x, w.y) < r + 12) {
      ctx.hit(npc, r >= SHOUT_R ? DMG_N + 10 : DMG_N, npc.x, npc.y);
      ctx.float(npc.x, npc.y - 58, 'OVERHEARD', '#ffc890');
    }
  }

  return {
    update(time) {
      if (!started) { started = true; reportAt = time + EVERY_MS; ctx.banner('MIND WHAT YOU SAY', '#e4d8ff'); }
      if (!inOrder && npc.hp < npc.maxHp * 0.5) { inOrder = true; ctx.banner('READ BACK IN ORDER', '#ffb070'); ctx.sfx('curse-cast'); }

      if (!readingAt && time >= reportAt) {
        if (words.length) {
          readingAt = time;
          const warn = tk.warn(WARN_MS);
          words.forEach((w, i) => {
            const last = i === words.length - 1;
            w.r = inOrder && last ? SHOUT_R : radiusOf(w);
            w.boomAt = time + warn + (inOrder ? i * CHAIN_MS : 0);
          });
          ctx.sfx('beam-charge');
        } else reportAt = time + 1500;
      }
      if (readingAt) {
        for (const w of [...words]) if (w.boomAt && time >= w.boomAt) { boom(w); words = words.filter((o) => o !== w); }
        if (!words.length) { readingAt = 0; reportAt = time + EVERY_MS; }
      }
    },

    onPlayerCast() { if (alive(player)) say(player.x, player.y, tk.now); },

    npcSeek(): Pt | null {
      const time = tk.now;
      // About to be read: step clear of every cloud, away from the nearest one.
      const soon = readingAt || reportAt - time < 900;
      if (soon) {
        for (const w of words) {
          const r = w.boomAt ? w.r : radiusOf(w);
          const d = dist(npc.x, npc.y, w.x, w.y);
          if (d < r + 30) {
            const a = d > 1 ? Math.atan2(npc.y - w.y, npc.x - w.x) : ctx.rng() * Math.PI * 2;
            return { x: tk.clampX(w.x + Math.cos(a) * (r + 70)), y: tk.clampY(w.y + Math.sin(a) * (r + 70)) };
          }
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      for (const w of words) {
        const r = w.boomAt ? w.r : radiusOf(w);
        const k = w.boomAt ? Math.max(0, Math.min(1, 1 - (w.boomAt - time) / tk.warn(WARN_MS))) : 0;
        // The reach of what was said: a soft violet pool that darkens and closes as he reads.
        g.fillStyle(w.boomAt ? mixDark(k) : DREAM, w.boomAt ? 0.12 + 0.22 * k : 0.08); g.fillCircle(w.x, w.y, r);
        g.lineStyle(2, w.boomAt ? EMBER : DREAM_LIT, w.boomAt ? 0.5 + 0.4 * k : 0.3); g.strokeCircle(w.x, w.y, r);
        if (w.boomAt) { g.lineStyle(2, EMBER, 0.8); g.strokeCircle(w.x, w.y, r * (1 - k) + 6); }
        // Little ripples, the sound of it.
        for (let i = 0; i < 2; i++) {
          const ph = (t * 0.8 + i * 0.5 + w.seed * 0.13) % 1;
          g.lineStyle(1.2, DREAM_LIT, 0.25 * (1 - ph)); g.strokeEllipse(w.x, w.y, r * 2 * ph, r * 1.4 * ph);
        }
      }
      // While he reads, a thread of the words runs from each cloud into his trumpet.
      if (readingAt && alive(npc)) {
        const mouth = trumpetMouth(npc.x, npc.y, true);
        for (const w of words) {
          const ph = (t * 2.4 + w.seed * 0.3) % 1;
          g.lineStyle(1.4, DREAM_LIT, 0.5); g.lineBetween(w.x, w.y - 30, mouth.x, mouth.y);
          const px = w.x + (mouth.x - w.x) * ph, py = w.y - 30 + (mouth.y - w.y + 30) * ph;
          g.fillStyle(EMBER, 0.9); g.fillCircle(px, py, 2.6);
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const w of words) {
        const k = w.boomAt ? Math.max(0, Math.min(1, 1 - (w.boomAt - time) / tk.warn(WARN_MS))) : 0;
        const s = (w.loud ? 1.25 : 1) * (1 + k * 0.4);
        const bx = w.x, by = w.y - 30 + Math.sin(t * 1.6 + w.seed) * 3;
        // A sleep-talk cloud: a puff with a tail curling down to where it was said.
        g.fillStyle(LINEN, 0.7); g.fillCircle(w.x + 6, w.y - 10, 3); g.fillCircle(w.x + 2, w.y - 16, 4.5);
        cloudPuff(g, bx, by, 14 * s, 0.92, w.boomAt ? mixDark(k) : 0xf2ecfa, w.boomAt ? NIGHTMARE : 0xbcb2dc, w.seed);
        // The mumbled words inside: a scribble line with a little crescent and a star.
        g.lineStyle(1.6, w.boomAt ? EMBER : PLUM, 0.9);
        g.beginPath();
        for (let i = 0; i <= 8; i++) {
          const x = bx - 10 * s + i * 2.5 * s, y = by - 1 + Math.sin(i * 1.9 + w.seed) * 2.4;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.strokePath();
        star(g, bx + 9 * s, by - 6 * s, 2.6 * s, w.boomAt ? EMBER : DREAM, 0.9, t + w.seed);
        if (w.loud) { g.lineStyle(1.5, PLUM, 0.7); g.lineBetween(bx - 16 * s, by - 10 * s, bx - 21 * s, by - 15 * s); g.lineBetween(bx + 16 * s, by - 10 * s, bx + 21 * s, by - 15 * s); }
      }
      // Lull's ear-trumpet: brass, long, cupped toward the loudest of your words.
      if (alive(npc)) {
        const up = readingAt > 0;
        const m = trumpetMouth(npc.x, npc.y, up);
        const ex = npc.x + 12, ey = npc.y - 30;
        g.lineStyle(4, BRASS_DARK, 1); g.lineBetween(ex, ey, m.x, m.y);
        g.lineStyle(2, lit(BRASS, 0.2), 1); g.lineBetween(ex, ey - 1, m.x, m.y - 1);
        g.fillStyle(BRASS_DARK, 1); g.fillEllipse(m.x + 1, m.y + 1, 22, 16);
        g.fillStyle(BRASS, 1); g.fillEllipse(m.x, m.y, 20, 14);
        g.fillStyle(dim(BRASS, 0.6), 1); g.fillEllipse(m.x + 2, m.y, 10, 7);
        g.fillStyle(EMBER, 0.6 + 0.3 * Math.sin(t * 7)); g.fillCircle(m.x + 2, m.y, 2.4);
      }
    },

    drawHud(g, time) {
      // A ledger page: one ink-blot per word he has on you, and the candle burning to the report.
      const x = 28, y = ctx.H - 66;
      hudPlate(g, x - 12, y - 12, 190, 52);
      g.fillStyle(LINEN, 0.95); g.fillRoundedRect(x, y - 4, 100, 34, 3);
      for (let i = 0; i < 4; i++) { g.lineStyle(1, 0xa2bcdc, 0.6); g.lineBetween(x + 4, y + 3 + i * 7, x + 96, y + 3 + i * 7); }
      for (let i = 0; i < MAX; i++) {
        const w = words[i];
        g.fillStyle(w ? (w.loud ? NIGHTMARE : PLUM) : 0xd8d0e0, w ? 1 : 0.6);
        g.fillCircle(x + 10 + i * 16, y + 13, w && w.loud ? 6 : 4.5);
      }
      const k = readingAt ? 1 : Math.max(0, Math.min(1, 1 - (reportAt - time) / EVERY_MS));
      const cx = x + 140;
      g.fillStyle(BRASS_DARK, 1); g.fillRect(cx - 9, y + 28, 18, 4);
      g.fillStyle(LINEN, 1); g.fillRect(cx - 4, y + 28 - 26 * (1 - k) - 2, 8, 26 * (1 - k) + 2);
      g.fillStyle(readingAt ? EMBER : 0xffe2a0, 1); g.fillEllipse(cx, y + 28 - 26 * (1 - k) - 7, 6, 10);
    },

    destroy() { for (const w of words) w.target?.remove(); },
  };
}

/** The trumpet's bell: held out level while he waits, lifted to his ear-height while he reads. */
function trumpetMouth(x: number, y: number, up: boolean): Pt {
  return up ? { x: x + 40, y: y - 62 } : { x: x + 44, y: y - 34 };
}

/** The cloud's colour as it is read: violet curdling toward the nightmare plum. */
function mixDark(k: number): number {
  return mixC(DREAM, 0x5a2a4a, k);
}

export const FALLEN_SLEEP_TALK: GimmickDef = {
  id: ID,
  rules: 'Every cast leaves what you said hanging where you stood. Lull reads them all aloud and they go off, hurting whoever is in them. Strike one to hush it.',
  make,
};

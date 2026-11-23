import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, shadow, type G } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import {
  BRASS, CHALK, FOE_TINT, HEM_GOLD, OAK, OAK_DARK, PLAYER_TINT, QUEEN, QUEEN_DARK, RED_THREAD, TAR, dist, tapeStrip,
  tideMark,
} from '../art';

/**
 * Short Measure — Measurer Quint, who read the Yardstick at dusk.
 *
 * An ell is forty-five inches, and the Measurers decided how many a head owed. Quint's brass
 * tape runs from the reel on his belt to the stranger, marked at every ell. Every few seconds he
 * calls a measure — three ells, five, six — and a chalk ring of that radius springs up round him
 * (and moves with him). When the count runs out the tape is read: stand *short* of the ring and
 * you are fined; stand *over* it and the tape reels you in; stand true on the ring and the
 * measure is honest — and an honest measure is paid out of Quint's own purse, more each time in
 * a row. He paces in at you while the count runs, to make you short.
 *
 * Below half he measures from the brass Yardstick in the middle instead, and reads you both:
 * whoever stands true on the ring is paid by whoever does not. The exploit is the whole rule —
 * keep the honest distance and he pays for his own measure.
 */

const ID = fallenId('sailmaker', 'short-measure');
const ELL = 60;
const BAND = 28;
const IDLE_MS = 2200;
const CALL_MS = 2600;
const SHORT_FINE = 16;
const OVER_FINE = 8;
const POST_FINE = 18;

type Read = 'true' | 'short' | 'over';

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng, tk } = ctx;
  const post: Pt = { x: W / 2, y: top + (H - top) / 2 + 14 };
  let calling = false;
  let ells = 4;
  let phaseAt = 0;
  let streak = 0;
  let fromPost = false;
  let announced = false;
  let lastRead: { at: number; who: Fighter; read: Read } [] = [];
  let lastCallEnds = 0;

  const centre = (): Pt => (fromPost ? post : { x: ctx.npc.x, y: ctx.npc.y + 10 });
  const R = (): number => ells * ELL;
  const readOf = (f: Fighter): Read => {
    const c = centre();
    const d = dist(f.x, f.y + 10, c.x, c.y);
    return Math.abs(d - R()) <= BAND ? 'true' : d < R() ? 'short' : 'over';
  };
  const npcPay = (frac: number): void => { ctx.hit(ctx.npc, Math.max(16, ctx.npc.maxHp * frac), ctx.npc.x, ctx.npc.y); ctx.sfx('money'); };

  const read = (time: number): void => {
    ctx.sfx('countdown-go');
    const p = ctx.player, n = ctx.npc;
    const rp = readOf(p);
    lastRead = [{ at: time, who: p, read: rp }];
    if (!fromPost) {
      if (rp === 'true') {
        npcPay(0.06 + streak * 0.02);
        streak = Math.min(3, streak + 1);
        ctx.banner(streak > 1 ? `TRUE MEASURE ×${streak}` : 'TRUE MEASURE', '#9df5c8');
      } else if (rp === 'short') {
        streak = 0;
        tk.hitPlayer(SHORT_FINE, p.x, p.y);
        ctx.sfx('judgement');
      } else {
        streak = 0;
        tk.hitPlayer(OVER_FINE, p.x, p.y);
        tk.pull(n.x, n.y, 130, 900);
        ctx.sfx('snap-back');
      }
      return;
    }
    const rn = readOf(n);
    lastRead.push({ at: time, who: n, read: rn });
    ctx.sfx('judgement');
    if (rp === 'true' && rn !== 'true') { npcPay(0.08); ctx.banner('HE STANDS SHORT — HE PAYS', '#9df5c8'); }
    else if (rn === 'true' && rp !== 'true') { tk.hitPlayer(POST_FINE, p.x, p.y); }
    else if (rp !== 'true' && rn !== 'true') { tk.hitPlayer(POST_FINE * 0.5, p.x, p.y); npcPay(0.03); }
  };

  return {
    update(time) {
      if (!announced) { announced = true; phaseAt = time - IDLE_MS + 900; ctx.banner('STAND TRUE TO THE MEASURE', '#e8d8a8'); }
      if (!fromPost && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        fromPost = true; streak = 0;
        ctx.banner('MEASURED FROM THE YARDSTICK', '#ffb080'); ctx.sfx('boss-phase');
      }
      if (!calling && time - phaseAt >= IDLE_MS) {
        calling = true; phaseAt = time;
        const choices = fromPost ? [2, 3, 4] : [3, 4, 5, 6];
        let next = choices[Math.floor(rng() * choices.length)];
        if (next === ells) next = choices[(choices.indexOf(next) + 1) % choices.length];
        ells = next;
        ctx.sfx('clock-tick');
      } else if (calling && time - phaseAt >= CALL_MS) {
        calling = false; phaseAt = time; lastCallEnds = time;
        read(time);
      }
    },

    // He paces the measure out slowly while the count runs.
    npcSpeedMult() { return calling && !fromPost ? 0.8 : 1; },

    npcSeek(): Pt | null {
      if (!calling) return null;
      const n = ctx.npc, p = ctx.player;
      if (fromPost) {
        const a = Math.atan2(n.y - post.y, n.x - post.x);
        return { x: tk.clampX(post.x + Math.cos(a) * R()), y: tk.clampY(post.y + Math.sin(a) * R()) - 10 };
      }
      // Close in to leave the stranger short of the ring.
      const a = Math.atan2(n.y - p.y, n.x - p.x);
      const want = Math.max(60, R() - 100);
      return { x: tk.clampX(p.x + Math.cos(a) * want), y: tk.clampY(p.y + Math.sin(a) * want) };
    },

    drawGround(g, time) {
      // The brass Yardstick's footing — always there; it only matters below half.
      tideMark(g, post.x, post.y + 4, 20, QUEEN, fromPost ? 0.5 : 0.2);
      if (!calling) {
        // The ring of the last read, fading.
        const k = (time - lastCallEnds) / 600;
        if (k < 1) { const c = centre(); g.lineStyle(3, CHALK, 0.6 * (1 - k)); g.strokeCircle(c.x, c.y, R()); }
        return;
      }
      const c = centre();
      const k = (time - phaseAt) / CALL_MS;
      const r = R();
      // The honest band, chalked, ell-studded, tightening its glow as the count runs out.
      g.lineStyle(BAND * 2, HEM_GOLD, 0.06 + k * 0.1); g.strokeCircle(c.x, c.y, r);
      g.lineStyle(1.5, CHALK, 0.55); g.strokeCircle(c.x, c.y, r - BAND); g.strokeCircle(c.x, c.y, r + BAND);
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2 + time / 6000;
        g.lineStyle(2.5, CHALK, 0.85); g.beginPath(); g.arc(c.x, c.y, r, a, a + 0.07); g.strokePath();
      }
      // Ell studs along one radius: a brass rivet at every ell out to the call.
      const a0 = -Math.PI / 2;
      for (let e = 1; e <= ells; e++) {
        const sx = c.x + Math.cos(a0) * e * ELL, sy = c.y + Math.sin(a0) * e * ELL;
        g.fillStyle(dim(BRASS, 0.4), 1); g.fillCircle(sx, sy + 1, 4.5);
        g.fillStyle(e === ells ? lit(BRASS, 0.3) : BRASS, 1); g.fillCircle(sx, sy, 4);
      }
      // The inside is "short" ground: faintly hatched in red.
      g.fillStyle(RED_THREAD, 0.03 + k * 0.05); g.fillCircle(c.x, c.y, r - BAND);
    },

    drawAir(g, time) {
      // The Yardstick in the middle.
      shadow(g, post.x, post.y + 2, 30, 9, 0.35);
      g.fillStyle(OAK_DARK, 1); g.fillRect(post.x - 5, post.y - 104, 10, 104);
      g.fillStyle(OAK, 1); g.fillRect(post.x - 3, post.y - 104, 4, 104);
      for (let i = 0; i < 4; i++) { g.fillStyle(BRASS, 1); g.fillRect(post.x - 6, post.y - 20 - i * 24, 12, 3); }
      g.fillStyle(fromPost ? HEM_GOLD : BRASS, 1); g.fillCircle(post.x, post.y - 108, fromPost ? 7 + Math.sin(time / 150) : 6);
      // The tape: from Quint's reel (or the Yardstick) to the stranger, every ell riveted.
      const from = fromPost ? { x: post.x, y: post.y - 20 } : { x: ctx.npc.x + 10, y: ctx.npc.y + 2 };
      const to = { x: ctx.player.x, y: ctx.player.y + 4 };
      const pulls = fromPost ? [to, { x: ctx.npc.x, y: ctx.npc.y + 4 }] : [to];
      for (const end of pulls) {
        const len = dist(from.x, from.y, end.x, end.y);
        if (len < 6) continue;
        tapeStrip(g, from.x, from.y, end.x, end.y, 5, 0.9, HEM_GOLD);
        const ux = (end.x - from.x) / len, uy = (end.y - from.y) / len;
        for (let d = ELL; d < len; d += ELL) {
          g.fillStyle(TAR, 0.9); g.fillRect(from.x + ux * d - 2, from.y + uy * d - 4, 4, 8);
          g.fillStyle(BRASS, 1); g.fillCircle(from.x + ux * d, from.y + uy * d, 1.6);
        }
        // The brass end-hook.
        g.lineStyle(2.4, BRASS, 1); g.beginPath(); g.arc(end.x, end.y + 3, 4, 0, Math.PI); g.strokePath();
      }
      if (!fromPost) {
        // Quint's reel: a round brass case on his belt with a winding crank.
        const rx = ctx.npc.x + 10, ry = ctx.npc.y + 2;
        g.fillStyle(dim(BRASS, 0.4), 1); g.fillCircle(rx, ry, 8);
        g.fillStyle(BRASS, 1); g.fillCircle(rx, ry, 6.5);
        g.fillStyle(QUEEN_DARK, 1); g.fillCircle(rx, ry, 2);
        const ca = time / (calling ? 90 : 400);
        g.lineStyle(1.6, TAR, 1); g.lineBetween(rx, ry, rx + Math.cos(ca) * 7, ry + Math.sin(ca) * 7);
      }
      // The verdict over each head for a moment after the read.
      for (const r of lastRead) {
        const k = (time - r.at) / 900;
        if (k < 0 || k > 1) continue;
        drawVerdict(g, r.who.x, r.who.y - 64 - k * 16, r.read, 1 - k);
      }
    },

    drawHud(g, time) {
      const cx = W / 2, y = top + 8;
      g.fillStyle(0x16140f, 0.72); g.fillRoundedRect(cx - 90, y - 4, 180, 34, 8);
      // The called measure, as that many brass ell-bars.
      for (let e = 0; e < 6; e++) {
        const on = calling && e < ells;
        g.fillStyle(on ? BRASS : 0x3a342a, on ? 1 : 0.8); g.fillRect(cx - 80 + e * 16, y + 2, 12, 12);
        if (on) { g.fillStyle(lit(BRASS, 0.4), 1); g.fillRect(cx - 80 + e * 16, y + 2, 12, 3); }
      }
      // The count running out.
      const k = calling ? Math.min(1, (time - phaseAt) / CALL_MS) : 0;
      g.fillStyle(0x3a342a, 1); g.fillRect(cx - 80, y + 18, 92, 5);
      g.fillStyle(k > 0.75 ? RED_THREAD : HEM_GOLD, 1); g.fillRect(cx - 80, y + 18, 92 * (1 - k), 5);
      // Honest measures in a row (what Quint will pay next).
      for (let i = 0; i < 3; i++) { g.fillStyle(i < streak ? PLAYER_TINT : 0x3a342a, 1); g.fillCircle(cx + 32 + i * 14, y + 10, 5); }
      g.fillStyle(fromPost ? FOE_TINT : 0x3a342a, 1); g.fillRect(cx + 74, y + 2, 6, 22);
    },
  };
}

/** A read stamped over a head: a tick for true, a short ruler for short, a reeled hook for over. */
function drawVerdict(g: G, x: number, y: number, read: Read, a: number): void {
  if (read === 'true') {
    g.lineStyle(4, 0x9df5c8, a); g.lineBetween(x - 9, y, x - 2, y + 7); g.lineBetween(x - 2, y + 7, x + 11, y - 8);
  } else if (read === 'short') {
    g.fillStyle(HEM_GOLD, a); g.fillRect(x - 10, y - 3, 14, 7);
    g.lineStyle(2, RED_THREAD, a); g.lineBetween(x + 6, y - 6, x + 14, y + 8);
    for (let i = 0; i < 3; i++) { g.lineStyle(1, TAR, a); g.lineBetween(x - 8 + i * 4, y - 3, x - 8 + i * 4, y + 1); }
  } else {
    g.lineStyle(2.5, BRASS, a); g.beginPath(); g.arc(x, y, 7, 0, Math.PI); g.strokePath();
    g.lineBetween(x - 7, y, x - 7, y - 12);
    g.lineStyle(1.5, RED_THREAD, a); g.lineBetween(x + 12, y - 4, x + 20, y - 4); g.lineBetween(x + 12, y - 4, x + 15, y - 7);
  }
}

export const FALLEN_SHORT_MEASURE: GimmickDef = {
  id: ID,
  rules: 'He calls a measure and rings it round himself. Stand on the ring when the tape is read and he pays; short is a fine, over is reeled in.',
  make,
};

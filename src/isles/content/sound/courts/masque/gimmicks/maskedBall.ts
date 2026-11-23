import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, StrikeTarget } from '../../../../../IslesTypes';
import { lit } from '../../../../../art/IsleArt';
import { dancer, mask, type MaskKind } from '../art';
import { GILT, GILT_LIT, ISTRIA, SEQUINS, SEQ_GOLD, VELVET, VELVET_LIT, FACADE_LIT, SEQ_TEAL } from '../palette';
import { alive, clamp, dist, stepDt } from '../util';

/**
 * Masked Ball — Dancer Domino.
 *
 * A ring of masked dancers waltzes round the middle of the floor, every one in the same black
 * domino mask, every one turning on the same one-two-three. Walk into the ring and you are swept
 * along it, trodden on and shoved out. Every so often the band strikes up THE BALL and Domino
 * takes the empty place in the ring — masked like the rest she is lost among them, and blows
 * barely find her, while the dancers flick sequins at you on the beat.
 *
 * But the dancers are papier-mâché and gauze. Strike one and it pops in a burst of glitter that
 * stings whoever is beside it. Pop a decoy while Domino is dancing and the ball falls apart: she
 * staggers out of the ring, stunned, her mask knocked askew, and hits land on her harder for a
 * while. She knows the trick too — she will pop a dancer beside *you* if she can.
 */

const SLOTS = 8;
const RING_R = 190;
const DANCER_R = 20;
const SPIN = 0.42; // rad/s round the ring
const BEAT_MS = 520; // a waltz beat; the third of every bar is the strong one
const BALL_EVERY = 10000;
const BALL_MS = 6500;
const POP_R = 86;
const POP_DMG = 8;
const REGROW_MS = 6500;

interface Dancer {
  slot: number;
  gown: number;
  target: StrikeTarget | null;
  poppedAt: number;
  x: number; y: number;
}

interface Pop { x: number; y: number; at: number; color: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const cx = W / 2, cy = (top + H) / 2 + 10;
  const dancers: Dancer[] = [];
  const pops: Pop[] = [];
  /** The empty place in the ring, kept for Domino. */
  const EMPTY = 0;
  let rot = rng() * Math.PI * 2;
  let started = false;
  let nextBall = 0;
  let ballWarnAt = -1;
  let ballUntil = 0;
  /** Domino is in the ring (masked). */
  let joined = false;
  let unmaskedUntil = 0;
  let nextBeat = 0;
  let beat = 0;
  const bumpAt = new Map<Fighter, number>([[player, 0], [npc, 0]]);

  const slotPos = (slot: number, time: number) => {
    const a = rot + (slot / SLOTS) * Math.PI * 2;
    // The waltz: each dancer turns a small circle of its own as the ring goes round.
    const w = time / 1000 * 3.2 + slot * 1.7;
    return { x: cx + Math.cos(a) * RING_R + Math.cos(w) * 12, y: cy + Math.sin(a) * RING_R * 0.78 + Math.sin(w) * 9 };
  };

  function grow(d: Dancer): void {
    d.poppedAt = 0;
    d.target = ctx.target({
      x: d.x, y: d.y, r: DANCER_R,
      onStruck: (by) => pop(d, by),
    });
  }

  function pop(d: Dancer, by: 'player' | 'npc'): void {
    if (!d.target) return;
    const time = ctx.scene.time.now;
    d.target.remove();
    d.target = null;
    d.poppedAt = time;
    pops.push({ x: d.x, y: d.y, at: time, color: d.gown });
    ctx.sfx('sparkle');
    ctx.float(d.x, d.y - 40, 'POP!', '#ffd24a');
    // Glitter stings whoever is beside it — not the one who struck it.
    const victim = by === 'player' ? npc : player;
    if (alive(victim) && dist(victim.x, victim.y, d.x, d.y) < POP_R) ctx.hit(victim, POP_DMG, victim.x, victim.y);
    // A decoy popped while Domino dances: the ball falls apart.
    if (by === 'player' && joined && alive(npc)) {
      joined = false;
      ballUntil = time;
      unmaskedUntil = time + 3500;
      ctx.stun(npc, 1000);
      ctx.nudge(npc, (npc.x - cx) * 0.35, (npc.y - cy) * 0.35);
      ctx.banner('UNMASKED!', '#ffd24a');
      ctx.flash(npc.x, npc.y, SEQ_GOLD);
      ctx.sfx('crystal-shatter');
    }
  }

  function bump(f: Fighter, time: number, dt: number): void {
    if (!alive(f)) return;
    for (const d of dancers) {
      if (!d.target) continue;
      const dd = dist(f.x, f.y, d.x, d.y);
      if (dd > DANCER_R + 22) continue;
      // Swept along the ring (tangent), and shouldered outward.
      const a = Math.atan2(f.y - cy, f.x - cx);
      const tx = -Math.sin(a), ty = Math.cos(a);
      const ox = (f.x - d.x) / Math.max(1, dd), oy = (f.y - d.y) / Math.max(1, dd);
      ctx.nudge(f, (tx * 150 + ox * 120) * dt, (ty * 150 + oy * 120) * dt);
      if (time >= (bumpAt.get(f) ?? 0)) {
        bumpAt.set(f, time + 800);
        ctx.hit(f, 3, f.x, f.y);
        ctx.sfx('hit-light');
      }
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        nextBall = time + 5500;
        nextBeat = time + BEAT_MS;
        for (let s = 0; s < SLOTS; s++) {
          if (s === EMPTY) continue;
          const p = slotPos(s, time);
          const d: Dancer = { slot: s, gown: [VELVET, SEQUINS[s % 5], FACADE_LIT, SEQ_TEAL][s % 4], target: null, poppedAt: 0, x: p.x, y: p.y };
          dancers.push(d);
          grow(d);
        }
      }
      rot += SPIN * dt * (time < ballUntil ? 1.6 : 1);
      for (const d of dancers) {
        const p = slotPos(d.slot, time);
        d.x = p.x; d.y = p.y;
        if (d.target) d.target.moveTo(d.x, d.y);
        else if (time - d.poppedAt > REGROW_MS) grow(d);
      }
      for (let i = pops.length - 1; i >= 0; i--) if (time - pops[i].at > 900) pops.splice(i, 1);

      // The band strikes up.
      if (ballWarnAt < 0 && time >= nextBall - 1400) {
        ballWarnAt = time;
        ctx.banner('THE BALL — DOMINO TAKES HER PLACE', '#ffd24a');
        ctx.sfx('holy-chord');
      }
      if (time >= nextBall) {
        nextBall = time + BALL_EVERY;
        ballWarnAt = -1;
        ballUntil = time + BALL_MS;
      }
      const ball = time < ballUntil;
      if (ball && !joined && alive(npc)) {
        const p = slotPos(EMPTY, time);
        if (dist(npc.x, npc.y, p.x, p.y) < 46) { joined = true; ctx.float(npc.x, npc.y - 50, 'LOST IN THE DANCE', '#c8b4f0'); }
      }
      if (!ball && joined) joined = false;
      // While she dances, she keeps her place in the ring.
      if (joined && alive(npc)) {
        const p = slotPos(EMPTY, time);
        ctx.nudge(npc, (p.x - npc.x) * Math.min(1, dt * 10), (p.y - npc.y) * Math.min(1, dt * 10));
      }

      // The beat: one, two, THREE. On the three during the ball, a dancer flicks sequins at you.
      if (time >= nextBeat) {
        nextBeat = time + BEAT_MS;
        beat = (beat + 1) % 3;
        if (ball && beat === 2 && alive(player)) {
          const live = dancers.filter((d) => d.target);
          const n = ctx.hard ? 2 : 1;
          for (let k = 0; k < n && live.length; k++) {
            const d = live[Math.floor(rng() * live.length)];
            const a = Math.atan2(player.y - d.y, player.x - d.x);
            for (const off of [-0.2, 0, 0.2]) ctx.tk.spawnBullet({ x: d.x, y: d.y - 30, angle: a + off, speed: 230, damage: 7, r: 5, lifeMs: 3500, color: SEQUINS[(beat + k) % 5] });
          }
          ctx.sfx('sparkle');
        }
      }

      bump(player, time, dt);
      if (!joined) bump(npc, time, dt);
    },

    npcTakenMult() {
      const time = ctx.scene.time.now;
      if (joined) return 0.35;
      return time < unmaskedUntil ? 1.4 : 1;
    },

    npcSeek() {
      const time = ctx.scene.time.now;
      if (time < ballUntil || ballWarnAt >= 0) return slotPos(EMPTY, time);
      // Out of the ball: stand by the dancer nearest you, to pop it in your face.
      let best: Dancer | null = null;
      let bd = Infinity;
      for (const d of dancers) {
        if (!d.target) continue;
        const dd = dist(d.x, d.y, player.x, player.y);
        if (dd < bd) { bd = dd; best = d; }
      }
      if (!best || bd > 160) return null;
      const a = Math.atan2(best.y - player.y, best.x - player.x);
      return { x: clamp(best.x + Math.cos(a) * 50, 60, W - 60), y: clamp(best.y + Math.sin(a) * 50, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // The inlaid ring the dancers follow, the empty place picked out in gilt.
      g.lineStyle(26, ISTRIA, 0.08); g.strokeEllipse(cx, cy, RING_R * 2, RING_R * 1.56);
      g.lineStyle(2, GILT, 0.35); g.strokeEllipse(cx, cy, RING_R * 2 + 30, RING_R * 1.56 + 24);
      g.lineStyle(2, GILT, 0.35); g.strokeEllipse(cx, cy, RING_R * 2 - 30, RING_R * 1.56 - 24);
      // Footprints of the waltz: three steps per bar, chalked round the ring.
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + rot * 0.15;
        g.fillStyle(lit(ISTRIA, 0.3), 0.18 + (i % 3 === 2 ? 0.12 : 0));
        g.fillEllipse(cx + Math.cos(a) * RING_R, cy + Math.sin(a) * RING_R * 0.78, 9, 5);
      }
      const p = slotPos(EMPTY, time);
      const ball = time < ballUntil;
      g.lineStyle(2, ball ? SEQ_GOLD : GILT, ball ? 0.9 : 0.35); g.strokeCircle(p.x, p.y + 4, 26);
      if (ballWarnAt >= 0) { g.fillStyle(SEQ_GOLD, 0.15 + Math.sin(time / 90) * 0.1); g.fillCircle(p.x, p.y + 4, 26); }
      // Dancer shadows (the decoys' and hers are the same — that is the point).
      for (const d of dancers) if (d.target) { g.fillStyle(0x000000, 0.22); g.fillEllipse(d.x, d.y + 3, 30, 9); }
    },

    drawAir(g, time) {
      const t = time / 1000;
      const kind: MaskKind = 'moretta';
      for (const d of dancers) {
        if (!d.target) {
          // Regrowing: a dress form being re-dressed, faint.
          const k = clamp((time - d.poppedAt) / REGROW_MS, 0, 1);
          if (k > 0.6) { g.fillStyle(d.gown, (k - 0.6) * 0.8); g.fillTriangle(d.x - 12, d.y, d.x + 12, d.y, d.x, d.y - 28); }
          continue;
        }
        dancer(g, d.x, d.y, 0.95, d.gown, kind, t + d.slot, 0x16101c);
      }
      // Domino in the ring: a gown and the same mask over her.
      if (joined && alive(npc)) {
        dancer(g, npc.x, npc.y, 1.0, VELVET_LIT, kind, t, 0x16101c);
      } else if (time < unmaskedUntil && alive(npc)) {
        // Mask knocked askew over one ear.
        mask(g, npc.x + 16, npc.y - 48, 0.5, kind, 0x16101c, GILT);
        g.lineStyle(2, GILT_LIT, 0.5 + Math.sin(time / 80) * 0.3); g.strokeCircle(npc.x, npc.y - 20, 30);
      }
      for (const p of pops) {
        const k = (time - p.at) / 900;
        for (let i = 0; i < 22; i++) {
          const a = i * 2.39;
          const r = k * POP_R * (0.4 + (i % 5) / 6);
          g.fillStyle(SEQUINS[i % 5], 1 - k);
          g.fillRect(p.x + Math.cos(a) * r, p.y - 30 + Math.sin(a) * r * 0.8 + k * k * 30, 3, 3);
        }
        g.lineStyle(2, p.color, 1 - k); g.strokeCircle(p.x, p.y - 20, k * POP_R);
      }
    },

    drawHud(g, time) {
      // The band's bar: three beat lamps, the third larger; lit gold while THE BALL plays.
      const ball = time < ballUntil;
      const bx = W / 2 - 40, by = top + 14;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(bx - 12, by - 10, 104, 20, 8);
      for (let i = 0; i < 3; i++) {
        const on = i === beat;
        g.fillStyle(on ? (ball ? SEQ_GOLD : 0xffffff) : 0x555555, on ? 1 : 0.6);
        g.fillCircle(bx + i * 40, by, i === 2 ? 7 : 5);
      }
      if (ball) { const k = clamp((ballUntil - time) / BALL_MS, 0, 1); g.fillStyle(SEQ_GOLD, 0.8); g.fillRect(bx - 8, by + 12, 96 * k, 3); }
    },

    destroy() {
      for (const d of dancers) d.target?.remove();
    },
  };
}

export const MASKED_BALL: GimmickDef = {
  id: 'masque-masked-ball',
  rules: 'Masked dancers waltz in a ring; at THE BALL Domino joins them, hard to hurt. Strike a dancer: it pops in glitter beside it — pop one while she dances and she staggers out unmasked.',
  make,
};

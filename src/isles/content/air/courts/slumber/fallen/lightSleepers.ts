import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { dim, lit, mulberry } from '../../../../../art/IsleArt';
import { DREAM_LIT, FEATHER, LINEN, NIGHTMARE_EYE, PLUM, QUILTS, SLATE, dist, nightcapOn, segDist, streetBed, zzz } from '../art';
import { fallenId } from '../../../../meteor/spec';
import { EMBER, alive, hudPlate } from './kit';

/**
 * Light Sleepers — Hush-Warden Tace, who walks the Long Ward at night in felt slippers. In the
 * star's telling the debtors asleep in the street are not quite asleep: they are the Prince's
 * light sleepers, and the Warden's work is to see they are only ever woken by somebody else.
 *
 * Five beds stand in the yard with a sleeper in each. Noise stirs them: a dash is loud, a cast
 * less so, and a body taking a blow is a thud — and the thud belongs to whoever was hit, not
 * whoever struck. Stir a sleeper fully and they sit bolt upright, point at whoever made the last
 * noise near them, and *SHUSH*: a hush rolls down the line they point along, hurting and
 * silencing anyone in it. The aim follows its culprit, then holds still a moment before it goes —
 * step off the line. Beat Tace beside a bed and the sleeper points at her.
 *
 * Halfway down the felt comes off the Belfry: every noise in the yard echoes a second later where
 * it was made. Tace walks soft (her casts make half the noise, her dashes all of it). The bot
 * keeps away from restless beds and sidesteps a pointing finger.
 */

const ID = fallenId('slumber', 'light-sleepers');
const BEDS: Pt[] = [{ x: 190, y: 230 }, { x: 770, y: 230 }, { x: 480, y: 390 }, { x: 190, y: 560 }, { x: 770, y: 560 }];
const DECAY = 0.13;
const UP_MS = 1050;
const LOCK_MS = 380;
const SHUSH_MS = 360;
const REST_MS = 3200;
const HALF_W = 26;
const REACH = 1200;
const DMG_P = 16;
const DMG_N = 24;
const SILENCE_MS = 1400;
const ECHO_MS = 1100;

type State = 'asleep' | 'up' | 'rest';
interface Sleeper { x: number; y: number; stir: number; state: State; at: number; culprit: Fighter | null; aim: number; fired: boolean; seed: number }
interface Noise { x: number; y: number; r: number; amt: number; who: Fighter; at: number; echo: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { player, npc, tk } = ctx;
  const sleepers: Sleeper[] = BEDS.map((b, i) => ({ x: b.x, y: b.y, stir: 0.15 * i % 0.5, state: 'asleep', at: 0, culprit: null, aim: 0, fired: false, seed: 31 + i * 17 }));
  const rings: Noise[] = [];
  const echoes: Noise[] = [];
  const wasDashing = new Map<Fighter, boolean>();
  let started = false;
  let echoing = false;

  /** Where the sleeper's head is — the noise is heard there, and the hush starts there. */
  const head = (s: Sleeper): Pt => ({ x: s.x, y: s.y - 40 });

  function noise(who: Fighter, r: number, amt: number, time: number, echo = false, at?: Pt): void {
    const x = at ? at.x : who.x, y = at ? at.y : who.y;
    for (const s of sleepers) {
      if (s.state !== 'asleep') continue;
      const h = head(s);
      const d = dist(x, y, h.x, h.y);
      if (d >= r) continue;
      s.stir += amt * (1 - (d / r) * 0.6);
      s.culprit = who;
    }
    rings.push({ x, y, r, amt, who, at: time, echo });
    if (echoing && !echo) echoes.push({ x, y, r, amt: amt * 0.7, who, at: time + ECHO_MS, echo: true });
  }

  const aimed = (s: Sleeper, f: Fighter): boolean => {
    const h = head(s);
    return segDist(f.x, f.y, h.x, h.y, h.x + Math.cos(s.aim) * REACH, h.y + Math.sin(s.aim) * REACH) < HALF_W + 12;
  };

  return {
    update(time, dt) {
      if (!started) { started = true; ctx.banner('DO NOT WAKE THE DEBTORS', '#e4d8ff'); }
      if (!echoing && npc.hp < npc.maxHp * 0.5) { echoing = true; ctx.banner('THE FELT IS OFF THE BELL', '#ffb070'); ctx.sfx('sonic-pulse'); }

      for (const f of [player, npc]) {
        const d = alive(f) && ctx.dashing(f);
        if (d && !wasDashing.get(f)) noise(f, 190, 0.55, time);
        wasDashing.set(f, d);
      }
      while (echoes.length && time >= echoes[0].at) {
        const e = echoes.shift() as Noise;
        noise(e.who, e.r, e.amt, time, true, e);
      }

      for (const s of sleepers) {
        if (s.state === 'asleep') {
          s.stir = Math.max(0, s.stir - DECAY * dt);
          if (s.stir >= 1 && s.culprit) {
            s.state = 'up'; s.at = time; s.fired = false; s.stir = 1;
            const h = head(s);
            s.aim = Math.atan2(s.culprit.y - h.y, s.culprit.x - h.x);
            ctx.sfx('screech');
          }
        } else if (s.state === 'up') {
          const fireAt = s.at + tk.warn(UP_MS);
          const c = s.culprit;
          if (c && alive(c) && time < fireAt - LOCK_MS) {
            const h = head(s);
            s.aim = Math.atan2(c.y - h.y, c.x - h.x);
          }
          if (!s.fired && time >= fireAt) {
            s.fired = true;
            ctx.sfx('hush');
            if (alive(player) && aimed(s, player)) { tk.hitPlayer(DMG_P, player.x, player.y); ctx.silence(player, SILENCE_MS); }
            if (alive(npc) && aimed(s, npc)) { ctx.hit(npc, DMG_N, npc.x, npc.y); ctx.silence(npc, SILENCE_MS); ctx.float(npc.x, npc.y - 58, 'SHUSHED', '#ffc890'); }
          }
          if (time >= fireAt + SHUSH_MS) { s.state = 'rest'; s.at = time; s.stir = 0; s.culprit = null; }
        } else if (time - s.at >= REST_MS) s.state = 'asleep';
      }
      while (rings.length && time - rings[0].at > 700) rings.shift();
    },

    onPlayerCast() { if (alive(player)) noise(player, 125, 0.17, tk.now); },
    onNpcCast() { if (alive(npc)) noise(npc, 125, 0.085, tk.now); },
    onPlayerHurt(amount) { if (alive(player)) noise(player, 150, 0.18 + Math.min(0.4, amount / 50), tk.now); },
    onNpcHurt(amount) { if (alive(npc)) noise(npc, 150, 0.18 + Math.min(0.4, amount / 50), tk.now); },

    npcSeek(): Pt | null {
      // A finger on her: off the line, sideways.
      for (const s of sleepers) {
        if (s.state === 'up' && !s.fired && aimed(s, npc)) {
          const side = Math.sin(s.aim - Math.atan2(npc.y - head(s).y, npc.x - head(s).x)) > 0 ? -1 : 1;
          const a = s.aim + side * Math.PI / 2;
          return { x: tk.clampX(npc.x + Math.cos(a) * 100), y: tk.clampY(npc.y + Math.sin(a) * 100) };
        }
      }
      // Clear of restless beds.
      for (const s of sleepers) {
        if (s.state !== 'asleep' || s.stir < 0.45) continue;
        const h = head(s);
        const d = dist(npc.x, npc.y, h.x, h.y);
        if (d < 180) {
          const a = d > 1 ? Math.atan2(npc.y - h.y, npc.x - h.x) : 0;
          return { x: tk.clampX(h.x + Math.cos(a) * 230), y: tk.clampY(h.y + Math.sin(a) * 230) };
        }
      }
      return null;
    },

    drawGround(g, time) {
      const t = time / 1000;
      // Noise rings: soft for a cast, sharp for a dash; echoes in ember.
      for (const n of rings) {
        const k = (time - n.at) / 700;
        g.lineStyle(n.echo ? 2 : 2.5, n.echo ? EMBER : DREAM_LIT, 0.5 * (1 - k)); g.strokeCircle(n.x, n.y, n.r * (0.3 + 0.7 * k));
      }
      for (const e of echoes) {
        const k = 1 - (e.at - time) / ECHO_MS;
        g.lineStyle(1.5, EMBER, 0.15 + 0.35 * k); g.strokeCircle(e.x, e.y, 10 + 14 * k);
        g.fillStyle(EMBER, 0.2 * k); g.fillCircle(e.x, e.y, 6);
      }
      for (const s of sleepers) {
        // The bed, its quilt shaking as the sleeper stirs.
        const shake = s.state === 'asleep' ? Math.sin(t * 22 + s.seed) * 2.2 * s.stir * s.stir : 0;
        g.fillStyle(SLATE, 0.18); g.fillEllipse(s.x, s.y - 20, 120, 70);
        streetBed(g, s.x + shake, s.y, 72, 46, QUILTS[s.seed % QUILTS.length], 0xe0c8b0, PLUM, mulberry(s.seed));
        // The aim line of a woken sleeper: dotted while it follows, solid once it holds.
        if (s.state === 'up') {
          const h = head(s);
          const fireAt = s.at + tk.warn(UP_MS);
          const locked = time >= fireAt - LOCK_MS;
          const ex = h.x + Math.cos(s.aim) * REACH, ey = h.y + Math.sin(s.aim) * REACH;
          if (!s.fired) {
            g.fillStyle(locked ? EMBER : DREAM_LIT, locked ? 0.2 : 0.08);
            const nx = -Math.sin(s.aim) * HALF_W, ny = Math.cos(s.aim) * HALF_W;
            g.fillTriangle(h.x + nx, h.y + ny, ex + nx, ey + ny, ex - nx, ey - ny);
            g.fillTriangle(h.x + nx, h.y + ny, h.x - nx, h.y - ny, ex - nx, ey - ny);
            g.lineStyle(2, locked ? EMBER : DREAM_LIT, locked ? 0.9 : 0.5);
            g.lineBetween(h.x + nx, h.y + ny, ex + nx, ey + ny); g.lineBetween(h.x - nx, h.y - ny, ex - nx, ey - ny);
          } else {
            // The shush itself: a rolling wedge of pale felt-fluff down the line.
            const k = Math.min(1, (time - fireAt) / SHUSH_MS);
            for (let i = 0; i < 14; i++) {
              const d = (i / 14) * REACH * k;
              const wob = Math.sin(i * 1.7 + t * 9) * HALF_W * 0.6;
              const px = h.x + Math.cos(s.aim) * d - Math.sin(s.aim) * wob, py = h.y + Math.sin(s.aim) * d + Math.cos(s.aim) * wob;
              g.fillStyle(FEATHER, 0.75 * (1 - k * 0.6)); g.fillEllipse(px, py, 18, 10);
            }
          }
        }
      }
    },

    drawAir(g, time) {
      const t = time / 1000;
      for (const s of sleepers) {
        const h = head(s);
        if (s.state === 'asleep') {
          // Asleep: zeds, and a lid over an eye that opens as the stir climbs.
          if (s.stir < 0.5) zzz(g, h.x + 14, h.y - 16, 5, t, DREAM_LIT, 0.8, s.seed);
          const k = Math.min(1, s.stir);
          const ex = h.x, ey = h.y - 30;
          g.fillStyle(LINEN, 0.85); g.fillEllipse(ex, ey, 26, 14);
          g.fillStyle(0x2a2440, 1); g.fillEllipse(ex, ey, 22 * k + 1, 11 * k + 1);
          g.fillStyle(k > 0.75 ? NIGHTMARE_EYE : DREAM_LIT, 1); g.fillCircle(ex, ey, 3.4 * k + 0.4);
          g.lineStyle(2, dim(LINEN, 0.4), 1);
          g.beginPath(); g.arc(ex, ey + 2 - 9 * k, 13, Math.PI + 0.25, -0.25, false); g.strokePath();
        } else if (s.state === 'up') {
          // Bolt upright: nightshirt, cap askew, an arm flung out pointing, finger to the lips.
          const ax = Math.cos(s.aim), ay = Math.sin(s.aim);
          g.fillStyle(LINEN, 1); g.fillRoundedRect(h.x - 10, h.y - 6, 20, 26, 6);
          g.fillStyle(0xe0c8b0, 1); g.fillCircle(h.x, h.y - 14, 9);
          nightcapOn(g, h.x, h.y - 14, 9, PLUM, 1, 0.9, Math.sin(t * 6) * 2);
          g.fillStyle(0x2a2020, 1); g.fillCircle(h.x - 3, h.y - 15, 1.4); g.fillCircle(h.x + 3, h.y - 15, 1.4);
          g.fillStyle(0x6a3a3a, 1); g.fillEllipse(h.x, h.y - 9, 4, 3);
          g.lineStyle(4, LINEN, 1); g.lineBetween(h.x, h.y, h.x + ax * 26, h.y + ay * 26);
          g.fillStyle(0xe0c8b0, 1); g.fillCircle(h.x + ax * 28, h.y + ay * 28, 3.5);
          g.lineStyle(2, 0xe0c8b0, 1); g.lineBetween(h.x + ax * 28, h.y + ay * 28, h.x + ax * 36, h.y + ay * 36);
          g.lineStyle(3, lit(LINEN, 0.2), 1); g.lineBetween(h.x - 6, h.y + 2, h.x - 2, h.y - 9);
          g.fillStyle(EMBER, 0.6 + 0.3 * Math.sin(t * 12)); g.fillCircle(h.x, h.y - 32, 3);
        } else {
          // Settling back: a slow zed.
          zzz(g, h.x + 12, h.y - 14, 4, t, DREAM_LIT, 0.5, s.seed);
        }
      }
    },

    drawHud(g) {
      // A row of five little bed-heads; the eye on each opens as its sleeper stirs.
      const x = 28, y = ctx.H - 52;
      hudPlate(g, x - 12, y - 22, 5 * 30 + 16, 40);
      sleepers.forEach((s, i) => {
        const cx = x + i * 30 + 6;
        const k = s.state === 'asleep' ? Math.min(1, s.stir) : s.state === 'up' ? 1 : 0;
        g.fillStyle(LINEN, 1); g.fillEllipse(cx, y, 22, 12);
        g.fillStyle(s.state === 'up' ? NIGHTMARE_EYE : 0x2a2440, 1); g.fillEllipse(cx, y, 18 * k + 1, 9 * k + 1);
        g.lineStyle(1.5, PLUM, 1); g.strokeEllipse(cx, y, 22, 12);
      });
      if (echoing) { g.fillStyle(EMBER, 1); g.fillCircle(x + 5 * 30 - 2, y - 14, 3); }
    },
  };
}

export const FALLEN_LIGHT_SLEEPERS: GimmickDef = {
  id: ID,
  rules: 'Dashes, casts and blows taken stir the sleepers. Woken, one points at the last noise-maker near it and shushes down that line. Later, noise echoes.',
  make,
};

import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt } from '../../../../../IslesTypes';
import { brandSigil, glow } from '../../../../../art/IsleArt';
import { ASH_DARK, EMBER, EMBER_DARK, EMBER_LIT, GLOW, IRON, KINDLE_GOLD, SOOT } from '../palette';
import { alive, angDiff, dist, frameClock } from './util';

/**
 * Keeper of the Hearth — Hearthwarden Gilda.
 *
 * A great round hearth burns in the middle of the room. Its *ring* — the warm band of
 * hearthstones round the fire — feeds whoever stands on it: health back every second and 25%
 * harder hits. The coals in the middle burn anyone who steps in.
 *
 * On a clock the hearth *flares*: the ring brightens, three iron andirons stand up at the rim
 * to mark the gaps, and a wall of flame rolls outward across the whole room. Anyone it crosses
 * outside the andirons' wedges is burned — Gilda included. Each flare the andirons turn a fixed
 * step clockwise, and the next step is marked by ghost andirons, so a watching player always
 * knows where the next gaps will be.
 *
 * Gilda is an earth warden: she sits on the ring (`npcSeek`) and walks into a gap when the
 * flare warns. Beat her by holding the ring yourself and shoving her off it, or by being in the
 * next gap before she is.
 */

const CORE_R = 46;
const RING_R = 132;
const WARN_MS = 1700;
const WAVE_SPEED = 360;
const WAVE_BAND = 24;
const GAP_HALF = 0.3;
const GAP_STEP = 0.7;
const FEED_BOOST = 1.25;
/** A hit at least this big knocks whoever took it outward, off the ring. */
const SHOVE_MIN = 8;

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const step = frameClock();
  const c: Pt = { x: W / 2, y: top + (H - top) / 2 + 10 };
  const period = ctx.hard ? 7200 : 9000;
  const flareDmg = ctx.hard ? 18 : 14;
  let gapBase = -Math.PI / 2;
  let nextFlare = 0;
  let warnAt = 0;
  let waveR = -1;
  let waveHit = { p: false, n: false };
  let feedAcc = { p: 0, n: 0 };
  let lastCoreP = 0;
  let lastCoreN = 0;
  let started = false;
  /** The gimmick's own burns don't count as shoves. */
  let own = false;

  const gaps = (base: number) => [0, 1, 2].map((i) => base + (Math.PI * 2 * i) / 3);
  const rOf = (f: Fighter) => dist(c.x, c.y, f.x, f.y);
  const onRing = (f: Fighter) => { const r = rOf(f); return r >= CORE_R && r <= RING_R; };
  const inGap = (f: Fighter, base: number) => {
    const a = Math.atan2(f.y - c.y, f.x - c.x);
    return gaps(base).some((g) => Math.abs(angDiff(a, g)) < GAP_HALF);
  };

  function feed(f: Fighter, which: 'p' | 'n', dt: number): void {
    if (!alive(f) || !onRing(f)) { feedAcc[which] = 0; return; }
    feedAcc[which] += dt * (ctx.hard ? 2.5 : 3);
    if (feedAcc[which] >= 1.5) {
      ctx.heal(f, Math.floor(feedAcc[which]));
      feedAcc[which] -= Math.floor(feedAcc[which]);
    }
  }

  function shove(f: Fighter, amount: number): void {
    if (amount < SHOVE_MIN || !alive(f) || !onRing(f)) return;
    const a = Math.atan2(f.y - c.y, f.x - c.x);
    ctx.nudge(f, Math.cos(a) * 36, Math.sin(a) * 36);
  }

  return {
    update(time) {
      const dt = step(time);
      if (!started) { started = true; nextFlare = time + period; }

      feed(player, 'p', dt);
      feed(npc, 'n', dt);

      // The coals.
      if (alive(player) && rOf(player) < CORE_R && time - lastCoreP > 600) { lastCoreP = time; own = true; ctx.hit(player, 5, player.x, player.y); own = false; }
      if (alive(npc) && rOf(npc) < CORE_R && time - lastCoreN > 600) { lastCoreN = time; own = true; ctx.hit(npc, 5, npc.x, npc.y); own = false; }

      // The flare clock.
      if (!warnAt && time >= nextFlare - WARN_MS) {
        warnAt = time;
        ctx.float(c.x, c.y - 70, 'THE HEARTH FLARES', '#ffc070');
        ctx.sfx('beam-charge');
      }
      if (warnAt && time >= nextFlare) {
        warnAt = 0;
        nextFlare = time + period;
        waveR = CORE_R;
        waveHit = { p: false, n: false };
        ctx.sfx('inferno');
      }
      if (waveR >= 0) {
        waveR += WAVE_SPEED * dt;
        for (const [f, k] of [[player, 'p'], [npc, 'n']] as [Fighter, 'p' | 'n'][]) {
          if (waveHit[k] || !alive(f)) continue;
          if (Math.abs(rOf(f) - waveR) < WAVE_BAND && !inGap(f, gapBase)) {
            waveHit[k] = true;
            own = true;
            ctx.hit(f, flareDmg, f.x, f.y);
            own = false;
            ctx.float(f.x, f.y - 40, 'SCORCHED', k === 'p' ? '#ff6a3a' : '#ffd27a');
          }
        }
        if (waveR > Math.hypot(W, H) * 0.6) {
          waveR = -1;
          gapBase += GAP_STEP;
        }
      }
    },

    // A real blow knocks the one on the ring back off it.
    onPlayerHurt(amount) { if (!own) shove(player, amount); },
    onNpcHurt(amount) { if (!own) shove(npc, amount); },

    playerTakenMult: () => (onRing(npc) ? FEED_BOOST : 1),
    npcTakenMult: () => (onRing(player) ? FEED_BOOST : 1),

    npcSeek() {
      const myA = Math.atan2(npc.y - c.y, npc.x - c.x);
      // Warning, or wave still rolling: walk into the nearest gap, on the ring.
      if (warnAt || waveR >= 0) {
        let best = gaps(gapBase)[0];
        for (const g of gaps(gapBase)) if (Math.abs(angDiff(myA, g)) < Math.abs(angDiff(myA, best))) best = g;
        return { x: c.x + Math.cos(best) * 92, y: c.y + Math.sin(best) * 92 };
      }
      // Otherwise keep the ring.
      if (onRing(npc)) return null;
      return { x: c.x + Math.cos(myA) * 92, y: c.y + Math.sin(myA) * 92 };
    },

    drawGround(g, time) {
      const charge = warnAt ? (time - warnAt) / WARN_MS : 0;
      // Hearthstones of the ring.
      g.fillStyle(SOOT, 0.5); g.fillCircle(c.x, c.y + 6, RING_R + 12);
      g.fillStyle(ASH_DARK, 1); g.fillCircle(c.x, c.y, RING_R + 6);
      for (let ring = 0; ring < 2; ring++) {
        const rr = CORE_R + 18 + ring * 40;
        const n = 14 + ring * 6;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + ring * 0.2;
          g.fillStyle(i % 2 ? 0x5d5853 : 0x4f4a46, 1);
          g.fillEllipse(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 30 - ring * 2, 20);
        }
      }
      // The ring's warmth — who stands here is fed.
      const warm = 0.1 + Math.sin(time / 400) * 0.03 + charge * 0.25;
      g.fillStyle(GLOW, warm); g.fillCircle(c.x, c.y, RING_R);
      g.lineStyle(2, EMBER_LIT, 0.5 + charge * 0.5); g.strokeCircle(c.x, c.y, RING_R);
      // The coals.
      g.fillStyle(EMBER_DARK, 1); g.fillCircle(c.x, c.y, CORE_R);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rr = (i % 3) * 12 + 8;
        g.fillStyle(i % 2 ? EMBER : 0xb83a10, 1);
        g.fillCircle(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr, 7 + (i % 3));
      }
      brandSigil(g, c.x, c.y, 18, KINDLE_GOLD, 0.35 + charge * 0.6);
      // Andirons: solid at the live gaps; ghosts at the next ones.
      for (const a of gaps(gapBase)) drawAndiron(g, c.x + Math.cos(a) * (RING_R + 14), c.y + Math.sin(a) * (RING_R + 14), 1, warnAt > 0);
      for (const a of gaps(gapBase + GAP_STEP)) drawAndiron(g, c.x + Math.cos(a) * (RING_R + 14), c.y + Math.sin(a) * (RING_R + 14), 0.25, false);
      // During the warning, the safe wedges are painted out across the floor.
      if (warnAt) {
        for (const a of gaps(gapBase)) {
          g.fillStyle(0xd8ffd8, 0.07 + charge * 0.08);
          g.beginPath(); g.moveTo(c.x, c.y);
          g.arc(c.x, c.y, Math.hypot(W, H), a - GAP_HALF, a + GAP_HALF, false);
          g.closePath(); g.fillPath();
          g.lineStyle(1.5, 0xd8ffd8, 0.4 + charge * 0.4);
          for (const s of [-1, 1]) {
            const e = a + s * GAP_HALF;
            g.lineBetween(c.x + Math.cos(e) * RING_R, c.y + Math.sin(e) * RING_R, c.x + Math.cos(e) * 900, c.y + Math.sin(e) * 900);
          }
        }
      }
      // The rolling wall of flame, broken at the gaps.
      if (waveR >= 0) {
        for (const a of gaps(gapBase)) {
          const from = a + GAP_HALF;
          const to = a + (Math.PI * 2) / 3 - GAP_HALF;
          g.lineStyle(WAVE_BAND * 1.6, EMBER, 0.45);
          g.beginPath(); g.arc(c.x, c.y, waveR, from, to, false); g.strokePath();
          g.lineStyle(4, EMBER_LIT, 0.95);
          g.beginPath(); g.arc(c.x, c.y, waveR, from, to, false); g.strokePath();
          for (let i = 0; i < 10; i++) {
            const t = from + ((to - from) * (i + 0.5)) / 10;
            const lick = 12 + Math.sin(time / 70 + i * 1.7) * 6;
            g.lineStyle(3, KINDLE_GOLD, 0.8);
            g.lineBetween(c.x + Math.cos(t) * waveR, c.y + Math.sin(t) * waveR,
              c.x + Math.cos(t) * (waveR + lick), c.y + Math.sin(t) * (waveR + lick));
          }
        }
      }
    },

    drawAir(g, time) {
      // Flames standing off the coals — taller as the flare comes.
      const charge = warnAt ? (time - warnAt) / WARN_MS : 0;
      glow(g, c.x, c.y - 10, 70 + charge * 40, GLOW, 0.05, 4);
      for (let i = 0; i < 7; i++) {
        const ox = (i - 3) * 11;
        const h = (30 + Math.sin(time / 110 + i * 1.3) * 10) * (1 + charge * 1.2);
        g.fillStyle(i % 2 ? EMBER : EMBER_LIT, 0.85);
        g.fillTriangle(c.x + ox - 8, c.y, c.x + ox + 8, c.y, c.x + ox, c.y - h);
      }
      // A ring under whoever is being fed.
      for (const f of [player, npc]) {
        if (!alive(f) || !onRing(f)) continue;
        g.lineStyle(2, KINDLE_GOLD, 0.6 + Math.sin(time / 160) * 0.25);
        g.strokeEllipse(f.x, f.y + 16, 46, 14);
        const ph = (time % 700) / 700;
        g.fillStyle(0x9df5a8, 0.8 * (1 - ph));
        g.fillCircle(f.x + Math.sin(time / 200) * 10, f.y - 10 - ph * 26, 2.2);
      }
    },

    drawHud(g, time) {
      const k = warnAt ? 1 : Math.max(0, Math.min(1, 1 - (nextFlare - WARN_MS - time) / (period - WARN_MS)));
      const x = W / 2, y = top + 20;
      g.fillStyle(0x000000, 0.45); g.fillCircle(x, y, 16);
      g.fillStyle(EMBER_DARK, 1); g.fillCircle(x, y, 12);
      g.fillStyle(warnAt && Math.floor(time / 110) % 2 === 0 ? 0xffffff : EMBER, 1);
      g.beginPath(); g.moveTo(x, y); g.arc(x, y, 12, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.closePath(); g.fillPath();
      g.lineStyle(2, IRON, 1); g.strokeCircle(x, y, 13);
    },
  };
}

/** An iron andiron standing at the hearth's rim, marking a gap the flare cannot cross. */
function drawAndiron(g: Phaser.GameObjects.Graphics, x: number, y: number, a: number, hot: boolean): void {
  g.fillStyle(0x000000, 0.3 * a); g.fillEllipse(x, y + 4, 20, 7);
  g.fillStyle(hot ? 0x6a3420 : IRON, a);
  g.fillRect(x - 3, y - 26, 6, 28);
  g.fillRect(x - 9, y - 2, 18, 4);
  g.fillCircle(x, y - 28, 6);
  g.fillStyle(hot ? EMBER_LIT : 0x5a5550, a);
  g.fillCircle(x, y - 28, 3);
}

export const KEEPER_OF_THE_HEARTH: GimmickDef = {
  id: 'hearth-keeper',
  rules: 'The hearth\'s ring heals and empowers whoever holds it; big hits knock you off. It flares outward on a clock — stand in an andiron\'s gap.',
  make,
};

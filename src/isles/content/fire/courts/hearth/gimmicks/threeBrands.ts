import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, Rect } from '../../../../../IslesTypes';
import { brandSigil, glow } from '../../../../../art/IsleArt';
import { BRAND, EMBER, EMBER_LIT, IRON, KINDLE_GOLD, SOOT, WATER, WATER_DEEP, WATER_LIT } from '../palette';
import { alive, dist, frameClock } from './util';

/**
 * Three Brands — Brandwright Ostra.
 *
 * Ostra makes the King's branding irons and fights with one. Every hit she lands burns a brand
 * into you — three sigils stack over your head. The third doesn't fade: it *fuses*, a ring of
 * fire counting down round your feet, and then it goes off — on you and on anyone standing
 * close. Brands cool off one at a time if you stop getting hit.
 *
 * Quench troughs hang on the side walls. Stand in one for a beat and every brand on you washes
 * off in a hiss of steam, fuse and all — but the trough empties and takes ten seconds to refill.
 *
 * The exploit: it works on her too. Every second hit you land brands *Ostra*, and her third
 * goes off on her — and on you, if you're hugging her. The bot runs for the water when it is
 * two brands deep, runs from you when *your* fuse is lit, and when you are two deep it stands
 * between you and the nearest full trough (`npcSeek`). That last one is the read: when she
 * plants by the water, the *other* trough is open.
 */

const FUSE_MS = 1400;
const BLAST_R = 140;
const PIP_MS = 7000;
const DECAY_MS = 3200;
const QUENCH_MS = 550;
const REFILL_PER_S = 0.1;
const BRAND_ICD = 520;

interface Side {
  f: Fighter;
  brands: number;
  coolAt: number;
  fuseAt: number;
  lastBrandAt: number;
  /** Ostra needs two of your hits per brand. */
  hits: number;
  quenchT: number;
  steamUntil: number;
  steamAt: Pt;
}

interface Trough { r: Rect; level: number; flashUntil: number }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc } = ctx;
  const step = frameClock();
  const midY = top + (H - top) / 2;
  const troughs: Trough[] = [
    { r: { x: 14, y: midY - 70, w: 64, h: 140 }, level: 1, flashUntil: 0 },
    { r: { x: W - 78, y: midY - 70, w: 64, h: 140 }, level: 1, flashUntil: 0 },
  ];
  if (ctx.hard) {
    // Hard: shallower troughs — a smaller target to find with three brands burning.
    for (const t of troughs) t.r = { ...t.r, y: t.r.y + 30, h: 80 };
  }
  const P: Side = { f: player, brands: 0, coolAt: 0, fuseAt: 0, lastBrandAt: 0, hits: 0, quenchT: 0, steamUntil: 0, steamAt: { x: 0, y: 0 } };
  const N: Side = { f: npc, brands: 0, coolAt: 0, fuseAt: 0, lastBrandAt: 0, hits: 0, quenchT: 0, steamUntil: 0, steamAt: { x: 0, y: 0 } };
  /** Our own detonation must not brand anybody. */
  let detonating = false;
  let blastFx: { x: number; y: number; at: number } | null = null;

  const inTrough = (t: Trough, f: Fighter) =>
    f.x > t.r.x - 8 && f.x < t.r.x + t.r.w + 8 && f.y > t.r.y && f.y < t.r.y + t.r.h;

  function brand(s: Side, time: number, label: string, color: string): void {
    if (s.fuseAt || s.brands >= 3) return;
    s.brands++;
    s.lastBrandAt = time;
    s.coolAt = time + PIP_MS;
    ctx.sfx('sizzle');
    if (s.brands >= 3) {
      s.fuseAt = time + FUSE_MS;
      ctx.float(s.f.x, s.f.y - 50, `${label} — THIRD BRAND`, color);
      ctx.sfx('beam-charge');
    } else {
      ctx.float(s.f.x, s.f.y - 40, `BRAND ${s.brands}`, color);
    }
  }

  function quench(s: Side, t: Trough, time: number): void {
    s.brands = 0;
    s.fuseAt = 0;
    s.hits = 0;
    s.quenchT = 0;
    s.steamUntil = time + 900;
    s.steamAt = { x: s.f.x, y: s.f.y };
    t.level = 0;
    t.flashUntil = time + 400;
    ctx.float(s.f.x, s.f.y - 40, 'QUENCHED', '#bfe8ff');
    ctx.sfx('splash');
  }

  function detonate(s: Side, time: number): void {
    const x = s.f.x, y = s.f.y;
    const dmg = ctx.hard ? 28 : 22;
    detonating = true;
    ctx.hit(s.f, dmg, x, y);
    const other = s === P ? N : P;
    if (alive(other.f) && dist(other.f.x, other.f.y, x, y) < BLAST_R) ctx.hit(other.f, dmg, other.f.x, other.f.y);
    detonating = false;
    s.brands = 0;
    s.fuseAt = 0;
    s.hits = 0;
    blastFx = { x, y, at: time };
    ctx.flash(x, y, BRAND);
    ctx.sfx('explosion-medium');
    ctx.banner(s === P ? 'THE BRAND TAKES' : 'OSTRA\'S BRAND TAKES', s === P ? '#ff6a3a' : '#ffd27a');
  }

  function tick(s: Side, time: number, dt: number): void {
    if (!alive(s.f)) return;
    if (s.fuseAt && time >= s.fuseAt) detonate(s, time);
    if (!s.fuseAt && s.brands > 0 && time >= s.coolAt) {
      s.brands--;
      s.coolAt = time + DECAY_MS;
    }
    let inAny: Trough | null = null;
    for (const t of troughs) if (t.level >= 1 && inTrough(t, s.f)) inAny = t;
    if (inAny && s.brands > 0) {
      s.quenchT += dt * 1000;
      if (s.quenchT >= QUENCH_MS) quench(s, inAny, time);
    } else {
      s.quenchT = 0;
    }
  }

  return {
    update(time) {
      const dt = step(time);
      for (const t of troughs) t.level = Math.min(1, t.level + REFILL_PER_S * dt);
      tick(P, time, dt);
      tick(N, time, dt);
      if (blastFx && time - blastFx.at > 600) blastFx = null;
    },

    onPlayerHurt(amount) {
      const time = ctx.scene.time.now;
      if (detonating || amount < 3 || time - P.lastBrandAt < BRAND_ICD) return;
      brand(P, time, 'YOU', '#ff7a2f');
    },

    onNpcHurt(amount) {
      const time = ctx.scene.time.now;
      if (detonating || amount < 3 || time - N.lastBrandAt < BRAND_ICD) return;
      N.hits++;
      if (N.hits >= 2) {
        N.hits = 0;
        brand(N, time, 'OSTRA', '#ffd27a');
      }
    },

    npcSeek() {
      const full = troughs.filter((t) => t.level >= 1);
      const centre = (t: Trough): Pt => ({ x: t.r.x + t.r.w / 2, y: t.r.y + t.r.h / 2 });
      // Two deep or burning: run for the water.
      if (N.brands >= 2 && full.length) {
        let best = full[0];
        for (const t of full) if (dist(npc.x, npc.y, centre(t).x, centre(t).y) < dist(npc.x, npc.y, centre(best).x, centre(best).y)) best = t;
        return centre(best);
      }
      // Your fuse is lit: don't be there when it goes.
      if (P.fuseAt) {
        const a = Math.atan2(npc.y - player.y, npc.x - player.x);
        return {
          x: Math.max(60, Math.min(W - 60, player.x + Math.cos(a) * (BLAST_R + 90))),
          y: Math.max(top + 60, Math.min(H - 60, player.y + Math.sin(a) * (BLAST_R + 90))),
        };
      }
      // You're two deep: stand between you and the nearest full trough.
      if (P.brands >= 2 && full.length) {
        let best = full[0];
        for (const t of full) if (dist(player.x, player.y, centre(t).x, centre(t).y) < dist(player.x, player.y, centre(best).x, centre(best).y)) best = t;
        const c = centre(best);
        return { x: c.x + (player.x - c.x) * 0.35, y: c.y + (player.y - c.y) * 0.35 };
      }
      return null;
    },

    drawGround(g, time) {
      for (const t of troughs) drawTrough(g, t, time);
      for (const s of [P, N]) {
        if (!s.fuseAt || !alive(s.f)) continue;
        // The fuse: a ring of brand-fire round the feet, closing like a clock.
        const k = 1 - (s.fuseAt - time) / FUSE_MS;
        g.fillStyle(BRAND, 0.08 + k * 0.12); g.fillCircle(s.f.x, s.f.y, BLAST_R);
        g.lineStyle(2, EMBER_LIT, 0.6); g.strokeCircle(s.f.x, s.f.y, BLAST_R);
        g.lineStyle(5, BRAND, 0.9);
        g.beginPath(); g.arc(s.f.x, s.f.y, BLAST_R - 6, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        brandSigil(g, s.f.x, s.f.y, 26 + k * 12, BRAND, 0.35 + k * 0.4);
        if (k > 0.75 && Math.floor(time / 80) % 2 === 0) {
          g.lineStyle(4, 0xffffff, 0.7); g.strokeCircle(s.f.x, s.f.y, BLAST_R + 3);
        }
      }
      if (blastFx) {
        const k = (time - blastFx.at) / 600;
        g.fillStyle(SOOT, 0.4 * (1 - k)); g.fillCircle(blastFx.x, blastFx.y, BLAST_R * (0.6 + k * 0.4));
        brandSigil(g, blastFx.x, blastFx.y, 40, 0x2b1a12, 0.8 * (1 - k));
      }
    },

    drawAir(g, time) {
      for (const s of [P, N]) {
        if (!alive(s.f)) continue;
        // Three sigils over the head, lit as they burn in.
        for (let i = 0; i < 3; i++) {
          const x = s.f.x + (i - 1) * 16;
          const y = s.f.y - 46 - (i === 1 ? 4 : 0);
          const on = i < s.brands;
          if (on) glow(g, x, y, 10, BRAND, 0.12, 2);
          brandSigil(g, x, y, 5.5, on ? (s.fuseAt && Math.floor(time / 110) % 2 === 0 ? 0xffffff : BRAND) : 0x3a3633, on ? 1 : 0.6);
        }
        if (time < s.steamUntil) {
          const k = 1 - (s.steamUntil - time) / 900;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.fillStyle(0xe6f2f5, 0.5 * (1 - k));
            g.fillCircle(s.steamAt.x + Math.cos(a) * 14 * k, s.steamAt.y - 10 - k * 40 - i * 3, 6 + k * 10);
          }
        }
        // Standing in the water: show the quench filling.
        if (s.quenchT > 0) {
          const k = s.quenchT / QUENCH_MS;
          g.lineStyle(3, WATER_LIT, 0.95);
          g.beginPath(); g.arc(s.f.x, s.f.y, 24, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
        }
      }
      if (blastFx) {
        const k = (time - blastFx.at) / 600;
        g.lineStyle(10 * (1 - k), EMBER, 0.8 * (1 - k)); g.strokeCircle(blastFx.x, blastFx.y, BLAST_R * (0.3 + k * 0.8));
        g.lineStyle(3, KINDLE_GOLD, 0.9 * (1 - k)); g.strokeCircle(blastFx.x, blastFx.y, BLAST_R * (0.2 + k * 0.6));
      }
    },
  };
}

/** A wall-hung quench trough: an iron-banded wooden box, its water level the refill clock. */
function drawTrough(g: Phaser.GameObjects.Graphics, t: Trough, time: number): void {
  const { x, y, w, h } = t.r;
  g.fillStyle(0x000000, 0.3); g.fillRect(x + 4, y + 6, w, h);
  g.fillStyle(0x3b2a1c, 1); g.fillRect(x - 4, y - 4, w + 8, h + 8);
  g.fillStyle(0x5a4330, 1); g.fillRect(x, y, w, h);
  const lv = t.level;
  const full = lv >= 1;
  g.fillStyle(WATER_DEEP, 1); g.fillRect(x + 5, y + 5, w - 10, h - 10);
  g.fillStyle(full ? WATER_LIT : WATER, 1);
  g.fillRect(x + 5, y + 5 + (h - 10) * (1 - lv), w - 10, (h - 10) * lv);
  if (full) {
    g.lineStyle(1.5, 0xd8f0f0, 0.6 + Math.sin(time / 220) * 0.2);
    g.strokeRect(x + 7, y + 7, w - 14, h - 14);
    for (let i = 0; i < 3; i++) {
      const yy = y + 16 + ((time / 30 + i * 40) % (h - 30));
      g.lineStyle(1, 0xffffff, 0.35); g.lineBetween(x + 12, yy, x + w - 12, yy);
    }
  }
  if (time < t.flashUntil) { g.fillStyle(0xffffff, 0.4); g.fillRect(x, y, w, h); }
  g.fillStyle(IRON, 1);
  g.fillRect(x - 5, y + 14, w + 10, 4); g.fillRect(x - 5, y + h - 18, w + 10, 4);
  g.fillStyle(EMBER, 0.85);
  g.fillRect(x + w / 2 - 2, y - 14, 4, 10);
}

export const THREE_BRANDS: GimmickDef = {
  id: 'hearth-three-brands',
  rules: 'Ostra\'s hits brand you; the third brand detonates on you and anyone near. Stand in a trough to wash brands off. Two of your hits brand her.',
  make,
};

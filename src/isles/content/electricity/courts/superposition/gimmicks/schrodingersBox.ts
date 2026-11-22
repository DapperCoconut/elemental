import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { dim, glow, lit } from '../../../../../art/IsleArt';
import { catSit, sealedBox, stencilEye, vial } from '../art';
import { ARC, BOTH, BOTH_LIT, CAT, STATE_A, STATE_B, VIAL, VIAL_DARK } from '../palette';
import { alive, clamp, dist, Gaze, stepDt } from '../util';

/**
 * Schrödinger's Box — Keeper Felis.
 *
 * Sealed boxes stand about the yard, and every one of them is both a cat and a vial until it is
 * opened. Stand on a box for a moment to pry the lid. A cat leaps out and curls round your legs —
 * a heal and a quick step for a few seconds. A vial breaks and fumes — a burst on the opener and a
 * cloud of poison that lingers on the spot for anyone in it.
 *
 * What decides it is *who is looking*. Each fighter has a cone of sight (drawn faint on the floor,
 * pointing where they look). A box opened inside the other fighter's sight collapses to whichever
 * is worse for the opener — always the vial. Opened unobserved, it is an honest coin toss.
 *
 * Felis knows this, so she goes for the boxes behind your back. Turn and look at her as she pries
 * a lid and her box is poison; keep her looking at you while you open yours and so is yours.
 */

const BOX_S = 30;
const OPEN_MS = 650;
const MAX_BOXES = 4;
const SIGHT_HALF = 0.62;
const SIGHT_REACH = 420;
const CAT_HEAL = 14;
const CAT_MS = 4000;
const VIAL_HIT = 8;
const FUME_R = 72;
const FUME_MS = 3600;
const FUME_TICK = 500;
const FUME_DMG = 4;

interface Box {
  x: number; y: number;
  seed: number;
  /** Lands at this time (a shadow first, then the thump). */
  landAt: number;
  /** Pry progress per fighter. */
  pry: Map<Fighter, number>;
}

interface Fume { x: number; y: number; until: number; lastTick: Map<Fighter, number> }
interface Pop { x: number; y: number; at: number; cat: boolean; observed: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, player, npc, rng } = ctx;
  const boxes: Box[] = [];
  const fumes: Fume[] = [];
  const pops: Pop[] = [];
  const gazes = new Map<Fighter, Gaze>([
    [player, new Gaze(ctx.facing, player, false)],
    [npc, new Gaze(ctx.facing, npc, true)],
  ]);
  const purred = new Map<Fighter, number>([[player, 0], [npc, 0]]);
  let nextBox = 0;
  let started = false;
  const other = (f: Fighter) => (f === player ? npc : player);

  function placeBox(time: number, delay: number): void {
    for (let tries = 0; tries < 30; tries++) {
      const x = 90 + rng() * (W - 180), y = top + 70 + rng() * (H - top - 130);
      if (boxes.some((b) => dist(b.x, b.y, x, y) < 130)) continue;
      if (dist(x, y, player.x, player.y) < 90 || dist(x, y, npc.x, npc.y) < 90) continue;
      boxes.push({ x, y, seed: rng() * 100, landAt: time + delay, pry: new Map() });
      return;
    }
  }

  /** Is `f` inside the other fighter's sight? */
  const observedBy = (f: Fighter) => {
    const o = other(f);
    return alive(o) && (gazes.get(o)?.sees(f.x, f.y, SIGHT_HALF, SIGHT_REACH) ?? false);
  };

  function open(b: Box, f: Fighter, time: number): void {
    const observed = observedBy(f);
    const cat = observed ? false : rng() < 0.5;
    pops.push({ x: b.x, y: b.y, at: time, cat, observed });
    if (cat) {
      ctx.heal(f, ctx.hard && f === player ? CAT_HEAL - 2 : CAT_HEAL);
      purred.set(f, time + CAT_MS);
      ctx.float(b.x, b.y - 50, observed ? 'CAT (seen)' : 'CAT!', '#ffd890');
      ctx.sfx('heal');
    } else {
      ctx.hit(f, VIAL_HIT, b.x, b.y);
      fumes.push({ x: b.x, y: b.y, until: time + FUME_MS, lastTick: new Map() });
      ctx.float(b.x, b.y - 50, observed ? 'OBSERVED — VIAL' : 'VIAL!', '#a8ff7a');
      ctx.sfx('status-poison');
    }
  }

  return {
    update(time, dtRaw) {
      const dt = stepDt(dtRaw);
      if (!started) {
        started = true;
        for (let i = 0; i < 3; i++) placeBox(time, 0);
        nextBox = time + 4200;
      }
      for (const gz of gazes.values()) gz.update(dt);
      if (time >= nextBox) {
        nextBox = time + (ctx.hard ? 3800 : 5000);
        if (boxes.length < MAX_BOXES) { placeBox(time, 900); ctx.sfx('whoosh'); }
      }
      // Prying.
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (time < b.landAt) continue;
        let opened = false;
        for (const f of [player, npc]) {
          if (!alive(f)) continue;
          const on = dist(f.x, f.y, b.x, b.y) < 34;
          const p = on ? (b.pry.get(f) ?? 0) + dt * 1000 : Math.max(0, (b.pry.get(f) ?? 0) - dt * 2000);
          b.pry.set(f, p);
          if (p >= OPEN_MS && !opened) { opened = true; open(b, f, time); }
        }
        if (opened) boxes.splice(i, 1);
      }
      // Fumes.
      for (let i = fumes.length - 1; i >= 0; i--) {
        const fm = fumes[i];
        if (time >= fm.until) { fumes.splice(i, 1); continue; }
        for (const f of [player, npc]) {
          if (!alive(f) || dist(f.x, f.y, fm.x, fm.y) > FUME_R) continue;
          if (time - (fm.lastTick.get(f) ?? 0) < FUME_TICK) continue;
          fm.lastTick.set(f, time);
          if (f === player) ctx.tk.hitPlayer(FUME_DMG, f.x, f.y); else ctx.hit(f, FUME_DMG, f.x, f.y);
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) if (time - pops[i].at > 1400) pops.splice(i, 1);
    },

    playerSpeedMult: () => (ctx.scene.time.now < (purred.get(player) ?? 0) ? 1.2 : 1),
    npcSpeedMult: () => (ctx.scene.time.now < (purred.get(npc) ?? 0) ? 1.2 : 1),

    npcSeek() {
      const pg = gazes.get(player);
      // A box the player is not looking at, nearest first — and never inside a fume.
      let best: Box | null = null;
      let bd = Infinity;
      for (const b of boxes) {
        if (ctx.scene.time.now < b.landAt) continue;
        if (fumes.some((fm) => dist(fm.x, fm.y, b.x, b.y) < FUME_R)) continue;
        if (pg && pg.sees(b.x, b.y, SIGHT_HALF + 0.15, SIGHT_REACH)) continue;
        const d = dist(npc.x, npc.y, b.x, b.y);
        if (d < bd) { bd = d; best = b; }
      }
      if (best) return { x: best.x, y: best.y };
      // Otherwise keep a little way off, out of any fume.
      const a = Math.atan2(npc.y - player.y, npc.x - player.x);
      let x = player.x + Math.cos(a) * 230, y = player.y + Math.sin(a) * 230;
      for (const fm of fumes) if (dist(fm.x, fm.y, x, y) < FUME_R + 20) { x += (x - fm.x) * 0.8; y += (y - fm.y) * 0.8; }
      return { x: clamp(x, 60, W - 60), y: clamp(y, top + 50, H - 40) };
    },

    drawGround(g, time) {
      // Sight cones: each fighter's look, laid faint on the floor.
      for (const [f, gz] of gazes) {
        if (!alive(f)) continue;
        const c = f === player ? STATE_B : STATE_A;
        g.fillStyle(c, 0.06);
        g.slice(f.x, f.y, SIGHT_REACH, gz.angle - SIGHT_HALF, gz.angle + SIGHT_HALF, false); g.fillPath();
        g.lineStyle(1.2, c, 0.22);
        g.lineBetween(f.x, f.y, f.x + Math.cos(gz.angle - SIGHT_HALF) * SIGHT_REACH, f.y + Math.sin(gz.angle - SIGHT_HALF) * SIGHT_REACH);
        g.lineBetween(f.x, f.y, f.x + Math.cos(gz.angle + SIGHT_HALF) * SIGHT_REACH, f.y + Math.sin(gz.angle + SIGHT_HALF) * SIGHT_REACH);
      }
      // Landing shadows.
      for (const b of boxes) {
        if (time >= b.landAt) continue;
        const k = clamp(1 - (b.landAt - time) / 900, 0, 1);
        g.fillStyle(0x000000, 0.15 + k * 0.3); g.fillEllipse(b.x, b.y, 20 + k * 30, 8 + k * 10);
      }
      // Fumes on the floor.
      for (const fm of fumes) {
        const k = clamp((fm.until - time) / 600, 0, 1);
        g.fillStyle(VIAL_DARK, 0.3 * k); g.fillCircle(fm.x, fm.y, FUME_R);
        g.lineStyle(1.5, VIAL, 0.35 * k); g.strokeCircle(fm.x, fm.y, FUME_R);
      }
    },

    drawAir(g, time) {
      for (const b of boxes) {
        if (time < b.landAt) {
          const k = clamp(1 - (b.landAt - time) / 900, 0, 1);
          sealedBox(g, b.x, b.y - (1 - k) * 300, BOX_S, b.seed);
          continue;
        }
        // The box itself, rocking a little — something inside, or not.
        const rock = Math.sin(time / 140 + b.seed) * (Math.sin(time / 900 + b.seed) > 0.6 ? 1.6 : 0.3);
        sealedBox(g, b.x + rock, b.y + BOX_S * 0.5, BOX_S, b.seed);
        // Both outcomes, faintly, over the lid: a cat's ears and a vial's neck, flickering.
        const ph = (Math.sin(time / 260 + b.seed) + 1) / 2;
        catSit(g, b.x - 8, b.y - BOX_S * 0.55, 0.55, CAT, 0.18 + ph * 0.2);
        vial(g, b.x + 10, b.y - BOX_S * 0.5, 0.55, 0.18 + (1 - ph) * 0.2);
        // Pry bars.
        for (const [f, p] of b.pry) {
          if (p <= 0) continue;
          const k = clamp(p / OPEN_MS, 0, 1);
          const seen = observedBy(f);
          g.lineStyle(3, seen ? VIAL : BOTH_LIT, 0.9);
          g.beginPath(); g.arc(b.x, b.y - 4, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2, false); g.strokePath();
          if (seen) stencilEye(g, b.x, b.y - BOX_S - 22, 6, VIAL, 0.9);
        }
      }
      // Fume clouds.
      for (const fm of fumes) {
        const k = clamp((fm.until - time) / 600, 0, 1);
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + time / 1400;
          const px = fm.x + Math.cos(a) * FUME_R * 0.45, py = fm.y - 10 + Math.sin(a) * FUME_R * 0.25 - ((time / 30 + i * 13) % 20);
          g.fillStyle(i % 2 ? VIAL : lit(VIAL, 0.3), 0.12 * k); g.fillCircle(px, py, 22 + (i % 3) * 6);
        }
      }
      // Opened boxes: the lid flying, and what was inside.
      for (const p of pops) {
        const k = clamp((time - p.at) / 1400, 0, 1);
        const lidY = p.y - 30 - Math.sin(k * Math.PI) * 60;
        g.fillStyle(dim(0xb89a6a, 0.1), 1 - k); g.fillRect(p.x - 18 + k * 30, lidY, 36, 6);
        if (p.cat) {
          glow(g, p.x, p.y - 20, 30, CAT, 0.07 * (1 - k), 3);
          catSit(g, p.x + k * 20, p.y - Math.sin(k * Math.PI) * 30, 1.1, CAT, 1 - k * 0.7);
        } else {
          vial(g, p.x, p.y - 10, 1.1, 1 - k);
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.fillStyle(0xd8f0ff, 1 - k); g.fillRect(p.x + Math.cos(a) * k * 40, p.y - 14 + Math.sin(a) * k * 30, 3, 2); }
        }
        if (p.observed) { g.lineStyle(2, VIAL, 1 - k); g.strokeCircle(p.x, p.y - 16, 20 + k * 30); }
      }
      // A purring cat at the heels of anyone it chose.
      for (const [f, until] of purred) {
        if (!alive(f) || time > until) continue;
        catSit(g, f.x - 22 + Math.sin(time / 200) * 2, f.y + 18, 0.7, CAT, 0.9);
      }
      // The eye over anyone currently seen by the other fighter.
      for (const f of [player, npc]) {
        if (!alive(f) || !observedBy(f)) continue;
        stencilEye(g, f.x, f.y - 52, 5, f === player ? STATE_A : STATE_B, 0.55);
      }
    },

    drawHud(g, time) {
      // A key: two little boxes (seen = vial, unseen = coin toss).
      const x = W / 2, y = top + 12;
      g.fillStyle(0x000000, 0.45); g.fillRoundedRect(x - 86, y - 8, 172, 18, 6);
      vial(g, x - 58, y + 8, 0.5, 1);
      g.fillStyle(ARC, 0.8); g.fillRect(x - 48, y, 30, 2);
      stencilEye(g, x - 6, y + 1, 4, VIAL, 1);
      catSit(g, x + 40, y + 8, 0.45, CAT, 0.5 + 0.5 * Math.sin(time / 300));
      vial(g, x + 60, y + 8, 0.45, 0.5 - 0.5 * Math.sin(time / 300));
      g.lineStyle(1, BOTH, 0.7); g.strokeRoundedRect(x - 86, y - 8, 172, 18, 6);
    },
  };
}

export const SCHRODINGERS_BOX: GimmickDef = {
  id: 'superposition-box',
  rules: 'Stand on a sealed box to open it: a cat (heal, quick feet) or a vial (poison). Opened in your foe\'s sight, it is always the vial.',
  make,
};

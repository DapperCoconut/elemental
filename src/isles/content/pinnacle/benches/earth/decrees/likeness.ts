import type Phaser from 'phaser';
import type { Fighter } from '../../../../../../entities/Fighter';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import { dim, lit, mixC } from '../../../../../art/IsleArt';
import { OBS, councilMask, slab } from '../../../../../art/PinnacleArt';
import { CLAY, OCHRE } from '../art';
import { type Who, alive, clamp, colourOf, dist } from '../util';

/**
 * Decree of the Likeness — Councilor Hobb Slipwell, Seat of Likeness (clay).
 *
 * Slipwell drafted the Substitution: a likeness of equal weight may stand in for the debtor. (That
 * is where the Potter's Court got its army.) Here, likenesses are modelled of both parties in turn —
 * a lump of wet clay rises on a little glass plinth and is shaped, over a breath, into the image of
 * one fighter, tied to its subject by a strand of slip. Then the law holds: whatever is done to a
 * likeness is done to its subject. A blow on someone else's likeness lands 60% on them. Likenesses
 * stop shots, and break after enough blows; your own breaks with no harm to you.
 *
 * The councilor's golem lives on its cursor and slams everything round it. Keep it off your little
 * self — and go and break hers.
 */

type G = Phaser.GameObjects.Graphics;

interface Likeness {
  who: Who;
  x: number;
  y: number;
  born: number;
  ready: number;
  hp: number;
  maxHp: number;
  target: StrikeTarget | null;
  lastXfer: number;
  /** When it broke (0 = whole). */
  broken: number;
  /** When its strand last carried a blow. */
  pulse: number;
  seed: number;
}

const make = (ctx: GimmickCtx): EncounterGimmick => {
  const { W, H, top, rng } = ctx;
  const EVERY = ctx.hard ? 5600 : 6600;
  const MODEL_MS = 1400;
  const LIFE_MS = 16000;
  const HP = ctx.hard ? 85 : 70;
  const SHARE = 0.6;
  const R = 24;
  const MAX_EACH = 2;
  const list: Likeness[] = [];
  let nextAt = 0;
  let nextWho: Who = 'player';
  let firstXfer = true;
  const fighter = (w: Who): Fighter => (w === 'player' ? ctx.player : ctx.npc);

  const breakIt = (l: Likeness, time: number, byOwner: boolean) => {
    if (l.broken) return;
    l.broken = time;
    l.target?.remove();
    l.target = null;
    ctx.sfx('stone-slam');
    ctx.float(l.x, l.y - 46, byOwner ? 'UNMADE' : 'BROKEN', '#e8b08a');
  };

  const struck = (l: Likeness, by: Who, amount: number) => {
    if (l.broken) return;
    const time = ctx.scene.time.now;
    const a = Math.max(1, amount);
    l.hp -= a;
    if (by !== l.who && time - l.lastXfer > 90) {
      l.lastXfer = time;
      l.pulse = time;
      const subj = fighter(l.who);
      if (alive(subj)) {
        ctx.hit(subj, clamp(Math.round(a * SHARE), 2, 26), subj.x, subj.y);
        if (firstXfer) { firstXfer = false; ctx.banner('WHAT IS DONE TO THE LIKENESS…', '#e8b08a'); }
      }
    }
    if (l.hp <= 0) breakIt(l, time, by === l.who);
  };

  const spawn = (who: Who, time: number) => {
    const mine = list.filter((l) => l.who === who && !l.broken);
    if (mine.length >= MAX_EACH) breakIt(mine[0], time, true);
    const subj = fighter(who), other = fighter(who === 'player' ? 'npc' : 'player');
    let best: Pt = { x: W / 2, y: (top + H) / 2 }, bs = -1;
    for (let i = 0; i < 12; i++) {
      const a = rng() * Math.PI * 2, r = 150 + rng() * 90;
      const x = clamp(other.x + Math.cos(a) * r, 60, W - 60), y = clamp(other.y + Math.sin(a) * r, top + 60, H - 50);
      const away = Math.min(dist(x, y, subj.x, subj.y) - 120, ...list.filter((l) => !l.broken).map((l) => dist(x, y, l.x, l.y) - 90), 200);
      if (away > bs) { bs = away; best = { x, y }; }
    }
    list.push({ who, x: best.x, y: best.y, born: time, ready: time + MODEL_MS, hp: HP, maxHp: HP, target: null, lastXfer: -9999, broken: 0, pulse: -9999, seed: rng() * 10 });
    ctx.sfx('slime-splat');
    ctx.float(best.x, best.y - 40, who === 'player' ? 'A LIKENESS OF YOU' : 'A LIKENESS OF THE SEAT', '#e8b08a');
  };

  /** The clay figure: a fighter's round body, ball hands, thumbed eyes — the councilor's wears a little mask. */
  const figure = (g: G, l: Likeness, time: number) => {
    const k = clamp((time - l.born) / MODEL_MS, 0, 1);
    const subj = fighter(l.who);
    const tint = mixC(CLAY, colourOf(subj, CLAY), 0.28);
    const x = l.x, base = l.y + 10;
    // The plinth and nameplate.
    slab(g, x, base + 8, 46, 12);
    g.fillStyle(dim(OCHRE, 0.2), 1); g.fillRect(x - 12, base + 1, 24, 4);
    if (k < 1) {
      // Being modelled: a lump rising, thumbs of clay pressing it into shape.
      const h = 10 + k * 30;
      g.fillStyle(dim(tint, 0.35), 1); g.fillEllipse(x, base - h * 0.45, 26 + k * 10, h);
      g.fillStyle(lit(tint, 0.1), 1); g.fillEllipse(x - 4, base - h * 0.6, 12 + k * 6, h * 0.5);
      for (let i = 0; i < 3; i++) {
        const a = time / 140 + i * 2.1;
        g.fillStyle(dim(CLAY, 0.2), 0.9); g.fillEllipse(x + Math.cos(a) * 22, base - h * 0.5 + Math.sin(a) * 8, 9, 6);
      }
      return;
    }
    const cracked = 1 - l.hp / l.maxHp;
    const by = base - 22;
    g.fillStyle(0x000000, 0.3); g.fillEllipse(x, base, 40, 10);
    g.fillStyle(dim(tint, 0.35), 1); g.fillCircle(x, by + 2, 18);
    g.fillStyle(tint, 1); g.fillCircle(x, by, 18);
    g.fillStyle(lit(tint, 0.25), 0.8); g.fillEllipse(x - 6, by - 7, 12, 8);
    // Thumb-marks in the wet clay.
    for (let i = 0; i < 4; i++) { g.fillStyle(dim(tint, 0.25), 0.6); g.fillEllipse(x - 10 + i * 7, by + 8 + (i % 2) * 3, 5, 3); }
    // Ball hands.
    for (const s of [-1, 1]) {
      g.fillStyle(dim(tint, 0.3), 1); g.fillCircle(x + s * 23, by + 6, 6.5);
      g.fillStyle(tint, 1); g.fillCircle(x + s * 23 - 1, by + 5, 5);
    }
    if (l.who === 'npc') councilMask(g, x, by - 2, 9, { alpha: 0.95 });
    else {
      g.fillStyle(dim(tint, 0.6), 1); g.fillCircle(x - 6, by - 2, 2.6); g.fillCircle(x + 6, by - 2, 2.6);
      g.fillStyle(lit(colourOf(subj, 0xffffff), 0.4), 0.9); g.fillCircle(x - 6, by - 2.6, 1); g.fillCircle(x + 6, by - 2.6, 1);
    }
    // Cracks as it is struck.
    g.lineStyle(1.3, dim(tint, 0.7), 0.9);
    for (let i = 0; i < Math.round(cracked * 5); i++) {
      const a = l.seed + i * 1.3;
      g.lineBetween(x + Math.cos(a) * 4, by + Math.sin(a) * 4, x + Math.cos(a) * 17, by + Math.sin(a) * 15);
    }
    // Drying near the end of its life.
    const age = time - l.born;
    if (age > LIFE_MS - 2500) { g.fillStyle(0xd8c8b0, 0.35 * (age - (LIFE_MS - 2500)) / 2500); g.fillCircle(x, by, 18); }
  };

  /** The strand of slip from a likeness to its subject, which flares when it carries a blow. */
  const strand = (g: G, l: Likeness, time: number) => {
    const subj = fighter(l.who);
    if (!alive(subj)) return;
    const hot = clamp(1 - (time - l.pulse) / 450, 0, 1);
    const d = dist(l.x, l.y, subj.x, subj.y) || 1;
    const nx = -(subj.y - l.y) / d, ny = (subj.x - l.x) / d;
    const n = Math.max(6, Math.round(d / 24));
    g.lineStyle(1.5 + hot * 2.5, hot > 0 ? lit(OBS.seam, 0.4) : mixC(CLAY, OBS.seam, 0.4), 0.35 + hot * 0.6);
    g.beginPath();
    for (let i = 0; i <= n; i++) {
      const k = i / n;
      const wob = Math.sin(k * Math.PI) * (10 * Math.sin(time / 400 + l.seed + k * 6));
      const px = l.x + (subj.x - l.x) * k + nx * wob, py = l.y - 20 + (subj.y - l.y + 20) * k + ny * wob;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.strokePath();
    if (hot > 0) { g.fillStyle(OBS.seamLit, hot); g.fillCircle(l.x + (subj.x - l.x) * (1 - hot), l.y - 20 + (subj.y - l.y + 20) * (1 - hot), 4); }
  };

  return {
    update(time) {
      if (nextAt === 0) nextAt = time + 1800;
      if (time >= nextAt) {
        nextAt = time + EVERY;
        spawn(nextWho, time);
        nextWho = nextWho === 'player' ? 'npc' : 'player';
      }
      for (let i = list.length - 1; i >= 0; i--) {
        const l = list[i];
        if (!l.broken && !l.target && time >= l.ready) l.target = ctx.target({ x: l.x, y: l.y - 12, r: R, onStruck: (by, amount) => struck(l, by, amount) });
        if (!l.broken && time - l.born > LIFE_MS) { breakIt(l, time, true); }
        if (l.broken && time - l.broken > 900) list.splice(i, 1);
      }
    },

    npcSeek() {
      // The golem wants the challenger's likeness: stand on its far side, so you must come and defend it.
      const p = ctx.player, n = ctx.npc;
      let best: Likeness | null = null, bd = Infinity;
      for (const l of list) {
        if (l.broken || l.who !== 'player' || ctx.scene.time.now < l.ready - 600) continue;
        const d = dist(n.x, n.y, l.x, l.y);
        if (d < bd) { bd = d; best = l; }
      }
      if (!best) return null;
      const d = dist(best.x, best.y, p.x, p.y) || 1;
      return { x: clamp(best.x + (best.x - p.x) / d * 60, 50, W - 50), y: clamp(best.y + (best.y - p.y) / d * 60, top + 40, H - 40) };
    },

    drawGround(g, time) {
      for (const l of list) if (!l.broken) strand(g, l, time);
    },

    drawAir(g, time) {
      for (const l of list) {
        if (!l.broken) { figure(g, l, time); continue; }
        // Shards of fired clay flying apart.
        const k = clamp((time - l.broken) / 900, 0, 1);
        for (let i = 0; i < 9; i++) {
          const a = l.seed + i * 0.7;
          const x = l.x + Math.cos(a) * k * 46, y = l.y - 12 + Math.sin(a) * k * 30 + k * k * 30;
          g.fillStyle(i % 2 ? CLAY : dim(CLAY, 0.3), 1 - k);
          g.fillTriangle(x - 4, y, x + 4, y + 1, x, y - 6);
        }
      }
    },

    destroy() {
      for (const l of list) l.target?.remove();
      list.length = 0;
    },
  };
};

export const DECREE_LIKENESS: GimmickDef = {
  id: 'bench-earth-likeness',
  rules: 'Likenesses are modelled of both parties. A blow on another\'s likeness is dealt 60% to its subject. They stop shots, and they break.',
  make,
};

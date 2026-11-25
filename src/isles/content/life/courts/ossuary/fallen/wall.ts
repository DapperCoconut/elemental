import type Phaser from 'phaser';
import type { EncounterGimmick, GimmickCtx, GimmickDef, Pt, StrikeTarget } from '../../../../../IslesTypes';
import type { Fighter } from '../../../../../../entities/Fighter';
import { dim, glow, lit, shadow } from '../../../../../art/IsleArt';
import { fallenId } from '../../../../meteor/spec';
import { Clock, O, OCOL, alive, clamp, dist, drawLily, jit } from '../util';

/**
 * STRUCK FROM THE WALL — Enoch Quarrender, Wall-Scraper.
 *
 * The Pruned's Wall is where the court's families cut the names of the ones taken up the hill.
 * "Flowers on the Wall are UNTIDY and will be removed." In the King's telling Enoch went further:
 * he went along the slabs at night with a claw-chisel and took the names off, letter by letter,
 * until nobody could say who had been there.
 *
 * Four name-slabs stand in the yard, each with up to five letters cut in it. Enoch scrapes: stood at
 * a slab he chips a letter off every second. A slab with no name left breathes out a grey fog of
 * forgetting — anyone standing in it is silenced. Strike a slab and you RECUT a letter (a shot from
 * across the yard will do). Strike a slab whose name is whole and it is read aloud: the letters
 * burst out in a ring that stuns and hurts Enoch if he is near — and the name is half-spent again.
 * So keep the names whole by his side, and he wants them blank by yours. Halfway down he takes up
 * the ink-pot: he flings black ink at the fullest slab near you, blotting two letters and splashing
 * whoever stands by it.
 */

const ID = fallenId('ossuary', 'wall');
const LETTERS = 5;
const SCRAPE_R = 74;
const SCRAPE_MS = 950;
const FOG_R = 92;
const READ_R = 170;
const SPLASH_R = 66;
const SPLASH_WARN = 1250;

type Side = 'player' | 'npc';

interface Slab {
  x: number; y: number;
  letters: number;
  seed: number;
  target: StrikeTarget | null;
  recutAt: number;
  chipAt: number;
  readAt: number;
  fogTick: Record<Side, number>;
}

interface Splash { slab: Slab; at: number; landAt: number; landed: boolean }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, tk } = ctx;
  const clock = new Clock();
  const yy = (k: number): number => top + (H - top) * k;
  const slabs: Slab[] = [
    { x: W * 0.2, y: yy(0.32) }, { x: W * 0.8, y: yy(0.32) }, { x: W * 0.27, y: yy(0.82) }, { x: W * 0.73, y: yy(0.82) },
  ].map((p, i) => ({ ...p, letters: 3, seed: i * 4.3 + 2, target: null, recutAt: -1e9, chipAt: -1e9, readAt: -1e9, fogTick: { player: 0, npc: 0 } }));
  const splashes: Splash[] = [];
  let now = 0;
  let inkPot = false;
  let nextSplash = 0;
  let scrapeClock = 0;
  const fighter = (s: Side): Fighter => (s === 'player' ? ctx.player : ctx.npc);
  const foot = (s: Slab): Pt => ({ x: s.x, y: s.y + 14 });

  const read = (s: Slab): void => {
    s.readAt = now;
    s.letters = Math.max(0, s.letters - 2);
    ctx.sfx('holy-chord');
    const n = ctx.npc;
    if (alive(n) && dist(n.x, n.y, s.x, s.y) < READ_R) {
      ctx.hit(n, 20, n.x, n.y);
      ctx.stun(n, 750);
      ctx.float(n.x, n.y - 60, 'THE NAME IS READ', OCOL.green);
    }
  };

  const struck = (s: Slab, by: Side): void => {
    if (by === 'npc') {
      if (s.letters > 0 && now - s.chipAt > 300) { s.letters--; s.chipAt = now; ctx.sfx('slash'); }
      return;
    }
    if (now - s.recutAt < 350) return;
    s.recutAt = now;
    if (s.letters >= LETTERS) { read(s); return; }
    s.letters++;
    ctx.sfx('hammer-forge');
    if (s.letters === LETTERS) ctx.float(s.x, s.y - 70, 'THE NAME IS WHOLE', OCOL.holy);
  };

  for (const s of slabs) s.target = ctx.target({ x: s.x, y: s.y - 22, r: 28, onStruck: (by) => struck(s, by) });

  return {
    update(time: number) {
      const dt = clock.tick(time);
      now = time;
      if (dt === 0) return;
      if (!inkPot && ctx.npc.hp < ctx.npc.maxHp * 0.5) {
        inkPot = true;
        nextSplash = time + 1500;
        ctx.banner('ENOCH TAKES UP THE INK-POT', OCOL.dusk);
        ctx.sfx('splash');
      }
      // Scraping: a letter a second off whichever slab he stands at.
      const n = ctx.npc;
      scrapeClock += dt * 1000;
      if (alive(n) && scrapeClock >= SCRAPE_MS) {
        scrapeClock = 0;
        for (const s of slabs) {
          if (s.letters <= 0 || dist(n.x, n.y, s.x, s.y + 14) > SCRAPE_R) continue;
          s.letters--; s.chipAt = now;
          ctx.sfx('slash');
          if (s.letters === 0) { ctx.float(s.x, s.y - 70, 'FORGOTTEN', OCOL.red); ctx.sfx('hush'); }
          break;
        }
      }
      // The ink-pot: the fullest slab near you, blotted.
      if (inkPot && time >= nextSplash) {
        nextSplash = time + 3400;
        const p = ctx.player;
        let best: Slab | null = null, score = -1e9;
        for (const s of slabs) {
          if (splashes.some((sp) => sp.slab === s && !sp.landed)) continue;
          const sc = s.letters * 100 - dist(p.x, p.y, s.x, s.y) * 0.4;
          if (sc > score) { score = sc; best = s; }
        }
        if (best) { splashes.push({ slab: best, at: time, landAt: time + tk.warn(SPLASH_WARN), landed: false }); ctx.sfx('whoosh'); }
      }
      for (const sp of splashes) {
        if (sp.landed || now < sp.landAt) continue;
        sp.landed = true;
        sp.slab.letters = Math.max(0, sp.slab.letters - 2);
        ctx.sfx('slime-splat');
        const f0 = foot(sp.slab);
        for (const s of ['player', 'npc'] as Side[]) {
          const f = fighter(s);
          if (!alive(f) || dist(f.x, f.y, f0.x, f0.y) > SPLASH_R + 16) continue;
          if (s === 'player') tk.hitPlayer(12, f.x, f.y); else ctx.hit(f, 16, f.x, f.y);
        }
      }
      for (let i = splashes.length - 1; i >= 0; i--) if (splashes[i].landed && now - splashes[i].landAt > 900) splashes.splice(i, 1);
      // Fog of forgetting off every blank slab.
      for (const s of slabs) {
        if (s.letters > 0) continue;
        const f0 = foot(s);
        for (const side of ['player', 'npc'] as Side[]) {
          const f = fighter(side);
          if (!alive(f) || now < s.fogTick[side] || dist(f.x, f.y, f0.x, f0.y) > FOG_R) continue;
          s.fogTick[side] = now + 500;
          ctx.silence(f, 750);
        }
      }
    },

    npcSeek(): Pt | null {
      const n = ctx.npc, p = ctx.player;
      // Out of a splash about to land, or a whole name you could read at him.
      for (const sp of splashes) {
        if (sp.landed) continue;
        const f0 = foot(sp.slab);
        const d = dist(n.x, n.y, f0.x, f0.y);
        if (d < SPLASH_R + 40) { const a = d > 3 ? Math.atan2(n.y - f0.y, n.x - f0.x) : 0; return { x: tk.clampX(f0.x + Math.cos(a) * (SPLASH_R + 70)), y: tk.clampY(f0.y + Math.sin(a) * (SPLASH_R + 70)) }; }
      }
      for (const s of slabs) {
        if (s.letters < LETTERS) continue;
        const d = dist(n.x, n.y, s.x, s.y);
        if (d < READ_R + 20 && dist(p.x, p.y, s.x, s.y) < 420) {
          const a = d > 3 ? Math.atan2(n.y - s.y, n.x - s.x) : 0;
          return { x: tk.clampX(s.x + Math.cos(a) * (READ_R + 60)), y: tk.clampY(s.y + Math.sin(a) * (READ_R + 60)) };
        }
      }
      // Otherwise: to the slab nearest you that still has a name, and scrape it, standing clear of fog.
      let best: Slab | null = null, bd = 1e9;
      for (const s of slabs) {
        if (s.letters <= 0 || s.letters >= LETTERS) continue;
        const d = dist(p.x, p.y, s.x, s.y) + dist(n.x, n.y, s.x, s.y) * 0.5;
        if (d < bd) { bd = d; best = s; }
      }
      if (!best) return null;
      const a = Math.atan2(n.y - best.y, n.x - best.x);
      return { x: tk.clampX(best.x + Math.cos(a) * 50), y: tk.clampY(best.y + 14 + Math.sin(a) * 40) };
    },

    drawGround(g: Phaser.GameObjects.Graphics, time: number) {
      for (const s of slabs) {
        const f0 = foot(s);
        if (s.letters === 0) drawFog(g, f0.x, f0.y, time, s.seed);
        else drawLily(g, s.x + 30, s.y + 18, 5, s.letters / LETTERS, Math.sin(time / 900 + s.seed) * 0.2);
      }
      for (const sp of splashes) drawSplash(g, sp, time);
    },

    drawAir(g: Phaser.GameObjects.Graphics, time: number) {
      for (const s of slabs) drawSlab(g, s, time, now);
      // A chisel glint at Enoch's hand while he scrapes.
      const n = ctx.npc;
      if (alive(n)) {
        for (const s of slabs) {
          if (now - s.chipAt > 260) continue;
          const k = (now - s.chipAt) / 260;
          for (let i = 0; i < 5; i++) {
            const a = -Math.PI / 2 + (jit(s.seed, i) - 0.5) * 2;
            g.fillStyle(O.boneLit, 1 - k); g.fillRect(s.x + Math.cos(a) * 26 * k - 1, s.y - 30 + Math.sin(a) * 26 * k - 1, 3, 3);
          }
        }
      }
    },

    drawHud(g: Phaser.GameObjects.Graphics) {
      // Four little slabs, top right, each with its letters left.
      const x0 = W - 30 - 4 * 34, y = top + 16;
      g.fillStyle(0x000000, 0.5); g.fillRoundedRect(x0 - 10, y - 6, 4 * 34 + 14, 52, 8);
      slabs.forEach((s, i) => {
        const x = x0 + i * 34;
        g.fillStyle(s.letters === 0 ? O.stoneDark : O.stone, 1); g.fillRoundedRect(x, y, 24, 38, { tl: 10, tr: 10, bl: 2, br: 2 });
        for (let k = 0; k < LETTERS; k++) {
          g.fillStyle(k < s.letters ? (s.letters === LETTERS ? O.holy : O.bone) : O.slate, 1);
          g.fillRect(x + 7, y + 7 + k * 6, 10, 3);
        }
      });
      if (inkPot) { g.fillStyle(0x141016, 1); g.fillCircle(x0 - 22, y + 22, 8); g.fillStyle(O.dusk, 1); g.fillRect(x0 - 25, y + 10, 6, 5); }
    },

    destroy() { for (const s of slabs) s.target?.remove(); },
  };
}

/** A name-slab of chapel stone: round-topped, lichened, its letters cut deep or scraped to pale gouges. */
function drawSlab(g: Phaser.GameObjects.Graphics, s: Slab, time: number, now: number): void {
  const x = s.x, y = s.y + 14;
  const w = 46, h = 70;
  shadow(g, x, y + 2, 64, 14, 0.4);
  g.fillStyle(dim(O.stone, 0.25), 1); g.fillRoundedRect(x - w / 2 - 2, y - h, w + 4, h, { tl: 22, tr: 22, bl: 2, br: 2 });
  g.fillStyle(O.stone, 1); g.fillRoundedRect(x - w / 2, y - h + 2, w, h - 2, { tl: 20, tr: 20, bl: 2, br: 2 });
  g.fillStyle(O.stoneLit, 0.8); g.fillRoundedRect(x - w / 2 + 3, y - h + 5, 10, h - 12, { tl: 8, tr: 0, bl: 0, br: 0 });
  g.fillStyle(O.moss, 0.7); g.fillEllipse(x + 12, y - 6, 18, 8); g.fillEllipse(x - 14, y - h + 14, 10, 6);
  // The letters: five rows, cut as little glyphs of strokes.
  for (let k = 0; k < LETTERS; k++) {
    const ly = y - h + 16 + k * 10;
    const cut = k < s.letters;
    for (let j = 0; j < 3; j++) {
      const lx = x - 12 + j * 10;
      const v = jit(s.seed + k, j);
      if (cut) {
        g.lineStyle(2, O.slate, 1);
        if (v < 0.33) { g.lineBetween(lx, ly - 3, lx, ly + 3); g.lineBetween(lx, ly, lx + 5, ly); }
        else if (v < 0.66) { g.lineBetween(lx, ly + 3, lx + 3, ly - 3); g.lineBetween(lx + 3, ly - 3, lx + 6, ly + 3); }
        else { g.strokeCircle(lx + 3, ly, 3); }
        if (s.letters === LETTERS) { g.lineStyle(1, O.holy, 0.5 + Math.sin(time / 200 + k) * 0.3); g.lineBetween(lx, ly + 4, lx + 6, ly + 4); }
      } else {
        g.fillStyle(O.boneShade, 0.55); g.fillRect(lx - 1, ly - 2, 7 + v * 2, 4);
      }
    }
  }
  if (s.letters === LETTERS) glow(g, x, y - h / 2, 40, O.holy, 0.03, 3);
  // Being read: the name's letters fly out as a widening ring.
  const rk = (now - s.readAt) / 600;
  if (rk >= 0 && rk < 1) {
    g.lineStyle(4, O.holy, 0.8 * (1 - rk)); g.strokeEllipse(x, y - 6, READ_R * 2 * rk, READ_R * 1.1 * rk);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const px = x + Math.cos(a) * READ_R * rk, py = y - 6 + Math.sin(a) * READ_R * 0.55 * rk;
      g.lineStyle(2, lit(O.holy, 0.3), 1 - rk); g.lineBetween(px - 3, py - 3, px + 3, py + 3); g.lineBetween(px - 3, py + 3, px + 3, py - 3);
    }
  }
}

/** The grey breath off a blank slab: slow coils of fog, the ground under it gone colourless. */
function drawFog(g: Phaser.GameObjects.Graphics, x: number, y: number, time: number, seed: number): void {
  g.fillStyle(0x8a8690, 0.14); g.fillEllipse(x, y, FOG_R * 2, FOG_R * 1.1);
  g.lineStyle(1.5, 0x8a8690, 0.5); g.strokeEllipse(x, y, FOG_R * 2, FOG_R * 1.1);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + time / 2600 + seed;
    const r = FOG_R * (0.35 + jit(seed, i) * 0.5);
    const fx = x + Math.cos(a) * r, fy = y + Math.sin(a) * r * 0.55 - 8;
    g.fillStyle(0xb8b4bc, 0.16 + jit(seed, i + 9) * 0.1); g.fillEllipse(fx, fy, 40 + jit(seed, i + 3) * 30, 16);
  }
}

/** An ink-pot's throw: a dark blot spreading where it will land, then a splash of black. */
function drawSplash(g: Phaser.GameObjects.Graphics, sp: Splash, time: number): void {
  const x = sp.slab.x, y = sp.slab.y + 14;
  if (!sp.landed) {
    const k = clamp((time - sp.at) / (sp.landAt - sp.at), 0, 1);
    g.fillStyle(0x141016, 0.15 + k * 0.3); g.fillEllipse(x, y, SPLASH_R * 2 * (0.4 + k * 0.6), SPLASH_R * 1.1 * (0.4 + k * 0.6));
    g.lineStyle(2, O.dusk, 0.6 + k * 0.4); g.strokeEllipse(x, y, SPLASH_R * 2, SPLASH_R * 1.1);
    // The pot's arc coming down.
    const py = y - 160 * (1 - k) - 40;
    g.fillStyle(0x141016, 1); g.fillCircle(x, py, 7);
    g.fillStyle(O.dusk, 1); g.fillRect(x - 3, py - 10, 6, 4);
    return;
  }
  const k = clamp((time - sp.landAt) / 900, 0, 1);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + jit(i, 2);
    const r = SPLASH_R * (0.4 + jit(i, 4) * 0.7) * Math.min(1, k * 4);
    g.fillStyle(0x141016, 0.8 * (1 - k)); g.fillCircle(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.55, 6 + jit(i, 6) * 6);
  }
  g.fillStyle(0x141016, 0.7 * (1 - k)); g.fillEllipse(x, y, SPLASH_R * 1.4, SPLASH_R * 0.7);
}

export const FALLEN_WALL: GimmickDef = {
  id: ID,
  rules: 'Enoch scrapes names off the slabs; a blank one fogs and silences. Strike a slab to recut a letter, a whole name to read it and stun him. At half, ink.',
  make,
};

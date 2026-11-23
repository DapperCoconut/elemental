import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import { GALE, GALE_CSS, GALE_LIT, OBS, hudPlate, sideMark } from '../art';
import { starGlow } from '../../../../../art/PinnacleArt';
import { type Who, WHO, alive, clampN, dist, fighterOf, inArena } from './util';

/**
 * SEAT OF THE ZENITH — Councilor Ptolema Vey (astra). *Decree of Precedence.*
 *
 * On Highspire who stood nearer the stars breathed first. The deck is ruled in seven tiers (VII at
 * the foot, I under the north rail). Whoever of you stands HIGHER — nearer the top — takes
 * precedence: their blows land 25% harder, and a little crown-star rides over them.
 *
 * Every seven seconds the Zenith chimes: the star over the north rail swells for 1.8s, its reticle
 * hunting whoever is highest, then locks on their spot for the last 0.35s and drops a lance of
 * starlight there — 16 and staggered (rooted 0.4s). Precedence has a price, and it is paid on the
 * chime. A perfected astra already smites whoever stands highest; this councilor climbs above you
 * between chimes and drops below you before them. The turn: the reticle only *locks* at the end —
 * step down past it late, or simply step out of the locked ring.
 */
const precedence = (ctx: GimmickCtx): EncounterGimmick => {
  const PERIOD = ctx.hard ? 5800 : 7000;
  const WARN = ctx.hard ? 1500 : 1800;
  const LOCK = 350;
  const R = 58;
  const DMG = ctx.hard ? 20 : 16;
  const TIERS = 7;

  const top = ctx.top;
  const star = { x: ctx.W / 2, y: top + 10 };
  let state: 'wait' | 'warn' | 'lock' = 'wait';
  let at = 0;
  let mark = { x: ctx.W / 2, y: ctx.H / 2 };
  let lances: { x: number; y: number; at: number }[] = [];
  let announced = false;

  const highest = (): Who | null => {
    const p = ctx.player, n = ctx.npc;
    if (!alive(p)) return alive(n) ? 'npc' : null;
    if (!alive(n)) return 'player';
    return p.y <= n.y ? 'player' : 'npc';
  };
  /** Who holds precedence right now (a few px of slack so a tie does not flicker). */
  const precedent = (): Who | null => {
    const d = ctx.npc.y - ctx.player.y;
    if (Math.abs(d) < 8) return null;
    return d > 0 ? 'player' : 'npc';
  };
  const tierOf = (y: number): number => clampN(Math.floor(((y - top) / (ctx.H - top)) * TIERS), 0, TIERS - 1);

  return {
    update(time) {
      if (!announced) { announced = true; at = time + 3500; ctx.banner('THE HIGHER STRIKES HARDER — THE ZENITH STRIKES THE HIGHEST', GALE_CSS); }
      if (state === 'wait' && time >= at) { state = 'warn'; at = time + ctx.tk.warn(WARN); ctx.sfx('beam-charge'); }
      if (state === 'warn') {
        const h = highest();
        if (h) { const f = fighterOf(ctx, h); mark = { x: mark.x + (f.x - mark.x) * 0.25, y: mark.y + (f.y - mark.y) * 0.25 }; }
        if (at - time <= LOCK) {
          state = 'lock';
          if (h) { const f = fighterOf(ctx, h); mark = { x: f.x, y: f.y }; }
          ctx.sfx('countdown-tick');
        }
      }
      if (state === 'lock' && time >= at) {
        ctx.sfx('light-beam');
        lances.push({ x: mark.x, y: mark.y, at: time });
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (!alive(f) || dist(f.x, f.y, mark.x, mark.y) > R) continue;
          ctx.hit(f, DMG, f.x, f.y);
          ctx.root(f, 400);
          ctx.float(f.x, f.y - 54, 'STRUCK FROM THE ZENITH', w === 'player' ? '#ff9a8a' : GALE_CSS);
        }
        state = 'wait';
        at = time + PERIOD - WARN;
      }
      lances = lances.filter((l) => time - l.at < 700);
    },
    playerTakenMult() { return precedent() === 'npc' ? 1.25 : 1; },
    npcTakenMult() { return precedent() === 'player' ? 1.25 : 1; },
    npcSeek() {
      const p = ctx.player, n = ctx.npc;
      const now = ctx.scene.time.now;
      // Before the chime: be the lower one, and away from the reticle.
      if (state === 'lock') return dist(n.x, n.y, mark.x, mark.y) < R + 30 ? inArena(ctx, n.x + (n.x < mark.x ? -110 : 110), n.y + 60) : null;
      if (state === 'warn' || (state === 'wait' && at - now < 900)) return inArena(ctx, p.x + (n.x < p.x ? -120 : 120), p.y + 150);
      // Between chimes: climb above the player and keep the crown-star.
      return inArena(ctx, p.x + (n.x < p.x ? -140 : 140), p.y - 140);
    },
    drawGround(g, time) {
      // The tiers: seven bands up the deck, each a step nearer the stars, numbered at the edges.
      const bandH = (ctx.H - top) / TIERS;
      const pt = tierOf(ctx.player.y), nt = tierOf(ctx.npc.y);
      for (let i = 0; i < TIERS; i++) {
        const y = top + i * bandH;
        const lift = (TIERS - i) / TIERS;
        g.fillStyle(GALE, 0.012 + lift * 0.03); g.fillRect(0, y, ctx.W, bandH);
        g.lineStyle(1.5, OBS.edge, 0.22 + lift * 0.2); g.lineBetween(0, y, ctx.W, y);
        // Numerals as tally-strokes (I…VII), the tier you stand on lit.
        const lit = i === pt || i === nt;
        for (const ex of [24, ctx.W - 24]) {
          for (let k = 0; k <= i; k++) {
            g.lineStyle(2, lit ? GALE_LIT : GALE, lit ? 0.9 : 0.35);
            g.lineBetween(ex - i * 2.5 + k * 5, y + bandH / 2 - 7, ex - i * 2.5 + k * 5, y + bandH / 2 + 7);
          }
        }
      }
      // The line of precedence: a faint horizon at the higher fighter's height.
      const pr = precedent();
      if (pr) {
        const f = fighterOf(ctx, pr);
        g.lineStyle(1, pr === 'player' ? GALE : OBS.seamLit, 0.35);
        for (let x = 0; x < ctx.W; x += 22) g.lineBetween(x, f.y, x + 11, f.y);
      }
      // The reticle hunting the highest, then locked.
      if (state !== 'wait') {
        const k = state === 'lock' ? 1 : clampN(1 - (at - time - LOCK) / (ctx.tk.warn(WARN) - LOCK), 0, 1);
        const locked = state === 'lock';
        g.fillStyle(OBS.star, locked ? 0.16 : 0.05 + k * 0.06); g.fillCircle(mark.x, mark.y, R);
        g.lineStyle(locked ? 3 : 2, locked ? OBS.starCore : OBS.star, 0.85); g.strokeCircle(mark.x, mark.y, R);
        const spin = time / (locked ? 120 : 400);
        for (let i = 0; i < 4; i++) {
          const a = spin + (i / 4) * Math.PI * 2;
          g.lineStyle(2, OBS.star, 0.9);
          g.lineBetween(mark.x + Math.cos(a) * (R + 4), mark.y + Math.sin(a) * (R + 4), mark.x + Math.cos(a) * (R + 16 - k * 8), mark.y + Math.sin(a) * (R + 16 - k * 8));
        }
        g.lineStyle(1, OBS.star, 0.5); g.strokeCircle(mark.x, mark.y, R * (1 - k) + 6);
      }
    },
    drawAir(g, time) {
      const t = time / 1000;
      // The Zenith over the north rail: a cold small star that swells to a hot one on the chime.
      const swell = state === 'wait' ? 0 : state === 'lock' ? 1 : clampN(1 - (at - time) / ctx.tk.warn(WARN), 0, 1);
      starGlow(g, star.x, star.y, 5 + swell * 9, t, 0.35 + swell * 0.65);
      if (state !== 'wait') {
        g.lineStyle(1, OBS.star, 0.2 + swell * 0.3); g.lineBetween(star.x, star.y, mark.x, mark.y);
      }
      // The lances: a column of starlight from the top of the arena to the struck spot.
      for (const l of lances) {
        const k = (time - l.at) / 700;
        g.fillStyle(OBS.star, 0.5 * (1 - k)); g.fillRect(l.x - 20 * (1 - k), top, 40 * (1 - k), l.y - top);
        g.fillStyle(OBS.starCore, 0.9 * (1 - k)); g.fillRect(l.x - 6 * (1 - k), top, 12 * (1 - k), l.y - top);
        g.lineStyle(4, OBS.star, 1 - k); g.strokeCircle(l.x, l.y, R * (0.6 + k * 0.8));
      }
      // The crown-star over whoever has precedence.
      const pr = precedent();
      if (pr) {
        const f = fighterOf(ctx, pr);
        if (alive(f)) {
          const y = f.y - 48 + Math.sin(t * 3) * 2;
          g.fillStyle(pr === 'player' ? GALE_LIT : OBS.seamLit, 0.95);
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2 + t;
            g.fillTriangle(f.x, y, f.x + Math.cos(a - 0.3) * 4, y + Math.sin(a - 0.3) * 4, f.x + Math.cos(a) * 11, y + Math.sin(a) * 11);
            g.fillTriangle(f.x, y, f.x + Math.cos(a + 0.3) * 4, y + Math.sin(a + 0.3) * 4, f.x + Math.cos(a) * 11, y + Math.sin(a) * 11);
          }
          g.fillStyle(0xffffff, 1); g.fillCircle(f.x, y, 2.5);
        }
      }
    },
    drawHud(g, time) {
      const cx = ctx.W / 2, cy = ctx.top + 20;
      hudPlate(g, cx, cy, 260, 26);
      // Left: who has precedence. Right: the clock to the chime.
      const pr = precedent();
      sideMark(g, cx - 110, cy, true); sideMark(g, cx - 60, cy, false);
      if (pr) { g.lineStyle(2, GALE_LIT, 1); g.strokeCircle(pr === 'player' ? cx - 110 : cx - 60, cy, 11); }
      const total = PERIOD;
      const left = state === 'wait' ? at - time + ctx.tk.warn(WARN) : at - time;
      const k = clampN(1 - left / total, 0, 1);
      g.fillStyle(0x000000, 0.6); g.fillRoundedRect(cx - 30, cy - 4, 140, 8, 4);
      g.fillStyle(state === 'wait' ? GALE : OBS.star, 1); g.fillRoundedRect(cx - 30, cy - 4, 140 * k, 8, 4);
      starGlow(g, cx + 118, cy, 3, time / 1000, 0.4 + k * 0.6);
    },
  };
};

export const PRECEDENCE: GimmickDef = {
  id: 'bench-air-precedence',
  rules: 'The higher of the two strikes harder; at each chime of the Zenith, the star strikes whoever stands highest.',
  make: precedence,
};

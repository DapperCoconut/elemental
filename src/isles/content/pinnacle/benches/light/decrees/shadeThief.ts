import type { EncounterGimmick, GimmickCtx, GimmickDef } from '../../../../../IslesTypes';
import type { G } from '../../../../../art/IsleArt';
import { OBS, starGlow } from '../../../../../art/PinnacleArt';
import { NOON } from '../art';
import { SIDE, WHO, type Who, alive, clamp, dist, fighterOf, onFloor, otherOf } from './util';

/**
 * DECREE OF THE SHADE-THIEF — Councilor Severin Ashlar, Seat of Scales (Justice).
 *
 * He drafted the Shade-Thief Statute that sent Solmara's sleepers to the Burning Glass. Up here
 * the star burns through one crack at a time and the crack wanders, so for once everything casts
 * a long shadow — and every shadow is evidence.
 *   - Stand in the other fighter's shadow and you strike them unseen: they take 35% more from you.
 *   - Every few seconds the Court holds THE SEARCH: a bailiff's lamp sweeps the floor edge to
 *     edge (its side lights first). Whoever it finds standing in another's shadow is a
 *     SHADE-THIEF — chained where they stand and bleached (taking 30% more) for a while.
 * He is a magistrate and he hunts your shadow; when the lamp comes he steps smartly out of it.
 * The trick: your shadow is yours to swing. Turn it back over him the moment the lamp arrives.
 */

interface Search { from: 'n' | 's' | 'e' | 'w'; warnAt: number; startAt: number; endAt: number; checked: Record<Who, boolean> }

function make(ctx: GimmickCtx): EncounterGimmick {
  const { W, H, top, rng } = ctx;
  const EVERY = ctx.hard ? 7500 : 9000;
  const WARN = 1300;
  const SWEEP = 1700;
  const CHAIN_MS = ctx.hard ? 1600 : 1300;
  const BLEACH_MS = 4200;
  const cx = W / 2, cy = (top + H) / 2;
  const phase0 = rng() * Math.PI * 2;
  let search: Search | null = null;
  let nextSearch = 0;
  let started = false;
  const bleachUntil: Record<Who, number> = { player: 0, npc: 0 };
  const chainUntil: Record<Who, number> = { player: 0, npc: 0 };

  /** Where the star's light lands on the floor now: it wanders slowly round, crack to crack. */
  const star = (time: number) => {
    const a = phase0 + time / 6400;
    return { x: cx + Math.cos(a) * W * 0.34, y: cy + Math.sin(a * 1.3) * (H - top) * 0.3 };
  };
  /** A fighter's shadow: from their feet, away from the star; longer the farther they stand from it. */
  const shadowOf = (w: Who, time: number) => {
    const f = fighterOf(ctx, w);
    const s = star(time);
    const d = dist(f.x, f.y, s.x, s.y) || 1;
    return { x: f.x, y: f.y, ux: (f.x - s.x) / d, uy: (f.y - s.y) / d, len: Math.min(280, 70 + d * 0.55) };
  };
  /** Is (x, y) inside `w`'s shadow? */
  const inShadow = (w: Who, x: number, y: number, time: number): boolean => {
    const sh = shadowOf(w, time);
    const vx = x - sh.x, vy = y - sh.y;
    const t = vx * sh.ux + vy * sh.uy;
    if (t < 18 || t > sh.len) return false;
    return Math.abs(vx * -sh.uy + vy * sh.ux) < 18 + 12 * (t / sh.len);
  };
  const thief = (w: Who, time: number) => alive(fighterOf(ctx, w)) && alive(fighterOf(ctx, otherOf(w))) && (() => {
    const f = fighterOf(ctx, w);
    return inShadow(otherOf(w), f.x, f.y, time);
  })();

  /** The lamp's line now, as a coordinate along its sweep axis. */
  const lampAt = (s: Search, time: number) => {
    const k = clamp((time - s.startAt) / SWEEP, 0, 1);
    switch (s.from) {
      case 'w': return -20 + k * (W + 40);
      case 'e': return W + 20 - k * (W + 40);
      case 'n': return top - 20 + k * (H - top + 40);
      default: return H + 20 - k * (H - top + 40);
    }
  };
  const passed = (s: Search, time: number, x: number, y: number) => {
    if (time < s.startAt) return false;
    const at = lampAt(s, time);
    return s.from === 'w' ? x <= at : s.from === 'e' ? x >= at : s.from === 'n' ? y <= at : y >= at;
  };

  function catchThief(w: Who, time: number): void {
    const f = fighterOf(ctx, w);
    chainUntil[w] = time + CHAIN_MS;
    bleachUntil[w] = time + BLEACH_MS;
    ctx.root(f, CHAIN_MS);
    ctx.float(f.x, f.y - 54, 'SHADE-THIEF', '#fffbea');
    ctx.flash(f.x, f.y, 0xffffff);
    ctx.sfx('chain');
  }

  return {
    update(time) {
      if (!started) { started = true; nextSearch = time + 4200; }
      if (!search && time >= nextSearch - WARN) {
        const sides: Search['from'][] = ['n', 's', 'e', 'w'];
        const from = sides[Math.floor(rng() * 4)];
        const warn = ctx.tk.warn(WARN);
        search = { from, warnAt: time, startAt: time + warn, endAt: time + warn + SWEEP, checked: { player: false, npc: false } };
        ctx.banner('THE SEARCH', '#fffbea');
        ctx.sfx('curse-cast');
      }
      if (search) {
        for (const w of WHO) {
          const f = fighterOf(ctx, w);
          if (search.checked[w] || !alive(f) || !passed(search, time, f.x, f.y)) continue;
          search.checked[w] = true;
          if (thief(w, time)) catchThief(w, time);
        }
        if (time >= search.endAt) { search = null; nextSearch = time + EVERY; }
      }
    },

    playerTakenMult() {
      const now = ctx.scene.time.now;
      return (thief('npc', now) ? 1.35 : 1) * (now < bleachUntil.player ? 1.3 : 1);
    },
    npcTakenMult() {
      const now = ctx.scene.time.now;
      return (thief('player', now) ? 1.35 : 1) * (now < bleachUntil.npc ? 1.3 : 1);
    },

    npcSeek() {
      const now = ctx.scene.time.now;
      const n = ctx.npc;
      const sh = shadowOf('player', now);
      const danger = search && !search.checked.npc;
      if (danger) {
        if (!inShadow('player', n.x, n.y, now)) return null;
        // Step square out of the shadow, to whichever side is nearer.
        const side = (n.x - sh.x) * -sh.uy + (n.y - sh.y) * sh.ux >= 0 ? 1 : -1;
        return onFloor(ctx, n.x - sh.uy * side * 90, n.y + sh.ux * side * 90);
      }
      // Into the player's shadow, a spear's length from their feet.
      const along = Math.min(sh.len * 0.5, 90);
      return onFloor(ctx, sh.x + sh.ux * along, sh.y + sh.uy * along);
    },

    drawGround(g, time) {
      const t = time / 1000;
      // The star's light landing on the floor: a hot pool where it comes through.
      const s = star(time);
      g.fillStyle(NOON.gold, 0.06); g.fillCircle(s.x, s.y, 90);
      g.fillStyle(NOON.gold, 0.08); g.fillCircle(s.x, s.y, 46);
      starGlow(g, s.x, s.y, 7, t, 0.6);
      // Each fighter's long shadow, cut black on the glass.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        drawShadow(g, w, time);
      }
      // The search's lamp-side: a white bar lit along the edge it comes from.
      if (search && time < search.startAt) {
        const k = clamp((time - search.warnAt) / (search.startAt - search.warnAt), 0, 1);
        const flick = Math.floor(time / 100) % 2 ? 1 : 0.6;
        g.fillStyle(0xffffff, 0.25 * k * flick);
        if (search.from === 'w') g.fillRect(0, top, 26, H - top);
        else if (search.from === 'e') g.fillRect(W - 26, top, 26, H - top);
        else if (search.from === 'n') g.fillRect(0, top, W, 26);
        else g.fillRect(0, H - 26, W, 26);
      }
    },

    drawAir(g, time) {
      // The lamp's sweep: a wall of white light with a hot leading edge, raking the floor.
      if (search && time >= search.startAt) {
        const at = lampAt(search, time);
        const v = search.from === 'w' || search.from === 'e';
        const back = search.from === 'w' || search.from === 'n' ? -1 : 1;
        for (let i = 0; i < 5; i++) {
          const off = back * i * 14;
          g.fillStyle(i === 0 ? 0xffffff : NOON.beam, i === 0 ? 0.55 : 0.16 - i * 0.025);
          if (v) g.fillRect(at + off - 4, top, 8, H - top); else g.fillRect(0, at + off - 4, W, 8);
        }
        // The bailiff's lantern riding the edge of the beam, at the arena's rim.
        const lx = v ? at : 30;
        const ly = v ? top + 14 : at;
        g.fillStyle(OBS.glass, 1); g.fillRect(lx - 8, ly - 10, 16, 20);
        g.fillStyle(0xffffff, 0.9); g.fillRect(lx - 5, ly - 7, 10, 14);
        g.lineStyle(1, NOON.brass, 1); g.strokeRect(lx - 8, ly - 10, 16, 20);
      }
      // The caught and the bleached.
      for (const w of WHO) {
        const f = fighterOf(ctx, w);
        if (!alive(f)) continue;
        if (time < bleachUntil[w]) {
          const k = (bleachUntil[w] - time) / BLEACH_MS;
          g.fillStyle(0xffffff, 0.18 + 0.12 * k); g.fillCircle(f.x, f.y, 24);
          g.lineStyle(1.5, NOON.clear, 0.7); g.strokeCircle(f.x, f.y, 27);
        }
        if (time < chainUntil[w]) {
          // Chains from the floor to the ankles: four short links each side, and a gold cuff.
          for (const sgn of [-1, 1]) {
            for (let i = 0; i < 4; i++) {
              const lx = f.x + sgn * (34 - i * 6), ly = f.y + 18 - i * 3;
              g.lineStyle(2, NOON.brass, 0.95); g.strokeEllipse(lx, ly, 7, 4);
            }
          }
          g.lineStyle(3, NOON.brass, 1); g.strokeEllipse(f.x, f.y + 14, 30, 8);
        }
        // A gold glint over a thief while they stand in it.
        if (thief(w, time)) {
          g.fillStyle(SIDE[w], 0.9);
          g.fillTriangle(f.x - 6, f.y - 44, f.x + 6, f.y - 44, f.x, f.y - 34);
        }
      }
    },

    drawHud(g, time) {
      const x = ctx.W - 150, y = top + 18;
      const k = search ? 1 : clamp(1 - (nextSearch - time) / EVERY, 0, 1);
      g.fillStyle(OBS.glass, 0.85); g.fillRoundedRect(x - 70, y - 11, 140, 22, 8);
      g.lineStyle(1.5, NOON.brass, 0.9); g.strokeRoundedRect(x - 70, y - 11, 140, 22, 8);
      g.fillStyle(search ? 0xffffff : NOON.gold, search ? 0.9 : 0.6); g.fillRoundedRect(x - 40, y - 4, 100 * k, 8, 3);
      // The lamp icon.
      g.fillStyle(NOON.brassDark, 1); g.fillRect(x - 62, y - 8, 14, 16);
      g.fillStyle(search ? 0xffffff : NOON.gold, 1); g.fillRect(x - 59, y - 5, 8, 10);
    },
  };

  function drawShadow(g: G, w: Who, time: number): void {
    const sh = shadowOf(w, time);
    const px = -sh.uy, py = sh.ux;
    const tipX = sh.x + sh.ux * sh.len, tipY = sh.y + sh.uy * sh.len;
    const trod = thief(otherOf(w), time);
    // Penumbra, then umbra: the shadow sharpens near the feet and blurs toward the tip.
    g.fillStyle(0x000000, 0.22);
    g.fillPoints([
      { x: sh.x + px * 22, y: sh.y + py * 22 }, { x: tipX + px * 34, y: tipY + py * 34 },
      { x: tipX - px * 34, y: tipY - py * 34 }, { x: sh.x - px * 22, y: sh.y - py * 22 },
    ], true);
    g.fillStyle(0x020104, 0.5);
    g.fillPoints([
      { x: sh.x + px * 16, y: sh.y + py * 16 }, { x: tipX + px * 22, y: tipY + py * 22 },
      { x: tipX + sh.ux * 10, y: tipY + sh.uy * 10 }, { x: tipX - px * 22, y: tipY - py * 22 },
      { x: sh.x - px * 16, y: sh.y - py * 16 },
    ], true);
    // A trodden shadow's edge burns: someone is standing in it.
    g.lineStyle(1.5, trod ? SIDE[otherOf(w)] : OBS.edge, trod ? 0.85 : 0.18);
    g.lineBetween(sh.x + px * 16, sh.y + py * 16, tipX + px * 22, tipY + py * 22);
    g.lineBetween(sh.x - px * 16, sh.y - py * 16, tipX - px * 22, tipY - py * 22);
  }
}

export const SHADE_THIEF: GimmickDef = {
  id: 'bench-light-shade-thief',
  rules: 'Who stands in another\'s shadow strikes them unseen (+35%); but when the Search sweeps, a shade-thief is chained and bleached.',
  make,
};

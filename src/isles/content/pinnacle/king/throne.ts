import type { BossEntry, BossEntryKit } from '../../../../boss/framework/BossDefs';
import { OBS } from '../../../art/PinnacleArt';
import type { KingPart } from './contract';
import { BACK_DOORS, doorStep, drawAegis, drawHall, drawHallLive, drawKing, drawWarrior } from './throneArt';
import { AEGIS, SEAT, clampN, ease, line, liveCourt, stagecraft, type Gfx, type Pt } from './throneCourt';
import { hostDirector } from './throneHost';
import { accusingHand, edict, gavelBlow, levy, thronesShadow } from './throneMoves';

/**
 * The Obsidian King, Act I — THE THRONE.
 *
 * He does not rise. He sits at the head of a long hall of black glass behind the Aegis, a dome of
 * the same glass as his shell, and sends the Host down the hall in named waves: the Shieldwall,
 * the Knives, the Kennel, the Host, and then harder repeats. While any of the Host stands the
 * Aegis holds and he takes almost nothing; break a wave and it cracks in gold for a few seconds
 * and the throne is open. Between and during the waves he rules from the chair: the Edict, the
 * Accusing Hand, the Gavel, the Throne's Shadow, the Levy. (See `throneHost.ts`, `throneMoves.ts`.)
 */

const ENTRY_MS = 4600;

/** The hall dark; his eyes light; the braziers catch; the Aegis rises; the first rank steps out of the walls. */
const entry: BossEntry = {
  ms: ENTRY_MS,
  cues: [
    { at: 0, sfx: 'boss-intro' },
    { at: 800, sfx: 'curse-cast' },
    { at: 1300, sfx: 'fireball' },
    { at: 1700, sfx: 'crystal-chime', shake: 0.003, ms: 600 },
    { at: 2500, say: 'Rise.' },
    { at: 2900, sfx: 'stone-rise' },
    { at: 3500, sfx: 'clang' },
    { at: 3900, sfx: 'drum-hit', shake: 0.004, ms: 300 },
  ],
  drawGround(g: Gfx, k: BossEntryKit) {
    stagecraft.entryP = k.p;
    // The first rank of the Host stepping out of the back wall's gates.
    const step = ease((k.p - 0.6) / 0.35);
    if (step <= 0) return;
    for (const d of BACK_DOORS) {
      const at = doorStep(d);
      drawWarrior(g, at.x, at.y - 14 + step * 14, Math.PI / 2, step * 5, { alpha: step * 0.9, hurt: false, hp: 1, t: k.time / 1000, windup: 0, lock: 0 });
    }
  },
  drawOver(g: Gfx, k: BossEntryKit) {
    const p = k.p;
    const dark = 0.96 * (1 - ease((p - 0.12) / 0.68));
    if (dark > 0.01) { g.fillStyle(0x020104, dark); g.fillRect(0, 0, k.W, k.H); }
    const t = k.time / 1000;
    // Braziers catch, violet.
    const fire = ease((p - 0.25) / 0.1) * dark;
    for (const x of [344, 616]) {
      g.fillStyle(OBS.seam, 0.25 * fire); g.fillCircle(x, 176, 18 + Math.sin(t * 9 + x) * 2);
      g.fillStyle(OBS.seamLit, 0.7 * fire); g.fillTriangle(x - 5, 182, x + 5, 182, x + Math.sin(t * 8) * 2, 166);
    }
    // The Aegis rising: its rim drawn in light against the dark.
    const rise = ease((p - 0.3) / 0.4);
    if (rise > 0.01 && dark > 0.02) {
      const sil: Pt[] = [];
      for (let i = 0; i <= 24; i++) {
        const u = (i / 24) * Math.PI;
        sil.push({ x: AEGIS.x + AEGIS.rx * Math.cos(u), y: AEGIS.y - AEGIS.up * rise * Math.sin(u) });
      }
      line(g, sil, 6, OBS.seam, 0.25 * dark);
      line(g, sil, 1.8, OBS.seamLit, 0.9 * dark);
      g.lineStyle(1.4, OBS.seamLit, 0.6 * dark);
      g.strokeEllipse(AEGIS.x, AEGIS.y, AEGIS.rx * 2, AEGIS.ry * 2);
    }
    // His eyes, first of all: two cold points in the slit, opening.
    const eyes = ease((p - 0.1) / 0.2);
    if (eyes > 0) {
      const ex = SEAT.x, ey = SEAT.y - 62 - 19 * 0.18;
      const flare = clampN(1 - (p - 0.15) / 0.25, 0, 1);
      for (const s of [-1, 1]) {
        g.fillStyle(OBS.seam, 0.2 * eyes * (0.4 + dark)); g.fillCircle(ex + s * 5.5, ey, 10 + flare * 16);
        g.fillStyle(OBS.seamLit, 0.5 * eyes); g.fillCircle(ex + s * 5.5, ey, 4 + flare * 3);
        g.fillStyle(0xffffff, eyes); g.fillCircle(ex + s * 5.5, ey, 1.9);
      }
      if (flare > 0) {
        g.lineStyle(1.2, OBS.seamLit, 0.6 * flare * eyes);
        g.lineBetween(ex - 40 * flare - 6, ey, ex + 40 * flare + 6, ey);
      }
    }
  },
};

export const KING_THRONE: KingPart = {
  phase: {
    name: 'The Throne',
    line: 'You may approach. My Host will show you how far.',
    hp: 900,
    cycle: [
      'sig:p1-edict', 'sig:p1-hand', 'sig:p1-gavel', 'sig:p1-levy', 'sig:p1-shadow',
      'sig:p1-edict', 'sig:p1-gavel', 'sig:p1-hand', 'sig:p1-shadow', 'sig:p1-levy',
    ],
    harass: ['h-snipe'],
    restMs: 2600,
    harassMs: 5600,
    style: { movement: 'anchor', anchorAt: { x: SEAT.x, y: SEAT.y }, hideRig: true, solid: true, gimmick: 'none', tint: 'none' },
    entry,
  },
  signatures: {
    'p1-host': hostDirector,
    'p1-edict': edict,
    'p1-hand': accusingHand,
    'p1-gavel': gavelBlow,
    'p1-shadow': thronesShadow,
    'p1-levy': levy,
  },
  drawDecor(g, s) {
    const c = liveCourt();
    drawKing(g, s, c);
    drawAegis(g, s.t, c);
  },
  drawArena(g, W, H) { drawHall(g, W, H); },
  drawBackdrop(g, s) { drawHallLive(g, s.t, liveCourt()); },
};

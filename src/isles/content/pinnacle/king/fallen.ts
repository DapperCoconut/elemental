import type { BossEntry, SignatureMove } from '../../../../boss/framework/BossDefs';
import type { BossToolkit } from '../../../../boss/framework/BossToolkit';
import type { KingPart } from './contract';
import {
  EMBER, EMBER_HOT, FALLEN_ENTRY_MS, T_SWAP, drawDream, drawFallen, drawTrail, fallenEntryGround, fallenEntryOver, paintFallpoint,
} from './fallenArt';
import { theBrand, theBreathTax, thePruning, theStoneTithe, theUndertow } from './fallenLawsA';
import { theDraw, theEndlessNoon, theLot, theMark, thePart } from './fallenLawsB';
import { crossExamination, theGavel } from './fallenMoves';
import {
  FALLEN_PHASE, FS, clampN, dist, fieldX, fieldY, live, place, resetFallen, say, turnToward,
} from './fallenState';

/**
 * The Obsidian King, Act IV — THE FALLEN KING (phase index 3: the hard extra phase, the Fall only).
 *
 * The Supernova's light pulls itself into a point, the hall and the sky are simply gone, and he is
 * standing on the dream's floor: a man, the player's own size, in a judge's robe of ash with the
 * cinder showing through. No throne, no host, no glass. He has read the whole case.
 *
 * A duel at your own scale. He is quick — he keeps a sword's length off you, circles, changes
 * direction, slips a shot now and then — and every attack CITES ONE OF THE TEN LAWS, looking like
 * its isle while it lasts: the Brand, the Undertow, the Pruning, the Breath-Tax, the Stone Tithe,
 * the Draw, the Mark, the Lot, the Part, the Endless Noon. Between them, his own: the Gavel and the
 * Cross-Examination, each of which leaves him open (a gold ring on the floor) for a moment.
 *
 * The floor is the Fall coming apart: ten pieces of the ten isles' ground over Fallpoint's glass,
 * breaking off as his pool falls — first-freed first — until he is fighting on bare glass under
 * the night sky. He speaks four times on the way down; the last is not a roar.
 *
 * `p4-court` is never cast: it is his footwork, his openings and his voice, every frame of the act.
 */

const LINES: [number, string][] = [
  [0.75, 'The Brand was a kindness. They had forgotten what fire was for.'],
  [0.5, 'Half the isles gone from under us, and you do not stop to look. Neither did I.'],
  [0.25, 'Do you hear it? The sea. It was always under the floor.'],
  [0.08, 'Dismissed, then. I only wanted it heard once more, all of it.'],
];

// ── The court: footwork, openings, his voice ─────────────────────────

const court = (tk: BossToolkit): SignatureMove => {
  return {
    durationMs: 0,
    tell: 'THE FALLEN KING',
    cast() { /* never in the cycle — the footwork runs every frame of the act */ },
    update(time, dt) {
      if (!live(tk)) {
        if (FS.live && tk.phase !== FALLEN_PHASE && tk.now - FS.seenAt > 300) resetFallen();
        return;
      }
      const p = tk.player;
      if (!FS.live) {
        FS.live = true;
        FS.x = tk.bossX; FS.y = tk.bossY;
        FS.strafeFlipAt = time + 1800;
      }
      // Speak at the marks, once each.
      while (FS.said < LINES.length && FS.hpRatio <= LINES[FS.said][0]) {
        say(tk, FS.x, FS.y - 70, LINES[FS.said][1]);
        FS.said++;
      }
      FS.face = turnToward(FS.face, Math.atan2(p.y - FS.y, p.x - FS.x), 7 * dt);
      if (FS.pose === 'cite' && !FS.drive && time - FS.citeAt > 1300) FS.pose = 'rest';
      FS.trail = FS.trail.filter((a) => time - a.at < 500);

      if (!FS.drive) {
        // A duellist's footwork: hold a sword's length, circle, change direction without warning.
        const d = dist(p.x, p.y, FS.x, FS.y) || 1;
        const ux = (p.x - FS.x) / d, uy = (p.y - FS.y) / d;
        const slow = FS.pose === 'cite' ? 0.55 : 1;
        let radial = 0;
        if (d > 235) radial = 215;
        else if (d < 150) radial = -175;
        if (time > FS.strafeFlipAt) { FS.strafe = -FS.strafe; FS.strafeFlipAt = time + 1300 + Math.random() * 1300; }
        const tang = 125 * FS.strafe;
        const nx = FS.x + (ux * radial - uy * tang) * slow * dt, ny = FS.y + (uy * radial + ux * tang) * slow * dt;
        if (fieldX(nx) !== nx || fieldY(ny) !== ny) { FS.strafe = -FS.strafe; FS.strafeFlipAt = time + 1500; }
        FS.walk += Math.hypot(fieldX(nx) - FS.x, fieldY(ny) - FS.y);
        place(tk, nx, ny);

        // He slips a shot now and then: a short step aside in a puff of ash.
        if (time - FS.slipAt > 2800) {
          const shot = tk.shotsNear(FS.x, FS.y, 64).find((h) => h.owner === 'player');
          if (shot) {
            FS.slipAt = time;
            FS.trail.push({ x: FS.x, y: FS.y, at: time, face: FS.face });
            const ax = shot.x - FS.x, ay = shot.y - FS.y, l = Math.hypot(ax, ay) || 1;
            const s = Math.random() < 0.5 ? -1 : 1;
            place(tk, FS.x - (ay / l) * 72 * s, FS.y + (ax / l) * 72 * s);
            tk.sfx('blink');
          }
        }
      } else tk.host.setBossPos(FS.x, FS.y);
    },
    takenMult() {
      if (!live(tk) || !FS.live) return 1;
      if (FS.air > 0.3) return 0.3;
      return tk.now < FS.openUntil ? 1.45 : 1;
    },
    drawGround(g, time) {
      if (!FS.live || !live(tk)) return;
      drawTrail(g, time);
      if (time < FS.openUntil) {
        // Open: a ring of embers round him — hit him now.
        const t = time / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(t * 9);
        g.fillStyle(EMBER_HOT, 0.05 + pulse * 0.04); g.fillCircle(FS.x, FS.y, 70);
        g.lineStyle(3, EMBER_HOT, 0.45 + pulse * 0.3);
        for (let i = 0; i < 12; i++) {
          const a0 = (i / 12) * Math.PI * 2 + t * 0.8;
          g.beginPath(); g.arc(FS.x, FS.y, 70, a0, a0 + 0.3, false); g.strokePath();
        }
        g.fillStyle(EMBER, 0.7);
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 - t; g.fillCircle(FS.x + Math.cos(a) * 70, FS.y + Math.sin(a) * 70, 2.2); }
      }
    },
    onPhaseEnd() { resetFallen(); },
  };
};

// ── The entry ────────────────────────────────────────────────────────

/** The light goes to a point; the hall is gone; he is standing there, small. ~7.6 s. */
const ENTRY: BossEntry = {
  ms: FALLEN_ENTRY_MS,
  hideBody: true,
  swapAt: T_SWAP / FALLEN_ENTRY_MS,
  bodyTo: { x: 480, y: 340 },
  drawGround: fallenEntryGround,
  drawOver: fallenEntryOver,
  cues: [
    { at: 0, sfx: 'time-warp' },
    { at: 900, sfx: 'hush' },
    { at: 1650, sfx: 'heartbeat' },
    { at: T_SWAP - 20, flash: 0xfff4d8, ms: 220, sfx: 'crystal-chime' },
    { at: 2700, sfx: 'heartbeat' },
    { at: 3500, sfx: 'whoosh' },
    { at: 4450, sfx: 'sizzle', flash: 0xffa040, ms: 120 },
    { at: 4800, say: 'There. That is all of me, when nobody is kneeling.' },
    { at: 6100, sfx: 'curse-cast' },
    { at: 6200, say: 'I appeal. Ten laws, and only me left to argue them.' },
  ],
};

// ── The part ─────────────────────────────────────────────────────────

export const KING_FALLEN: KingPart = {
  phase: {
    name: 'The Fallen King',
    line: 'You won on the facts. I appeal on the law. Hear the case again — all of it, from me.',
    hp: 1100,
    cycle: [
      'sig:p4-brand', 'sig:p4-cross', 'sig:p4-undertow', 'sig:p4-pruning', 'sig:p4-gavel',
      'sig:p4-breath', 'sig:p4-tithe', 'sig:p4-cross', 'sig:p4-draw', 'sig:p4-mark', 'sig:p4-gavel',
      'sig:p4-lot', 'sig:p4-part', 'sig:p4-cross', 'sig:p4-noon', 'sig:p4-gavel',
    ],
    harass: ['h-snipe', 'h-lane'],
    restMs: 1700,
    restEnragedMs: 1100,
    harassMs: 4400,
    bodyR: 26,
    style: { movement: 'stalk', gimmick: 'none', tint: 'hot', hideRig: true, look: { torsoR: 26 } },
    entry: ENTRY,
  },
  signatures: {
    'p4-court': court,
    'p4-brand': theBrand,
    'p4-undertow': theUndertow,
    'p4-pruning': thePruning,
    'p4-breath': theBreathTax,
    'p4-tithe': theStoneTithe,
    'p4-draw': theDraw,
    'p4-mark': theMark,
    'p4-lot': theLot,
    'p4-part': thePart,
    'p4-noon': theEndlessNoon,
    'p4-gavel': theGavel,
    'p4-cross': crossExamination,
  },
  drawDecor(g, s) {
    FS.seenAt = s.t;
    FS.hpRatio = s.hpRatio;
    const x = FS.live ? FS.x : s.x, y = FS.live ? FS.y : s.y;
    drawFallen(g, x, y, {
      t: s.t / 1000, face: FS.live ? FS.face : s.facing, pose: FS.pose, hurt: s.hurt,
      cite: FS.cite, citeK: FS.cite >= 0 ? clampN(1 - (s.t - FS.citeAt) / 1600, 0, 1) : 0,
      walk: FS.walk, air: FS.air, hp: s.hpRatio,
    });
  },
  drawArena(g, W, H) { paintFallpoint(g, W, H); },
  drawBackdrop(g, s) { drawDream(g, s.t / 1000, s.hpRatio, s.t); },
};

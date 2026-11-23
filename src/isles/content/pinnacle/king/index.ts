import type { BossEntry, WorldBossDef } from '../../../../boss/framework/BossDefs';
import { OBS } from '../../../art/PinnacleArt';
import { KING_ID } from '../spec';
import type { KingPart } from './contract';
import { KING_THRONE } from './throne';
import { KING_DUEL } from './duel';
import { KING_STAR, KING_OUTRO } from './star';
import { KING_FALLEN } from './fallen';

/**
 * The Obsidian King — the campaign's last fight, one body in three acts.
 *
 *  I.   THE THRONE — he does not rise. He sits at the head of the hall behind the Aegis and sends
 *       the Host down it in waves: warriors, assassins, beasts. Break a wave and the Aegis cracks.
 *  II.  THE CRACKED MASK — he walks down the steps with a sword and a shield of black glass.
 *  III. THE STAR UNSHELLED — the hall bursts, the shell falls away, and the thing that fell into
 *       the sea burns in the middle of its own rings.
 *
 *  IV.  THE FALLEN KING — inside the Fall only (hard mode's extra phase): what is left when the star is
 *       spent. Man-sized, no throne, no glass. See `docs/ten-isles/fall.md`.
 *
 * Each act is its own file (a `KingPart`); this one only folds them together.
 */
const ACTS = [KING_THRONE, KING_DUEL, KING_STAR].filter((p): p is KingPart => !!p);
const READY = ACTS.length === 3;
const FALLEN: KingPart | null = READY ? (KING_FALLEN as KingPart | null) : null;
// Phase index 3 is the hard extra phase, so the fourth part lines up with it.
const PARTS = FALLEN ? [...ACTS, FALLEN] : ACTS;
// The star is a wall: nobody walks into it (its act paints the burn; the engine holds the line).
if (READY) PARTS[2].phase.style = { ...PARTS[2].phase.style, solid: true };
const part = (i: number): KingPart | undefined => PARTS[Math.min(i, PARTS.length - 1)];

export const OBSIDIAN_KING: WorldBossDef = {
  worldId: `isle:${KING_ID}`,
  name: 'The Obsidian King',
  title: 'the Throne Above the Sea',
  color: OBS.seam,
  colorLit: OBS.seamLit,
  colorDark: OBS.glass,
  accent: OBS.star,
  damageMult: 1.75,
  intro: [
    'Ten crowns. I made every one of them, and you have brought me the pieces.',
    'Sixty voices advised me. You have made the hall very quiet. I find I do not mind.',
    'Come up, then. Not to the throne — nobody comes to the throne. Come as far as you can.',
  ],
  banter: [
    'I was old when your sea was steam.',
    'The Brand, the Tithe, the Noon — small ideas. I only asked them to keep order.',
    'You fight like the last one. There was a last one. There is always a last one.',
    'Do you know what is under the glass? No. Nobody ever asked.',
    'Kneel, and I will let the isles keep their little dawn.',
  ],
  defeatLine: 'THE STAR GOES OUT',
  resumeLine: 'Another. Send them all — the glass is patient.',
  // Until all three acts have landed the def stands empty, and the validator lists it as a placeholder.
  phases: READY ? ACTS.map((p) => p.phase) : [],
  hard: { hpMult: 1.3, damageMult: 1.2, restMult: 0.75, introLine: 'THE GLASS REMEMBERS YOU', extraPhase: FALLEN?.phase },
  signatures: Object.assign({}, ...PARTS.map((p) => p.signatures)),
  look: { crest: 'crown', pattern: 'facets', aura: 'none', hands: 'gauntlet', torsoR: 40, eyes: 2, eyeColor: OBS.seamLit, mouth: 'none' },
  drawDecor: (g, s) => part(s.phaseIdx)?.drawDecor?.(g, s),
  drawLit: (g, s) => part(s.phaseIdx)?.drawLit?.(g, s),
  drawArena: (g, W, H, idx) => part(idx)?.drawArena?.(g, W, H),
  drawBackdrop: (g, s, W, H) => part(s.phaseIdx)?.drawBackdrop?.(g, s, W, H),
  outro: (KING_OUTRO ?? undefined) as BossEntry | undefined,
};

import type { MeteorBundle } from '../../IslesTypes';
import { FALLPOINT_AREA } from './area';
import { CINE_FALL_DEF } from './cine/fall';
import { CINE_FALL_END_DEF } from './cine/end';
import { CINE_METEOR_DEF } from './cine/meteor';
import { METEOR_ITEMS, METEOR_SCRIPTS } from './items';
import { METEOR } from './meteor';
import { FERRYMAN_TALKS } from './people';

/**
 * Fallpoint and the fallen star: the ring of sea-glass, its onlookers, the meteor's words, the
 * Ferryman's lines out here, the Fallen King's artifact and the Fall's three cinematics.
 * Design: `docs/ten-isles/fall.md`.
 */
export const METEOR_BUNDLE: MeteorBundle = {
  area: FALLPOINT_AREA,
  meteor: METEOR,
  ferryman: FERRYMAN_TALKS,
  items: METEOR_ITEMS,
  scripts: METEOR_SCRIPTS,
  cutscenes: [CINE_METEOR_DEF, CINE_FALL_DEF, CINE_FALL_END_DEF],
};

import type { IsleBundle } from '../../IslesTypes';
import { SOUND_CORE } from './isle';
import { SOUND_GENES } from './genes';
import { BRASS_COURT } from './courts/brass';
import { CAVERN_COURT } from './courts/cavern';
import { LIBRETTO_COURT } from './courts/libretto';
import { MASQUE_COURT } from './courts/masque';
import { HUSH_COURT } from './courts/hush';
import { CATHEDRAL_COURT } from './courts/cathedral';

/**
 * Choirholm — the Sound Isle, fourth beyond the Breakwater. See docs/ten-isles/sound.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Great Organ dungeon live under `isle/`.
 */
export const SOUND_ISLE: IsleBundle = {
  ...SOUND_CORE,
  courts: [BRASS_COURT, CAVERN_COURT, LIBRETTO_COURT, MASQUE_COURT, HUSH_COURT, CATHEDRAL_COURT],
  genes: SOUND_GENES,
};

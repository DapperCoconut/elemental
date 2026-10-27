import type { IsleBundle } from '../../IslesTypes';
import { AIR_CORE } from './isle';
import { AIR_GENES } from './genes';
import { GALEWARD_COURT } from './courts/galeward';
import { SLUMBER_COURT } from './courts/slumber';
import { FABLE_COURT } from './courts/fable';
import { ORBIT_COURT } from './courts/orbit';
import { STORMEYE_COURT } from './courts/stormeye';
import { STARFALL_COURT } from './courts/starfall';

/**
 * Highspire — the Air Isle. See docs/ten-isles.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Lung dungeon live under `isle/`.
 */
export const AIR_ISLE: IsleBundle = {
  ...AIR_CORE,
  courts: [GALEWARD_COURT, SLUMBER_COURT, FABLE_COURT, ORBIT_COURT, STORMEYE_COURT, STARFALL_COURT],
  genes: AIR_GENES,
};

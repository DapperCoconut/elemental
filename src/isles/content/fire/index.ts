import type { IsleBundle } from '../../IslesTypes';
import { FIRE_CORE } from './isle';
import { FIRE_GENES } from './genes';
import { HEARTH_COURT } from './courts/hearth';
import { CALDERA_COURT } from './courts/caldera';
import { BOILERWORKS_COURT } from './courts/boilerworks';
import { POWDER_COURT } from './courts/powder';
import { CORONA_COURT } from './courts/corona';
import { CANDLEWICK_COURT } from './courts/candlewick';

/**
 * Brandmark — the Fire Isle. See docs/ten-isles.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port, the
 * Kiln dungeon, King Ashgrave, the wanderer, the sea fish and rods live under `isle/`.
 */
export const FIRE_ISLE: IsleBundle = {
  ...FIRE_CORE,
  courts: [HEARTH_COURT, POWDER_COURT, BOILERWORKS_COURT, CANDLEWICK_COURT, CORONA_COURT, CALDERA_COURT],
  genes: FIRE_GENES,
};

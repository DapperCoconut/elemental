import type { IsleBundle } from '../../IslesTypes';
import { WATER_CORE } from './isle';
import { WATER_GENES } from './genes';
import { TIDEWATER_COURT } from './courts/tidewater';
import { SAILMAKER_COURT } from './courts/sailmaker';
import { SLICKHARBOR_COURT } from './courts/slickharbor';
import { INKWELL_COURT } from './courts/inkwell';
import { RIMEFAST_COURT } from './courts/rimefast';
import { ABYSSAL_COURT } from './courts/abyssal';

/**
 * The Drowned Reach — the Water Isle. See docs/ten-isles.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Undertow dungeon live under `isle/`.
 */
export const WATER_ISLE: IsleBundle = {
  ...WATER_CORE,
  courts: [TIDEWATER_COURT, SAILMAKER_COURT, SLICKHARBOR_COURT, INKWELL_COURT, RIMEFAST_COURT, ABYSSAL_COURT],
  genes: WATER_GENES,
};

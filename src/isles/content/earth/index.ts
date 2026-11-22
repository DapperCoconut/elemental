import type { IsleBundle } from '../../IslesTypes';
import { EARTH_CORE } from './isle';
import { EARTH_GENES } from './genes';
import { STONEHOLD_COURT } from './courts/stonehold';
import { POTTER_COURT } from './courts/potter';
import { DUNESEA_COURT } from './courts/dunesea';
import { GEODE_COURT } from './courts/geode';
import { FORGE_COURT } from './courts/forge';
import { RUBBLE_COURT } from './courts/rubble';

/**
 * Bedrock Hold — the Earth Isle. See docs/ten-isles/earth.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Sepulchre dungeon live under `isle/`.
 */
export const EARTH_ISLE: IsleBundle = {
  ...EARTH_CORE,
  courts: [STONEHOLD_COURT, POTTER_COURT, DUNESEA_COURT, GEODE_COURT, FORGE_COURT, RUBBLE_COURT],
  genes: EARTH_GENES,
};

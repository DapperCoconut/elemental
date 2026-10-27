import type { IsleBundle } from '../../IslesTypes';
import { LIFE_CORE } from './isle';
import { LIFE_GENES } from './genes';
import { BLOOM_COURT } from './courts/bloom';
import { SPORE_COURT } from './courts/spore';
import { HEARTWOOD_COURT } from './courts/heartwood';
import { WILDHUNT_COURT } from './courts/wildhunt';
import { OSSUARY_COURT } from './courts/ossuary';
import { CONFECTION_COURT } from './courts/confection';

/**
 * Thornwild — the Life Isle. See docs/ten-isles.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Glasshouse dungeon live under `isle/`.
 */
export const LIFE_ISLE: IsleBundle = {
  ...LIFE_CORE,
  courts: [BLOOM_COURT, CONFECTION_COURT, WILDHUNT_COURT, SPORE_COURT, OSSUARY_COURT, HEARTWOOD_COURT],
  genes: LIFE_GENES,
};

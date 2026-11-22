import type { IsleBundle } from '../../IslesTypes';
import { ELECTRICITY_CORE } from './isle';
import { ELECTRICITY_GENES } from './genes';
import { DYNAMO_COURT } from './courts/dynamo';
import { CIRCUIT_COURT } from './courts/circuit';
import { BOUNCE_COURT } from './courts/bounce';
import { LODESTAR_COURT } from './courts/lodestar';
import { HALFLIFE_COURT } from './courts/halflife';
import { SUPERPOSITION_COURT } from './courts/superposition';

/**
 * Voltreach — the Electricity Isle, first beyond the Breakwater. See docs/ten-isles/electricity.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Crown Coil dungeon live under `isle/`.
 */
export const ELECTRICITY_ISLE: IsleBundle = {
  ...ELECTRICITY_CORE,
  courts: [DYNAMO_COURT, CIRCUIT_COURT, BOUNCE_COURT, LODESTAR_COURT, HALFLIFE_COURT, SUPERPOSITION_COURT],
  genes: ELECTRICITY_GENES,
};

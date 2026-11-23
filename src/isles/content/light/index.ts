import type { IsleBundle } from '../../IslesTypes';
import { LIGHT_CORE } from './isle';
import { LIGHT_GENES } from './genes';
import { NOON_COURT } from './courts/noon';
import { TRIBUNAL_COURT } from './courts/tribunal';
import { LANTERN_COURT } from './courts/lantern';
import { ARCANE_COURT } from './courts/arcane';
import { WORKSHOP_COURT } from './courts/workshop';
import { MURAL_COURT } from './courts/mural';

/**
 * Solmara — the Light Isle, fifth and last beyond the Breakwater. See docs/ten-isles/light.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Heliostat dungeon live under `isle/`.
 */
export const LIGHT_ISLE: IsleBundle = {
  ...LIGHT_CORE,
  courts: [NOON_COURT, TRIBUNAL_COURT, LANTERN_COURT, ARCANE_COURT, WORKSHOP_COURT, MURAL_COURT],
  genes: LIGHT_GENES,
};

import type { IsleBundle } from '../../IslesTypes';
import { FATE_CORE } from './isle';
import { FATE_GENES } from './genes';
import { CARD_COURT } from './courts/card';
import { CLOCKWORK_COURT } from './courts/clockwork';
import { TREASURY_COURT } from './courts/treasury';
import { REMEMBRANCE_COURT } from './courts/remembrance';
import { MIND_COURT } from './courts/mind';
import { WAR_COURT } from './courts/war';

/**
 * Lotterhaven — the Fate Isle, third beyond the Breakwater. See docs/ten-isles/fate.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the House dungeon live under `isle/`.
 */
export const FATE_ISLE: IsleBundle = {
  ...FATE_CORE,
  courts: [CARD_COURT, CLOCKWORK_COURT, TREASURY_COURT, REMEMBRANCE_COURT, MIND_COURT, WAR_COURT],
  genes: FATE_GENES,
};

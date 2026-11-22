import type { IsleBundle } from '../../IslesTypes';
import { SLIME_CORE } from './isle';
import { SLIME_GENES } from './genes';
import { FANG_COURT } from './courts/fang';
import { WEB_COURT } from './courts/web';
import { SHACKLE_COURT } from './courts/shackle';
import { CLOAK_COURT } from './courts/cloak';
import { UMBRAL_COURT } from './courts/umbral';
import { GRAVE_COURT } from './courts/grave';

/**
 * Fangmire — the Venom Isle, second beyond the Breakwater. See docs/ten-isles/slime.md.
 *
 * Each court lives in its own folder under `courts/` and exports a `CourtBundle`; the port and
 * the Slough dungeon live under `isle/`.
 */
export const SLIME_ISLE: IsleBundle = {
  ...SLIME_CORE,
  courts: [FANG_COURT, WEB_COURT, SHACKLE_COURT, CLOAK_COURT, UMBRAL_COURT, GRAVE_COURT],
  genes: SLIME_GENES,
};

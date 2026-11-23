import type { CutsceneDef } from '../../../IslesTypes';
import { CINE_SHROUD } from './shroud';
import { CINE_LANDFALL } from './landfall';
import { CINE_ENDING } from './ending';

/** The Pinnacle's three big cinematics: the Shroud breaking, the landfall, and the end of the campaign. */
export const PIN_CUTSCENES: CutsceneDef[] = [CINE_SHROUD, CINE_LANDFALL, CINE_ENDING];

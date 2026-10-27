import type { GimmickDef } from '../../../../../IslesTypes';
import { CAPTIVE_SUN } from './captiveSun';
import { ARC_PYLONS } from './arcPylons';
import { CONTAINMENT_BREACH } from './containment';
import { FLARE_WEATHER } from './flareWeather';
import { MAGNETIC_BOTTLE } from './magneticBottle';

/** The Corona Court's five fight rules, in encounter order. */
export const CORONA_GIMMICKS: GimmickDef[] = [CAPTIVE_SUN, ARC_PYLONS, CONTAINMENT_BREACH, FLARE_WEATHER, MAGNETIC_BOTTLE];

export { CAPTIVE_SUN, ARC_PYLONS, CONTAINMENT_BREACH, FLARE_WEATHER, MAGNETIC_BOTTLE };

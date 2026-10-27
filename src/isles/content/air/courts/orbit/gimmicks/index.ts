import type { GimmickDef } from '../../../../../IslesTypes';
import { ORRERY_GIMMICK } from './orrery';
import { TIDAL_LOCK } from './tidalLock';
import { ZERO_G } from './zeroG';
import { SLINGSHOT } from './slingshot';
import { EVENT_HORIZON } from './eventHorizon';

/** The Orbit Court's five fight rules, in encounter order. */
export const ORBIT_GIMMICKS: GimmickDef[] = [ORRERY_GIMMICK, TIDAL_LOCK, ZERO_G, SLINGSHOT, EVENT_HORIZON];

export { ORRERY_GIMMICK, TIDAL_LOCK, ZERO_G, SLINGSHOT, EVENT_HORIZON };

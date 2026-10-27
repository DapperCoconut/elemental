import type { GimmickDef } from '../../../../../IslesTypes';
import { FAIRY_RING } from './fairyRing';
import { PUFFBALL } from './puffball';
import { MYCELIUM } from './mycelium';
import { WISPS } from './wisps';
import { DECOMPOSITION } from './decomposition';

/** The Spore Court's five fight rules, in encounter order. */
export const SPORE_GIMMICKS: GimmickDef[] = [FAIRY_RING, PUFFBALL, MYCELIUM, WISPS, DECOMPOSITION];

export { FAIRY_RING, PUFFBALL, MYCELIUM, WISPS, DECOMPOSITION };

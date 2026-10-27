import type { GimmickDef } from '../../../../../IslesTypes';
import { REDACTION } from './redaction';
import { SQUID_PENS } from './squidPens';
import { WET_INK } from './wetInk';
import { DECREE } from './decree';
import { INKBLOT_TEST } from './inkblot';

/** The Inkwell Court's five fight rules, in encounter order. */
export const INKWELL_GIMMICKS: GimmickDef[] = [REDACTION, SQUID_PENS, WET_INK, DECREE, INKBLOT_TEST];

export { REDACTION, SQUID_PENS, WET_INK, DECREE, INKBLOT_TEST };

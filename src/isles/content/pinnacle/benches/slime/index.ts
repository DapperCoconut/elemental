import type { PinnacleTierBundle } from '../../../../IslesTypes';
import { PIN_SLIME_AREA } from './area';
import { PIN_SLIME_CINE } from './cine';
import { PIN_SLIME_COUNCIL, PIN_SLIME_DECREES } from './councilors';
import { PIN_SLIME_FLOOR } from './floor';
import { PIN_SLIME_ITEMS, PIN_SLIME_SCRIPTS } from './relic';

/**
 * The seventh bench of the Obsidian Pinnacle — the Venom Bench, where the Mark was written: a fen
 * in a glass bowl under the Register of the Marked and the alembic of the Draught. Six councilors
 * (Venom, Death, Shadow, Bind, Subterfuge, String), six decrees, the Unrationed Draught relic and the
 * bench's intro cinematic.
 */
export const PIN_SLIME: PinnacleTierBundle = {
  area: PIN_SLIME_AREA,
  encounters: PIN_SLIME_COUNCIL,
  gimmicks: PIN_SLIME_DECREES,
  floor: PIN_SLIME_FLOOR,
  items: PIN_SLIME_ITEMS,
  scripts: PIN_SLIME_SCRIPTS,
  cutscenes: [PIN_SLIME_CINE],
};

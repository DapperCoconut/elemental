import type { PinnacleSummitBundle } from '../../../IslesTypes';
import { SUMMIT_AREA } from './area';
import { CINE_THRONE } from './cine';
import { SUMMIT_FLOOR } from './floor';
import { SUMMIT_ITEMS, SUMMIT_SCRIPTS } from './items';

/**
 * The Crownless Hall — the top of the Obsidian Pinnacle: the nave of sixty empty niches, the ten
 * crown-moulds, the throne, the King's artifact (the Unshelled Star) and `cine-throne`, the walk up
 * to him. The King himself is `king/`.
 */
export const PIN_SUMMIT_BUNDLE: PinnacleSummitBundle = {
  area: SUMMIT_AREA,
  floor: SUMMIT_FLOOR,
  items: SUMMIT_ITEMS,
  scripts: SUMMIT_SCRIPTS,
  cutscenes: [CINE_THRONE],
};

import type { CourtBundle } from '../../../../IslesTypes';
import { RIMEFAST_AREA } from './area';
import { HOARFROST_BOSS } from './boss';
import { RIMEFAST_ENCOUNTERS } from './encounters';
import { RIMEFAST_FLOOR } from './floor';
import { RIMEFAST_FISH, RIMEFAST_FISHERIES, RIMEFAST_ITEMS, RIMEFAST_SCRIPTS, RIMEFAST_SHOPS } from './items';
import { RIMEFAST_QUESTS } from './quests';
import { THIN_ICE } from './gimmicks/thinIce';
import { ICEBREAKER } from './gimmicks/icebreaker';
import { FROSTBITE } from './gimmicks/frostbite';
import { ICICLE_GALLERY } from './gimmicks/icicleGallery';
import { SNOW_FORTS } from './gimmicks/snowForts';
import { FALLEN } from './fallen';

/**
 * THE RIMEFAST COURT — the Drowned Reach's ice court, a harbour Queen Maresa had frozen solid so
 * no ship could leave, governed by Prince Hoarfrost and his Thaw Tithe. Tier 3.
 */
export const RIMEFAST_COURT: CourtBundle = {
  court: {
    id: 'rimefast',
    isle: 'water',
    element: 'ice',
    name: 'The Rimefast Court',
    prince: { id: 'hoarfrost', name: 'Prince Hoarfrost', title: 'Master of the Rimefast Court', artifact: 'art-hoarfrost' },
    tier: 3,
    area: 'rimefast',
    floor: RIMEFAST_FLOOR,
    encounters: RIMEFAST_ENCOUNTERS,
    quests: RIMEFAST_QUESTS,
    color: 0x9fd8f0,
  },
  area: RIMEFAST_AREA,
  gimmicks: [THIN_ICE, ICEBREAKER, FROSTBITE, ICICLE_GALLERY, SNOW_FORTS],
  boss: HOARFROST_BOSS,
  items: RIMEFAST_ITEMS,
  scripts: RIMEFAST_SCRIPTS,
  shops: RIMEFAST_SHOPS,
  fish: RIMEFAST_FISH,
  fisheries: RIMEFAST_FISHERIES,
  fallen: FALLEN,
};

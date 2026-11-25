import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { WILDHUNT_AREA } from './area';
import { FANG_BOSS } from './boss';
import { WILDHUNT_ENCOUNTERS } from './encounters';
import { WILDHUNT_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { HUNTING_BLINDS } from './gimmicks/blinds';
import { FALCONRY } from './gimmicks/falconry';
import { HORN_CALL } from './gimmicks/hornCall';
import { QUARRY } from './gimmicks/quarry';
import { STAG_RUT } from './gimmicks/stagRut';
import {
  ART_FANG, CHARM_COLLAR, CHARM_GAUNTLET, CHARM_HORN, CHARM_REEDS, WILDHUNT_ITEMS, WILDHUNT_SCRIPTS,
} from './items';
import { WILDHUNT_QUESTS } from './quests';

/**
 * The Wildhunt Court (hunt, tier 2) — Prince Fang's lodge town in Thornwild's deep forest, where
 * the Bloom Tithe is paid in game and the households that come up short are run as quarry before
 * they are pruned. See docs/ten-isles.md. Everything the court contributes is gathered here.
 */

const COURT: CourtDef = {
  id: 'wildhunt',
  isle: 'life',
  element: 'hunt',
  name: 'The Wildhunt Court',
  prince: { id: 'fang', name: 'Prince Fang', title: 'Master of the Wildhunt', artifact: ART_FANG },
  tier: 2,
  area: 'wildhunt',
  floor: WILDHUNT_FLOOR,
  encounters: WILDHUNT_ENCOUNTERS,
  quests: WILDHUNT_QUESTS,
  color: 0x8a2a1e,
};

export const WILDHUNT_COURT: CourtBundle = {
  court: COURT,
  area: WILDHUNT_AREA,
  gimmicks: [QUARRY, STAG_RUT, HUNTING_BLINDS, HORN_CALL, FALCONRY],
  boss: FANG_BOSS,
  fallen: FALLEN,
  items: WILDHUNT_ITEMS,
  scripts: WILDHUNT_SCRIPTS,
  shops: [{
    id: 'wildhunt-shop',
    name: 'The Antler & Awl',
    stock: [CHARM_COLLAR, CHARM_REEDS, CHARM_HORN, CHARM_GAUNTLET],
    buys: true,
  }],
  fisheries: [{ id: 'wildhunt-ford', name: 'The Ford Pool', kind: 'pond' }],
  fish: [
    { id: 'fish-ford-salmon', fisheries: ['wildhunt-ford'], weight: 70, fight: 3, size: [45, 92] },
    { id: 'fish-antler-pike', fisheries: ['wildhunt-ford'], weight: 30, fight: 5, size: [60, 130] },
  ],
};

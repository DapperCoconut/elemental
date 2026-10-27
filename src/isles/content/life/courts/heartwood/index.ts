import type { CourtBundle, GimmickDef } from '../../../../IslesTypes';
import { HEARTWOOD_AREA } from './area';
import { BIRCHBARK_BOSS } from './birchbark';
import { HEARTWOOD_ENCOUNTERS } from './encounters';
import { heartwoodFloor } from './floor';
import { HEARTWOOD_FISH, HEARTWOOD_FISHERIES, HEARTWOOD_ITEMS, HEARTWOOD_SCRIPTS, HEARTWOOD_SHOPS } from './items';
import { HEARTWOOD_QUESTS } from './quests';
import { sapTapGimmick } from './gimmicks/sapTap';
import { growthRingsGimmick } from './gimmicks/growthRings';
import { woodpeckerGimmick } from './gimmicks/woodpecker';
import { leafFallGimmick } from './gimmicks/leafFall';
import { termitesGimmick } from './gimmicks/termites';

/**
 * The Heartwood Court — Thornwild's tier-4 court, a city on a birch the size of a mountain.
 * Prince Birchbark, the Still Prince, has the bark grow shut over the doors of the pruned; the
 * Empress's Glasshouse stands on the crown fork, and its door opens on this area's north edge.
 * See docs/ten-isles.md.
 */

const GIMMICKS: GimmickDef[] = [sapTapGimmick, growthRingsGimmick, woodpeckerGimmick, leafFallGimmick, termitesGimmick];

export const HEARTWOOD_COURT: CourtBundle = {
  court: {
    id: 'heartwood',
    isle: 'life',
    element: 'gluttony',
    name: 'The Heartwood Court',
    prince: { id: 'birchbark', name: 'Prince Birchbark', title: 'the Still Prince', artifact: 'art-birchbark' },
    tier: 4,
    area: 'heartwood',
    floor: heartwoodFloor,
    encounters: HEARTWOOD_ENCOUNTERS,
    quests: HEARTWOOD_QUESTS,
    color: 0xe9bc33,
  },
  area: HEARTWOOD_AREA,
  gimmicks: GIMMICKS,
  boss: BIRCHBARK_BOSS,
  items: HEARTWOOD_ITEMS,
  scripts: HEARTWOOD_SCRIPTS,
  shops: HEARTWOOD_SHOPS,
  fish: HEARTWOOD_FISH,
  fisheries: HEARTWOOD_FISHERIES,
};

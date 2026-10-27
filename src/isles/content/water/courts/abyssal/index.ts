import type { CourtBundle, GimmickDef } from '../../../../IslesTypes';
import { ABYSSAL_AREA } from './area';
import { ABYSSAL_ENCOUNTERS } from './encounters';
import { abyssalFloor } from './floor';
import { ABYSSAL_FISH, ABYSSAL_FISHERIES, ABYSSAL_ITEMS, ABYSSAL_SCRIPTS, ABYSSAL_SHOPS } from './items';
import { LANTERNJAW_BOSS } from './lanternjaw';
import { ABYSSAL_QUESTS } from './quests';
import { lureGimmick } from './gimmicks/theLure';
import { crushDepthGimmick } from './gimmicks/crushDepth';
import { whaleFallGimmick } from './gimmicks/whaleFall';
import { bioluminescenceGimmick } from './gimmicks/bioluminescence';
import { leviathanShadowGimmick } from './gimmicks/leviathanShadow';

/**
 * The Abyssal Court — the Drowned Reach's tier-4 court, a city inside one vast air bubble at
 * the bottom of the trench. Prince Lanternjaw, the Lamp Below, sells its people their air and
 * hangs his lure over every house the Queen means to leave under; the maelstrom stair down to
 * the Undertow opens on this area's north rim. See docs/ten-isles.md.
 */

const GIMMICKS: GimmickDef[] = [lureGimmick, crushDepthGimmick, whaleFallGimmick, bioluminescenceGimmick, leviathanShadowGimmick];

export const ABYSSAL_COURT: CourtBundle = {
  court: {
    id: 'abyssal',
    isle: 'water',
    element: 'depths',
    name: 'The Abyssal Court',
    prince: { id: 'lanternjaw', name: 'Prince Lanternjaw', title: 'the Lamp Below', artifact: 'art-lanternjaw' },
    tier: 4,
    area: 'abyssal',
    floor: abyssalFloor,
    encounters: ABYSSAL_ENCOUNTERS,
    quests: ABYSSAL_QUESTS,
    color: 0x39c6d6,
  },
  area: ABYSSAL_AREA,
  gimmicks: GIMMICKS,
  boss: LANTERNJAW_BOSS,
  items: ABYSSAL_ITEMS,
  scripts: ABYSSAL_SCRIPTS,
  shops: ABYSSAL_SHOPS,
  fish: ABYSSAL_FISH,
  fisheries: ABYSSAL_FISHERIES,
};

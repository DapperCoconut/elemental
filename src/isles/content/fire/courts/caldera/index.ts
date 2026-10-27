import type { CourtBundle, GimmickDef } from '../../../../IslesTypes';
import { CALDERA_AREA } from './area';
import { BASALT_BOSS } from './basalt';
import { CALDERA_ENCOUNTERS } from './encounters';
import { calderaFloor } from './floor';
import { CALDERA_FISH, CALDERA_FISHERIES, CALDERA_ITEMS, CALDERA_SCRIPTS, CALDERA_SHOPS } from './items';
import { CALDERA_QUESTS } from './quests';
import { crustWalkGimmick } from './gimmicks/crustWalk';
import { eruptionClockGimmick } from './gimmicks/eruptionClock';
import { coolingRainGimmick } from './gimmicks/coolingRain';
import { magmaTideGimmick } from './gimmicks/magmaTide';
import { pumiceBrawlGimmick } from './gimmicks/pumiceBrawl';

/**
 * The Caldera Court — Brandmark's tier-4 court, inside the crater on the isle's peak. Prince
 * Basalt, the Molten Heir, governs the obsidian quarry that feeds his father's Kiln; the
 * Kiln's sealed door stands on this area's north rim. See docs/ten-isles.md.
 */

const GIMMICKS: GimmickDef[] = [crustWalkGimmick, eruptionClockGimmick, coolingRainGimmick, magmaTideGimmick, pumiceBrawlGimmick];

export const CALDERA_COURT: CourtBundle = {
  court: {
    id: 'caldera',
    isle: 'fire',
    element: 'magma',
    name: 'The Caldera Court',
    prince: { id: 'basalt', name: 'Prince Basalt', title: 'the Molten Heir', artifact: 'art-basalt' },
    tier: 4,
    area: 'caldera',
    floor: calderaFloor,
    encounters: CALDERA_ENCOUNTERS,
    quests: CALDERA_QUESTS,
    color: 0xff5a1a,
  },
  area: CALDERA_AREA,
  gimmicks: GIMMICKS,
  boss: BASALT_BOSS,
  items: CALDERA_ITEMS,
  scripts: CALDERA_SCRIPTS,
  shops: CALDERA_SHOPS,
  fish: CALDERA_FISH,
  fisheries: CALDERA_FISHERIES,
};

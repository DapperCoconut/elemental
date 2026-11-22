import type { CourtBundle } from '../../../../IslesTypes';
import { FORGE_AREA } from './area';
import { FORGE_ENCOUNTERS, FORGE_GIMMICKS } from './encounters';
import { FORGE_FLOOR } from './floor';
import { ART_ANVIL, FORGE_FISH, FORGE_FISHERIES, FORGE_ITEMS, FORGE_SCRIPTS, FORGE_SHOPS } from './items';
import { FORGE_COLOR } from './palette';
import { ANVIL_BOSS } from './prince';
import { FORGE_QUESTS } from './quests';

/**
 * The Forge Court — metal, tier 3 of Bedrock Hold, Prince Anvil the Unbending.
 *
 * A foundry town in the iron hills, east along Hammer Row from the Stonehold Court and up the
 * Ore Road from the Geode Court: blast furnaces against the ironstone face, the Tithe Hook where
 * every household's iron is hung by weight, the bell pit where the interred are cast in bronze,
 * and the Anvil Hall over the Runnel. See docs/ten-isles/earth.md for the court's place on the
 * isle, and each file here for its part.
 */
export const FORGE_COURT: CourtBundle = {
  court: {
    id: 'forge',
    isle: 'earth',
    element: 'metal',
    name: 'The Forge Court',
    prince: { id: 'anvil', name: 'Prince Anvil', title: 'the Unbending', artifact: ART_ANVIL },
    tier: 3,
    area: 'forge',
    floor: FORGE_FLOOR,
    encounters: FORGE_ENCOUNTERS,
    quests: FORGE_QUESTS,
    color: FORGE_COLOR,
  },
  area: FORGE_AREA,
  gimmicks: FORGE_GIMMICKS,
  boss: ANVIL_BOSS,
  items: FORGE_ITEMS,
  scripts: FORGE_SCRIPTS,
  shops: FORGE_SHOPS,
  fish: FORGE_FISH,
  fisheries: FORGE_FISHERIES,
};

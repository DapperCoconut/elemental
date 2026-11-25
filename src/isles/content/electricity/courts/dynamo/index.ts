import type { CourtBundle } from '../../../../IslesTypes';
import { DYNAMO_AREA } from './area';
import { DYNAMO_ENCOUNTERS, DYNAMO_GIMMICKS } from './encounters';
import { DYNAMO_FLOOR } from './floor';
import { FALLEN } from './fallen';
import {
  ART_VOLT, DYNAMO_BAKERIES, DYNAMO_FISH, DYNAMO_FISHERIES, DYNAMO_ITEMS, DYNAMO_SCRIPTS, DYNAMO_SHOPS,
} from './items';
import { DYNAMO_COLOR } from './palette';
import { VOLT_BOSS } from './prince';
import { DYNAMO_QUESTS } from './quests';

/**
 * The Dynamo Court — electricity, tier 1 of Voltreach, Prince Volt the Live Wire.
 *
 * The first court up the cable road from Terminus: a power-station town where the storm river
 * comes off the black rock in a white race, every household cranks its Draw by hand, and the
 * Brownout Bell decides whose lights go out. Home of the Ovenlight bakery and the Mill Race's
 * charged fishing. See docs/ten-isles/electricity.md for the court's place on the isle, and each
 * file here for its part.
 */
export const DYNAMO_COURT: CourtBundle = {
  court: {
    id: 'dynamo',
    isle: 'electricity',
    element: 'electricity',
    name: 'The Dynamo Court',
    prince: { id: 'volt', name: 'Prince Volt', title: 'the Live Wire', artifact: ART_VOLT },
    tier: 1,
    area: 'dynamo',
    floor: DYNAMO_FLOOR,
    encounters: DYNAMO_ENCOUNTERS,
    quests: DYNAMO_QUESTS,
    color: DYNAMO_COLOR,
  },
  area: DYNAMO_AREA,
  gimmicks: DYNAMO_GIMMICKS,
  boss: VOLT_BOSS,
  items: DYNAMO_ITEMS,
  scripts: DYNAMO_SCRIPTS,
  shops: DYNAMO_SHOPS,
  bakeries: DYNAMO_BAKERIES,
  fish: DYNAMO_FISH,
  fisheries: DYNAMO_FISHERIES,
  fallen: FALLEN,
};

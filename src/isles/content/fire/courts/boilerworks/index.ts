import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { BOILERWORKS_AREA } from './area';
import { GAUGE_BOSS } from './boss';
import { BOILERWORKS_ENCOUNTERS } from './encounters';
import { BOILERWORKS_FLOOR } from './floor';
import { CONVEYOR_FLOOR } from './gimmicks/conveyorFloor';
import { OVERPRESSURE } from './gimmicks/overpressure';
import { PISTON_PRESS } from './gimmicks/pistonPress';
import { STEAM_BATH } from './gimmicks/steamBath';
import { VALVE_RACE } from './gimmicks/valveRace';
import {
  ART_GAUGE, BOILERWORKS_ITEMS, BOILERWORKS_SCRIPTS, CHARM_CONVEYOR_COG, CHARM_PIPE_WRENCH, CHARM_SAFETY_VALVE,
  CHARM_SHIFT_BELL,
} from './items';
import { BOILERWORKS_QUESTS } from './quests';

/**
 * The Boilerworks Court (pressure, tier 2) — Prince Gauge's steam factory yard on Brandmark.
 * See docs/ten-isles.md. Everything the court contributes is gathered here.
 */

const COURT: CourtDef = {
  id: 'boilerworks',
  isle: 'fire',
  element: 'pressure',
  name: 'The Boilerworks Court',
  prince: { id: 'gauge', name: 'Prince Gauge', title: 'Prince of Pistons', artifact: ART_GAUGE },
  tier: 2,
  area: 'boilerworks',
  floor: BOILERWORKS_FLOOR,
  encounters: BOILERWORKS_ENCOUNTERS,
  quests: BOILERWORKS_QUESTS,
  color: 0xb5683a,
};

export const BOILERWORKS_COURT: CourtBundle = {
  court: COURT,
  area: BOILERWORKS_AREA,
  gimmicks: [VALVE_RACE, CONVEYOR_FLOOR, STEAM_BATH, PISTON_PRESS, OVERPRESSURE],
  boss: GAUGE_BOSS,
  items: BOILERWORKS_ITEMS,
  scripts: BOILERWORKS_SCRIPTS,
  shops: [{
    id: 'boilerworks-shop',
    name: 'The Company Store',
    stock: [CHARM_SAFETY_VALVE, CHARM_SHIFT_BELL, CHARM_CONVEYOR_COG, CHARM_PIPE_WRENCH],
    buys: true,
  }],
  fisheries: [{ id: 'boilerworks-pond', name: 'The Cooling Pond', kind: 'steam' }],
  fish: [
    { id: 'fish-boiled-bream', fisheries: ['boilerworks-pond'], weight: 60, fight: 2, size: [18, 34] },
    { id: 'fish-pipe-eel', fisheries: ['boilerworks-pond'], weight: 30, fight: 4, size: [40, 92] },
    { id: 'fish-gauge-goby', fisheries: ['boilerworks-pond'], weight: 10, fight: 3, size: [6, 14] },
  ],
};

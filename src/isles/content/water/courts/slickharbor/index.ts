import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { SLICKHARBOR_AREA } from './area';
import { CRUDE_BOSS } from './boss';
import { SLICKHARBOR_ENCOUNTERS } from './encounters';
import { SLICKHARBOR_FLOOR } from './floor';
import { CRANE_HOOK } from './gimmicks/craneHook';
import { GUSHER } from './gimmicks/gusher';
import { SLICK } from './gimmicks/slick';
import { SPARK_HAZARD } from './gimmicks/sparkHazard';
import { TAR_PIT } from './gimmicks/tarPit';
import {
  ART_CRUDE, CHARM_BILGE, CHARM_HOOK, CHARM_SOLES, CHARM_TAPER, SLICKHARBOR_ITEMS, SLICKHARBOR_SCRIPTS,
} from './items';
import { SLICKHARBOR_QUESTS } from './quests';

/**
 * The Slickharbor Court (oil, tier 2) — Prince Crude's refinery port in the Drowned Reach, where
 * the Dry Tithe is paid in barrels and the Queen's lamps burn on everyone's oil but their own.
 * See docs/ten-isles.md. Everything the court contributes is gathered here.
 */

const COURT: CourtDef = {
  id: 'slickharbor',
  isle: 'water',
  element: 'oil',
  name: 'The Slickharbor Court',
  prince: { id: 'crude', name: 'Prince Crude', title: 'The Lamp-Oil Prince', artifact: ART_CRUDE },
  tier: 2,
  area: 'slickharbor',
  floor: SLICKHARBOR_FLOOR,
  encounters: SLICKHARBOR_ENCOUNTERS,
  quests: SLICKHARBOR_QUESTS,
  color: 0xd8a840,
};

export const SLICKHARBOR_COURT: CourtBundle = {
  court: COURT,
  area: SLICKHARBOR_AREA,
  gimmicks: [SLICK, GUSHER, TAR_PIT, SPARK_HAZARD, CRANE_HOOK],
  boss: CRUDE_BOSS,
  items: SLICKHARBOR_ITEMS,
  scripts: SLICKHARBOR_SCRIPTS,
  shops: [{
    id: 'slickharbor-shop',
    name: 'The Slop Chest',
    stock: [CHARM_SOLES, CHARM_BILGE, CHARM_TAPER, CHARM_HOOK],
    buys: true,
  }],
  fisheries: [{ id: 'slickharbor-slick', name: 'The Slick', kind: 'oil' }],
  fish: [
    { id: 'fish-tar-catfish', fisheries: ['slickharbor-slick'], weight: 55, fight: 2, size: [30, 74] },
    { id: 'fish-slick-sculpin', fisheries: ['slickharbor-slick'], weight: 33, fight: 4, size: [12, 30] },
    { id: 'fish-rainbow-shiner', fisheries: ['slickharbor-slick'], weight: 12, fight: 3, size: [7, 16] },
  ],
};

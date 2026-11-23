import type { CourtBundle } from '../../../../IslesTypes';
import { POWDER_AREA } from './area';
import { FUSE_BOSS } from './boss';
import { POWDER_ENCOUNTERS } from './encounters';
import { POWDER_FLOOR } from './floor';
import { POWDER_FISH, POWDER_FISHERIES, POWDER_ITEMS, POWDER_SCRIPTS, POWDER_SHOPS } from './items';
import { POWDER_QUESTS } from './quests';
import { KEG_ALLEY } from './gimmicks/kegAlley';
import { CANNON_RIDGE } from './gimmicks/cannonRidge';
import { TWENTY_PACES } from './gimmicks/twentyPaces';
import { SMOKE_SCREEN } from './gimmicks/smokeScreen';
import { MINEFIELD_DRILL } from './gimmicks/minefieldDrill';
import { FALLEN } from './fallen';

/**
 * THE POWDER COURT — Brandmark's gunpowder court, a star-fort magazine town governed by Prince
 * Fuse, the Brand-King's artillery-mad son. Tier 2.
 */
export const POWDER_COURT: CourtBundle = {
  court: {
    id: 'powder',
    isle: 'fire',
    element: 'gunpowder',
    name: 'The Powder Court',
    prince: { id: 'fuse', name: 'Prince Fuse', title: 'Master of the Powder Court', artifact: 'art-fuse' },
    tier: 2,
    area: 'powder',
    floor: POWDER_FLOOR,
    encounters: POWDER_ENCOUNTERS,
    quests: POWDER_QUESTS,
    color: 0xffb02e,
  },
  area: POWDER_AREA,
  gimmicks: [KEG_ALLEY, CANNON_RIDGE, TWENTY_PACES, SMOKE_SCREEN, MINEFIELD_DRILL],
  boss: FUSE_BOSS,
  items: POWDER_ITEMS,
  scripts: POWDER_SCRIPTS,
  shops: POWDER_SHOPS,
  fish: POWDER_FISH,
  fisheries: POWDER_FISHERIES,
  fallen: FALLEN,
};

import type { CourtBundle, CourtDef } from '../../../../IslesTypes';
import { FABLE_AREA } from './area';
import { LEGEND_BOSS } from './boss';
import { FABLE_ENCOUNTERS } from './encounters';
import { FABLE_FLOOR } from './floor';
import { FALLEN } from './fallen';
import { BEANSTALK_GIMMICK } from './gimmicks/beanstalk';
import { DRAGONS_HOARD } from './gimmicks/dragonHoard';
import { GOLDEN_GOOSE } from './gimmicks/goldenGoose';
import { HUFF_AND_PUFF } from './gimmicks/huffPuff';
import { MIRROR_MIRROR } from './gimmicks/mirror';
import { ART_LEGEND, CHARM_COMPACT, CHARM_GARTER, CHARM_LOCKET, CHARM_SEED, FABLE_ITEMS, FABLE_SCRIPTS } from './items';
import { FABLE_QUESTS } from './quests';

/**
 * The Fable Court (myth, tier 2) — Prince Legend's storybook town on Highspire's south-western
 * shoulder, where a story told aloud is the longest breath there is, so every tale is licensed,
 * the town is cast to play the Prince's own, and the rest are burned on the square. See
 * docs/ten-isles.md. Everything the court contributes is gathered here.
 */

const COURT: CourtDef = {
  id: 'fable',
  isle: 'air',
  element: 'myth',
  name: 'The Fable Court',
  prince: { id: 'legend', name: 'Prince Legend', title: 'Hero of Every Tale', artifact: ART_LEGEND },
  tier: 2,
  area: 'fable',
  floor: FABLE_FLOOR,
  encounters: FABLE_ENCOUNTERS,
  quests: FABLE_QUESTS,
  color: 0x7d5cff,
};

export const FABLE_COURT: CourtBundle = {
  court: COURT,
  area: FABLE_AREA,
  gimmicks: [BEANSTALK_GIMMICK, GOLDEN_GOOSE, HUFF_AND_PUFF, MIRROR_MIRROR, DRAGONS_HOARD],
  boss: LEGEND_BOSS,
  fallen: FALLEN,
  items: FABLE_ITEMS,
  scripts: FABLE_SCRIPTS,
  shops: [{
    id: 'fable-shop',
    name: 'The Last Page',
    stock: [CHARM_GARTER, CHARM_SEED, CHARM_COMPACT, CHARM_LOCKET],
    buys: true,
  }],
  fisheries: [{ id: 'fable-moat', name: 'The Castle Moat', kind: 'pond' }],
  fish: [
    { id: 'fish-wishing-carp', fisheries: ['fable-moat'], weight: 65, fight: 2, size: [28, 70] },
    { id: 'fish-bard-bass', fisheries: ['fable-moat'], weight: 35, fight: 4, size: [38, 86] },
  ],
};

import type { CourtBundle } from '../../../../IslesTypes';
import { CLOAK_AREA } from './area';
import { CLOAK_ENCOUNTERS, CLOAK_GIMMICKS } from './encounters';
import { CLOAK_FLOOR } from './floor';
import { ART_WHISPER, CLOAK_FISH, CLOAK_FISHERIES, CLOAK_ITEMS, CLOAK_SCRIPTS, CLOAK_SHOPS } from './items';
import { CLOAK_COLOR } from './palette';
import { WHISPER_BOSS } from './prince';
import { CLOAK_QUESTS } from './quests';

/**
 * The Cloak Court — subterfuge, tier 3 of Fangmire, Prince Whisper, the Ear of the Mire.
 *
 * The informers' town east of the Fang: shuttered streets with eye-holes in every shutter, an
 * ear-trumpet on every corner piped under the cobbles to the Hall of Letters, where every
 * denunciation posted in the Asp's Mouth is nailed up for the town to read — and the named are
 * passed over at the Draught House until they go grey. See docs/ten-isles/slime.md for the
 * court's place on the isle, and each file here for its part.
 */
export const CLOAK_COURT: CourtBundle = {
  court: {
    id: 'cloak',
    isle: 'slime',
    element: 'subterfuge',
    name: 'The Cloak Court',
    prince: { id: 'whisper', name: 'Prince Whisper', title: 'the Ear of the Mire', artifact: ART_WHISPER },
    tier: 3,
    area: 'cloak',
    floor: CLOAK_FLOOR,
    encounters: CLOAK_ENCOUNTERS,
    quests: CLOAK_QUESTS,
    color: CLOAK_COLOR,
  },
  area: CLOAK_AREA,
  gimmicks: CLOAK_GIMMICKS,
  boss: WHISPER_BOSS,
  items: CLOAK_ITEMS,
  scripts: CLOAK_SCRIPTS,
  shops: CLOAK_SHOPS,
  fish: CLOAK_FISH,
  fisheries: CLOAK_FISHERIES,
};

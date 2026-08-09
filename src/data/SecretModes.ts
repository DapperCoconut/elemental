/**
 * Secret modes — the thing behind the difficulty plates.
 *
 * Every difficulty card on the 1v1 select screen is bolted down with four
 * screws. They are drawn from the very first visit as a hint and do nothing at
 * all until the player finds the screwdriver lying at the bottom of one of the
 * shop's pages. After that the screws come out one click at a time, and a plate
 * with all four removed lifts off to reveal the mode underneath.
 *
 * An unscrewed plate stays unscrewed: the mode is recorded on the save and from
 * then on it simply sits in a second row beneath the ordinary difficulties.
 *
 * The modes themselves live in ArenaScene (`secretMode` on the boot payload)
 * and, for World Shift, in `SecretMapKit`. This table is what the menu draws
 * and what the results screen pays out against.
 */

export type SecretModeId = 'dummy' | 'duo' | 'tagteam' | 'worldshift' | 'truenightmare';

export interface SecretModeDef {
  id: SecretModeId;
  /** Index into DIFFICULTY_PRESETS whose plate hides this mode (0 = Easy). */
  difficultyIndex: number;
  /** The difficulty the fight is actually run at. 1-5, matching the presets. */
  difficultyLevel: number;
  name: string;
  icon: string;
  /** One line on the button. */
  tagline: string;
  /** The full pitch, shown when the plate comes off and on hover. */
  blurb: string;
  /** Flat shards on a win, on top of nothing else — secret modes ignore the ordinary table. */
  shardReward: number;
  color: number;
}

export const SECRET_MODES: SecretModeDef[] = [
  {
    id: 'dummy',
    difficultyIndex: 0,
    // Nightmare, deliberately: the plate it came off is Easy, but a practice
    // target that skips seven casts in ten is useless for practising against.
    // Its health and its feet are both taken away anyway — all the rung buys is
    // "uses everything, aims properly".
    difficultyLevel: 5,
    name: 'DUMMY MODE',
    icon: '🎯',
    tagline: 'A practice range with a real element in it',
    blurb:
      'The enemy you picked, standing perfectly still and unable to die. Drive it with the ARROW KEYS, '
      + 'make it shoot with P, and press O to switch its abilities back on — it still will not move. '
      + 'A damage tally above its head resets every five seconds, so combos can be measured. '
      + 'Nothing here is recorded: no shards, no mastery, no achievements, no bond research.',
    shardReward: 0,
    color: 0x88a0b8,
  },
  {
    id: 'duo',
    difficultyIndex: 1,
    difficultyLevel: 2,
    name: 'DUO',
    icon: '⚔️',
    tagline: 'Two against one — put both of them down',
    blurb:
      'Pick a second enemy element and fight both at once. Both bots run on Normal, and the bout is '
      + 'only won when the pair of them are down.',
    shardReward: 50,
    color: 0x9ad14a,
  },
  {
    id: 'tagteam',
    difficultyIndex: 2,
    difficultyLevel: 3,
    name: 'TAG TEAM',
    icon: '🔁',
    tagline: 'Three of yours against three of theirs',
    blurb:
      'Choose three elements, then three to face. Every foe is on Hard. Fall and the next element on '
      + 'your bench takes the floor — with the wounds you already put in the current foe left exactly '
      + 'where they were. Run out of elements before they run out of fighters and the bout is lost.',
    shardReward: 75,
    color: 0xe8a63c,
  },
  {
    id: 'worldshift',
    difficultyIndex: 3,
    difficultyLevel: 4,
    name: 'WORLD SHIFT',
    icon: '🌍',
    tagline: 'Five arenas that fight back',
    blurb:
      'Pick the ground you fight on. Every hazard on every map is impartial — it will happily kill '
      + 'you or the thing you came to kill. All five are fought on Expert.',
    shardReward: 100,
    color: 0xff7a2e,
  },
  {
    id: 'truenightmare',
    difficultyIndex: 4,
    difficultyLevel: 5,
    name: 'TRUE NIGHTMARE',
    icon: '💀',
    tagline: 'It dodges. And sometimes it casts twice.',
    blurb:
      'Nightmare, with the safety off. The enemy dashes out of the way of anything you throw at it, '
      + 'and one cast in four goes off twice.',
    shardReward: 200,
    color: 0xff2b4d,
  },
];

export function getSecretMode(id: string | null | undefined): SecretModeDef | null {
  return SECRET_MODES.find((m) => m.id === id) ?? null;
}

/** The mode hidden under difficulty plate `index` (0-based), or null. */
export function secretModeForDifficulty(index: number): SecretModeDef | null {
  return SECRET_MODES.find((m) => m.difficultyIndex === index) ?? null;
}

/** Screws per plate. Four corners, four clicks. */
export const SCREWS_PER_PLATE = 4;

/**
 * Tag Team run state, carried across ArenaScene restarts.
 *
 * Deliberately not `TagTeamState` from FightFormats: that one is wired into the
 * campaign's element-reselect scene and the boss door, and both halves of *this*
 * chain (your bench and theirs) are chosen up front, so there is nothing to go
 * back to a picker for.
 */
export interface SecretTagState {
  /** The three elements you brought, in the order they take the floor. */
  playerTeam: string[];
  playerIndex: number;
  /** The three you came to beat, in order. */
  enemies: string[];
  enemyIndex: number;
  /** HP the current foe carries into the next bout after you fall. Damage sticks. */
  enemyHp: number | null;
}

/** A fresh three-on-three. */
export function freshSecretTag(playerTeam: string[], enemies: string[]): SecretTagState {
  return { playerTeam, playerIndex: 0, enemies, enemyIndex: 0, enemyHp: null };
}

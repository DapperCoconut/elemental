/**
 * World Shift arenas — the five grounds you can choose to fight on.
 *
 * Each map is a standing set of rules that applies to *everyone* standing in
 * it: the player, the bot, and anything either of them summoned. Nothing here
 * takes sides.
 *
 * The machinery lives in `src/elements/kits/SecretMapKit.ts`. That kit is
 * deliberately written against a list of fighters rather than against
 * "player and npc", so the same maps can later be dropped into multiplayer,
 * invasion or co-op without touching this table or the map logic — those modes
 * only have to hand the kit a different roster and say which side each fighter
 * is on.
 */

export type SecretMapId = 'graveyard' | 'winter' | 'magma' | 'chaos' | 'study';

export interface SecretMapDef {
  id: SecretMapId;
  name: string;
  emoji: string;
  /** One line for the card. */
  tagline: string;
  /** The rules, spelled out. Shown on the card and announced on entry. */
  rules: string[];
  /** Ground tone — the kit paints the floor with it. */
  floor: number;
  /** Accent for UI chrome and the map's own HUD furniture. */
  accent: number;
}

export const SECRET_MAPS: SecretMapDef[] = [
  {
    id: 'graveyard',
    name: 'GRAVEYARD',
    emoji: '🪦',
    tagline: 'The dead keep arriving, and both of you are meat',
    rules: [
      'Husks climb out of the graves along the top wall, wave after wave.',
      'Every husk attacks whoever is nearest — it does not care which of you that is.',
      'Two runic bars run along the bottom: green is yours, red is theirs.',
      'Killing a husk feeds the killer\'s bar. Fill it and a Husk Titan rises,',
      'and it will only ever hurt the fighter who did not summon it.',
    ],
    floor: 0x14161f,
    accent: 0x6fd18a,
  },
  {
    id: 'winter',
    name: 'WINTER WONDERLAND',
    emoji: '❄️',
    tagline: 'Keep warm or stop moving permanently',
    rules: [
      'Sheets of black ice steal your footing wherever you tread on them.',
      'A chill meter fills fast anywhere away from a fire.',
      'Fill it and you freeze solid, taking damage every second until you thaw.',
      'A handful of campfires are the only warmth. The bot knows where they are.',
    ],
    floor: 0x1b2733,
    accent: 0x9fe3ff,
  },
  {
    id: 'magma',
    name: 'MAGMA FALLS',
    emoji: '🌋',
    tagline: 'The ceiling is falling and the floor is split',
    rules: [
      'Magma rocks fall constantly, hit hard, and leave burning pools behind them.',
      'The volcano at the top erupts without warning — a whole plume at once.',
      'A river of lava cuts the arena in two.',
      'Crossing it costs 100 health. It will not charge you again for five seconds.',
    ],
    floor: 0x22140f,
    accent: 0xff6a1e,
  },
  {
    id: 'chaos',
    name: 'CHAOS REALM',
    emoji: '🎪',
    tagline: 'Nothing here travels in a straight line, including you',
    rules: [
      'Every projectile bounces off the walls. Forever.',
      'The two of you trade places every ten seconds, ready or not.',
      'Bumpers line the walls — dash into one and it flings you at your cursor.',
      '(The bot gets flung at you instead. It did not ask for this either.)',
    ],
    floor: 0x241033,
    accent: 0xff5fc4,
  },
  {
    id: 'study',
    name: "ALCHEMIST'S STUDY",
    emoji: '⚗️',
    tagline: 'A dusty library with something on every shelf',
    rules: [
      'Potions keep appearing around the room.',
      'Walk over one to drink it — the buffs are large and they last.',
      'They stack, so a hoarder becomes a genuine problem.',
      'The bot drinks too, and it will walk across the room to do it.',
    ],
    floor: 0x2a2418,
    accent: 0xc9a227,
  },
];

export function getSecretMap(id: string | null | undefined): SecretMapDef | null {
  return SECRET_MAPS.find((m) => m.id === id) ?? null;
}

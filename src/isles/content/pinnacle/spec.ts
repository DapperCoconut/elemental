/**
 * The Obsidian Pinnacle's fixed skeleton: the ten benches in climbing order, which six elements sit
 * on each, and the id rules every Pinnacle builder shares. Nothing here imports content.
 */

export interface BenchSpec {
  /** Area id — also the key its six seats, its floor and its stair gate hang off. */
  id: string;
  /** The isle this bench legislated for (its six elements are that isle's six courts). */
  isle: string;
  /** 1 (lowest) – 10. */
  n: number;
  name: string;
  /** Subtitle under the area name. */
  subtitle: string;
  elements: [string, string, string, string, string, string];
  color: number;
}

export const BENCHES: BenchSpec[] = [
  { id: 'bench-fire', isle: 'fire', n: 1, name: 'The Ember Bench', subtitle: 'First bench — where the Brand was written',
    elements: ['fire', 'magma', 'pressure', 'gunpowder', 'plasma', 'wax'], color: 0xff6a2a },
  { id: 'bench-water', isle: 'water', n: 2, name: 'The Tide Bench', subtitle: 'Second bench — where the Undertow was written',
    elements: ['water', 'ice', 'depths', 'oil', 'ink', 'cloth'], color: 0x3aa0ff },
  { id: 'bench-life', isle: 'life', n: 3, name: 'The Thorn Bench', subtitle: 'Third bench — where the Pruning was written',
    elements: ['life', 'growth', 'gluttony', 'hunt', 'marrow', 'gum'], color: 0x5ad06a },
  { id: 'bench-air', isle: 'air', n: 4, name: 'The Gale Bench', subtitle: 'Fourth bench — where the Breath-Tax was written',
    elements: ['air', 'tempest', 'gravity', 'dream', 'astra', 'myth'], color: 0xbfe8ff },
  { id: 'bench-earth', isle: 'earth', n: 5, name: 'The Stone Bench', subtitle: 'Fifth bench — where the Stone Tithe was written',
    elements: ['earth', 'crystal', 'clay', 'dune', 'metal', 'ruin'], color: 0xc89a5a },
  { id: 'bench-electricity', isle: 'electricity', n: 6, name: 'The Storm Bench', subtitle: 'Sixth bench — where the Draw was written',
    elements: ['electricity', 'technology', 'magnet', 'radiation', 'rubber', 'quantum'], color: 0xffe14a },
  { id: 'bench-slime', isle: 'slime', n: 7, name: 'The Venom Bench', subtitle: 'Seventh bench — where the Mark was written',
    elements: ['slime', 'death', 'shadow', 'bind', 'subterfuge', 'string'], color: 0x9be04a },
  { id: 'bench-fate', isle: 'fate', n: 8, name: 'The Lot Bench', subtitle: 'Eighth bench — where the Lot was written',
    elements: ['fate', 'fortune', 'sand', 'memory', 'psychic', 'conquest'], color: 0xd9a8ff },
  { id: 'bench-sound', isle: 'sound', n: 9, name: 'The Choir Bench', subtitle: 'Ninth bench — where the Part was written',
    elements: ['sound', 'echo', 'silence', 'illusion', 'passion', 'paper'], color: 0xff8ac8 },
  { id: 'bench-light', isle: 'light', n: 10, name: 'The Noon Bench', subtitle: 'Tenth bench — where the Endless Noon was written',
    elements: ['light', 'justice', 'soul', 'magic', 'creation', 'chalk'], color: 0xfff2b0 },
];

export const PIN_LANDING = 'pin-landing';
export const PIN_SUMMIT = 'pin-summit';
export const KING_ID = 'obsidian-king';
/** Total councilors — the throne door wants every one of them. */
export const SEAT_COUNT = 60;

/** A councilor's encounter id. */
export const seatId = (element: string): string => `seat-${element}`;
/** A bench's intro cinematic id. */
export const benchIntroId = (benchId: string): string => `cine-${benchId}`;
/** A bench's relic charm id. */
export const relicId = (benchId: string): string => `relic-${benchId}`;
export const benchOf = (id: string): BenchSpec | undefined => BENCHES.find((b) => b.id === id);
/** The area below / above a bench on the stair. */
export const below = (b: BenchSpec): string => (b.n === 1 ? PIN_LANDING : BENCHES[b.n - 2].id);
export const above = (b: BenchSpec): string => (b.n === BENCHES.length ? PIN_SUMMIT : BENCHES[b.n].id);

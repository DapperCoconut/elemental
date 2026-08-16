/**
 * The Disgraced Lab's second tier — unstable synthesis.
 *
 * Upstairs a forge is a transaction: pay the nuclei, take the element. Down
 * here it is a wager. Three sockets instead of two, and what comes out of them
 * is not finished — it is the *abstract echo* of an ordinary duo, and it will
 * not hold on its own.
 *
 * ## The shape of a recipe
 *
 * Two **base** elements decide what you get. They are exactly the pair that
 * makes a normal combined element upstairs (`Recipes.ts`), and the result is
 * that element's corrupt counterpart — Water + Air is Ice up in the Lab, and
 * Magma down here. The third socket takes **one abstract element**, which is
 * the binder. Which abstract you choose does not change the result…
 *
 * …but it is the third thing you have to fight. A forge only spends its Divine
 * Nucleus to produce something too unstable to keep; stabilising it means
 * putting down all three ingredients, at Expert, in one three-on-three. So the
 * binder is a difficulty dial the player sets for themselves.
 *
 * Two abstracts in the sockets is refused outright — nothing in the pairing
 * would be holding anything else together.
 */

import { ABSTRACT_ELEMENT_IDS } from './AbstractElements';

/** The five elements a socket will accept as a *base*. Abstracts are the sixth thing. */
export const UNSTABLE_BASE_IDS: string[] = ['fire', 'water', 'life', 'air', 'earth'];

export interface UnstableRecipe {
  /** The two base elements. Order-independent. */
  bases: [string, string];
  result: string;
  resultName: string;
  resultEmoji: string;
  resultColor: number;
  /** The ordinary combined element this one is the abstract echo of — flavour, shown in the lab. */
  echoOf: string;
  echoName: string;
  echoEmoji: string;
}

export const UNSTABLE_RECIPES: UnstableRecipe[] = [
  { bases: ['fire', 'water'],  result: 'radiation', resultName: 'Radiation', resultEmoji: '☢️', resultColor: 0x7cff3d, echoOf: 'oil',      echoName: 'Oil',      echoEmoji: '🛢️' },
  { bases: ['fire', 'life'],   result: 'depths',    resultName: 'Depths',    resultEmoji: '🐟', resultColor: 0x0e8f9c, echoOf: 'hunt',     echoName: 'Hunt',     echoEmoji: '🐺' },
  { bases: ['fire', 'air'],    result: 'psychic',   resultName: 'Psychic',   resultEmoji: '👁️', resultColor: 0x9b4dff, echoOf: 'shadow',   echoName: 'Shadow',   echoEmoji: '🌑' },
  { bases: ['fire', 'earth'],  result: 'ruin',      resultName: 'Ruin',      resultEmoji: '🧱', resultColor: 0xc4392c, echoOf: 'creation', echoName: 'Creation', echoEmoji: '⚒️' },
  { bases: ['water', 'life'],  result: 'cloth',    resultName: 'Cloth',    resultEmoji: '🧣', resultColor: 0xd1435c, echoOf: 'growth',   echoName: 'Growth',   echoEmoji: '🦠' },
  { bases: ['water', 'air'],   result: 'magma',     resultName: 'Magma',     resultEmoji: '🌋', resultColor: 0xff5a1e, echoOf: 'ice',      echoName: 'Ice',      echoEmoji: '🧊' },
  { bases: ['water', 'earth'], result: 'chalk',     resultName: 'Chalk',     resultEmoji: '🖍️', resultColor: 0xf4f1e6, echoOf: 'crystal',  echoName: 'Crystal',  echoEmoji: '💎' },
  { bases: ['life', 'air'],    result: 'paper',     resultName: 'Paper',     resultEmoji: '📄', resultColor: 0xf2ead6, echoOf: 'soul',     echoName: 'Soul',     echoEmoji: '👻' },
  { bases: ['life', 'earth'],  result: 'bind',      resultName: 'Bind',      resultEmoji: '⛓️', resultColor: 0xe0b743, echoOf: 'gravity',  echoName: 'Gravity',  echoEmoji: '🌌' },
  { bases: ['air', 'earth'],   result: 'dune',      resultName: 'Sand',      resultEmoji: '🏜️', resultColor: 0xe8c87a, echoOf: 'sand',     echoName: 'Time',     echoEmoji: '⏳' },
];

/** Every element that can only be reached through an unstable synthesis. */
export const UNSTABLE_ELEMENT_IDS: string[] = UNSTABLE_RECIPES.map((r) => r.result);

export function isUnstableElement(id: string): boolean {
  return UNSTABLE_ELEMENT_IDS.includes(id);
}

/** Why a set of three sockets cannot be forged, or null when it can. */
export type UnstableFault =
  | 'incomplete'   // fewer than three seated
  | 'duplicate'    // the same element twice
  | 'two-abstract' // more than one abstract — nothing is binding anything
  | 'no-abstract'  // all base — this is a Lab-upstairs merge, not a synthesis
  | 'unknown';     // a legal shape with no recipe behind it

export interface UnstableAttempt {
  recipe: UnstableRecipe | null;
  fault: UnstableFault | null;
  /** The two bases and the binder, once the shape is known to be legal. */
  bases: string[];
  abstractId: string | null;
}

/**
 * Reads three sockets. Never throws and never guesses — a caller shows
 * `fault` to the player and only spends a nucleus when `recipe` is set.
 */
export function readUnstableSockets(
  a: string | null, b: string | null, c: string | null,
): UnstableAttempt {
  const seated = [a, b, c].filter((x): x is string => !!x);
  const none: UnstableAttempt = { recipe: null, fault: null, bases: [], abstractId: null };

  if (seated.length < 3) return { ...none, fault: 'incomplete' };
  if (new Set(seated).size < 3) return { ...none, fault: 'duplicate' };

  const abstracts = seated.filter((id) => ABSTRACT_ELEMENT_IDS.includes(id));
  const bases = seated.filter((id) => UNSTABLE_BASE_IDS.includes(id));

  if (abstracts.length > 1) return { ...none, fault: 'two-abstract' };
  if (abstracts.length === 0) return { ...none, fault: 'no-abstract' };
  // Anything that is neither base nor abstract (a combined element dragged in
  // from somewhere) lands here rather than being silently ignored.
  if (bases.length !== 2) return { ...none, fault: 'unknown' };

  const recipe = findUnstableRecipe(bases[0], bases[1]);
  if (!recipe) return { ...none, fault: 'unknown', bases, abstractId: abstracts[0] };
  return { recipe, fault: null, bases, abstractId: abstracts[0] };
}

/** The recipe two base elements make, in either order. */
export function findUnstableRecipe(a: string, b: string): UnstableRecipe | undefined {
  return UNSTABLE_RECIPES.find(
    (r) => (r.bases[0] === a && r.bases[1] === b) || (r.bases[0] === b && r.bases[1] === a),
  );
}

export function getUnstableRecipe(resultId: string): UnstableRecipe | undefined {
  return UNSTABLE_RECIPES.find((r) => r.result === resultId);
}

/** What each fault should say on the lab's message line. */
export const UNSTABLE_FAULT_TEXT: Record<UnstableFault, string> = {
  'incomplete':   'Seat three elements — two base, one abstract.',
  'duplicate':    'Three different elements. A thing cannot bind itself.',
  'two-abstract': '⚡ TOO UNSTABLE — two abstracts will not hold. One binder, no more.',
  'no-abstract':  'Three base elements is a merge, not a synthesis. One of them must be abstract.',
  'unknown':      'This pairing is not yet understood.\nNo Divine Nucleus was spent.',
};

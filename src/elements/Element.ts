import { Ability } from './Ability';

/**
 * Every ability id bound to Click, across every element. Filled by `ElementRegistry`; kept here
 * so `Fighter` can ask "was that a basic attack?" without importing the whole roster.
 */
export const CLICK_ABILITY_IDS = new Set<string>();

export interface Element {
  id: string;
  name: string;
  color: number;
  emoji: string;
  abilities: Ability[];
}

import { Ability } from './Ability';

export interface Element {
  id: string;
  name: string;
  color: number;
  emoji: string;
  abilities: Ability[];
}

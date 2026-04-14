import { Element } from './Element';
import { Ability } from './Ability';

const noop: Ability = { id: 'dummy-noop', name: '—', description: 'Does nothing.', displayKey: '', cooldown: 0, cast() {} };

export const dummyElement: Element = {
  id: 'dummy',
  name: 'Dummy',
  color: 0x888888,
  emoji: '🎯',
  abilities: [noop],
};

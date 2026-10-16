import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Marrow — a test element, reachable only from a cheat-mode save for now.
 *
 * A host with its ribcage hinged open and the marrow cavity burning behind it. Everything the
 * element does is an immune response: it does not aim, it *deploys*. Four of the five keys put
 * cells on the field, they walk themselves at whatever is nearest, and the bone bar across the
 * top of the screen is the whole game — five sockets, and you decide what is in them.
 *
 * The second bar underneath it is inflammation. It fills when you get hurt and while your
 * macrophages are working, it drains constantly, and everything you own gets faster and starts
 * regenerating in proportion to how high it is. Marrow is therefore the one element that wants
 * to be taking damage: a host at 0 inflammation is a slow pile of cells, and a host at 100 is a
 * fever with a standing army.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in MarrowKit.
 */

const antiBodyBlast: Ability = {
  id: 'marrow-antibody',
  name: 'Anti-Body Blast',
  description: 'Flick a single antibody at your cursor for 12 damage. It does not stop there — it latches onto whoever it hit and stays there for the rest of the match, up to 10 on one body, and they never fade. Every antibody on a body makes each of your cells bite it 10% harder, and hands a biting macrophage 2 extra HP for itself and for you. A full coat of ten is double damage from your entire board.',
  displayKey: 'Click',
  cooldown: 440,
  cast(ctx: CastContext) { ctx.marrowAntibody(ctx.targetX, ctx.targetY); },
};

const macrosma: Ability = {
  id: 'marrow-macrosma',
  name: 'Macrosma',
  description: 'Summon a macrophage: 85 HP and very slow. It bites for 15, healing itself and you 5 each time — more of both against a body you have antibodies on. Anything the enemy has summoned it simply eats — instantly, for 25 HP to you and to itself. While one is alive it also generates 2 inflammation a second.',
  displayKey: 'E',
  cooldown: 9500,
  cast(ctx: CastContext) { ctx.marrowMacrosma(); },
};

const neutralize: Ability = {
  id: 'marrow-neutralize',
  name: 'Neutralize',
  description: 'Summon a neutrophil: 30 HP, fast, and it hits for 25 — more against a body you have antibodies on. It is meant to die. When it does it bursts into a wide web of spiked protein that slows everything caught in it and grinds them down for six seconds.',
  displayKey: 'R',
  cooldown: 8000,
  cast(ctx: CastContext) { ctx.marrowNeutralize(); },
};

const dendricles: Ability = {
  id: 'marrow-dendricles',
  name: 'Dendricles',
  description: 'Whip five dendritic tentacles at your cursor at short range, one after another, all five going to the same point, 5 damage each. Land four or more of them on the same enemy and the ability transforms: the next cast summons a T-cell instead, which walks around buffing your other cells by 25% speed and 50% damage and topping them up with 25 HP.',
  displayKey: 'F',
  cooldown: 6500,
  cast(ctx: CastContext) { ctx.marrowDendricles(ctx.targetX, ctx.targetY); },
};

const mastacre: Ability = {
  id: 'marrow-mastacre',
  name: 'Mastacre',
  description: 'Release five mast cells. They do not take up summon slots — they simply home in on whoever is nearest, and five seconds later every one of them detonates for 25 damage in a wide radius and dumps 20 inflammation into you. Kill one early and it goes off where it stood.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 26000,
  cast(ctx: CastContext) { ctx.marrowMastacre(); },
};

export const marrowElement: Element = {
  id: 'marrow',
  name: 'Marrow',
  color: 0xd1435c,
  emoji: '🦴',
  abilities: [antiBodyBlast, macrosma, neutralize, dendricles, mastacre],
};

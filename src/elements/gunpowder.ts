import { Element } from './Element';
import { Ability } from './Ability';

const gunpowderMusketShotAbility: Ability = {
  id: 'gunpowder-musket-shot',
  name: 'Musket Shot',
  description: 'Fire a high-power musket ball (35 dmg) toward your cursor. You carry 3 muskets — each fired one drops behind you, glowing hot for 6s before it can be picked back up.',
  displayKey: 'Click',
  cooldown: 350,
  cast(ctx) { ctx.gunpowderMusketShot(ctx.targetX, ctx.targetY); },
};

const gunpowderExplosiveRetreatAbility: Ability = {
  id: 'gunpowder-explosive-retreat',
  name: 'Explosive Retreat',
  description: 'Detonate a blast in front of you (20 dmg) and get launched backward — a quick burst of escape distance.',
  displayKey: 'E',
  cooldown: 7000,
  cast(ctx) { ctx.gunpowderExplosiveRetreat(ctx.targetX, ctx.targetY); },
};

const gunpowderFireAtWillAbility: Ability = {
  id: 'gunpowder-fire-at-will',
  name: 'Fire at Will',
  description: 'Fire every weapon in your arsenal at once, toward your cursor.',
  displayKey: 'R',
  cooldown: 9000,
  cast(ctx) { ctx.gunpowderFireAtWill(ctx.targetX, ctx.targetY); },
};

const gunpowderArsenalExpansionAbility: Ability = {
  id: 'gunpowder-arsenal-expansion',
  name: 'Arsenal Expansion',
  description: "Choose 1 of 3 offered weapons to add to your arsenal (max 3, fired together by Fire at Will). Can't be used with a full arsenal — right-click a weapon in the HUD to discard it.",
  displayKey: 'F',
  cooldown: 1500,
  cast(ctx) { ctx.gunpowderArsenalExpansion(); },
};

const gunpowderFinalOrdinanceAbility: Ability = {
  id: 'gunpowder-final-ordinance',
  name: 'Final Ordinance',
  description: 'Call down a barrage of explosives that track your cursor as they fall. After a 2s delay, 6 blasts rain down on your cursor in quick succession — decent damage each, plus a 0.5s stun.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 35000,
  cast(ctx) { ctx.gunpowderFinalOrdinance(ctx.targetX, ctx.targetY); },
};

export const gunpowderElement: Element = {
  id: 'gunpowder',
  name: 'Gunpowder',
  color: 0x440066,
  emoji: '💀',
  abilities: [
    gunpowderMusketShotAbility,
    gunpowderExplosiveRetreatAbility,
    gunpowderFireAtWillAbility,
    gunpowderArsenalExpansionAbility,
    gunpowderFinalOrdinanceAbility,
  ],
};

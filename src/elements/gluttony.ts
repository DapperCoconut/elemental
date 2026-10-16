import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Harvest — a test element, reachable only from a cheat-mode save for now. The id is still
 * `gluttony` (it replaced the chef of that name), so saves, unlocks and campaign data keep it.
 *
 * A dark scarecrow with a sack over its head, a purple grin that will not stop drooling, and a
 * scythe taller than it is. It plants rot: Sow Corruption seeds the ground with a purple mold
 * that slowly spreads into eyes and mouths, everything standing on it rots, and the rot is what
 * the rest of the kit feeds on — the sickle heals more off a rotten body, the crows bite it
 * harder, the scythe kills it sooner. The mold grows hearts; cutting one with the sickle is
 * Corrupt HP, and whoever chews through Corrupt HP catches the rot too.
 *
 * Every `cast` below is a one-line delegate; the whole simulation lives in GluttonyKit.
 */

const sickle: Ability = {
  id: 'harvest-sickle',
  name: 'Sickle',
  description: 'Throw a sickle that flies a full loop out toward the cursor and back to your hand, like a boomerang. 12 damage to everything it passes through — it pierces. Right-click swaps which way the loop curls. Cutting one of your own corrupt hearts bursts it for 75 Corrupt HP, then 5 more a second for 5 seconds.',
  displayKey: 'Click',
  cooldown: 650,
  cast(ctx: CastContext) { ctx.harvestSickle(ctx.targetX, ctx.targetY); },
};

const sow: Ability = {
  id: 'harvest-sow',
  name: 'Sow Corruption',
  description: 'Scatter a burst of corruption seeds on the ground around you. Each one slowly grows into a purple mold of eyes and mouths that keeps spreading, a little further over time. Enemies standing on it slowly gain Corruption. Mature mold now and then grows a corrupt heart — cut it with your sickle.',
  displayKey: 'E',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.harvestSow(); },
};

const frenzy: Ability = {
  id: 'harvest-frenzy',
  name: 'Feeding Frenzy',
  description: 'Release 3 crows that circle your cursor for 6 seconds, pecking anything they fly through for 5 — up to three times that against a fully corrupted enemy.',
  displayKey: 'R',
  cooldown: 14000,
  cast(ctx: CastContext) { ctx.harvestFrenzy(ctx.targetX, ctx.targetY); },
};

const consume: Ability = {
  id: 'harvest-consume',
  name: 'Consume',
  description: 'Open the sack and bite forward for 18. Anything bitten has its shields, Corrupt HP and evasion stolen, copies of its damage and speed buffs go to you, and it cannot heal for 8 seconds. Biting a fighter tears off a piece of Corrupt Flesh: below 75 health you eat one at once for 75 Corrupt HP. With half or more of your health as Corrupt HP, the bite also floods them with Corruption.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.harvestConsume(ctx.targetX, ctx.targetY); },
};

const reap: Ability = {
  id: 'harvest-reap',
  name: 'Reaping Hour',
  description: 'Swing the great scythe in a wide arc in front of you for 30. Everything cut takes 15% more damage for the rest of the match, and it stacks. Anything left below 10% health is killed outright — a line that rises to 25% the more corrupted they are.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 35000,
  cast(ctx: CastContext) { ctx.harvestReap(ctx.targetX, ctx.targetY); },
};

export const gluttonyElement: Element = {
  id: 'gluttony',
  name: 'Harvest',
  color: 0x6a2c91,
  emoji: '🌾',
  abilities: [sickle, sow, frenzy, consume, reap],
};

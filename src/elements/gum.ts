import { Element } from './Element';
import { Ability, CastContext } from './Ability';

/**
 * Savor — two characters on one body, and Space swaps them.
 *
 * The id is still `gum` (this slot used to be Slime; `slime` is Acid's), so saves, campaign
 * worlds and husk tables keep working. Everything the player sees says Savor.
 *
 * **Sugar** is soft and generous: candy bombs that leave sweet trails, a bag of sweets thrown on
 * the floor to be picked up for small permanent buffs, a loop round the enemy that steals their
 * blood sugar, a chocolate ball that *lends* them your buffs (and then takes it back with a
 * crash), and a Sugar Rush ultimate.
 *
 * **Salt** is hard and mean: a fast shard that bites harder into bigger health pools, a crust of
 * shield that builds over time, a stalactite fired off a timing bar that soaks up the colour of
 * whatever buffs it passes through, a cone that stings for half of what you just dealt, and a
 * Salt Crash ultimate that lifts everyone onto spears for a race.
 *
 * Abilities 0–4 are Sugar's row, 5–9 Salt's — the tray swaps rows like Justice's stances. Every
 * `cast` is a one-line delegate into SavorKit.
 */

const sugarSlam: Ability = {
  id: 'savor-sugar-slam',
  name: 'Sugar Slam',
  description: 'Lob a sugar bomb to the cursor. It bursts for 22 damage, leaves a sugar cloud where it lands and a trail of sugar along the way it flew — both sting anyone standing in them.',
  displayKey: 'Click',
  cooldown: 700,
  cast(ctx: CastContext) { ctx.savorSugarSlam(ctx.targetX, ctx.targetY); },
};

const sweetTooth: Ability = {
  id: 'savor-sweet-tooth',
  name: 'Sweet Tooth',
  description: 'Tear open a bag of candies and scatter five around you. Walk over one to eat it for a small buff that lasts the whole match: Cinnamon (damage), Mint (resistance), Lemon (speed), Fruit Punch (dodge chance). Rainbow Lollipops raise all four — Black Licorice lowers all four.',
  displayKey: 'E',
  cooldown: 5000,
  cast(ctx: CastContext) { ctx.savorSweetTooth(ctx.targetX, ctx.targetY); },
};

const sugarDiffusion: Ability = {
  id: 'savor-sugar-diffusion',
  name: 'Sugar Diffusion',
  description: '+50% speed for 5 seconds. Run a full loop round an enemy and you drain their blood sugar into a cube over your head: they are slower for the rest of the match, sluggish and unable to dodge just after using an ability, and weaker every time they repeat the same attack. While it lasts it also drains their bars.',
  displayKey: 'R',
  cooldown: 15000,
  cast(ctx: CastContext) { ctx.savorSugarDiffusion(); },
};

const caringShare: Ability = {
  id: 'savor-caring-share',
  name: 'Caring Share',
  description: 'Throw a ball of chocolate. It hits for 16 and lends the target 150% of your candy buffs for 5 seconds — then they crash for 5 seconds with the same amount as penalties, and drop 3 candies for you to pick up.',
  displayKey: 'F',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.savorCaringShare(ctx.targetX, ctx.targetY); },
};

const sugarRush: Ability = {
  id: 'savor-sugar-rush',
  name: 'Sugar Rush!',
  description: 'For 12 seconds: triple speed, and every candy buff you have counts double. The screen goes wide and rainbow.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.savorSugarRush(); },
};

const saltSlice: Ability = {
  id: 'savor-salt-slice',
  name: 'Salt Slice',
  description: 'Fire a fast shard of salt: 12 damage plus 3% of the target\'s max health, so bigger health pools bleed faster. It stops at the first body it hits.',
  displayKey: 'Click',
  cooldown: 500,
  cast(ctx: CastContext) { ctx.savorSaltSlice(ctx.targetX, ctx.targetY); },
};

const saltShield: Ability = {
  id: 'savor-salt-shield',
  name: 'Salt Shield',
  description: 'Salt crusts over you as shield, 2 a second and climbing to 5 a second. It stops once you reach 75 shield — or the moment your shield is knocked down to nothing.',
  displayKey: 'E',
  cooldown: 12000,
  cast(ctx: CastContext) { ctx.savorSaltShield(); },
};

const saltInfusion: Ability = {
  id: 'savor-salt-infusion',
  name: 'Salt Infusion',
  description: 'Grow a stalactite in front of you with a timing bar underneath. Press R again to fire it: 48 damage in the green, 32 in the yellow, 18 in the red. It pierces, soaks up the colour of every buff on whoever it passes through, and drops where it stops — pick the coated crystal up for permanent candy stacks to match.',
  displayKey: 'R',
  cooldown: 10000,
  cast(ctx: CastContext) { ctx.savorSaltInfusion(ctx.targetX, ctx.targetY); },
};

const saltWounds: Ability = {
  id: 'savor-salt-wounds',
  name: 'Salt in the Wounds',
  description: 'Spray a cone of stinging salt. Each enemy in it takes half of all the damage you dealt them in the last 2 seconds.',
  displayKey: 'F',
  cooldown: 9000,
  cast(ctx: CastContext) { ctx.savorSaltWounds(ctx.targetX, ctx.targetY); },
};

const saltCrash: Ability = {
  id: 'savor-salt-crash',
  name: 'Salt Crash',
  description: 'Salt spears burst up under every enemy for 30 and hold them in the air. Nobody can attack while a race plays out: press the salt crystals that pop up on screen. Out-press them and they take 40 more and your candies turn Salted — every stack also cuts your cooldowns for 10 seconds.',
  displayKey: 'Q',
  isUltimate: true,
  cooldown: 40000,
  cast(ctx: CastContext) { ctx.savorSaltCrash(); },
};

export const gumElement: Element = {
  id: 'gum',
  name: 'Savor',
  color: 0xf7b2d0,
  emoji: '🍬',
  abilities: [
    sugarSlam, sweetTooth, sugarDiffusion, caringShare, sugarRush,
    saltSlice, saltShield, saltInfusion, saltWounds, saltCrash,
  ],
};

// Type-only, so this module and Perks.ts can reference each other without a
// runtime import cycle (Perks.ts folds DIVINE_PERKS into getPerksForElement).
import type { PerkDef } from './Perks';

/**
 * Divine perks — the Disgraced Laboratory's output.
 *
 * Every recipe is exactly one **normal** element (base or combined) plus one
 * **abstract** element. Anything else is too unstable to hold, so the lab
 * refuses the pairing outright rather than producing a lesser perk.
 *
 * The table is intentionally empty: the perks themselves are authored
 * separately. The lab is fully wired around it, so adding an entry here is all
 * that is needed to make a pairing forgeable — and until a pairing has an
 * entry, the lab says so and keeps the player's Divine Nucleus.
 *
 * To add one:
 *   {
 *     id: 'ashen-current', name: 'Ashen Current', emoji: '⚡', color: 0xff8844,
 *     description: '…',
 *     ingredients: ['fire', 'electricity'],   // [normal, abstract] — order free
 *     tier: 'divine',
 *     elementId: 'fire',                      // which element equips it
 *   }
 */
export const DIVINE_PERKS: PerkDef[] = [
  {
    id: 'bass',
    name: 'Bass',
    emoji: '🎵',
    color: 0x3388ff,
    description: 'Composing gains a fifth note: the blue Bass note, 5 composure a piece. Striking one lays a row of 7 water charges along your aim line, centred on your cursor — each detonates a moment later for 10 damage. It fires no wave of its own.',
    ingredients: ['water', 'sound'],
    tier: 'divine',
    elementId: 'sound',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    emoji: '🌌',
    color: 0x55ffcc,
    description: 'A curtain of aurora borealis hangs around you. Every hit you take makes it surge, throwing acceleration straight into your car — the harder the hit, the bigger the shove.',
    ingredients: ['water', 'light'],
    tier: 'divine',
    elementId: 'light',
  },
  {
    id: 'revitalize',
    name: 'Revitalize',
    emoji: '⚡',
    color: 0x88ff44,
    description: 'Root Shield brings a plant to life instead of shielding it. Living plants grow root legs and walk: Sunflower, Rose, Nightcap and Pitcher stalk the nearest enemy, Cotton and Nurse Lily follow you. They also carry 25% more HP and heal 5 HP per second.',
    ingredients: ['life', 'electricity'],
    tier: 'divine',
    elementId: 'life',
  },
  {
    id: 'decay',
    name: 'Decay',
    emoji: '☠️',
    color: 0x77cc55,
    description: 'Press E while the Grimoire is on cooldown to reset it, at the cost of 25 dark energy. Press Q while the Necronomicon is on cooldown to reset that, at the cost of 99 — almost always a death sentence unless you are clean.',
    ingredients: ['life', 'slime'],
    tier: 'divine',
    elementId: 'magic',
  },
  {
    id: 'storm',
    name: 'Storm',
    emoji: '⛈️',
    color: 0x556688,
    description: 'Wind Trap and Sweeping Tornado darken into thunderheads. Sniping anything held inside one charges your next shot to a full 45-damage electro shot — it still has to be drawn, but it hits like the charged one.',
    ingredients: ['air', 'electricity'],
    tier: 'divine',
    elementId: 'air',
  },
  {
    id: 'erosion',
    name: 'Erosion',
    emoji: '🌪️',
    color: 0xbb9955,
    description: 'Your shields are replaced by an aura of loose rock and sand carrying all of their HP at once. It blocks damage from every direction instead of one, still counts as a shield for your bash, and Shield Splinter can still blow it apart.',
    ingredients: ['air', 'slime'],
    tier: 'divine',
    elementId: 'earth',
  },
  {
    id: 'snow',
    name: 'Snow',
    emoji: '❄️',
    color: 0xccf0ff,
    description: 'Frozen Solid stops freezing and plants a snowball turret instead. It loads frost stacks as ammo — feed it with your Ice Spikes. Every 5s it fires for 15 damage, 1 frost stack and a 50% slow for 3s. Stands 30s.',
    ingredients: ['air', 'fate'],
    tier: 'divine',
    elementId: 'ice',
  },
  {
    id: 'moral',
    name: 'Moral',
    emoji: '🎺',
    color: 0xffcc55,
    description: 'Every recruit is hired with 25% more loyalty, and the Rolodex gains the Bard for 1💵. The Bard never fights — it bounces around like a money runner, and while it is on the payroll every other recruit loses loyalty 75% slower. Bards do not buff bards.',
    ingredients: ['air', 'sound'],
    tier: 'divine',
    elementId: 'quantum',
  },
  {
    id: 'gasoline',
    name: 'Gasoline',
    emoji: '⛽',
    color: 0xffaa33,
    description: 'The workshop turns out specials: Med-Drones heal you 2 HP/s while they orbit, Bash-Drones ram for 10 and a shove, Blast-Drones lob 10-damage bombs and detonate for double, and the Drone-Prime carries 5 shots and flies home unharmed from a Drone Destroy.',
    ingredients: ['air', 'light'],
    tier: 'divine',
    elementId: 'oil',
  },
  {
    id: 'death',
    name: 'Death',
    emoji: '💀',
    color: 0x662299,
    description: 'A trap bar appears above the arena and Snap Trap places whichever trap is selected. Base: the usual jaws. Mine: a triangular charge that blows for 35 damage in an AOE. Grabber: a tentacle seizes anyone close and will not let them stray far from the trap for 5s. Plume: the trap bursts into 10 shadow puddles.',
    ingredients: ['life', 'fate'],
    tier: 'divine',
    elementId: 'shadow',
  },
  {
    id: 'electromagnet',
    name: 'Electromagnet',
    emoji: '🧲',
    color: 0xffaa33,
    description: 'The Atom Smasher no longer flings your magnets away — it charges them. A charged magnet arcs into anyone standing near it and stuns for half a second when it lands a hit. The charge holds 10s, or forever once the Smasher is enhanced.',
    ingredients: ['fire', 'electricity'],
    tier: 'divine',
    elementId: 'magnet',
  },
  {
    id: 'sulphur',
    name: 'Sulphur',
    emoji: '🟡',
    color: 0xffdd44,
    description: 'Your geysers cap themselves and build sulphurous pressure instead — about 5 a second, up to 100. Step on one and it blows: a speed boost equal to the stored pressure for 8s, and the geyser is spent.',
    ingredients: ['fire', 'slime'],
    tier: 'divine',
    elementId: 'water',
  },
  {
    id: 'ash',
    name: 'Ash',
    emoji: '🌫️',
    color: 0xff7744,
    description: 'Every card that leaves your hand unplayed burns on the way out — an ember blast at your feet for 25 damage and a lingering burn. Rerolling the hand, binning a card with Cycle and an Immolating curse all count.',
    ingredients: ['fire', 'fate'],
    tier: 'divine',
    elementId: 'fate',
  },
  {
    id: 'anger',
    name: 'Anger',
    emoji: '😡',
    color: 0xffdd33,
    description: 'Hold R for 3 seconds to smash your whole arsenal. In exchange you go berserk for 8s: yellow, trailing afterimages, +100% attack speed and 33% less damage taken. You cannot shoot — you hold a bayoneted musket out front, and ramming an enemy runs them through for 35.',
    ingredients: ['fire', 'sound'],
    tier: 'divine',
    elementId: 'gunpowder',
  },
  {
    id: 'torch',
    name: 'Torch',
    emoji: '🔥',
    color: 0xffaa44,
    description: 'Your echo-light becomes a burning torch, 50% wider than before. It gutters as you are hurt, shrinking all the way to a third of a normal light once you have taken 350 damage.',
    ingredients: ['fire', 'light'],
    tier: 'divine',
    elementId: 'echo',
  },
  {
    id: 'conduit',
    name: 'Conduit',
    emoji: '⚡',
    color: 0x66ccff,
    description: 'Your sabre and flail run live, hitting 30% harder, and your armour earths every hit that strikes it for 5 damage back at your opponent. The price is Transfusion: while it heals you it eats away your empty max HP.',
    ingredients: ['water', 'electricity'],
    tier: 'divine',
    elementId: 'metal',
  },
  {
    id: 'emesis',
    name: 'Emesis',
    emoji: '🤢',
    color: 0x88cc44,
    description: 'Your body keeps rejecting itself: every so often you throw up a short cone of green clouds that sit for 3s and burn anyone but you. Anything caught in it will throw up twice of its own within 10s — so it spreads.',
    ingredients: ['water', 'slime'],
    tier: 'divine',
    elementId: 'growth',
  },
  {
    id: 'murk',
    name: 'Murk',
    emoji: '🐸',
    color: 0x77aa44,
    description: 'Burrowing leaves an acid toad on the surface. It hops around the arena at random, dribbling small acid puddles wherever it lands, and vanishes the moment you surface.',
    ingredients: ['water', 'fate'],
    tier: 'divine',
    elementId: 'slime',
  },
  {
    id: 'order',
    name: 'Order',
    emoji: '⚖️',
    color: 0xffffcc,
    description: 'Chaos cannot touch its master: nothing you do can damage you any more, by any route. Everything else can — you take 25% more damage from every outside source.',
    ingredients: ['life', 'light'],
    tier: 'divine',
    elementId: 'plasma',
  },
  {
    id: 'hell',
    name: 'Hell',
    emoji: '🐕‍🦺',
    color: 0xcc3322,
    description: 'The beast you release is a hellhound instead — a smaller, meaner thing that deals 30% more damage, swings 20% faster and runs 30% quicker, but takes 25% more damage itself.',
    ingredients: ['earth', 'electricity'],
    tier: 'divine',
    elementId: 'hunt',
  },
  {
    id: 'copper',
    name: 'Copper',
    emoji: '🟠',
    color: 0xdd8844,
    description: 'You earth every hit you take into the floor. Each wound scatters copper sparks that burn for a fifth of the damage you took, twice a second, for 3s.',
    ingredients: ['earth', 'slime'],
    tier: 'divine',
    elementId: 'electricity',
  },
  {
    id: 'molten',
    name: 'Molten',
    emoji: '🌋',
    color: 0xff5522,
    description: 'Your Pressure Bomb hits 20% harder but sears you with a burn each time. Flame Nuke becomes an eruption: a screen-wide mushroom cloud for 100 damage to everyone including you, leaving the arena strewn with magma.',
    ingredients: ['earth', 'fate'],
    tier: 'divine',
    elementId: 'fire',
  },
  {
    id: 'gold',
    name: 'Gold',
    emoji: '🗡️',
    color: 0xffdd44,
    description: 'The sabre is replaced by a golden dagger. Clicking stabs for solid damage, and holding a charged click flurries a barrage of stabs instead of winding up one big swing. The Blood Blade scales with how much blood you are carrying rather than your attack speed.',
    ingredients: ['earth', 'light'],
    tier: 'divine',
    elementId: 'metal',
  },
  {
    id: 'call-of-the-void',
    name: 'Call of the Void',
    emoji: '🕳️',
    color: 0x442266,
    description: 'The Death Whistle calls the dying: every enemy near the shriek at 10% HP or less dies outright. Each whistle that claims something raises the threshold 5% — up to 30% — and the first one that claims nothing drops it back to 10%.',
    ingredients: ['earth', 'sound'],
    tier: 'divine',
    elementId: 'soul',
  },
];

/**
 * Order-independent lookup, matching the rest of the perk finders in Perks.ts.
 * Returns undefined when the pairing is valid but has no perk authored yet —
 * the caller must treat that as "not yet understood", not as a failed forge.
 */
export function findDivinePerkRecipe(a: string, b: string): PerkDef | undefined {
  const sorted = [a, b].sort().join(',');
  return DIVINE_PERKS.find((p) => [...p.ingredients].sort().join(',') === sorted);
}

export function getDivinePerksForElement(elementId: string): PerkDef[] {
  return DIVINE_PERKS.filter((p) => p.elementId === elementId);
}

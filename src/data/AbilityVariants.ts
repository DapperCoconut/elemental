export interface AbilityVariant {
  emoji?: string;
  name: string;
  description: string;
  /** Upgrade slot (e.g. 'e', 'q') required for this variant to be reachable; omit if always available. */
  requiresUpgrade?: string;
  /** Perk id required for this variant to be reachable (checked against the element's own perk pool); omit if always available. */
  requiresPerk?: string;
}

export interface AbilityVariantSet {
  label: string;
  variants: AbilityVariant[];
}

// Keyed by elementId -> ability displayKey (lowercased) -> the full set of outcomes that
// ability can produce. Ability descriptions only have room to say "random" or "one of" —
// this is the place to spell out every possibility so the info panel can list them all.
const ABILITY_VARIANTS: Record<string, Partial<Record<string, AbilityVariantSet>>> = {
  creation: {
    e: {
      label: 'Nexus potions (load 2 bolts of any tiers to brew — walk onto the Nexus to drink)',
      variants: [
        { emoji: '⚔️', name: 'Copper + Copper — Buff Potion', description: 'Deal 25% more damage for 20s.' },
        { emoji: '💚', name: 'Silver + Silver — Heal Potion', description: 'Regenerate 3 HP every second for 20s.' },
        { emoji: '🏆', name: 'Gold + Gold — Gold Potion', description: 'For 90s, every effect you gain — good or bad — lasts twice as long.' },
        { emoji: '🛡️', name: 'Copper + Silver — Protection Potion', description: 'Take 25% less damage for 20s.' },
        { emoji: '👟', name: 'Copper + Gold — Speed Potion', description: 'Move 50% faster for 20s.' },
        { emoji: '⏱️', name: 'Silver + Gold — Reload Potion', description: 'Ability cooldowns recharge 25% faster for 20s.' },
      ],
    },
    r: {
      label: 'Mech arms (R+ — whichever potions were sitting on the Nexus when the wrench woke it)',
      variants: [
        { emoji: '🔨', name: 'Buff Potion — Chainsaw Arm', description: 'Rips into anything that comes within reach on its own — small, very fast damage. Overheats after 5s of cutting and needs 3s to cool.', requiresUpgrade: 'r' },
        { emoji: '💊', name: 'Heal Potion — Med Core Arm', description: 'Every 8s it lobs 3 healing orbs around you. Walk over one to repair the mech for 15 HP.', requiresUpgrade: 'r' },
        { emoji: '🤖', name: 'Gold Potion — Grabber Arm', description: 'Reaches out and seizes anyone who gets close, holding them for 3s. They cannot attack while they are in the claw.', requiresUpgrade: 'r' },
        { emoji: '🛡️', name: 'Protection Potion — Shield Arm', description: '+25 mech HP, and every 5th hit the mech takes is blocked outright. Two shield arms block every 3rd.', requiresUpgrade: 'r' },
        { emoji: '🚀', name: 'Speed Potion — Barrage Arm', description: 'Every 8s it fires 3 homing rockets, each dealing 5 damage plus a small blast.', requiresUpgrade: 'r' },
        { emoji: '⚙️', name: 'Reload Potion — Overclock Arm', description: '+25% mech speed, and it supercharges whatever is on the other arm — more damage, more healing, shorter cooldowns. Everything you build while overclocked comes out steel-plated with double health.', requiresUpgrade: 'r' },
      ],
    },
  },
  magic: {
    e: {
      label: 'Grimoire wheel (← / → to select, release to cast — center button toggles Dark Magic with E+)',
      variants: [
        { emoji: '🔥', name: 'Flame Burst', description: '3 fire clouds launch in a narrow spread — 2 dmg/0.25s burn tick for 2s, clouds expire after 3s.' },
        { emoji: '🌧️', name: 'Storm Cloud', description: 'Stationary cloud 80px ahead pulses once after 3s, slowing enemies within 110px for 1.5s.' },
        { emoji: '🌿', name: 'Virulent Thorns', description: 'Fast vine dart — binds the enemy for 2s on hit; if still bound at expiry, deals 25 dmg.' },
        { emoji: '💨', name: 'Compression Blast', description: 'Point-blank 90px burst — heavy knockback + 8 dmg.' },
        { emoji: '🗿', name: "Gaia's Guidance", description: 'Summons 3 orbiting rock orbs (10 dmg on contact) for 5s.' },
        { emoji: '🖤', name: 'Corrupt Flames', description: 'Cursed fire cloud follows your cursor (70px radius, 4 dmg/0.5s burn tick) for 5s. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Acid Cloud', description: 'Cloud pulses every 3s, stacking +25% damage vulnerability on hit enemies (no direct damage) for 8s. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Draining Thorns', description: 'Instant vine (up to 200px) — 15 dmg and heals you 15 HP on hit. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Recalling Gale', description: '1s wind cone that pulls enemies toward you. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: "Gaia's Temple", description: 'Fixed temple with 3 orbiting orbs (15 dmg + 1s slow on contact) for 10s. +25 Darkness.', requiresUpgrade: 'e' },
      ],
    },
    q: {
      label: 'Necronomicon wheel (← / → to select, release to cast — center button toggles Dark Magic with Q+)',
      variants: [
        { emoji: '🌋', name: 'Flame Barrage', description: '10 fire clouds fan out in a wide spread — 3 dmg/0.2s burn tick for 4s, clouds last 6s.' },
        { emoji: '🌊', name: 'Final Drench', description: 'Stationary cloud 80px ahead pulses every 3s for 12 dmg within 130px, lasting 12s.' },
        { emoji: '🌿', name: 'Thorn Prison', description: 'Slower vine dart cages the enemy in 4 chain segments (15 HP each) for 5s on hit.' },
        { emoji: '🌪️', name: 'Tornado Blast', description: '90px knockback burst (10 dmg), then a wandering tornado lingers for 10s.' },
        { emoji: '🌋', name: "Gaia's Rage", description: 'Summons 5 larger, crackable rock orbs (20 dmg on contact) for 12s.' },
        { emoji: '🖤', name: 'Dark Barrage', description: '3 cursed flame clouds fan out and track your cursor (60px radius, 4 dmg/0.5s burn tick) for 4s. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Acid Rain', description: '3 clouds ring around you, each pulsing every 2s to stack +25% damage vulnerability (no direct damage) for 8s. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Torture Trap', description: 'Vine dart (up to 200px) links a hit enemy to you for 5s, draining 3 dmg/s as lifesteal. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Hurricane Vacuum', description: '1s pull cone, then a wandering vacuum tornado lingers for 10s. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: "Gaia's Monument", description: '5 large crackable orbs (20 dmg + 1s stun on contact) for 15s. +50 Darkness.', requiresUpgrade: 'q' },
      ],
    },
  },
  gunpowder: {
    f: {
      label: 'Arsenal weapons (choose 1 of 3 offered; max 3 in your arsenal, 6 with R+; F+ unlocks 7 more weapon types)',
      variants: [
        { emoji: '🔫', name: 'Pistol', description: 'Hitscan, 10 dmg. Each copy in your arsenal: -10% Fire at Will cooldown (stacks).' },
        { emoji: '💥', name: 'AR', description: '3 hitscan shots in quick succession, 6 dmg each.' },
        { emoji: '💨', name: 'Shotgun', description: 'Cone of 10 pellets at short range, 2 dmg each.' },
        { emoji: '🎯', name: 'Rifle', description: 'Large long-range hitscan, 15 dmg. Each copy in your arsenal: +25% Musket Shot damage (stacks).' },
        { emoji: '💣', name: 'Grenade Launcher', description: 'Lobs a grenade that explodes after a short fuse (25 dmg AoE).' },
        { emoji: '🔥', name: 'Machine Gun', description: '20 hitscan shots, 2 dmg each, up to 10° inaccurate.' },
        { emoji: '🚒', name: 'Flamethrower', description: 'Launches 10 flame clouds ahead, 3 dmg each — fade after 3s or on contact. Each copy in your arsenal: muskets cool 20% slower (stacks).', requiresUpgrade: 'f' },
        { emoji: '🚀', name: 'RPG', description: 'Explosive rocket, 20 dmg in a large AoE. Each copy in your arsenal: +20% Fire at Will cooldown (stacks).', requiresUpgrade: 'f' },
        { emoji: '🌪️', name: 'Minigun', description: '30 hitscan shots, 2 dmg each — slows you 50% while firing. Each copy in your arsenal: muskets cool 35% slower (stacks).', requiresUpgrade: 'f' },
        { emoji: '🔭', name: 'Sniper', description: 'Hitscan, 20 dmg. Only fires every other Fire at Will — its arsenal slot turns red when it\'s about to be skipped.', requiresUpgrade: 'f' },
        { emoji: '💚', name: 'Ray-Gun', description: 'Bouncy green bullet that pierces the enemy and bounces off walls, 5 dmg + knockback per hit, up to 3 hits total.', requiresUpgrade: 'f' },
        { emoji: '❄️', name: 'Freeze-Ray', description: 'Hitscan, 3 dmg + 1s stun. Each copy in your arsenal: muskets cool 20% faster (stacks).', requiresUpgrade: 'f' },
        { emoji: '⚔️', name: 'Gunblade', description: 'Long-range shot (10 dmg), or a point-blank slash (15 dmg) if the enemy is close. Grants 20% damage reduction for 2s after any Fire at Will.', requiresUpgrade: 'f' },
      ],
    },
  },
  sound: {
    e: {
      label: 'Records on the deck (a harmonized Disc Dice changes the record — Accelerando is loaded at the bell)',
      variants: [
        { emoji: '💚', name: 'Accelerando Disc', description: 'Move 20% faster, and every ability cooldown recharges 25% faster.' },
        { emoji: '🔴', name: 'Bass Disc', description: 'Deal 20% more damage with everything.' },
        { emoji: '🔵', name: 'Calm Disc', description: 'Regenerate 2 HP every second.' },
      ],
    },
  },
};

export function getAbilityVariants(elementId: string, displayKey: string): AbilityVariantSet | undefined {
  return ABILITY_VARIANTS[elementId]?.[displayKey.toLowerCase()];
}

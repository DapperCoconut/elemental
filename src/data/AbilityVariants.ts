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
        { emoji: '🪚', name: 'Buff Potion — Chainsaw Arm', description: 'Rips into anything that comes within reach on its own — small, very fast damage. Overheats after 5s of cutting and needs 3s to cool.', requiresUpgrade: 'r' },
        { emoji: '💊', name: 'Heal Potion — Med Core Arm', description: 'Every 8s it lobs 3 healing orbs around you. Walk over one to repair the mech for 15 HP.', requiresUpgrade: 'r' },
        { emoji: '🦾', name: 'Gold Potion — Grabber Arm', description: 'Reaches out and seizes anyone who gets close, holding them for 3s. They cannot attack while they are in the claw.', requiresUpgrade: 'r' },
        { emoji: '🛡️', name: 'Protection Potion — Shield Arm', description: '+25 mech HP, and every 5th hit the mech takes is blocked outright. Two shield arms block every 3rd.', requiresUpgrade: 'r' },
        { emoji: '🚀', name: 'Speed Potion — Barrage Arm', description: 'Every 8s it fires 3 homing rockets, each dealing 5 damage plus a small blast.', requiresUpgrade: 'r' },
        { emoji: '⚙️', name: 'Reload Potion — Overclock Arm', description: '+25% mech speed, and it supercharges whatever is on the other arm — more damage, more healing, shorter cooldowns. Everything you build while overclocked comes out steel-plated with double health.', requiresUpgrade: 'r' },
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
        { emoji: '🧯', name: 'Flamethrower', description: 'Launches 10 flame clouds ahead, 3 dmg each — fade after 3s or on contact. Each copy in your arsenal: muskets cool 20% slower (stacks).', requiresUpgrade: 'f' },
        { emoji: '🚀', name: 'RPG', description: 'Explosive rocket, 20 dmg in a large AoE. Each copy in your arsenal: +20% Fire at Will cooldown (stacks).', requiresUpgrade: 'f' },
        { emoji: '🌪️', name: 'Minigun', description: '30 hitscan shots, 2 dmg each — slows you 50% while firing. Each copy in your arsenal: muskets cool 35% slower (stacks).', requiresUpgrade: 'f' },
        { emoji: '🔭', name: 'Sniper', description: 'Hitscan, 20 dmg. Only fires every other Fire at Will — its arsenal slot turns red when it\'s about to be skipped.', requiresUpgrade: 'f' },
        { emoji: '🟢', name: 'Ray-Gun', description: 'Bouncy green bullet that pierces the enemy and bounces off walls, 5 dmg + knockback per hit, up to 3 hits total.', requiresUpgrade: 'f' },
        { emoji: '❄️', name: 'Freeze-Ray', description: 'Hitscan, 3 dmg + 1s stun. Each copy in your arsenal: muskets cool 20% faster (stacks).', requiresUpgrade: 'f' },
        { emoji: '⚔️', name: 'Gunblade', description: 'Long-range shot (10 dmg), or a point-blank slash (15 dmg) if the enemy is close. Grants 20% damage reduction for 2s after any Fire at Will.', requiresUpgrade: 'f' },
      ],
    },
  },
  sound: {
    f: {
      label: 'Soul Songs (F cycles them — Staccato is the one a match starts on)',
      variants: [
        { emoji: '🔴', name: 'Staccato', description: '+20% damage. Your baton travels 30% faster and loses its spin half as fast.' },
        { emoji: '🔵', name: 'Melody', description: '+25% move speed and 20% shorter cooldowns.' },
        { emoji: '🟢', name: 'Smooth', description: '20% damage resistance and 3 HP every second.' },
      ],
    },
  },
};

export function getAbilityVariants(elementId: string, displayKey: string): AbilityVariantSet | undefined {
  return ABILITY_VARIANTS[elementId]?.[displayKey.toLowerCase()];
}

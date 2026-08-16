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
  magic: {
    e: {
      label: 'Grimoire wheel (← / → to select, release to cast — E+ adds a Dark Magic button at the hub that toggles the corrupted five)',
      variants: [
        { emoji: '🔥', name: 'Flare', description: 'A burning orb crawls to the cursor at 110 px/s for 4.5s — 3 dmg every 0.5s within 34px, plus a 3s burn.' },
        { emoji: '🌊', name: 'Splash', description: 'A 90px pool for 6s: 35% slow and 3 dmg/s to anything standing in it.' },
        { emoji: '🌿', name: 'Spur', description: 'Three burs in a 26° spread at 620 px/s, 5 dmg each.' },
        { emoji: '💨', name: 'Gust', description: 'Dash up to 240px. Anything within 96px of the corridor takes 6 and is hauled back to the cast point for 1.3s.' },
        { emoji: '🪨', name: 'Ward', description: 'Five stones orbit you for 8s — 10 dmg on contact, and they delete hostile projectiles.' },
        { emoji: '🖤', name: 'Flare+', description: 'Half speed again (55 px/s) inside a 70px dark aura dealing 3 dmg/0.4s. Its burn becomes a shadow burn worth 4 a tick. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Splash+', description: 'Putrid: 130px, 6 dmg/s, a 70% slow, and no dash, blink or dodge roll while you stand in it. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Spur+', description: 'Burs stick for 2s and stack. Five at once pins for 3s, then tears free for 12. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Gust+', description: 'An 8s electricity trail along the dash: 4 dmg/0.3s to whatever it hauls, +25% speed for you to walk on. Dupe copies it. +25 Darkness.', requiresUpgrade: 'e' },
        { emoji: '🖤', name: 'Ward+', description: '10s instead of 8, plus a linked rock wall at 92px that blocks enemies but not shots — and sheds links that fly for 10 as it dies. +25 Darkness.', requiresUpgrade: 'e' },
      ],
    },
    q: {
      label: 'Necronomicon wheel (← / → to select, release to summon — Q+ adds a Dark Magic button at the hub that toggles the corrupted five)',
      variants: [
        { emoji: '🔥', name: 'Fire', description: '45 HP familiar, 18s. A fire bolt every 1.3s at up to 420px: 8 dmg and a 2s burn.' },
        { emoji: '🌊', name: 'Water', description: '50 HP familiar, 18s. A dart every 1.5s: 6 dmg and a 1.2s slow.' },
        { emoji: '🌿', name: 'Life', description: '60 HP warden, 18s. A thorn lash every 1.2s within 96px for 7 — it has to close.' },
        { emoji: '💨', name: 'Wind', description: '40 HP and the fastest. A shove every 1.1s within 110px: 5 dmg and hard knockback.' },
        { emoji: '🪨', name: 'Earth', description: '80 HP golem, the slowest. A slam every 1.6s within 78px for 12 — the hardest ordinary hit.' },
        { emoji: '🖤', name: 'Fire+', description: '+40% HP. Every 7s drops a bomb that detonates as a cross of four 200px pillars for 18 (the diagonals are safe). +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Water+', description: '+40% HP. Every 8s floods the whole arena for 4s — a 20% slow with nowhere to stand it out. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Life+', description: '+40% HP. Every 9s fires 18 roots within 150px of the target, 3 dmg and a 1.5s root each. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Wind+', description: '+40% HP. Every 10s raises an 8s hurricane. Stand within 58px of the eye for 70% faster cooldowns and +30% damage taken by everything. +50 Darkness.', requiresUpgrade: 'q' },
        { emoji: '🖤', name: 'Earth+', description: '+40% HP. Every 9s opens five 34px holes for 9s: 20 dmg and a trip back to the centre. It catches you too, unless Levitate is up. +50 Darkness.', requiresUpgrade: 'q' },
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
  gum: {
    q: {
      label: 'Slime beacons (Solidify sets any puddle you have laid — pick one up, shake it, put it down)',
      variants: [
        { emoji: '🟢', name: 'Green Beacon — Slowing Aura', description: 'Set from a Slime Splash puddle. Anyone standing inside its aura moves at half speed for as long as it runs.', requiresUpgrade: 'e' },
        { emoji: '🩷', name: 'Pink Beacon — Healing Aura', description: 'Set from an Emesis puddle. Heals you 8 HP a second while you are inside its aura.', requiresUpgrade: 'f' },
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
        { emoji: '💚', name: 'Accelerando — cut somebody', description: 'Sound System banks +3% move speed per fighter the green record slices, for the rest of the match.', requiresUpgrade: 'e' },
        { emoji: '🔴', name: 'Bass — cut somebody', description: 'Sound System banks +2% damage per fighter the red record slices, for the rest of the match.', requiresUpgrade: 'e' },
        { emoji: '🔵', name: 'Calm — cut somebody', description: 'Sound System banks +1% damage resistance per fighter the blue record slices, floored at 75% off.', requiresUpgrade: 'e' },
      ],
    },
    f: {
      label: 'Notes on the bugle bar (Perfect Pitch adds the two you are not meant to strike)',
      variants: [
        { emoji: '🎺', name: 'Brass Note', description: 'Click it under the line: +1% move AND attack speed, banked permanently. Drop it and the call is over.' },
        { emoji: '🔴', name: 'Red Note', description: 'Let it run off the end of the bar for +1% damage. Striking one counts as a mistake; missing one does not.', requiresUpgrade: 'f' },
        { emoji: '💚', name: 'Green Hold Note', description: 'Catch the head and keep the button down across the tail. A perfect carry is +3% attack speed; a partial one pays pro rata.', requiresUpgrade: 'f' },
      ],
    },
  },
};

export function getAbilityVariants(elementId: string, displayKey: string): AbilityVariantSet | undefined {
  return ABILITY_VARIANTS[elementId]?.[displayKey.toLowerCase()];
}

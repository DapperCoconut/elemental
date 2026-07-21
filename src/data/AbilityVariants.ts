import { BASE_GUNS, GUN_NAMES, GUN_EMOJIS, GUN_DESCS } from '../elements/kits/MetalKit';

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
  metal: {
    r: {
      label: 'Possible weapons (1 of 3 added to your arsenal per cast)',
      variants: [
        ...BASE_GUNS.map((id) => ({
          emoji: GUN_EMOJIS[id],
          name: GUN_NAMES[id],
          description: GUN_DESCS[id],
        })),
        { emoji: GUN_EMOJIS['sniper'], name: GUN_NAMES['sniper'], description: GUN_DESCS['sniper'], requiresUpgrade: 'r' },
      ],
    },
  },
  creation: {
    e: {
      label: 'Crucible crafts (load 3 bolts of any tiers to trigger)',
      variants: [
        { emoji: '🟠', name: 'Copper + Copper + Copper', description: '8 copper bolts radiate outward from the Crucible (5 dmg each).' },
        { emoji: '⚪', name: 'Copper + Copper + Silver', description: 'Summons a homing scythe from the Crucible.' },
        { emoji: '⚪', name: 'Copper + Silver + Silver', description: 'Spawns a Medkit at the Crucible (+25 HP).' },
        { emoji: '⚪', name: 'Silver + Silver + Silver', description: '3 healing pulses from the Crucible (10 HP each, 110px range).' },
        { emoji: '🟡', name: 'Gold + Gold + Gold', description: 'Cross-shaped 4-beam strike (35 dmg each) + 25% damage reduction for 15s.' },
        { emoji: '🟡', name: 'Copper + Copper + Gold', description: 'Summons a Ghoul at the Crucible.' },
        { emoji: '🟡', name: 'Copper + Gold + Gold', description: '3 damage pulses from the Crucible (15 dmg each, 110px range).' },
        { emoji: '🟡', name: 'Gold + Silver + Silver', description: '5 fire DOT pools scattered across the arena.' },
        { emoji: '🟡', name: 'Gold + Gold + Silver', description: '+30% speed boost for 15s.' },
      ],
    },
  },
  technology: {
    click: {
      label: 'Arsenal weapons (grab the one shown in the cycling box)',
      variants: [
        { emoji: '🗡️', name: 'Sword Whip', description: 'Melee arc swing — 110px range, 55° cone, 22 dmg.' },
        { emoji: '💿', name: 'Disc Dancer', description: 'Twin discs fly forward in parallel, then converge to explode at their midpoint (16 dmg, 50px AoE) — twice.' },
        { emoji: '🌀', name: 'Helix Shot', description: 'Hold to fire a weaving twin-stream of bullets that alternate sides (5 dmg each).' },
        { emoji: '💣', name: 'Code Cruncher', description: 'Lobs an arcing grenade that sticks to a wall or the enemy, exploding after 3s (35 dmg, 65px AoE).' },
        { emoji: '🧲', name: 'Dragger', description: 'Hold to drag the enemy toward your cursor for up to 5s (1 dmg tick every 0.5s); slamming them into a wall deals 10 dmg (every 2s).', requiresUpgrade: 'click' },
        { emoji: '✂️', name: 'String Cutter', description: "Fires an infinite laser wire through both directions along a fixed line — 18 dmg per hit, 0.6s between shots.", requiresUpgrade: 'click' },
        { emoji: '🔫', name: 'Rifle', description: '3-round hitscan rifle (8 dmg/shot). Press Q when empty to reload via a 3-zone timing minigame.', requiresUpgrade: 'q' },
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
        { emoji: '🪨', name: "Gaia's Guidance", description: 'Summons 3 orbiting rock orbs (10 dmg on contact) for 5s.' },
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
  death: {
    e: {
      label: "Ferryman's Soul Shop (E+, spend 💀 souls earned from wisp/enemy kills)",
      variants: [
        { emoji: '🛡️', name: 'Wisp Armor', description: 'Wisps: HP ×1.5, give ×2 kills. Cost: 10 💀', requiresUpgrade: 'e' },
        { emoji: '🗡️', name: 'Wisp Screamers', description: 'Wisps fire bolts at their target, give ×2 kills. Cost: 10 💀', requiresUpgrade: 'e' },
        { emoji: '⚡', name: 'Swift Scythe', description: 'Looming Dread fuses in 3s instead of 5s. Cost: 5 💀', requiresUpgrade: 'e' },
        { emoji: '🎯', name: 'Critical Success', description: 'Every 10th 1000 Blades click deals ×2 damage. Cost: 15 💀', requiresUpgrade: 'e' },
        { emoji: '💀', name: 'Wisp Bane', description: '1000 Blades clicks vs wisps and the Three-Headed Beast deal ×2. Cost: 20 💀', requiresUpgrade: 'e' },
        { emoji: '👑', name: 'Daemon King', description: 'Wisp Daemon HP ×2; unlocked Trail Dash lasts ×2 as long. Cost: 5 💀', requiresUpgrade: 'e' },
        { emoji: '🔪', name: 'Blade Apex', description: 'Trail Dash slash trails last 10s instead of 5s. Cost: 10 💀', requiresUpgrade: 'e' },
        { emoji: '🕳️', name: 'Edge of Finality', description: 'Judgement Day\'s hole arms in 5s (down from 15s) with a bigger suck range. Cost: 25 💀', requiresUpgrade: 'e' },
        { emoji: '💨', name: 'Splice', description: 'Repeatable — instantly grants Trail Dash for 10s. Cost: 5 💀 each time.', requiresUpgrade: 'e' },
      ],
    },
  },
  sound: {
    click: {
      label: 'Composed note types (Click+: right-click to enter Composing Mode, drag onto the bar — 20-pt budget)',
      variants: [
        { emoji: '⚪', name: 'Normal Note', description: '20 dmg on hit. Costs 1 pt.', requiresUpgrade: 'click' },
        { emoji: '🔴', name: 'Red Note', description: '30 dmg on hit (crit). Costs 3 pts.', requiresUpgrade: 'click' },
        { emoji: '🔵', name: 'Blue Note', description: '20 dmg + slows the enemy 30% for 2s. Costs 2 pts.', requiresUpgrade: 'click' },
        { emoji: '🟣', name: 'Purple Note', description: '20 dmg + grants you +25% speed for 3s. Costs 3 pts.', requiresUpgrade: 'click' },
      ],
    },
  },
};

export function getAbilityVariants(elementId: string, displayKey: string): AbilityVariantSet | undefined {
  return ABILITY_VARIANTS[elementId]?.[displayKey.toLowerCase()];
}

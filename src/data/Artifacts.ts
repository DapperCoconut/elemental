/**
 * Artifacts — the Vault's reusable relics.
 *
 * An artifact behaves like a campaign shop item at the point of use: you arm it from the
 * 🎒 bag and it takes effect in your next match. The difference is that it is never spent.
 * Arming one puts it on a five-minute real-time cooldown instead of deleting it, so an
 * artifact is a permanent part of the profile that has to be *rationed* rather than hoarded.
 *
 * Because they are permanent, they do not compete with items on the stat sheet — every one
 * of them is a **rule change**. Items add 12% damage; artifacts make your shots bounce off
 * the walls ten times. That is the whole design brief, and it is why `ArtifactPowerId` is a
 * closed union rather than the open `ItemEffect` bag: each power is bespoke code in
 * `ArtifactsKit`, and a new artifact is a new case there, not a new number here.
 *
 * The read-out under each name is hand-written for the same reason. `Items.describeEffect`
 * generates its prose because an item is a pile of multipliers; there is no honest way to
 * generate "your projectiles bounce off the walls up to ten times".
 */

/** Every power the kit knows how to run. One case in `ArtifactsKit` per entry. */
export type ArtifactPowerId =
  | 'ricochet'
  | 'splitPrism'
  | 'homing'
  | 'molasses'
  | 'staticBraid'
  | 'leechHalo'
  | 'rimeBrand'
  | 'grudgeLedger'
  | 'wrathEngine'
  | 'bulletBallet'
  | 'gravitySnare'
  | 'mirrorBulwark'
  | 'recursionLoop'
  | 'emberTrail'
  | 'kingmaker';

export interface ArtifactDef {
  id: string;
  name: string;
  emoji: string;
  power: ArtifactPowerId;
  /** Plate colour in the bag and on the reward card. */
  accent: number;
  /** Hand-written line of character. */
  flavor: string;
  /** The mechanical truth, one bullet per thing it actually does. */
  lines: string[];
  /** How this one plays with the others — the Vault sells combos, so it says so out loud. */
  combo: string;
}

/** Five minutes, in ms. An artifact that has just been armed cannot be armed again inside it. */
export const ARTIFACT_COOLDOWN_MS = 5 * 60 * 1000;

export const ARTIFACTS: ArtifactDef[] = [
  {
    id: 'ricochet-glyph', name: 'Ricochet Glyph', emoji: '🔷', power: 'ricochet', accent: 0x4fc3ff,
    flavor: 'Scratched onto the inside of the arena wall, facing in. The wall has opinions now.',
    lines: [
      'Every projectile you fire bounces off the arena walls instead of dying on them',
      'Up to 10 bounces, then it expires',
      'Each bounce adds +8% damage to that shot (up to +80%)',
    ],
    combo: 'A bounced shot is still your shot — Split Prism splits it, Hunter\'s Eye steers it home.',
  },
  {
    id: 'split-prism', name: 'Split Prism', emoji: '🔱', power: 'splitPrism', accent: 0xb45cff,
    flavor: 'Hold it up to anything travelling fast. There are now three of that thing.',
    lines: [
      'A quarter-second after you fire, every projectile forks into two more at ±20°',
      'Forks deal 55% damage and never fork again',
      'Works on anything you shoot, once per shot',
    ],
    combo: 'With the Ricochet Glyph one trigger pull fills the room. With Static Braid it counts as three hits.',
  },
  {
    id: 'hunters-eye', name: "Hunter's Eye", emoji: '🦅', power: 'homing', accent: 0xffc44d,
    flavor: 'Taken from something that has never once looked away from what it wanted.',
    lines: [
      'Your projectiles steer toward the enemy for their entire flight, up to 260°/sec',
      'Turning never changes their speed — a homing shot arrives just as hard',
    ],
    combo: 'Curves Ricochet bounces back onto the target and drags every Split Prism fork home with them.',
  },
  {
    id: 'molasses-lens', name: 'Molasses Lens', emoji: '🍯', power: 'molasses', accent: 0xd8a531,
    flavor: 'Look through it and everything coming at you is doing so very politely.',
    lines: [
      'Every enemy projectile crosses the arena at 40% speed, for the whole match',
      'Slowed shots are dimmed and trailed so you can read the room at a glance',
    ],
    combo: 'A room full of crawling shots is a room full of Bullet Ballet near-misses.',
  },
  {
    id: 'static-braid', name: 'Static Braid', emoji: '⚡', power: 'staticBraid', accent: 0xffee00,
    flavor: 'Three wires plaited together and left to argue. Every fourth word is a bolt.',
    lines: [
      'Every 4th time you damage the enemy, lightning falls on them',
      '45 damage in a 170px radius, and it stuns for 0.35s',
    ],
    combo: 'Counts *hits*, not casts — Split Prism forks and Ember Trail ticks all feed the count.',
  },
  {
    id: 'leech-halo', name: 'Leech Halo', emoji: '🩸', power: 'leechHalo', accent: 0xff4d6d,
    flavor: 'It hangs a hand\'s breadth off your skin and it is always, quietly, hungry.',
    lines: [
      'A 180px halo drains 7 HP per second from any enemy standing inside it',
      'Every point drained is healed straight back to you',
    ],
    combo: 'Gravity Snare drags them into the halo and roots them there. Wrath Engine wants you hurt; this stops it being fatal.',
  },
  {
    id: 'rime-brand', name: 'Rime Brand', emoji: '❄️', power: 'rimeBrand', accent: 0x88ccff,
    flavor: 'Pressed cold instead of hot. The mark it leaves goes all the way through.',
    lines: [
      'Every hit you land stacks one Rime on the enemy (stacks fade after 6s)',
      'At 6 stacks they freeze solid for 1.4s and the stacks clear',
      'A frozen enemy takes +40% damage from everything',
    ],
    combo: 'Split Prism triples your stack rate; Static Braid\'s bolt lands inside the freeze window.',
  },
  {
    id: 'grudge-ledger', name: 'Grudge Ledger', emoji: '📕', power: 'grudgeLedger', accent: 0xc23a2e,
    flavor: 'Every page is a date, a name, and a number. The column at the right is unpaid.',
    lines: [
      'All damage you take is written down',
      'Every 12s the ledger is settled: 45% of the running total is repaid to the enemy at once',
      'Settling clears the page — nothing carries over',
    ],
    combo: 'The one artifact that rewards being hit, which is exactly what Wrath Engine already wanted.',
  },
  {
    id: 'wrath-engine', name: 'Wrath Engine', emoji: '🔺', power: 'wrathEngine', accent: 0xff7a2f,
    flavor: 'A machine with one input and one output, and the input is how badly today is going.',
    lines: [
      '+1.4% damage for every 1% of your max HP that is missing',
      'Caps at +70% damage on the last sliver of health',
      'Updates continuously — healing gives the damage back',
    ],
    combo: 'Leech Halo and Grudge Ledger both let you live at the bottom of the bar where this pays out.',
  },
  {
    id: 'bullet-ballet', name: 'Bullet Ballet', emoji: '🩰', power: 'bulletBallet', accent: 0xff5fa2,
    flavor: 'The trick is not dodging. The trick is dodging by exactly as little as possible.',
    lines: [
      'An enemy shot that passes within 30px without hitting you grants a Grace stack',
      'Each stack: +10% move speed and +9% damage, for 4s. Up to 5 stacks',
      'Refreshing a stack refreshes them all',
    ],
    combo: 'Molasses Lens turns every incoming shot into a near-miss you can actually stand in.',
  },
  {
    id: 'gravity-snare', name: 'Gravity Snare', emoji: '🕸️', power: 'gravitySnare', accent: 0x8844cc,
    flavor: 'Not a net. A local disagreement about which direction "down" is.',
    lines: [
      'Every 9s the enemy is yanked halfway to you',
      'They are rooted where they land for 1.1s',
    ],
    combo: 'Delivers them into the Leech Halo and the Ember Trail, and holds them there for Static Braid.',
  },
  {
    id: 'mirror-bulwark', name: 'Mirror Bulwark', emoji: '🪞', power: 'mirrorBulwark', accent: 0xd6dee6,
    flavor: 'It is not a shield. It is a very short, very decisive conversation about ownership.',
    lines: [
      'A mirror shell regrows every 10s',
      'The next hit it eats is cancelled outright and sent back at the attacker in full',
      'Cancelling a hit also knocks 2.5s off every cooldown you have',
    ],
    combo: 'The refund is per shell, so Molasses Lens (more incoming shots, all slow) turns it into a cooldown engine.',
  },
  {
    id: 'recursion-loop', name: 'Recursion Loop', emoji: '♾️', power: 'recursionLoop', accent: 0x2ee6c0,
    flavor: 'Written in the margin of its own definition, which is how these things usually go.',
    lines: [
      'Every ability you cast has a 35% chance to come off cooldown instantly',
      'Applies to all five slots, ultimates included',
    ],
    combo: 'Mirror Bulwark\'s refund stacks with the roll — a loop that hits twice pays for the third cast.',
  },
  {
    id: 'ember-trail', name: 'Ember Trail', emoji: '🌠', power: 'emberTrail', accent: 0xff5a1e,
    flavor: 'You are not on fire. Where you have been is on fire. It is an important distinction.',
    lines: [
      'You leave a burning wake behind you wherever you walk',
      'Each patch lasts 3s and deals 16 damage per second to enemies standing in it',
    ],
    combo: 'Gravity Snare parks them in it. Rime Brand counts every tick as a hit.',
  },
  {
    id: 'kingmaker-crown', name: 'Kingmaker Crown', emoji: '👑', power: 'kingmaker', accent: 0xf0d68a,
    flavor: 'It does not make you a king. It makes the fight go on long enough that you become one.',
    lines: [
      'Every 20s the match lasts, permanently: +8% damage, +5% move speed, +30 max HP',
      'It never stops and it never resets',
    ],
    combo: 'Everything that stalls — Molasses Lens, Mirror Bulwark, Leech Halo — is now a stacking damage buff.',
  },
];

export function getArtifact(id: string): ArtifactDef | undefined {
  return ARTIFACTS.find((a) => a.id === id);
}

/**
 * Artifacts armed for the next match.
 *
 * The twin of `Items.consumedItemIds`, and cleared at the same place — `ArenaScene.create()`
 * hands the set to `ArtifactsKit` and empties it, so an artifact armed for a fight is spent
 * on that fight whether you win it or not.
 */
export const armedArtifactIds = new Set<string>();

export function clearArmedArtifacts(): void {
  armedArtifactIds.clear();
}

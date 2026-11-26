import { ElementCodex } from '../AbilityCodex';

/**
 * Astra — the cracked shell with a dwarf star inside, gathering a body of space dust.
 *
 * Verified against `src/elements/astra.ts` and `kits/AstraKit.ts`. Every number below is a constant
 * at the top of the kit. No shop upgrades (the first five went with the mass rework of
 * 2026-11-25), no mastery, no perks.
 */
const astra: ElementCodex = {
  identity:
    'A shell of deep space with a dwarf star inside it, gathering dust into a huge, slow body that '
    + 'soaks most of every hit. Its mass is thrown as a supernova and fed by a furnace — and a full '
    + 'bar of it collapses into the Singularity, a black hole with a kit of its own.',

  passives: [
    {
      emoji: '🌌',
      name: 'Space Dust',
      basics:
        'Clouds of space dust drift into the arena — one every 2.2s, up to five of yours at a time. '
        + 'Walk your hitbox into one for 10 mass, shown on the bar over your head (max 100). Mass '
        + 'makes you slower and much bigger, but it takes 75% of every hit instead of you, losing '
        + 'one point per point of damage. Enemies can walk inside your swollen hitbox.',
      effects: [
        { tag: 'resource', label: 'Mass', detail: '0–100. Dust cloud +10, comet shard +8, a shot melted by Nuclear Fusion +5.' },
        { tag: 'buff', label: 'Soak', detail: '75% of each hit comes off the mass instead of your health, while there is mass to take it.' },
        { tag: 'cost', label: 'Weight', detail: 'At full mass: half speed, and a hitbox 4.2 times its normal radius (about 92px).' },
      ],
    },
  ],

  abilities: {
    'astra-antimatter': {
      basics:
        'Launch a blob of liquid-mercury antimatter toward your cursor. It passes through enemies '
        + 'without hurting them. The moment it touches anything else physical — an enemy shot, a '
        + 'summon, a wall an enemy built, a shield an enemy is holding — it annihilates in a wide shockwave. The arena walls do not set it off: there it just splashes out. Every '
        + 'annihilation throws off 3 photons that chase your cursor.',
      cast: 'Click (hold to keep firing). 0.9s cooldown.',
      noUpgrade: true,
      effects: [
        { tag: 'damage', label: 'Annihilation', detail: '18 damage to every enemy within 120px of where it went off. The shot or summon it touched is destroyed.' },
        { tag: 'damage', label: 'Photons', detail: '3 per annihilation — none if the blob hits nothing. They fly after your cursor for 8s; the first enemy each one touches takes 8 and the photon is spent. They stack up to 15.' },
        { tag: 'utility', label: 'Blob', detail: '540px/s, flies until it meets something or leaves the arena.' },
      ],
      notes: ['The blob alone never hurts a body: put it on their shots, their summons or their shield.'],
    },

    'astra-supernova': {
      basics:
        'Throw off a large chunk of your mass — up to 45 of it — as a flaming shockwave centred on '
        + 'you. The more mass you throw, the harder and wider it hits. Needs at least 10 mass.',
      cast: 'E. 7s cooldown.',
      noUpgrade: true,
      effects: [
        { tag: 'damage', label: 'Shockwave', detail: '12 damage plus 0.5 per point of mass thrown: 34 at the full 45.' },
        { tag: 'area', label: 'Reach', detail: 'Your hitbox radius at the moment of the cast, plus 105px, plus 1.3px per point thrown.' },
        { tag: 'cost', label: 'Mass', detail: 'Spends up to 45. You shrink, and speed up, at once.' },
      ],
    },

    'astra-fusion': {
      basics:
        'For 3 seconds the inside of your hitbox heats to a furnace. Enemy projectiles that enter it '
        + 'are melted and add to your mass instead of taking from it, and enemies standing inside '
        + 'your hitbox burn.',
      cast: 'R. 12s cooldown.',
      noUpgrade: true,
      effects: [
        { tag: 'buff', label: 'Melt', detail: 'Each enemy projectile that enters the hitbox is destroyed for +5 mass.' },
        { tag: 'buff', label: 'Feed', detail: 'Hits that do land still lose 75% to the mass — which grows by that much instead of shrinking.' },
        { tag: 'damage', label: 'Burn', detail: '6 damage every 0.5s to each enemy inside your hitbox (36 over the 3s).' },
      ],
      notes: ['The bigger you are, the bigger the furnace.'],
    },

    'astra-comet': {
      basics:
        'A comet falls fast at your cursor, cracks the floor, and stays where it landed. Cover it '
        + 'with your hitbox to catch it: it then sits in place inside you and moves with you. Hold F '
        + 'to swing it round you faster and faster; release to throw it along its orbit. The longer '
        + 'the swing the harder it hits — past halfway it catches fire.',
      cast: 'F to call it (9s cooldown). With a comet caught: hold F to swing, release to throw.',
      noUpgrade: true,
      effects: [
        { tag: 'damage', label: 'Landing', detail: '14 damage within 58px, half a second after the cast.' },
        { tag: 'damage', label: 'Throw', detail: '10 damage with no swing, rising to 70 at full spin (about 2.8s of holding).' },
        { tag: 'utility', label: 'Shatter', detail: 'Thrown at 60% spin or more, it breaks on a wall or a body into 4 shards worth 8 mass each. Slower, it drops where it stopped and can be caught again.' },
        { tag: 'utility', label: 'Lifetime', detail: 'A comet lies on the floor for 20s. Calling another replaces it.' },
      ],
      notes: ['It leaves along the tangent of its orbit, not at your cursor — time the release.'],
    },

    'astra-singularity': {
      basics:
        'Only at maximum mass. You become a black hole and take everyone in with you: the world goes '
        + 'black, every other body is a black shape with a white outline, and you sit on a hovering '
        + 'throne, eyes closed, hands behind your back. Mass does not exist in here and you cannot be '
        + 'damaged or stunned. Your five keys become five new abilities. After 12 seconds an enemy '
        + 'player is asked whether they give up.',
      cast: 'Q, at 100 mass. Lasts until you leave (Q again) or the fight ends.',
      noUpgrade: true,
      effects: [
        { tag: 'damage', label: 'Click — Judgement', detail: 'Tap: a laser that cannot miss, 28 damage, 1.1s apart. Hold 3s and release: the world ends, and every enemy with it.' },
        { tag: 'control', label: 'Click on an enemy — drag', detail: 'Hold the button on an enemy to drag them with your cursor. They cannot move or act while held.' },
        { tag: 'damage', label: 'E — Godfist', detail: 'Teleport behind them; time slows before the hit. 50 damage, then 50 more when they hit the far wall. 6s.' },
        { tag: 'utility', label: 'R — Snap', detail: 'Swap health values with the nearest enemy. Snapped within 0.35s of being hit: teleport away instead and fire 3 lasers for 25 each. 8s.' },
        { tag: 'control', label: 'F — Kneel', detail: 'Every enemy kneels for 2s: no moving, no attacking. 7s.' },
        { tag: 'cost', label: 'Q — Play With Your Food', detail: 'Return to the arena. Every enemy is healed to full. Beat a bot after this for double rewards.' },
      ],
      notes: [
        'Piercing and true damage still reach you in the black hole.',
        'You leave with no mass.',
        'Let an enemy player go and beat them anyway, and the last thing they see is you laughing.',
      ],
    },
  },
};

export default astra;

import { ElementCodex } from '../AbilityCodex';

/**
 * Soul — necromancy as supply chain. The element manufactures its own corpses, and the fight is
 * won by whoever has more bodies standing at the end.
 *
 * Verified against `src/elements/soul.ts`, `kits/SoulKit.ts`, the soul block of
 * `data/Upgrades.ts`, the Ward and Call of the Void perks and `data/Mastery.ts`.
 */
const soul: ElementCodex = {
  identity:
    'A summoner with no summon button. Soul plants headstones that spit out zombies hunting *you*, '
    + 'burns those zombies down with its own lantern, and raises the corpses as Amalgams that fight '
    + 'at your side. Every part of the loop costs you something, and the payoff is the only genuine '
    + 'horde in the game — a wall of bodies that heals, buffs itself, and can be set on fire as a '
    + 'finisher.',

  passives: [
    {
      emoji: '⚰️',
      name: 'The Corpse Queue',
      basics:
        'A five-slot queue of bodies, newest at the front, so Arise! always raises your most recent '
        + 'kill. Anything that dies near you fills it — your own grave zombies burned down with Lantern '
        + 'Light, enemies you kill, Invasion husks. A corpse remembers its max HP, so raising a 200 HP '
        + 'creature gives you a 200 HP Amalgam, and Angered and variant traits carry through the queue as '
        + 'well.',
      effects: [
        { tag: 'resource', label: 'Capacity', detail: '5 corpses held. The newest goes to the front, so Arise! always raises the most recent kill.' },
        { tag: 'resource', label: 'What fills it', detail: 'Anything that dies near you — your own grave zombies burned down with Lantern Light, enemies you killed, and Invasion husks.' },
        { tag: 'utility', label: 'It remembers', detail: 'A corpse keeps its max HP, so raising a 200 HP creature gives you a 200 HP Amalgam. Angered and variant traits carry through the queue too.' },
      ],
      notes: [
        'With Restless Ground bought, the queue shows a picture of each fallen foe rather than a generic slot.',
      ],
    },
    {
      emoji: '👻',
      name: 'Amalgams',
      basics:
        'Your risen creatures: a 19px body at 115 px/s carrying the max HP of the corpse it came from. '
        + 'It bites for 8 on a 0.9s cooldown and every 4–6 seconds launches at ×2.4 speed for 0.4s to hit '
        + 'for 15. Amalgams raised from metal, earth, light or silence bodies swing instead of shooting — '
        + '6 damage within 50px every 0.8s. They can be repaired: Lantern Light pools heal them 3 HP a '
        + 'second, and Death Whistle restores 75% of their max HP outright.',
      effects: [
        { tag: 'summon', label: 'The body', detail: 'A 19px creature moving at 115 px/s, with the max HP of whatever corpse it came from.' },
        { tag: 'damage', label: 'Bite', detail: '8 damage on a 0.9s cooldown.' },
        { tag: 'damage', label: 'Dash bite', detail: 'Every 4–6s it launches at ×2.4 speed for 0.4s and hits for 15.' },
        { tag: 'damage', label: 'Melee lineage', detail: 'Amalgams raised from metal, earth, light or silence bodies swing instead of shooting: 6 damage within 50px every 0.8s.' },
        { tag: 'utility', label: 'They can be healed', detail: 'Lantern Light puddles heal them 3 HP/s, and Death Whistle restores 75% of their max HP outright.' },
      ],
      notes: [
        'Dealing damage with Amalgams is one of the four Soul Mastery requirements (1000 damage), and raising them is another (200 Amalgams).',
      ],
    },
  ],

  abilities: {
    'soul-lantern-light': {
      basics:
        'Hold Click and a spark chases your cursor, dropping a 14px pool every 0.15s that lasts 2.5 '
        + 'seconds and ticks once a second. Pools burn enemies for 5 a second — and your own grave '
        + 'zombies, which is the point — while healing you and every Amalgam standing in them for 3 a '
        + 'second. Held down, it lays a continuous lane.',
      cast: 'Hold Click. The spark chases the cursor and drops a pool wherever it goes.',
      effects: [
        { tag: 'dot', label: 'Burns', detail: '5 damage a second to any enemy standing in a pool — and to your own grave zombies, which is the point.' },
        { tag: 'heal', label: 'Mends', detail: '3 HP a second to you and to every Amalgam standing in a pool.' },
        { tag: 'area', label: 'The pools', detail: '14px radius, lasting 2.5s each, ticking once a second. Held down they form a continuous lane.' },
        { tag: 'utility', label: 'Availability', detail: '0.15s between drops — effectively continuous while held.' },
      ],
      upgrade: {
        basics:
          'An Amalgam already at full HP keeps absorbing at 3 HP a second as shield HP, up to 100% of its '
          + 'maximum — 200% effective health at the cap.',
        effects: [
          { tag: 'shield', label: 'Overheal', detail: 'An Amalgam at full HP keeps absorbing at 3 HP/s as shield HP, up to 100% of its max — 200% effective health at the cap.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The pools are the element\'s only self-heal. Soul has no other way to recover.',
      ],
    },

    'soul-arise': {
      basics:
        'Pops the front of the corpse queue and raises one Amalgam carrying that corpse\'s max HP, '
        + 'variant abilities and any Angered buff it died with. There is no cap on how many Amalgams can '
        + 'be out at once. 3s cooldown, and it silently does nothing when the queue is empty.',
      cast: 'E. Pops the front of the corpse queue. Silently does nothing when the queue is empty.',
      effects: [
        { tag: 'summon', label: 'Raise', detail: 'One Amalgam, carrying the corpse\'s max HP, variant abilities and any Angered buff it died with.' },
        { tag: 'resource', label: 'Cost', detail: 'One corpse from the 5-slot queue. There is no cap on how many Amalgams you can have out at once.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        basics:
          'Casting within 70px of one of your graves enhances the grave instead of spending a corpse: it '
          + 'starts spitting Angered Zombies at ×2 max HP (40 instead of 20) and ×1.25 move speed, with '
          + 'glowing red eyes. The buff persists all the way down the chain — an Angered Zombie burned down '
          + 'becomes an Angered corpse and then an Angered Amalgam, doubled HP included.',
        effects: [
          { tag: 'buff', label: 'Enhance a grave', detail: 'Casting within 70px of one of your graves enhances it instead of consuming a corpse.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Angered Zombies', detail: '×2 max HP (40 instead of 20) and ×1.25 move speed, with visibly glowing red eyes.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Buffs persist', detail: 'An Angered Zombie you burn down becomes an Angered corpse and then an Angered Amalgam — the doubled HP is kept all the way through.', requiresUpgrade: 'e' },
        ],
      },
    },

    'soul-grave': {
      basics:
        'Plants a permanent headstone at the cursor that spits out a zombie every 5 seconds. There is '
        + 'no cap and no way to remove one, and the zombies hunt you: 20 HP, 70 px/s, biting for 5 on a '
        + '1.2s cooldown. That is the point — burning your own zombies down with Lantern Light is the '
        + 'main way to fill the corpse queue. 0.5s cooldown, so you can carpet the arena in seconds, '
        + 'which is exactly the mistake to avoid.',
      cast: 'R at the cursor. Instant.',
      effects: [
        { tag: 'summon', label: 'The grave', detail: 'A permanent headstone spitting out one zombie every 5s. Uncapped in number, and there is no way to remove one.' },
        { tag: 'cost', label: 'It hunts you', detail: 'Grave zombies target the caster: 20 HP, 70 px/s, biting for 5 on a 1.2s cooldown.' },
        { tag: 'resource', label: 'The point', detail: 'Burning your own zombies down with Lantern Light is the main way to fill the corpse queue.' },
        { tag: 'utility', label: 'Availability', detail: '0.5s cooldown — you can carpet the arena in seconds, which is exactly the mistake it warns about.' },
      ],
      upgrade: {
        basics:
          'A grave now has a 35% chance to spit a Speedster, Tank, Blaster, Spitter, Medic or Rusher '
          + 'instead of a basic zombie. Kill one, raise it, and the Amalgam keeps that variant\'s unique '
          + 'abilities — and the corpse queue starts showing a picture of each fallen foe instead of a '
          + 'generic slot.',
        effects: [
          { tag: 'summon', label: 'Variant chance', detail: '35% chance a grave spits a Speedster, Tank, Blaster, Spitter, Medic or Rusher instead of a basic zombie.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Recruitable', detail: 'Kill one and Arise! it and the Amalgam keeps that variant\'s unique abilities.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Readable queue', detail: 'The corpse queue starts showing a picture of each fallen foe rather than a generic slot.', requiresUpgrade: 'r' },
        ],
      },
    },

    'soul-death-whistle': {
      basics:
        'Recalls every living Amalgam to the mark at the cursor; each one that arrives within 30px is '
        + 'healed 75% of its max HP and then resumes fighting from there. 8s cooldown.',
      cast: 'F at the cursor. Every living Amalgam is recalled.',
      effects: [
        { tag: 'heal', label: 'Arrival heal', detail: '75% of an Amalgam\'s max HP restored when it gets within 30px of the shriek point.' },
        { tag: 'movement', label: 'The recall', detail: 'Every Amalgam breaks off and runs to the mark, then resumes fighting from there.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        basics:
          'Every Amalgam that reaches the mark also gets +50% move speed and +50% damage for 10 seconds, '
          + 'trailing red. It multiplies with the Angered buff and with variant traits rather than '
          + 'replacing them.',
        effects: [
          { tag: 'buff', label: 'Blooded', detail: '+50% move speed and +50% damage for 10s on every Amalgam that reaches the mark, with a red trail.', requiresUpgrade: 'f' },
          { tag: 'buff', label: 'Stacks with everything', detail: 'It multiplies with the Angered buff and with variant traits rather than replacing them.', requiresUpgrade: 'f' },
        ],
      },
      notes: [
        'Healing Amalgams with the whistle is one of the four Soul Mastery requirements (200 HP healed).',
      ],
    },

    'soul-hells-torment': {
      basics:
        'Sets every living Amalgam alight at once, arena-wide. They burn down at 5 damage a second and '
        + 'die of it — this is a sacrifice, not a buff. While burning, each throws 3 embers a second at 5 '
        + 'damage and scorches a 60px radius around itself for 15 once a second, and each one that burns '
        + 'out bursts into 12 embers across a 120px radius. 20s cooldown.',
      cast: 'Q. Instant, arena-wide, ignites every living Amalgam at once.',
      effects: [
        { tag: 'cost', label: 'They burn down', detail: '5 damage a second to each of your own Amalgams. They die to it — this is a sacrifice, not a buff.' },
        { tag: 'damage', label: 'Ember spray', detail: '3 embers a second off each burning Amalgam, 5 damage each.' },
        { tag: 'damage', label: 'Scorched ground', detail: '15 damage in a 60px radius around each burning Amalgam, once a second.' },
        { tag: 'damage', label: 'Detonation', detail: 'A burnt-out Amalgam bursts into 12 embers across a 120px radius.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown.' },
      ],
      upgrade: {
        basics:
          'An Amalgam killed by Hell\'s Torment comes back: it re-enters the corpse queue at 100 HP with a '
          + '15-damage bite and a 20-damage dash. Every 20 damage an Inflamed takes leaks embers and a '
          + 'torment blast around it, and its death is 20 embers and a 45-damage blast in a 170px radius — '
          + 'nearly half again the ordinary detonation\'s reach.',
        effects: [
          { tag: 'summon', label: 'The Inflamed', detail: 'An Amalgam killed by Hell\'s Torment re-enters the corpse queue at 100 HP with a 15-damage bite and a 20-damage dash.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Leaking fire', detail: 'Every 20 damage an Inflamed takes releases embers and a torment blast around it.', requiresUpgrade: 'q' },
          { tag: 'damage', label: 'Their death', detail: '20 embers and a 45-damage blast in a 170px radius — nearly half again the ordinary detonation\'s reach.', requiresUpgrade: 'q' },
        ],
      },
      notes: [
        'Setting Amalgams ablaze is one of the four Soul Mastery requirements (25 ignitions).',
      ],
    },
  },

  perks: {
    ward: {
      basics:
        'All incoming damage ×0.7, a flat 30% off, for as long as at least 2 living Amalgams are within '
        + '220px of you; below that it switches off immediately. It clamps your incoming multiplier at '
        + '0.7 rather than stacking, so it never combines with a stronger reduction.',
      effects: [
        { tag: 'shield', label: 'Damage reduction', detail: 'All incoming damage ×0.7 — a flat 30% off — while the condition holds.' },
        { tag: 'utility', label: 'The condition', detail: 'At least 2 living Amalgams within 220px of you. Below that it switches off immediately.' },
        { tag: 'cost', label: 'Not additive', detail: 'It clamps your incoming multiplier at 0.7 rather than stacking, so it never combines with a stronger reduction.' },
      ],
    },
    'call-of-the-void': {
      basics:
        'Every Death Whistle also executes: any enemy within 150px of the shriek at or below the '
        + 'current threshold dies outright, through anything. The threshold starts at 10% health and '
        + 'rises 5% for every whistle that claims something, to a maximum of 30% — and the first whistle '
        + 'that claims nothing drops it straight back to 10%, so a wasted shriek costs the whole '
        + 'build-up.',
      cast: 'Nothing new to press. Every Death Whistle carries the call.',
      effects: [
        { tag: 'damage', label: 'The claim', detail: 'Every enemy within 150px of the shriek at or below the current threshold dies outright, through anything.' },
        { tag: 'resource', label: 'Escalation', detail: 'Starts at 10% HP. Each whistle that claims something raises the threshold by 5%, to a maximum of 30%.' },
        { tag: 'cost', label: 'The reset', detail: 'The first whistle that claims nothing drops the threshold back to 10%. A wasted shriek costs you the whole build-up.' },
      ],
    },
  },

  mastery: {
    'strength-in-numbers': {
      basics:
        'Every Amalgam gains 5% damage resistance for every other Amalgam alive: five out is 20% each, '
        + 'ten out is 45% each, capped at 75% once you have sixteen. Past that the horde is functionally '
        + 'unkillable by chip damage. The links are drawn as grey threads between bodies, so the size of '
        + 'the bonus is visible on the field.',
      effects: [
        { tag: 'shield', label: 'Per-ally resistance', detail: '5% damage resistance to each Amalgam for every *other* Amalgam alive — 5 out means each takes 20% less, 10 out means 45% less.' },
        { tag: 'shield', label: 'The cap', detail: '75% maximum, reached at 16 Amalgams. Past that the horde is functionally unkillable by chip damage.' },
        { tag: 'utility', label: 'Readable', detail: 'The links are drawn as grey threads between bodies, so the size of the bonus is visible on the field.' },
      ],
      notes: [
        'Passive — no bind and no key. It rewards the grave-spam the base ability warns you about.',
      ],
    },
    'grave-mistake': {
      basics:
        'A bindable two-stage key. The first cast destroys your nearest grave to wake an Alpha: 200 HP '
        + 'at 85 px/s, hostile to you, biting for 20 and firing 5 green bullets every 3 seconds at 5 '
        + 'damage each, where a hit blocks all healing — yours and your allies\' — for 5 seconds. Your '
        + 'zombies and your shots both damage it, and killing it raises it as an Amalgam under your '
        + 'control. From then on the same key is Soul Screech: 25 damage in a 165px radius, healing '
        + 'allies inside that radius for half the health you are personally missing (150 each at 400 max '
        + 'and 100 remaining), with the excess spilling into weak HP rather than being wasted. 12s '
        + 'cooldown on both forms.',
      cast: 'Bindable to E, R, F or Q. The first cast destroys your nearest grave to wake the Alpha. Once the Alpha is killed the same key becomes Soul Screech.',
      effects: [
        { tag: 'summon', label: 'The Alpha', detail: '200 HP, moving at 85 px/s, hostile to you. It bites for 20.' },
        { tag: 'debuff', label: 'Anti-heal cones', detail: 'Every 3s it fires 5 green bullets at 5 damage each. Being hit blocks all healing — yours and your allies\' — for 5s.' },
        { tag: 'utility', label: 'Bringing it down', detail: 'Your own zombies and your own shots both damage it. Kill it and it rises as an Amalgam under your control.' },
        { tag: 'damage', label: 'Soul Screech', detail: 'After the Alpha falls the key becomes a 25-damage scream in a 165px radius.' },
        { tag: 'heal', label: 'Screech healing', detail: 'Allies inside the same 165px radius are healed for 50% of the health you are personally missing this round — at 400 max HP and 100 remaining, that is 150 each. Excess spills into weak HP rather than being wasted.' },
        { tag: 'utility', label: 'Availability', detail: '12s cooldown on both forms.' },
      ],
      notes: [
        'It costs you a grave, which is the resource the whole element runs on — an early Alpha is a real setback if it goes badly.',
        'The Screech heals *more* the worse your own health is, so it is at its strongest exactly when the horde is losing.',
      ],
    },
  },
};

export default soul;

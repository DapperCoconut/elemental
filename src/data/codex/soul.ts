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
    + 'drains those zombies dry on a siphon cord, and raises the corpses as Amalgams that fight '
    + 'at your side. Every part of the loop costs you something, and the payoff is the only genuine '
    + 'crew in the game — three bodies that heal, buff each other, and can be set on fire as a '
    + 'finisher, or climbed into and worn.',

  passives: [
    {
      emoji: '⚰️',
      name: 'The Corpse Queue',
      basics:
        'A five-slot queue of bodies, newest at the front, so Arise! always raises your most recent '
        + 'kill. Anything that dies near you fills it — your own grave zombies drained down on a Siphon '
        + 'cord, enemies you kill, Invasion husks. A corpse remembers its max HP, so raising a 200 HP '
        + 'creature gives you a 200 HP Amalgam, and Angered and variant traits carry through the queue as '
        + 'well.',
      effects: [
        { tag: 'resource', label: 'Capacity', detail: '5 corpses held. The newest goes to the front, so Arise! always raises the most recent kill.' },
        { tag: 'resource', label: 'What fills it', detail: 'Anything that dies near you — your own grave zombies drained down on a Siphon cord, enemies you killed, and Invasion husks.' },
        { tag: 'utility', label: 'It remembers', detail: 'A corpse keeps its max HP, so raising a 200 HP creature gives you a 200 HP Amalgam. Angered and variant traits carry through the queue too.' },
      ],
      notes: [
        'The queue always shows a picture of each fallen foe, so a tier 3 graveyard\'s output is readable before you raise any of it.',
      ],
    },
    {
      emoji: '🧟',
      name: 'Three Bodies',
      basics:
        'One side may have three living bodies on the field at a time, and grave zombies and '
        + 'Amalgams share the ceiling — a zombie you have not drained yet is a slot your Amalgam '
        + 'cannot use, which is the whole tension of the loop. A grave that comes due while the field '
        + 'is full simply holds its spawn and restarts its 5 second clock, so nothing banks up and '
        + 'arrives at once; Arise refuses outright and does not spend the corpse. The count is drawn '
        + 'beside the corpse queue and turns red at the ceiling.',
      effects: [
        { tag: 'resource', label: 'The ceiling', detail: '3 living bodies per side, counting grave zombies and Amalgams together.' },
        { tag: 'cost', label: 'They compete', detail: 'A grave zombie you have not drained yet occupies a slot your Amalgam cannot use. Draining is how you make room as well as how you make corpses.' },
        { tag: 'utility', label: 'Graves hold, they do not queue', detail: 'A grave that comes due at the cap skips that spawn and restarts its 5 second clock, so nothing banks up.' },
        { tag: 'utility', label: 'Arise refuses for free', detail: 'Arise at the cap does nothing and does not spend the corpse — you lose the 3 second cooldown and nothing else.' },
      ],
      notes: [
        'The friendly Alpha from Grave Mistake is the one exemption: it is the payout for killing a 200 HP horror, not something you can raise on demand, and it replaced a body that was already on the field.',
        'Strength in Numbers reads the same three bodies, so its 5%-per-other-Amalgam resist tops out at 10% rather than its 75% cap.',
      ],
    },
    {
      emoji: '👻',
      name: 'Amalgams',
      basics:
        'Your risen creatures: a 19px body at 115 px/s carrying the max HP of the corpse it came from. '
        + 'It bites for 8 on a 0.9s cooldown and every 4–6 seconds launches at ×2.4 speed for 0.4s to hit '
        + 'for 15. Amalgams raised from metal, earth, light or silence bodies swing instead of shooting — '
        + '6 damage within 50px every 0.8s. They can be repaired: a Siphon cord feeds them 8 HP a '
        + 'second, and Death Whistle restores 75% of their max HP outright.',
      effects: [
        { tag: 'summon', label: 'The body', detail: 'A 19px creature moving at 115 px/s, with the max HP of whatever corpse it came from.' },
        { tag: 'damage', label: 'Bite', detail: '8 damage on a 0.9s cooldown.' },
        { tag: 'damage', label: 'Dash bite', detail: 'Every 4–6s it launches at ×2.4 speed for 0.4s and hits for 15.' },
        { tag: 'damage', label: 'Melee lineage', detail: 'Amalgams raised from metal, earth, light or silence bodies swing instead of shooting: 6 damage within 50px every 0.8s.' },
        { tag: 'utility', label: 'They can be healed', detail: 'A Siphon cord feeds them 8 HP/s with the overflow becoming shield HP, and Death Whistle restores 75% of their max HP outright.' },
      ],
      notes: [
        'Dealing damage with Amalgams is one of the four Soul Mastery requirements (1000 damage), and raising them is another (200 Amalgams).',
      ],
    },
  ],

  abilities: {
    'soul-siphon': {
      basics:
        'One press opens one cord onto whatever is nearest the cursor, inside 72px of it. A cord on '
        + 'anything hostile — the other fighter, an Invasion husk, the loose Alpha, or one of your own '
        + 'grave zombies — drains 2 damage out of it every 0.5s, so 4 a second per cord and 12 a second '
        + 'with all three on one target. A cord on one of your Amalgams feeds it 4 HP every 0.5s instead, '
        + 'and anything above its maximum becomes shield HP up to a second full bar, with no upgrade '
        + 'needed. Three cords is the ceiling; a fourth press recycles the oldest. They snap on their own '
        + 'past 330px.',
      cast: 'Click on something. One press, one cord — it is not held down.',
      effects: [
        { tag: 'dot', label: 'Drain', detail: '2 damage every 0.5s per cord — 4 a second, or 12 a second with all three on the same target.' },
        { tag: 'heal', label: 'Mend', detail: 'A cord on one of your Amalgams feeds it 4 HP every 0.5s — 8 a second — instead of draining it.' },
        { tag: 'shield', label: 'Overheal is free', detail: 'Healing above an Amalgam\'s maximum becomes shield HP, up to 100% of its max — 200% effective health at the cap. This is base now, not an upgrade.' },
        { tag: 'resource', label: 'Three cords', detail: 'Three at once, on three different things or all on one. A fourth press releases the oldest rather than being refused.' },
        { tag: 'utility', label: 'The leash', detail: 'A cord snaps on its own once the far end is more than 330px away, and the cord visibly pulls taut as it approaches that.' },
        { tag: 'utility', label: 'Availability', detail: '0.4s between presses.' },
      ],
      upgrade: {
        basics:
          'Put all three cords onto the same Amalgam and you climb into it for 12 seconds. Your own body '
          + 'opens up like a flower and stops being reachable at all — every point of damage aimed at it '
          + 'is swallowed before shields — while WASD walks the Amalgam, Click bites with it on a 0.65s '
          + 'cooldown, and whatever move its variant has is bound to E on a 4s cooldown: a spitter spits, '
          + 'a medic pulses, and anything else throws itself forward at ×3 speed for 0.4s. A ridden body '
          + 'bites far more than its AI ever would — every grave zombie on the board and the enemy\'s own '
          + 'risen are targets too, not just the opposing fighter. It ends at 12 seconds or when the '
          + 'Amalgam dies, whichever comes first, and takes 30 seconds to come back.',
        effects: [
          { tag: 'buff', label: 'Untouchable', detail: 'While riding, every point of damage aimed at your own body is absorbed outright, ahead of shields. 0 damage taken for the whole possession.', requiresUpgrade: 'click' },
          { tag: 'control', label: 'You are the Amalgam', detail: 'Your body is pinned in place and WASD drives the Amalgam instead, at its own move speed. Its AI stops running for the duration, and Death Whistle no longer recalls it.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Bite', detail: 'Click bites for the Amalgam\'s own bite damage within 58px, on a 0.65s cooldown.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'It can hit the dead too', detail: 'A ridden body targets every grave zombie on the board — yours included, which is how it feeds the corpse queue — and the enemy\'s own Amalgams, on top of the opposing fighter. Its AI only ever attacked the last of those 3.', requiresUpgrade: 'click' },
          { tag: 'damage', label: 'Its own move on E', detail: 'A 4s cooldown: a spitter fires a shot, a medic pulses 12% healing to nearby Amalgams within 165px, everything else lunges at ×3 speed for 0.4s.', requiresUpgrade: 'click' },
          { tag: 'cost', label: 'Duration and recovery', detail: '12 seconds, or until the Amalgam dies — whichever comes first. Then 30 seconds before a third cord can take you anywhere, counted from the moment you land back in your body.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'Your R, F and Q still answer while riding — the body is open, not asleep. Only Click and E are taken over, and E outranks a mastery bound to the same key for the duration.',
        'Draining your own grave zombies is the main way the corpse queue is fed, so the cords are the supply line as well as the damage.',
        'A plate under the corpse queue names the body you are wearing, shows its health and shield, counts the 12 seconds down, and becomes the 30 second recovery clock once you are out — so a third cord is never a guess.',
        'The three cords are released when the ride ends, so a possession always costs you your whole Siphon board as well as the cooldown.',
      ],
    },

    'soul-arise': {
      basics:
        'Pops the front of the corpse queue and raises one Amalgam carrying that corpse\'s max HP, '
        + 'variant abilities and any Angered buff it died with. There is no cap on how many Amalgams can '
        + 'be out at once beyond the shared 3-body ceiling. 3s cooldown, and it silently does nothing '
        + 'when the queue is empty or when the field is already full — in both cases the corpse stays put.',
      cast: 'E. Pops the front of the corpse queue. Silently does nothing when the queue is empty.',
      effects: [
        { tag: 'summon', label: 'Raise', detail: 'One Amalgam, carrying the corpse\'s max HP, variant abilities and any Angered buff it died with.' },
        { tag: 'resource', label: 'Cost', detail: 'One corpse from the 5-slot queue. Refused without spending anything while you already have 3 bodies standing.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        basics:
          'Everything you raise now leaves a cloud of decay where it falls — grave zombies and Amalgams '
          + 'alike. An 84px cloud lasting 6 seconds and ticking once a second: 6 damage a second to '
          + 'anything hostile inside it plus a 30% move slow while they stand there, and 6 HP a second to '
          + 'your own Amalgams, with the overflow becoming shield HP the same way a cord\'s does. The rot '
          + 'is left by the death, not by the cast, so it accumulates wherever the fighting actually is.',
        effects: [
          { tag: 'dot', label: 'Rot', detail: '6 damage a second to anything hostile standing in the 84px cloud, ticking once a second for 6 seconds.', requiresUpgrade: 'e' },
          { tag: 'control', label: 'Slow', detail: 'Anything hostile inside a cloud moves at ×0.7 for as long as it stays there. It is read live, so stepping out restores the stride immediately.', requiresUpgrade: 'e' },
          { tag: 'heal', label: 'It feeds your own', detail: '6 HP a second to every Amalgam of yours inside it, with the overflow becoming shield HP.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Left by the death', detail: 'Every grave zombie and every Amalgam of yours drops one when it dies — so the rot collects wherever the fighting actually is, not where you aimed.', requiresUpgrade: 'e' },
        ],
      },
    },

    'soul-grave': {
      basics:
        'Plants a permanent headstone at the cursor that spits out one plain zombie every 5 seconds — '
        + 'never anything else, unupgraded. There is '
        + 'no cap and no way to remove one, and the zombies hunt you: 20 HP, 70 px/s, biting for 5 on a '
        + '1.2s cooldown. That is the point — draining your own zombies down with Siphon is the '
        + 'main way to fill the corpse queue. 0.5s cooldown, so you can carpet the arena in seconds, '
        + 'which is exactly the mistake to avoid.',
      cast: 'R at the cursor. Instant.',
      effects: [
        { tag: 'summon', label: 'The grave', detail: 'A permanent headstone spitting out one zombie every 5s. Uncapped in number, and there is no way to remove one — though a grave that comes due while 3 bodies are already standing skips that spawn.' },
        { tag: 'summon', label: 'Plain bodies only', detail: 'Unupgraded, a grave raises the basic 20 HP zombie and nothing else — no variants, no tiers.' },
        { tag: 'cost', label: 'It hunts you', detail: 'Grave zombies target the caster: 20 HP, 70 px/s, biting for 5 on a 1.2s cooldown.' },
        { tag: 'resource', label: 'The point', detail: 'Draining your own zombies down with Siphon is the main way to fill the corpse queue — 1 body every 10s or so per grave.' },
        { tag: 'utility', label: 'Availability', detail: '0.5s cooldown — you can carpet the arena in seconds, which is exactly the mistake it warns about.' },
      ],
      upgrade: {
        basics:
          'Every grave now raises an elemental variant rather than a plain body, and a cast landed within '
          + '90px of a grave you already own builds that plot up instead of planting a second stone. Two '
          + 'more presses take it to tier 3, and the plot\'s tier is exactly the variant tier it raises — '
          + 'the stone reddens as it goes and the grave-light spreads. A tier 3 graveyard raises them '
          + 'Angered as well: ×2 max HP and ×1.25 move speed, with glowing red eyes. All of it carries down '
          + 'the chain, so a tier 3 body becomes a tier 3 corpse and then a tier 3 Angered Amalgam.',
        effects: [
          { tag: 'summon', label: 'Always a variant', detail: 'Every zombie a grave raises is an elemental variant now, not a 35% chance of one.', requiresUpgrade: 'r' },
          { tag: 'buff', label: 'Build a graveyard', detail: 'A cast within 90px of a grave you own raises that plot a tier instead of planting a stone. 3 tiers is the ceiling.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Tier is the tier', detail: 'A tier 2 plot raises tier 2 variants and a tier 3 plot raises tier 3 ones — the same three-tier ladder the Invasion lightning brands husks with.', requiresUpgrade: 'r' },
          { tag: 'summon', label: 'Angered at the top', detail: 'A tier 3 graveyard also raises them Angered: ×2 max HP and ×1.25 move speed, with visibly glowing red eyes.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'It carries down the chain', detail: 'A tier 3 Angered body becomes a tier 3 Angered corpse and then a tier 3 Angered Amalgam, doubled HP and variant abilities included.', requiresUpgrade: 'r' },
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
        'Every Amalgam gains 5% damage resistance for every other Amalgam alive. The formula still runs '
        + 'to a 75% cap at sixteen bodies, but the three-body ceiling means you will never see more than '
        + '10% — two Amalgams is 5% each and three is 10% each. What it really rewards now is keeping all '
        + 'three slots filled with Amalgams rather than with grave zombies you have not drained. The '
        + 'links are drawn as grey threads between bodies, thickening as the bonus climbs.',
      effects: [
        { tag: 'shield', label: 'Per-ally resistance', detail: '5% damage resistance to each Amalgam for every *other* Amalgam alive — 2 out means 5% each, 3 out means 10% each.' },
        { tag: 'shield', label: 'The cap you can reach', detail: '10%, at 3 Amalgams. The formula\'s own 75% ceiling needs 16 bodies and the field only holds 3.' },
        { tag: 'utility', label: 'Readable', detail: 'The links are drawn as grey threads between bodies, thickening and brightening as the bonus climbs.' },
      ],
      notes: [
        'Passive — no bind and no key. Since grave zombies and Amalgams share the three-body ceiling, the passive is really paying you to drain your plots down promptly rather than to plant more of them.',
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

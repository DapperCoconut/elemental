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
      magic:
        'Nothing you kill is wasted. Every body that falls near you is filed into a five-slot queue '
        + 'along the edge of the screen — newest first — and Arise! pops whatever is on top. The '
        + 'queue is the element\'s whole economy: no corpses, no army.',
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
      magic:
        'A raised corpse is a real fighter with its own health bar, its own AI and its own reach. '
        + 'They chase, they bite, they periodically launch themselves at whoever you are fighting, '
        + 'and the ones raised from elemental husks keep the quirks they had in life.',
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
      magic:
        'A spark trailed out of a lantern toward the cursor, dribbling small violet pools behind it. '
        + 'The pools do not care whose side anybody is on — they burn every enemy standing in them, '
        + 'including your own grave zombies, and they mend you and every Amalgam you own. This is how '
        + 'the corpses get made.',
      cast: 'Hold Click. The spark chases the cursor and drops a pool wherever it goes.',
      effects: [
        { tag: 'dot', label: 'Burns', detail: '5 damage a second to any enemy standing in a pool — and to your own grave zombies, which is the point.' },
        { tag: 'heal', label: 'Mends', detail: '3 HP a second to you and to every Amalgam standing in a pool.' },
        { tag: 'area', label: 'The pools', detail: '14px radius, lasting 2.5s each, ticking once a second. Held down they form a continuous lane.' },
        { tag: 'utility', label: 'Availability', detail: '0.15s between drops — effectively continuous while held.' },
      ],
      upgrade: {
        magic:
          'Soul Lantern stops the healing wasting itself on full-health Amalgams. Overflow is packed '
          + 'onto them as shield instead, so a horde parked in your light does not just stay alive — '
          + 'it doubles.',
        effects: [
          { tag: 'shield', label: 'Overheal', detail: 'An Amalgam at full HP keeps absorbing at 3 HP/s as shield HP, up to 100% of its max — 200% effective health at the cap.', requiresUpgrade: 'click' },
        ],
      },
      notes: [
        'The pools are the element\'s only self-heal. Soul has no other way to recover.',
      ],
    },

    'soul-arise': {
      magic:
        'The pay-off button. The newest corpse in the queue is hauled back up out of the ground and '
        + 'stands as an Amalgam under your control. It is a one-line ability with no numbers of its '
        + 'own — everything about the thing you raise was decided by whatever it used to be.',
      cast: 'E. Pops the front of the corpse queue. Silently does nothing when the queue is empty.',
      effects: [
        { tag: 'summon', label: 'Raise', detail: 'One Amalgam, carrying the corpse\'s max HP, variant abilities and any Angered buff it died with.' },
        { tag: 'resource', label: 'Cost', detail: 'One corpse from the 5-slot queue. There is no cap on how many Amalgams you can have out at once.' },
        { tag: 'utility', label: 'Availability', detail: '3s cooldown.' },
      ],
      upgrade: {
        magic:
          'Cruel Offering gives E a second meaning. Cast beside one of your own graves and it does '
          + 'not spend a corpse at all — it feeds the headstone. The grave starts producing Angered '
          + 'Zombies: twice the health, faster, with red eyes, and every buff they carry survives '
          + 'through the queue and into Amalgam-hood.',
        effects: [
          { tag: 'buff', label: 'Enhance a grave', detail: 'Casting within 70px of one of your graves enhances it instead of consuming a corpse.', requiresUpgrade: 'e' },
          { tag: 'summon', label: 'Angered Zombies', detail: '×2 max HP (40 instead of 20) and ×1.25 move speed, with visibly glowing red eyes.', requiresUpgrade: 'e' },
          { tag: 'utility', label: 'Buffs persist', detail: 'An Angered Zombie you burn down becomes an Angered corpse and then an Angered Amalgam — the doubled HP is kept all the way through.', requiresUpgrade: 'e' },
        ],
      },
    },

    'soul-grave': {
      magic:
        'A headstone driven into the floor, and it is not on your side. Every five seconds it shoves '
        + 'a shambling zombie out that hunts *you* — the element manufactures its own enemies so it '
        + 'has something to kill. Graves never expire and there is no cap, which is a warning rather '
        + 'than a feature.',
      cast: 'R at the cursor. Instant.',
      effects: [
        { tag: 'summon', label: 'The grave', detail: 'A permanent headstone spitting out one zombie every 5s. Uncapped in number, and there is no way to remove one.' },
        { tag: 'cost', label: 'It hunts you', detail: 'Grave zombies target the caster: 20 HP, 70 px/s, biting for 5 on a 1.2s cooldown.' },
        { tag: 'resource', label: 'The point', detail: 'Burning your own zombies down with Lantern Light is the main way to fill the corpse queue.' },
        { tag: 'utility', label: 'Availability', detail: '0.5s cooldown — you can carpet the arena in seconds, which is exactly the mistake it warns about.' },
      ],
      upgrade: {
        magic:
          'Restless Ground stops the graves producing the same shambler every time. What comes out '
          + 'might be any of the Invasion husk variants, and if you kill it and raise it, you keep '
          + 'whatever made it special.',
        effects: [
          { tag: 'summon', label: 'Variant chance', detail: '35% chance a grave spits a Speedster, Tank, Blaster, Spitter, Medic or Rusher instead of a basic zombie.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Recruitable', detail: 'Kill one and Arise! it and the Amalgam keeps that variant\'s unique abilities.', requiresUpgrade: 'r' },
          { tag: 'utility', label: 'Readable queue', detail: 'The corpse queue starts showing a picture of each fallen foe rather than a generic slot.', requiresUpgrade: 'r' },
        ],
      },
    },

    'soul-death-whistle': {
      magic:
        'A shriek thrown at a point on the floor. Every Amalgam you own drops what it is doing and '
        + 'runs for that spot, and the ones that reach it are healed most of the way back to full. '
        + 'It is a regroup, a heal and a repositioning tool in one press — the ability that keeps a '
        + 'horde alive long enough to matter.',
      cast: 'F at the cursor. Every living Amalgam is recalled.',
      effects: [
        { tag: 'heal', label: 'Arrival heal', detail: '75% of an Amalgam\'s max HP restored when it gets within 30px of the shriek point.' },
        { tag: 'movement', label: 'The recall', detail: 'Every Amalgam breaks off and runs to the mark, then resumes fighting from there.' },
        { tag: 'utility', label: 'Availability', detail: '8s cooldown.' },
      ],
      upgrade: {
        magic:
          'Carrion Call turns the regroup into a war cry. Anything that answers the shriek comes away '
          + 'from it faster and angrier, trailing red for the next ten seconds.',
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
      magic:
        'The ultimate spends the army. Every Amalgam you own catches fire — they keep fighting while '
        + 'they burn, spraying embers and scorching the ground around themselves once a second, and '
        + 'when the flames finish them they go off. It is the only ability in the kit that converts '
        + 'the horde into damage instead of keeping it alive.',
      cast: 'Q. Instant, arena-wide, ignites every living Amalgam at once.',
      effects: [
        { tag: 'cost', label: 'They burn down', detail: '5 damage a second to each of your own Amalgams. They die to it — this is a sacrifice, not a buff.' },
        { tag: 'damage', label: 'Ember spray', detail: '3 embers a second off each burning Amalgam, 5 damage each.' },
        { tag: 'damage', label: 'Scorched ground', detail: '15 damage in a 60px radius around each burning Amalgam, once a second.' },
        { tag: 'damage', label: 'Detonation', detail: 'A burnt-out Amalgam bursts into 12 embers across a 120px radius.' },
        { tag: 'utility', label: 'Availability', detail: '20s cooldown.' },
      ],
      upgrade: {
        magic:
          'Unending Hell refuses to let them stay dead. What burns away comes back into the queue as '
          + 'the Inflamed — scarred, blackened, harder-hitting things that leak fire every time they '
          + 'are wounded and go off far bigger than an ordinary Amalgam when they finally fall.',
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
      magic:
        'The horde stops being only a weapon and starts being a wall. While enough of your dead are '
        + 'standing near you, the shriek of them between you and the world blunts everything that '
        + 'gets through.',
      effects: [
        { tag: 'shield', label: 'Damage reduction', detail: 'All incoming damage ×0.7 — a flat 30% off — while the condition holds.' },
        { tag: 'utility', label: 'The condition', detail: 'At least 2 living Amalgams within 220px of you. Below that it switches off immediately.' },
        { tag: 'cost', label: 'Not additive', detail: 'It clamps your incoming multiplier at 0.7 rather than stacking, so it never combines with a stronger reduction.' },
      ],
    },
    'call-of-the-void': {
      magic:
        'The divine perk. The Death Whistle stops being a rally and becomes an invitation — anything '
        + 'near the shriek that is already close to the end simply accepts and dies. And the more it '
        + 'takes, the greedier it gets.',
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
      magic:
        'Faint grey threads appear between your dead, and every one of them is holding the others up. '
        + 'A single Amalgam is as fragile as it ever was; a dozen of them are nearly impossible to '
        + 'clear, because each one is being shielded by every other one on the field.',
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
      magic:
        'You destroy one of your own headstones and something far worse comes out of it. The Alpha '
        + 'Amalgam is a huge horror that is not yours — it turns on you, bites, and sprays cones of '
        + 'green shot that stop you being healed at all. Bring it down and it rises on your side, and '
        + 'the ability becomes something else entirely.',
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
